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

/**
 * 计算 polygon 的路径
 * @param data 包含经纬度的数据
 * @returns polygon 的路径
 */
export const handlerPolygonPath = (data: any) => {
  // let endpoint = [] as any[];

  let endpoint = data.map((item: any) => {
    let cartesian = Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude); // 经纬度转笛卡尔坐标
    // endpoint.push(cartesian);
    return cartesian;
  });

  endpoint.push(endpoint[0]); // 添加第一个点, 形成闭合路径

  // return endpoint;
  return new Cesium.PolygonHierarchy(endpoint); // 创建 polygon 的路径
};

/**
 * 根据原点和方向距离计算 polygon 的路径
 * @param startLongitude 经度
 * @param startLatitude 纬度
 * @param startHeight 高度
 * @param data 包含方向和距离的数据
 * @returns polygon 的路径
 */
export function handlerDirectionDistance(
  startLongitude: number,
  startLatitude: number,
  startHeight: number,
  data: any,
) {
  let earthRadius = Cesium.Ellipsoid.WGS84.maximumRadius; // 地球半径

  let fixedPositions = Cesium.Cartographic.fromDegrees(startLongitude, startLatitude, startHeight); // 起点
  let fixedCartesian = Cesium.Cartographic.toCartesian(fixedPositions); // 起点的笛卡尔坐标

  let endPointCartesians: any[] = [];
  // let currentCartesian = fixedCartesian;

  data.forEach((item: any) => {
    let direction = Cesium.Math.toRadians(item.direction); // 方向角度
    let distance = item.distance * 1000; // 距离

    // 计算终点的笛卡尔坐标
    let endpointCartesian = Cesium.Cartesian3.fromRadians(
      Cesium.Cartographic.fromCartesian(fixedCartesian).longitude + (distance / earthRadius) * Math.cos(direction),
      Cesium.Cartographic.fromCartesian(fixedCartesian).latitude + (distance / earthRadius) * Math.sin(direction),
      Cesium.Cartographic.fromCartesian(fixedCartesian).height,
    );
    endPointCartesians.push(endpointCartesian);
  });

  endPointCartesians.push(endPointCartesians[0]);

  return new Cesium.PolygonHierarchy(endPointCartesians);
}

/**
 * 根据原点和方向距离计算 polygon 的路径
 * @param startLongitude 经度
 * @param startLatitude 纬度
 * @param startHeight 高度
 * @param data 包含方向和距离的数据
 * @returns polygon 的路径
 */
export function handlerDistanceKm(startLongitude: number, startLatitude: number, startHeight: number, data: any) {
  let earthRadius = Cesium.Ellipsoid.WGS84.maximumRadius; // 地球半径

  let fixedPositions = Cesium.Cartographic.fromDegrees(startLongitude, startLatitude, startHeight); // 起点
  let fixedCartesian = Cesium.Cartographic.toCartesian(fixedPositions); // 起点的笛卡尔坐标

  let endPointCartesians: any[] = [];
  // let currentCartesian = fixedCartesian;

  data.forEach((item: any) => {
    // let direction = Cesium.Math.toRadians(item.direction); // 方向角度
    let direction = Cesium.Math.toRadians(item.azimuth); // 方向角度
    // let distance = item.distance * 1000; // 距离
    let distance = item.distancekm * 1000; // 距离

    // 计算终点的笛卡尔坐标
    let endpointCartesian = Cesium.Cartesian3.fromRadians(
      Cesium.Cartographic.fromCartesian(fixedCartesian).longitude + (distance / earthRadius) * Math.cos(direction),
      Cesium.Cartographic.fromCartesian(fixedCartesian).latitude + (distance / earthRadius) * Math.sin(direction),
      Cesium.Cartographic.fromCartesian(fixedCartesian).height,
    );
    endPointCartesians.push(endpointCartesian);
  });

  endPointCartesians.push(endPointCartesians[0]);

  return new Cesium.PolygonHierarchy(endPointCartesians);
}

/**
 * 根据每一个点的终点为下一个点的起点计算 polygon 的路径
 * @param startLongitude 经度
 * @param startLatitude 纬度
 * @param startHeight 高度
 * @param data 包含方向和距离的数据
 * @returns polygon 的路径
 */
export function handlerPointNew(startLongitude: number, startLatitude: number, startHeight: number, data: any) {
  let startPoint = Cesium.Cartesian3.fromDegrees(startLongitude, startLatitude, startHeight);

  let pathPoints: any[] = [startPoint]; // 路径点
  let currentPoint = startPoint; // 当前点

  data.forEach((item: any) => {
    let direction = Cesium.Math.toRadians(item.direction); // 方向角度
    let distance = item.distance * 1000; // 距离

    // 计算终点的笛卡尔坐标
    let newPoint = Cesium.Cartesian3.fromRadians(
      Cesium.Cartographic.fromCartesian(currentPoint).longitude +
        (distance / Cesium.Ellipsoid.WGS84.maximumRadius) * Math.cos(direction),
      Cesium.Cartographic.fromCartesian(currentPoint).latitude +
        (distance / Cesium.Ellipsoid.WGS84.maximumRadius) * Math.sin(direction),
      Cesium.Cartographic.fromCartesian(currentPoint).height,
    );
    pathPoints.push(newPoint); // 添加新点
    currentPoint = newPoint; // 更新当前点
  });

  pathPoints.push(startPoint); // 添加起始点以形成闭合路径

  return pathPoints;
}

/**
 * 计算两点之间的距离, 如果距离大于 distanceMi 设定的米,则生成一个新的点
 * @param data 位置数据(经纬度)
 * @param distanceMi 生成新点的距离
 * @returns 新的位置数据
 */
export const handlerComputePoint = (data: any, distanceMi: number) => {
  let dataPath = [];
  for (let i = 0; i < data.length - 1; i++) {
    let start = data[i];
    let end = data[i + 1];
    // 计算两点之间的距离
    let distance = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromDegrees(start.longitude, start.latitude),
      Cesium.Cartesian3.fromDegrees(end.longitude, end.latitude),
    );
    if (distance > distanceMi) {
      // 该段距离大于 1000 米, 每 1000 米生成一个新的经纬度点
      let count = Math.floor(distance / distanceMi); // 向下取整
      let step = distanceMi; // 步长
      // 生成新的点
      for (let j = 0; j < count; j++) {
        let longitude = start.longitude + ((end.longitude - start.longitude) * step) / distance; // 计算经度
        let latitude = start.latitude + ((end.latitude - start.latitude) * step) / distance; // 计算纬度
        dataPath.push({ longitude, latitude }); // 添加新的点
        step += distanceMi; // 步长递增
      }
      // 添加最后一个点
      dataPath.push(end);
    }
  }
  return dataPath;
};
