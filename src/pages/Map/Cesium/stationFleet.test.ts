import { describe, expect, it } from 'vitest';
import { buildStationFleet } from './stationFleet';

describe('stationFleet', () => {
  it('generates a deterministic fleet clamped to the China bbox', () => {
    const a = buildStationFleet(8000);
    const b = buildStationFleet(8000);
    expect(a).toEqual(b);
    expect(a).toHaveLength(8000);
    a.forEach((station) => {
      expect(station.lng).toBeGreaterThanOrEqual(73);
      expect(station.lng).toBeLessThanOrEqual(135);
      expect(station.lat).toBeGreaterThanOrEqual(18);
      expect(station.lat).toBeLessThanOrEqual(54);
      expect(station.region).toBeTruthy();
    });
  });

  it('honors the requested count and spreads across many clusters', () => {
    const fleet = buildStationFleet(500);
    expect(fleet).toHaveLength(500);
    expect(new Set(fleet.map((s) => s.region)).size).toBeGreaterThan(25);
  });

  it('allocates stations in proportion to cluster weight', () => {
    const counts = new Map<string, number>();
    buildStationFleet(8000).forEach((s) => counts.set(s.region, (counts.get(s.region) ?? 0) + 1));
    const n = (region: string) => counts.get(region) ?? 0;
    // 权重 8 > 6 > 3.4 > 0.5 > 0.3
    expect(n('广东')).toBeGreaterThan(n('北京'));
    expect(n('北京')).toBeGreaterThan(n('福建'));
    expect(n('福建')).toBeGreaterThan(n('西藏'));
    expect(n('西藏')).toBeGreaterThan(n('澳门'));
    // 广东:西藏 = 8:0.5，配额四舍五入与补齐只带来个位数偏差
    expect(n('广东') / n('西藏')).toBeGreaterThan(12);
    expect(n('广东') / n('西藏')).toBeLessThan(20);
    // 同权重的簇站数相当
    expect(Math.abs(n('北京') - n('上海'))).toBeLessThanOrEqual(5);
  });

  it('handles tiny counts exactly and deterministically', () => {
    expect(buildStationFleet(0)).toEqual([]);
    [1, 2, 5, 20, 33].forEach((count) => {
      const fleet = buildStationFleet(count);
      expect(fleet).toHaveLength(count);
      expect(buildStationFleet(count)).toEqual(fleet);
      fleet.forEach((s) => expect(s.region).toBeTruthy());
    });
  });
});
