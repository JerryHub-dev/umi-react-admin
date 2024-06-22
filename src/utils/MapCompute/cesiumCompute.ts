import * as Cesium from 'cesium';

/**
 * 获取矩形区域内的实体
 * @param viewer viewer 对象
 * @param rectangle 矩形区域
 * @returns 实体数组
 */
export function getEntitiesInRectangle(viewer: any, rectangle: any) {
  const entitiesInRectangle = []; // 矩形内的实体
  const entities = viewer.entities.values; // 获取所有实体

  // 遍历所有实体
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]; // 实体

    // 判断实体是否有位置信息
    if (entity.position) {
      // 获取实体的位置
      const position = entity.position.getValue(Cesium.JulianDate.now());

      // 判断位置是否在矩形内
      if (position) {
        // 获取位置的经纬度坐标
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        // 判断坐标是否在矩形内
        if (Cesium.Rectangle.contains(rectangle, cartographic)) {
          // 添加到矩形内的实体数组
          entitiesInRectangle.push(entity);
        }
      }
    }
  }

  return entitiesInRectangle;
}
