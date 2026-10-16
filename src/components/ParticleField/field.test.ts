import { describe, expect, it } from 'vitest';
import {
  buildPalette,
  computeFrame,
  createFrame,
  createGroups,
  follow,
  groupByBucket,
  HUES,
  idleFocus,
  layoutParticles,
  LEVELS,
  levelStyle,
  ringFalloff,
  ringRadius,
  spacingFor,
} from './field';

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

  it('环带强度在半径处最大，向内外两侧衰减', () => {
    const r = 200;
    expect(ringFalloff(r, r)).toBe(1);
    expect(ringFalloff(r * 0.5, r)).toBeLessThan(0.2);
    expect(ringFalloff(r * 1.5, r)).toBeLessThan(0.2);
    expect(ringRadius(100, 100)).toBe(120);
    expect(ringRadius(4000, 3000)).toBe(340);
  });

  it('大屏按总数上限放大间距，常规屏保持默认密度', () => {
    expect(spacingFor(1440, 900)).toBe(26);
    expect(spacingFor(390, 844)).toBe(30);
    const s = spacingFor(3840, 2160);
    expect(s).toBeGreaterThan(26);
    expect(layoutParticles(3840, 2160, s).count).toBeLessThan(2500);
  });

  it('环上的粒子最大最亮、远处不画；线段大致沿径向', () => {
    const width = 1200;
    const height = 800;
    const layout = layoutParticles(width, height, 24);
    const frame = createFrame(layout.count);
    const [fx, fy] = [width / 2, height / 2];
    const radius = ringRadius(width, height);
    const visible = computeFrame(layout, frame, fx, fy, radius, 0);
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(layout.count);

    let ringLevels = 0;
    let ringCount = 0;
    let farDrawn = 0;
    for (let i = 0; i < layout.count; i++) {
      const d = Math.hypot(layout.x[i] - fx, layout.y[i] - fy);
      const b = frame.bucket[i];
      if (d > radius * 4 && b >= 0) farDrawn++;
      if (b < 0) continue;
      if (Math.abs(d - radius) < 6) {
        ringLevels += b % LEVELS;
        ringCount++;
      }
      // 线段沿径向，偏转不超过摆动上限 0.2 rad（|叉积| / 模长之积 = 夹角正弦）
      const o = i * 4;
      const sx = frame.seg[o + 2] - frame.seg[o];
      const sy = frame.seg[o + 3] - frame.seg[o + 1];
      const cross = sx * (layout.y[i] - fy) - sy * (layout.x[i] - fx);
      expect(Math.abs(cross) / (Math.hypot(sx, sy) * d)).toBeLessThanOrEqual(Math.sin(0.2) + 1e-4);
    }
    expect(farDrawn).toBe(0);
    expect(ringCount).toBeGreaterThan(0);
    expect(ringLevels / ringCount).toBe(LEVELS - 1);
  });

  it('按桶归组后不丢不重', () => {
    const layout = layoutParticles(600, 400, 20);
    const frame = createFrame(layout.count);
    const groups = createGroups(layout.count);
    const visible = computeFrame(layout, frame, 300, 200, 150, 1.3);
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
