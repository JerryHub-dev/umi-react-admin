import { useEffect, useRef } from 'react';
import {
  buildPalette,
  computeFrame,
  createFrame,
  createGroups,
  createMotion,
  DOT_LEVELS,
  groupByBucket,
  idleFocus,
  layoutParticles,
  LEVELS,
  levelStyle,
  ringRadius,
  spacingFor,
  stepMotion,
  type Frame,
  type Groups,
  type Layout,
} from './field';

export interface ParticleFieldProps {
  /** 暗色底：同档粒子更亮 */
  dark?: boolean;
  className?: string;
}

const PALETTE = buildPalette();

/**
 * 跟随指针的粒子光环背景（Canvas 2D，无第三方依赖）。算法与参数见 ./field.ts。
 *
 * - 纯装饰：aria-hidden，且应由调用方加 pointer-events-none，指针事件在 window 上监听，不挡表单；
 * - prefers-reduced-motion 时只画一帧静态画面，不跑动画循环、不跟随指针；
 * - 后台标签页 requestAnimationFrame 自动暂停；卸载时取消循环并解除全部监听。
 */
const ParticleField: React.FC<ParticleFieldProps> = ({ dark = false, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const darkRef = useRef(dark);
  const redrawRef = useRef<() => void>(undefined);

  useEffect(() => {
    darkRef.current = dark;
    // 动画循环下一帧自然生效；静态模式需要主动重画
    redrawRef.current?.();
  }, [dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let width = 0;
    let height = 0;
    let radius = 0;
    let layout: Layout = layoutParticles(0, 0, 1);
    let frame: Frame = createFrame(0);
    let groups: Groups = createGroups(0);
    const motion = createMotion(0, 0);
    let targetX = 0;
    let targetY = 0;
    let pointerActive = false;
    let started = false;
    let raf = 0;
    let last = 0;
    let time = 0;

    // dt <= 0：静态画面，粒子直接落到目标状态
    const draw = (dt = 0) => {
      ctx.clearRect(0, 0, width, height);
      computeFrame(layout, frame, motion, radius, time, dt);
      groupByBucket(frame, layout.count, groups);
      const { counts, starts, order } = groups;
      const { seg } = frame;
      const isDark = darkRef.current;
      ctx.lineCap = 'round';
      for (let b = 0; b < counts.length; b++) {
        const n = counts[b];
        if (!n) continue;
        const level = b % LEVELS;
        const style = levelStyle(level, isDark);
        const color = PALETTE[(b - level) / LEVELS];
        const end = starts[b] + n;
        ctx.globalAlpha = style.alpha;
        ctx.beginPath();
        if (level < DOT_LEVELS) {
          // 远处的淡点：取线段中点画小方块，一次 fill
          const size = style.width;
          const half = size / 2;
          for (let k = starts[b]; k < end; k++) {
            const o = order[k] * 4;
            ctx.rect((seg[o] + seg[o + 2]) / 2 - half, (seg[o + 1] + seg[o + 3]) / 2 - half, size, size);
          }
          ctx.fillStyle = color;
          ctx.fill();
        } else {
          for (let k = starts[b]; k < end; k++) {
            const o = order[k] * 4;
            ctx.moveTo(seg[o], seg[o + 1]);
            ctx.lineTo(seg[o + 2], seg[o + 3]);
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = style.width;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      width = rect.width;
      height = rect.height;
      // 高分屏按设备像素绘制，但封顶 2 倍，4K 小屏上不至于把填充率拖垮
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout = layoutParticles(width, height, spacingFor(width, height));
      frame = createFrame(layout.count);
      groups = createGroups(layout.count);
      radius = ringRadius(width, height);
      if (!started) {
        [motion.x, motion.y] = idleFocus(time, width, height);
        started = true;
      }
      if (reduced) draw();
    };

    const tick = (now: number) => {
      // 切回标签页时 dt 会很大：封顶，避免光环瞬移
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      if (!pointerActive) [targetX, targetY] = idleFocus(time, width, height);
      // 跟指针时跟手一些，回到游走时慢慢滑过去；中心移动的快慢决定这一刻的浪有多大
      stepMotion(motion, targetX, targetY, dt, pointerActive ? 5 : 1.4);
      draw(dt);
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      pointerActive = true;
    };
    // 鼠标移出窗口（relatedTarget 为空）或触摸结束：交还给游走路径
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) pointerActive = false;
    };
    const onTouchEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') pointerActive = false;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    redrawRef.current = reduced ? () => draw() : undefined;

    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerout', onOut);
      window.addEventListener('pointerup', onTouchEnd);
      window.addEventListener('pointercancel', onTouchEnd);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      redrawRef.current = undefined;
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('pointerup', onTouchEnd);
      window.removeEventListener('pointercancel', onTouchEnd);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
};

export default ParticleField;
