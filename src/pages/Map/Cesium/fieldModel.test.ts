import { distanceKm } from '@/utils/MapCompute/geodesy';
import { describe, expect, it } from 'vitest';
import {
  coverageRadiusKm,
  FIELD_MAX,
  FIELD_MIN,
  fieldStrength,
  gridSamples,
  gridValues,
  planarDistanceKm,
  REGION,
  transmitters,
} from './fieldModel';

describe('fieldModel', () => {
  const cols = 12;
  const rows = 8;
  const latSpan = REGION.north - REGION.south;

  it('gridValues is row-major with row 0 at the north edge', () => {
    const values = gridValues(cols, rows, 0);
    expect(values).toHaveLength(cols * rows);
    const lngOf = (c: number) => REGION.west + ((c + 0.5) / cols) * (REGION.east - REGION.west);
    [0, rows - 1].forEach((r) => {
      const lat = REGION.north - ((r + 0.5) / rows) * latSpan;
      [0, 5, cols - 1].forEach((c) => {
        expect(values[r * cols + c]).toBeCloseTo(fieldStrength(lngOf(c), lat, 0), 3);
      });
    });
  });

  it('gridSamples keeps the legacy south-first order, mirroring gridValues by row', () => {
    const samples = gridSamples(cols, rows);
    const values = gridValues(cols, rows, 0);
    expect(samples).toHaveLength(cols * rows);
    // 旧接口 row 0 = 南：首行纬度低于末行
    expect(samples[0].lat).toBeLessThan(samples[(rows - 1) * cols].lat);
    expect(samples[0].lat).toBeCloseTo(REGION.south + (0.5 / rows) * latSpan, 9);
    // 同一格点：gridSamples 的第 r 行 = gridValues 的第 rows-1-r 行
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        expect(samples[r * cols + c].strength).toBeCloseTo(values[(rows - 1 - r) * cols + c], 3);
      }
    }
  });

  it('propagation distance matches the haversine probe within 0.5% across the region (longitude scaled by cos(lat))', () => {
    const corners: [number, number][] = [
      [REGION.west, REGION.south],
      [REGION.east, REGION.south],
      [REGION.west, REGION.north],
      [REGION.east, REGION.north],
    ];
    transmitters().forEach((tx) => {
      corners.forEach(([lng, lat]) => {
        const planar = planarDistanceKm(lng, lat, tx.lng, tx.lat);
        const great = distanceKm([lng, lat], [tx.lng, tx.lat]);
        expect(Math.abs(planar - great) / great).toBeLessThan(0.005);
      });
    });
  });

  it('clamps field strength to the demo dB range', () => {
    gridValues(cols, rows, 37).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(FIELD_MIN);
      expect(value).toBeLessThanOrEqual(FIELD_MAX);
    });
  });

  it('coverageRadiusKm grows with transmitter power and shrinks with the threshold', () => {
    const powers = [0.2, 0.4, 0.6, 0.8, 1];
    [45, 60].forEach((threshold) => {
      const radii = powers.map((power) => coverageRadiusKm(power, threshold));
      for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1]);
    });
    expect(coverageRadiusKm(1, 45)).toBeGreaterThan(coverageRadiusKm(1, 60));
    // 阈值高到任何功率都覆盖不到时钳在 1 km（不出现 NaN/负数），且依旧单调不减
    const clamped = powers.map((power) => coverageRadiusKm(power, FIELD_MAX));
    clamped.forEach((radius) => expect(radius).toBeGreaterThanOrEqual(1));
    for (let i = 1; i < clamped.length; i++) expect(clamped[i]).toBeGreaterThanOrEqual(clamped[i - 1]);
  });
});
