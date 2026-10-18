import { useEffect, useRef } from 'react';
import {
  buildPalette,
  computeFrame,
  createFrame,
  createGroups,
  createMotion,
  DOT_LEVELS,
  follow,
  frameGap,
  groupByBucket,
  idleFocus,
  introScale,
  layoutParticles,
  LEVELS,
  levelStyle,
  QUIET_DIM,
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
  /** 安静模式（如用户正在输入）：浪平息、整体压暗，不和前景抢注意力 */
  quiet?: boolean;
  className?: string;
}

const PALETTES = { dark: buildPalette('dark'), light: buildPalette('light') };

/**
 * 跟随指针的粒子光环背景（Canvas 2D，无第三方依赖）。算法与参数见 ./field.ts。
 *
 * - 纯装饰：aria-hidden，且应由调用方加 pointer-events-none，指针事件在 window 上监听，不挡表单；
 * - prefers-reduced-motion 或强制颜色（Windows 高对比度）时只画一帧静态画面，不跑动画循环、不跟随指针；
 *   强制颜色下调用方还应把画布隐藏（forced-colors:hidden）；
 * - 后台标签页 requestAnimationFrame 自动暂停；窗口失焦、长时间无操作时降帧（见 frameGap）；
 * - 卸载时取消循环并解除全部监听。
 */
const ParticleField: React.FC<ParticleFieldProps> = ({ dark = false, quiet = false, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const darkRef = useRef(dark);
  const quietRef = useRef(quiet);
  const redrawRef = useRef<() => void>(undefined);

  useEffect(() => {
    darkRef.current = dark;
    // 动画循环下一帧自然生效；静态模式需要主动重画
    redrawRef.current?.();
  }, [dark]);

  useEffect(() => {
    quietRef.current = quiet;
  }, [quiet]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const media = (query: string) => window.matchMedia?.(query).matches ?? false;
    const still = media('(prefers-reduced-motion: reduce)') || media('(forced-colors: active)');
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
    let quietLevel = 0;
    let blurred = false;
    let lastInput = performance.now();

    // dt <= 0：静态画面，粒子直接落到目标状态
    const draw = (dt = 0) => {
      ctx.clearRect(0, 0, width, height);
      computeFrame(layout, frame, motion, still ? radius : radius * introScale(time), time, dt);
      groupByBucket(frame, layout.count, groups);
      const { counts, starts, order } = groups;
      const { seg } = frame;
      const isDark = darkRef.current;
      const dim = 1 - QUIET_DIM * quietLevel;
      ctx.lineCap = 'round';
      for (let b = 0; b < counts.length; b++) {
        const n = counts[b];
        if (!n) continue;
        const level = b % LEVELS;
        const style = levelStyle(level, isDark);
        const color = PALETTES[isDark ? 'dark' : 'light'][(b - level) / LEVELS];
        const end = starts[b] + n;
        ctx.globalAlpha = style.alpha * dim;
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
      if (still) draw();
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (last && now - last < frameGap(blurred, now - lastInput) - 1) return;
      // 切回标签页时 dt 会很大：封顶，避免光环瞬移。首帧也按一帧推进而不是直接落定，
      // 亮度从零升起、粒子被弹簧推开，和入场半径一起构成那圈涟漪
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      time += dt;
      if (!pointerActive) [targetX, targetY] = idleFocus(time, width, height);
      // 指针态也保持「慢半拍」的漂浮感（对齐参考站 ≈1.2/s 的有效速率），回到游走时更慢
      stepMotion(motion, targetX, targetY, dt, pointerActive ? 1.3 : 0.9);
      quietLevel = follow(quietLevel, quietRef.current ? 1 : 0, dt, 3);
      draw(dt);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      pointerActive = true;
      lastInput = performance.now();
    };
    const onKey = () => {
      lastInput = performance.now();
    };
    const onBlur = () => {
      blurred = true;
    };
    const onFocus = () => {
      blurred = false;
      lastInput = performance.now();
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
    redrawRef.current = still ? () => draw() : undefined;

    if (!still) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerout', onOut);
      window.addEventListener('pointerup', onTouchEnd);
      window.addEventListener('pointercancel', onTouchEnd);
      window.addEventListener('keydown', onKey);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);
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
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
};

export default ParticleField;
