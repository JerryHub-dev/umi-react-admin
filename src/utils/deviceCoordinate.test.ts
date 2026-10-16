import { describe, expect, it } from 'vitest';
import {
  COORDINATE_GRID_DEGREES,
  serializeDeviceCoordinates,
  serializeDeviceListCoordinates,
} from './deviceCoordinate';

/**
 * 坐标脱敏是权限边界（F12）：没有 ops.device.coordinate.view 时，接口在序列化处把经纬度粗化到格网。
 * 这里锁住「精确值只对持权者可见」「无权限时两轴都粗化」「同格网不可区分」三条不变量。
 */
/** 浮点比值先收敛到 6 位小数再判整：0.1 步长的除法会引入 398.99999999999994 这样的噪声 */
const isOnGrid = (value: number) => {
  const steps = Number((value / COORDINATE_GRID_DEGREES).toFixed(6));
  return Number.isInteger(steps);
};

describe('device coordinate serialization', () => {
  const device = { id: 'D1', name: 'RRU-1', lng: 116.397_123, lat: 39.908_456 };

  it('returns the exact values only for callers holding the permission', () => {
    expect(serializeDeviceCoordinates(device, true)).toEqual({ ...device, coordinatePrecision: 'exact' });
  });

  it('coarsens both axes to the grid when the permission is missing', () => {
    const coarse = serializeDeviceCoordinates(device, false);

    expect(coarse.coordinatePrecision).toBe('coarse');
    expect(coarse.lng).toBe(116.3);
    expect(coarse.lat).toBe(39.9);
    expect(isOnGrid(coarse.lng)).toBe(true);
    expect(isOnGrid(coarse.lat)).toBe(true);
    // 不泄露原始低位：粗化值必须是向下取整，而不是四舍五入回原始方向
    expect(coarse.lng).toBeLessThanOrEqual(device.lng);
    expect(coarse.lat).toBeLessThanOrEqual(device.lat);
  });

  it('makes devices inside one grid cell indistinguishable', () => {
    const a = serializeDeviceCoordinates({ lng: 116.31, lat: 39.91 }, false);
    const b = serializeDeviceCoordinates({ lng: 116.39, lat: 39.99 }, false);

    expect(a.lng).toBe(b.lng);
    expect(a.lat).toBe(b.lat);
  });

  it('keeps devices in different cells distinguishable for map rendering', () => {
    const a = serializeDeviceCoordinates({ lng: 116.31, lat: 39.91 }, false);
    const b = serializeDeviceCoordinates({ lng: 116.51, lat: 40.01 }, false);

    expect(a.lng).not.toBe(b.lng);
    expect(a.lat).not.toBe(b.lat);
  });

  it('handles negative coordinates without drifting off the grid', () => {
    const coarse = serializeDeviceCoordinates({ lng: -0.05, lat: -39.95 }, false);

    expect(isOnGrid(coarse.lng)).toBe(true);
    expect(isOnGrid(coarse.lat)).toBe(true);
    expect(coarse.lng).toBeLessThanOrEqual(-0.05);
    expect(coarse.lat).toBeLessThanOrEqual(-39.95);
  });

  it('does not mutate the input rows', () => {
    const input = { lng: 116.397_123, lat: 39.908_456 };
    serializeDeviceCoordinates(input, false);

    expect(input).toEqual({ lng: 116.397_123, lat: 39.908_456 });
  });

  it('applies the same boundary to list responses, preserving order', () => {
    const rows = [
      { id: 'D1', lng: 116.397_123, lat: 39.908_456 },
      { id: 'D2', lng: 121.473_701, lat: 31.230_416 },
    ];

    const coarse = serializeDeviceListCoordinates(rows, false);
    expect(coarse.map((row) => row.id)).toEqual(['D1', 'D2']);
    expect(coarse.every((row) => row.coordinatePrecision === 'coarse')).toBe(true);

    const exact = serializeDeviceListCoordinates(rows, true);
    expect(exact[0].lng).toBe(116.397_123);
    expect(exact.every((row) => row.coordinatePrecision === 'exact')).toBe(true);
  });
});
