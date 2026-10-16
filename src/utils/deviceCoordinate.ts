import type { Device } from '@/services/types';

/**
 * 设备坐标的数据范围边界（审查 F12）。
 *
 * 允许看到精确经纬度的唯一条件：会话持有 ops.device.coordinate.view。
 * 没有该权限时，接口在**序列化边界**把坐标粗化到 0.1° 格网（约 10 公里），
 * 并标 coordinatePrecision: 'coarse'。UI 只是呈现，不能替代这里的判断——
 * 直接调用 /api/v1/devices 同样只能拿到粗化值。
 *
 * 粗化用向下取整而非四舍五入：同一格网内所有设备落到同一点，且不泄露原始值的低位。
 */
export const COORDINATE_GRID_DEGREES = 0.1;

/** 粗化后的坐标：**向下取整到格网角点**（不是格网中心），同一格网内所有设备落到同一点 */
const snapToGrid = (value: number) =>
  Number((Math.floor(value / COORDINATE_GRID_DEGREES) * COORDINATE_GRID_DEGREES).toFixed(4));

/**
 * 按调用者是否持有精确坐标权限序列化设备（单一出口，列表/详情/地图共用）。
 * 不做部分字段保留：无权限时经纬度两者都粗化，避免用单轴精确值定位。
 * 返回类型显式带上 coordinatePrecision：调用方据此标注精度，不需要依赖输入里已经存在该字段。
 */
export const serializeDeviceCoordinates = <T extends Pick<Device, 'lng' | 'lat'>>(
  device: T,
  canViewExact: boolean,
): T & { coordinatePrecision: Device['coordinatePrecision'] } => {
  if (canViewExact) return { ...device, coordinatePrecision: 'exact' };
  return { ...device, lng: snapToGrid(device.lng), lat: snapToGrid(device.lat), coordinatePrecision: 'coarse' };
};

/** 批量版本（列表接口） */
export const serializeDeviceListCoordinates = <T extends Pick<Device, 'lng' | 'lat'>>(
  devices: T[],
  canViewExact: boolean,
): (T & { coordinatePrecision: Device['coordinatePrecision'] })[] =>
  devices.map((device) => serializeDeviceCoordinates(device, canViewExact));
