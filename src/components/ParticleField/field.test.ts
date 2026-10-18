import { describe, expect, it } from 'vitest';
import {
  buildPalette,
  computeFrame,
  createFrame,
  createGroups,
  createMotion,
  envelope,
  follow,
  frameGap,
  groupByBucket,
  HUES,
  IDLE_MS,
  idleFocus,
  INTRO_SECONDS,
  introScale,
  layoutParticles,
  LEVELS,
  levelStyle,
  ringBase,
  ringRadius,
  spacingFor,
  stepMotion,
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

  it('环半径只随时间呼吸（±5% 内），不随指针速度变化', () => {
    const r = 300;
    expect(envelope(0, r)).toBe(1);
    expect(envelope(r * 0.6, r)).toBeLessThan(0.1);
    expect(ringRadius(100, 100)).toBe(120);
    expect(ringRadius(4000, 3000)).toBe(340);
    for (let t = 0; t < 20; t += 0.05) {
      expect(ringBase(r, t)).toBeGreaterThan(r * 0.95);
      expect(ringBase(r, t)).toBeLessThan(r * 1.05);
    }
    expect(ringBase(r, 0)).toBe(r * (1 + 0.02));
  });

  it('静态帧：环带附近最亮，远处只剩基础明暗的淡点；线段大致沿径向', () => {
    const { layout, frame, radius } = setup();
    const motion = createMotion(WIDTH / 2, HEIGHT / 2);
    const visible = computeFrame(layout, frame, motion, radius, 0, 0);
    // 基础明暗让全场隐约可见（对齐参考站的 ambient 项）
    expect(visible).toBe(layout.count);

    let nearSum = 0;
    let nearCount = 0;
    let innerSum = 0;
    let innerCount = 0;
    let farMaxLevel = 0;
    let maxTilt = 0;
    for (let i = 0; i < layout.count; i++) {
      const dx = layout.x[i] - motion.x;
      const dy = layout.y[i] - motion.y;
      const d = Math.hypot(dx, dy);
      const u = d - ringBase(radius, 0);
      const level = levelOf(frame.bucket[i]);
      if (d > radius * 4) farMaxLevel = Math.max(farMaxLevel, level);
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
    // 远处最多到「淡点」档，不会画出亮线
    expect(farMaxLevel).toBeLessThanOrEqual(1);
    expect(nearSum / nearCount).toBeGreaterThan(innerSum / innerCount + 2);
    // 摆动上限：自身晃动 0.08 rad
    expect(maxTilt).toBeLessThanOrEqual(Math.sin(0.08) + 1e-4);
  });

  it('位移指数回归：环移走后单调衰减、不回弹；亮度快起慢落', () => {
    const { layout, frame, radius } = setup();
    const motion = createMotion(WIDTH / 2, HEIGHT / 2);
    computeFrame(layout, frame, motion, radius, 0, 0);
    // 找一个正好在环带、正右方的粒子
    let probe = -1;
    let best = Infinity;
    for (let i = 0; i < layout.count; i++) {
      const dx = layout.x[i] - motion.x;
      const dy = layout.y[i] - motion.y;
      const u = Math.abs(Math.hypot(dx, dy) - ringBase(radius, 0));
      if (dx > 0 && Math.abs(dy) < 20 && u < best) {
        best = u;
        probe = i;
      }
    }
    const settled = frame.ox[probe];
    expect(settled).toBeGreaterThan(4);
    const glowOn = frame.glow[probe];
    expect(glowOn).toBeGreaterThan(0.5);

    // 环瞬间移走：位移被指数拉回，只是变慢，不会越过零点（无弹簧回弹）
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
    expect(minOffset).toBeGreaterThanOrEqual(0);
    expect(frame.ox[probe]).toBeLessThan(0.5);
    expect(frame.glow[probe]).toBeLessThan(0.15);
  });

  it('环心按速率缓动跟随，dt <= 0 不改变状态', () => {
    const motion = createMotion(0, 0);
    // 有效速率 ≈1.2/s：一秒后走掉大半段，但还留着明显的「慢半拍」
    for (let n = 0; n < 60; n++) stepMotion(motion, 100, 0, STEP, 1.3);
    expect(motion.x).toBeGreaterThan(60);
    expect(motion.x).toBeLessThan(95);
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

  it('缓动与帧率无关、游走点留在视口内、补丁色板与档位合法', () => {
    // 两个半帧与一个整帧落到同一位置
    const half = follow(follow(0, 100, 0.008, 1.3), 100, 0.008, 1.3);
    expect(half).toBeCloseTo(follow(0, 100, 0.016, 1.3), 10);
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
    // 三色补丁（对齐参考站）：暗色从 #7189ff 起步到黑；亮色蓝→红→黄
    const dark = buildPalette('dark');
    const light = buildPalette('light');
    expect(dark).toHaveLength(HUES);
    expect(light).toHaveLength(HUES);
    dark.forEach((c) => expect(c).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/));
    expect(dark[0]).toBe('rgb(113,137,255)');
    expect(dark[HUES - 1]).toBe('rgb(0,0,0)');
    expect(light[0]).toBe('rgb(44,100,237)');
    // 中段落在红补丁附近（允许插值的少量偏移）
    expect(light[Math.floor(HUES / 2)]).toMatch(/^rgb\(2[0-9]{2},(?:[6-9][0-9]),[0-9]{1,2}\)$/);
    expect(light[HUES - 1]).toBe('rgb(255,207,3)');
    expect(levelStyle(LEVELS - 1, false).alpha).toBeCloseTo(1);
    expect(levelStyle(0, true).alpha).toBeGreaterThan(levelStyle(0, false).alpha);
  });

  it('入场半径从小到大缓出，降帧规则按失焦与空闲时长', () => {
    expect(introScale(0)).toBeCloseTo(0.3);
    expect(introScale(INTRO_SECONDS / 2)).toBeGreaterThan(0.3 + 0.7 * 0.5);
    expect(introScale(INTRO_SECONDS)).toBe(1);
    expect(introScale(INTRO_SECONDS * 3)).toBe(1);
    expect(frameGap(false, 0)).toBe(0);
    expect(frameGap(false, IDLE_MS + 1)).toBe(33);
    expect(frameGap(true, 0)).toBe(50);
  });
});
