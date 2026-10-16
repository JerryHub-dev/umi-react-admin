import { describe, expect, it } from 'vitest';
import {
  buildPalette,
  computeFrame,
  createFrame,
  createGroups,
  createMotion,
  edgeRadius,
  envelope,
  follow,
  groupByBucket,
  HUES,
  idleFocus,
  layoutParticles,
  LEVELS,
  levelStyle,
  ringIntensity,
  ringRadius,
  spacingFor,
  stepMotion,
  TAU,
  wavePhase,
} from './field';

const WIDTH = 1200;
const HEIGHT = 800;
const STEP = 1 / 60;

const setup = () => {
  const layout = layoutParticles(WIDTH, HEIGHT, 24);
  return { layout, frame: createFrame(layout.count), radius: ringRadius(WIDTH, HEIGHT) };
};

/** 某个粒子当前的绘制档位（-1 = 不可见） */
const levelOf = (bucket: number) => (bucket < 0 ? -1 : bucket % LEVELS);

describe('粒子光环计算', () => {
  it('布局确定且覆盖整个视口（四周多铺一格）', () => {
    const a = layoutParticles(400, 300, 20);
    const b = layoutParticles(400, 300, 20);
    expect(a.count).toBe((20 + 2) * (15 + 2));
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    expect(Math.min(...a.x)).toBeLessThan(0);
    expect(Math.max(...a.x)).toBeGreaterThan(400);
    expect(Math.min(...a.y)).toBeLessThan(0);
    expect(Math.max(...a.y)).toBeGreaterThan(300);
  });

  it('大屏按总数上限放大间距，常规屏保持默认密度', () => {
    expect(spacingFor(1440, 900)).toBe(26);
    expect(spacingFor(390, 844)).toBe(30);
    const s = spacingFor(3840, 2160);
    expect(s).toBeGreaterThan(26);
    expect(layoutParticles(3840, 2160, s).count).toBeLessThan(2500);
  });

  it('软边在半径附近起伏，被搅动时运动反方向拉长', () => {
    const r = 300;
    expect(envelope(0, r)).toBe(1);
    expect(envelope(r * 0.6, r)).toBeLessThan(0.1);
    expect(ringRadius(100, 100)).toBe(120);
    expect(ringRadius(4000, 3000)).toBe(340);
    for (let theta = 0; theta < TAU; theta += 0.2) {
      const calm = edgeRadius(theta, 3, r, 0, 0);
      expect(calm).toBeGreaterThan(r * 0.88);
      expect(calm).toBeLessThan(r * 1.12);
    }
    // 向右移动（heading = 0）：左侧（尾迹）比静止时更长，右侧（迎面）更短
    expect(edgeRadius(Math.PI, 0, r, 1, 0)).toBeGreaterThan(edgeRadius(Math.PI, 0, r, 0, 0));
    expect(edgeRadius(0, 0, r, 1, 0)).toBeLessThan(edgeRadius(0, 0, r, 0, 0));
  });

  it('静态帧：边缘附近最亮，远处不画；线段大致沿径向', () => {
    const { layout, frame, radius } = setup();
    const motion = createMotion(WIDTH / 2, HEIGHT / 2);
    const visible = computeFrame(layout, frame, motion, radius, 0, 0);
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(layout.count);

    let nearSum = 0;
    let nearCount = 0;
    let innerSum = 0;
    let innerCount = 0;
    let farDrawn = 0;
    let maxTilt = 0;
    for (let i = 0; i < layout.count; i++) {
      const dx = layout.x[i] - motion.x;
      const dy = layout.y[i] - motion.y;
      const d = Math.hypot(dx, dy);
      const u = d - edgeRadius(Math.atan2(dy, dx), 0, radius, 0, 0);
      const level = levelOf(frame.bucket[i]);
      if (d > radius * 4 && level >= 0) farDrawn++;
      if (Math.abs(u) < 10) {
        nearSum += Math.max(level, 0);
        nearCount++;
      }
      if (d < radius * 0.3) {
        innerSum += Math.max(level, 0);
        innerCount++;
      }
      if (level >= 0) {
        // |叉积| / 模长之积 = 线段与径向夹角的正弦
        const o = i * 4;
        const sx = frame.seg[o + 2] - frame.seg[o];
        const sy = frame.seg[o + 3] - frame.seg[o + 1];
        maxTilt = Math.max(maxTilt, Math.abs(sx * dy - sy * dx) / (Math.hypot(sx, sy) * d));
      }
    }
    expect(farDrawn).toBe(0);
    expect(nearSum / nearCount).toBeGreaterThan(innerSum / innerCount + 2);
    // 摆动上限：浪坡 0.22 + 自身晃动 0.06 rad
    expect(maxTilt).toBeLessThanOrEqual(Math.sin(0.28) + 1e-4);
  });

  it('浪峰随时间向外推进，搅动时浪更急、反差更大', () => {
    const r = 300;
    const at = (u: number, t: number, energy = 0) =>
      ringIntensity(envelope(u, r), Math.sin(wavePhase(u, r, t, energy)), energy);
    // 某一时刻离边缘最近的亮度局部极大值
    const crestNear = (from: number, t: number) => {
      let best = Infinity;
      let pos = from;
      for (let u = -r * 0.5; u <= r * 0.5; u += 0.5) {
        const isPeak = at(u, t) > at(u - 0.5, t) && at(u, t) >= at(u + 0.5, t);
        if (isPeak && Math.abs(u - from) < best) {
          best = Math.abs(u - from);
          pos = u;
        }
      }
      return pos;
    };
    const first = crestNear(0, 0);
    expect(crestNear(first, 0.2)).toBeGreaterThan(first);
    // 同一位置，扰动能量让浪推进得更快
    expect(wavePhase(0, r, 1, 1)).toBeLessThan(wavePhase(0, r, 1, 0));
    // 浪谷（crest = -1）在平静时仍保留大部分亮度，搅动时更暗
    expect(ringIntensity(1, -1, 0)).toBeCloseTo(0.65);
    expect(ringIntensity(1, -1, 1)).toBeLessThan(ringIntensity(1, -1, 0));
    expect(ringIntensity(1, 1, 1)).toBe(1);
  });

  it('弹簧：位移平滑追上目标并带一点回弹；亮度快起慢落', () => {
    const { layout, frame, radius } = setup();
    const motion = createMotion(WIDTH / 2, HEIGHT / 2);
    computeFrame(layout, frame, motion, radius, 0, 0);
    // 找一个正好在边缘、正右方的粒子
    let probe = -1;
    let best = Infinity;
    for (let i = 0; i < layout.count; i++) {
      const dx = layout.x[i] - motion.x;
      const dy = layout.y[i] - motion.y;
      const u = Math.abs(Math.hypot(dx, dy) - edgeRadius(Math.atan2(dy, dx), 0, radius, 0, 0));
      if (dx > 0 && Math.abs(dy) < 20 && u < best) {
        best = u;
        probe = i;
      }
    }
    const settled = frame.ox[probe];
    expect(settled).toBeGreaterThan(4);
    const glowOn = frame.glow[probe];
    expect(glowOn).toBeGreaterThan(0.5);

    // 光环瞬间移走：位移不会立刻归零，而是被弹簧拉回、越过零点后再回来
    motion.x = -5000;
    let t = 0;
    for (let n = 0; n < 6; n++) computeFrame(layout, frame, motion, radius, (t += STEP), STEP);
    expect(frame.ox[probe]).toBeGreaterThan(0);
    expect(frame.ox[probe]).toBeLessThan(settled);
    // 余晖：0.1 秒后仍然亮着
    expect(frame.glow[probe]).toBeGreaterThan(glowOn * 0.6);
    let minOffset = settled;
    for (let n = 0; n < 240; n++) {
      computeFrame(layout, frame, motion, radius, (t += STEP), STEP);
      minOffset = Math.min(minOffset, frame.ox[probe]);
    }
    expect(minOffset).toBeLessThan(0);
    expect(Math.abs(frame.ox[probe])).toBeLessThan(0.5);
    expect(frame.glow[probe]).toBeLessThan(0.05);
  });

  it('中心移动越快扰动能量越高，静止后平息', () => {
    const motion = createMotion(0, 0);
    let x = 0;
    for (let n = 0; n < 60; n++) stepMotion(motion, (x += 30), 0, STEP, 30);
    expect(motion.energy).toBeGreaterThan(0.6);
    expect(motion.vx).toBeGreaterThan(0);
    const stirred = motion.energy;
    for (let n = 0; n < 60; n++) stepMotion(motion, x, 0, STEP, 30);
    expect(motion.energy).toBeLessThan(stirred);
    expect(motion.energy).toBeGreaterThan(stirred * 0.3);
    for (let n = 0; n < 600; n++) stepMotion(motion, x, 0, STEP, 30);
    expect(motion.energy).toBeLessThan(0.01);
    // dt <= 0 不改变状态
    const before = { ...motion };
    stepMotion(motion, 9999, 9999, 0, 30);
    expect(motion).toEqual(before);
  });

  it('按桶归组后不丢不重', () => {
    const layout = layoutParticles(600, 400, 20);
    const frame = createFrame(layout.count);
    const groups = createGroups(layout.count);
    const visible = computeFrame(layout, frame, createMotion(300, 200), 150, 1.3, 0);
    expect(groupByBucket(frame, layout.count, groups)).toBe(visible);
    const seen = new Set(Array.from(groups.order.subarray(0, visible)));
    expect(seen.size).toBe(visible);
    for (let b = 0; b < HUES * LEVELS; b++) {
      for (let k = groups.starts[b]; k < groups.starts[b] + groups.counts[b]; k++) {
        expect(frame.bucket[groups.order[k]]).toBe(b);
      }
    }
  });

  it('缓动与帧率无关、游走点留在视口内、色环与档位合法', () => {
    // 两个半帧与一个整帧落到同一位置
    const half = follow(follow(0, 100, 0.008, 5), 100, 0.008, 5);
    expect(half).toBeCloseTo(follow(0, 100, 0.016, 5), 10);
    for (let t = 0; t < 120; t += 0.7) {
      const [x, y] = idleFocus(t, 1000, 600);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1000);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(600);
      // 窄屏只在顶部五分之一游走（登录框之上）
      const [, top] = idleFocus(t, 390, 844);
      expect(top).toBeLessThan(844 * 0.22);
    }
    const palette = buildPalette();
    expect(palette).toHaveLength(HUES);
    palette.forEach((c) => expect(c).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/));
    expect(levelStyle(LEVELS - 1, false).alpha).toBeCloseTo(1);
    expect(levelStyle(0, true).alpha).toBeGreaterThan(levelStyle(0, false).alpha);
  });
});
