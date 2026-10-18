import { describe, expect, it } from 'vitest';
import {
  capabilityStats,
  envelopeRing,
  isIntercepted,
  rangeKm,
  sweepSector,
  targetPosition,
  TARGETS,
} from './capabilityModel';

/** 数值冒烟：模型在一段时间内所有输出必须有限（渲染崩溃=cartesian NaN 的前置防线） */
describe('监测站能力模型', () => {
  it('包络/目标/波束在 0..10 分钟内不产生 NaN 或非法值', () => {
    for (let seconds = 0; seconds < 600; seconds += 0.7) {
      for (const capability of ['location', 'intercept', 'demodulation'] as const) {
        const ring = envelopeRing(capability, seconds);
        expect(ring).toHaveLength(72);
        ring.forEach((p) => {
          expect(Number.isFinite(p.longitude), `lng @${capability},${seconds}`).toBe(true);
          expect(Number.isFinite(p.latitude), `lat @${capability},${seconds}`).toBe(true);
          expect(Number.isFinite(p.distanceKm), `km @${capability},${seconds}`).toBe(true);
        });
        const stats = capabilityStats(capability, seconds);
        expect(stats.max).toBeGreaterThan(stats.min);
        // 合理量程：基距 122..215 km，方向瓣 ±25%，阴影最多砍 47%
        expect(stats.max).toBeLessThan(320);
        expect(stats.min).toBeGreaterThan(60);
        expect(stats.avg).toBeGreaterThan(80);
      }
      TARGETS.forEach((target) => {
        const p = targetPosition(target, seconds);
        expect(Number.isFinite(p.longitude) && Number.isFinite(p.latitude) && Number.isFinite(p.altitude)).toBe(true);
        expect(typeof isIntercepted(target, seconds)).toBe('boolean');
      });
      const sector = sweepSector(seconds * 0.5, 0.11, 240);
      expect(sector.length).toBeGreaterThanOrEqual(10);
      sector.forEach(([lng, lat]) => expect(Number.isFinite(lng) && Number.isFinite(lat)).toBe(true));
      expect(rangeKm('intercept', seconds, seconds)).toBeGreaterThan(0);
    }
  });
});
