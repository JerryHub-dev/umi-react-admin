/**
 * InfoIndex.tsx
 */
import { centerGeoHash, geohashBounds } from '@/utils/MapCompute/geoHash';
import { ProCard } from '@ant-design/pro-components';
import { Button, Spin, message } from 'antd';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useEffect, useState } from 'react';
// import { geohashBounds } from 'ngeohash';

export default function InfoIndex() {
  const [viewer, setViewer] = useState(null as any);
  const [messageApi, contextHolder] = message.useMessage();

  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZjBmZTAzMS1jMTJkLTQ5OGQtYTkyYS0xODcyMjU3MTQzMmUiLCJpZCI6MTg2MDcxLCJpYXQiOjE3MDM0MDIwMzl9.DQzBf8T_0U92DwjBcYQqdgwhFs-Cx7EacplwoL_ypjY';

  useEffect(() => {
    // 创建一个 Cesium Viewer 实例
    const viewer = new Cesium.Viewer('cesiumContainer', {
      // 去除所有的控件
      animation: false, // 是否显示动画控件
      baseLayerPicker: false, // 是否显示图层选择控件
      fullscreenButton: false, // 是否显示全屏按钮
      geocoder: false, // 是否显示地名查找控件
      homeButton: false, // 是否显示Home按钮
      infoBox: false, // 是否显示信息框
      sceneModePicker: false, // 是否显示3D/2D选择器
      selectionIndicator: false, // 是否显示选取指示器组件
      timeline: false, // 是否显示时间轴
      navigationHelpButton: false, // 是否显示帮助信息按钮
      navigationInstructionsInitiallyVisible: false, // 是否显示导航指示
      scene3DOnly: true, // 是否只显示3D
      shouldAnimate: true, // 是否显示动画
      skyAtmosphere: false, // 是否显示大气层
      skyBox: false, // 是否显示天空盒
      vrButton: false, // 是否显示VR按钮
    });

    // 1, 去除版权信息
    (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

    // 2, 添加一个点击事件来显示位置坐标：
    viewer.screenSpaceEventHandler.setInputAction(
      function onLeftClick(movement: { position: Cesium.Cartesian2 }) {
        const cartesian = viewer.camera.pickEllipsoid(
          movement.position,
          viewer.scene.globe.ellipsoid,
        );
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          const longitudeString = Cesium.Math.toDegrees(
            cartographic.longitude,
          ).toFixed(2);
          const latitudeString = Cesium.Math.toDegrees(
            cartographic.latitude,
          ).toFixed(2);
          messageApi.info(
            `Longitude: ${longitudeString}, Latitude: ${latitudeString}`,
          );
          // alert(`Longitude: ${longitudeString}, Latitude: ${latitudeString}`);
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );

    setViewer(viewer);

    // 销毁
    return () => {
      viewer.destroy();
    };
  }, []);

  // 获取中心点
  const [centerPosition, setCenterPosition] = useState('');
  const getCenterPosition = () => {
    if (viewer === null) {
      return;
    }
    const center = viewer.camera.position;
    const cartographic = Cesium.Cartographic.fromCartesian(center);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    messageApi.success(`中心点坐标: ${longitude}, ${latitude}`);
    setCenterPosition(`${longitude}, ${latitude}`);
  };

  // 根据中心点坐标生成 GeoHash
  const [centerHash, setCenterHash] = useState('');
  const handleCenterGeoHash = () => {
    if (viewer === null) {
      return;
    }
    const cartesian = viewer.camera.position; // 获取相机位置
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian); // 获取笛卡尔坐标
    console.log(cartographic);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude); // 转换为经度
    const latitude = Cesium.Math.toDegrees(cartographic.latitude); // 转换为纬度
    console.log(longitude, latitude);
    const precision = 8; // 精度
    const geohash = centerGeoHash(latitude, longitude, precision);
    messageApi.success(`生成的GeoHash: ${geohash}`);
    setCenterHash(geohash);
  };

  function getGeoHash(west: any, south: any, east: any, north: any) {
    // 计算中心点的经纬度
    const centerLat = (north + south) / 2;
    const centerLon = (west + east) / 2;

    // 生成 geohash
    const geohash = centerGeoHash(centerLat, centerLon, 5);
    // const geohash = encodeGeohash(centerLat, centerLon, 5);

    // 根据生成的 geohash 字符串显示范围
    return geohash;
  }

  // 根据视图范围生成 GeoHash
  const [mapHash, setMapHash] = useState('');
  const handleGeoHash = async () => {
    if (viewer === null) {
      return;
    }
    const rectangle = viewer.camera.computeViewRectangle(); // 获取视图范围

    if (rectangle) {
      // 获取西、南、东、北的经纬度
      const west = Cesium.Math.toDegrees(rectangle.west);
      const south = Cesium.Math.toDegrees(rectangle.south);
      const east = Cesium.Math.toDegrees(rectangle.east);
      const north = Cesium.Math.toDegrees(rectangle.north);

      console.log(
        `West: ${west}, South: ${south}, East: ${east}, North: ${north}`,
      );

      // 使用这些边界生成 GeoHash
      const geohash = getGeoHash(west, south, east, north);
      console.log(`GeoHash: ${geohash}`);

      messageApi.success(`生成的GeoHash: ${geohash}`);
      setMapHash(geohash);

      setTimeout(() => {
        // 如何根据 geohash 字符串手动实现显示范围 画出范围
        viewer.entities.removeAll(); // 移除所有实体

        const bounds: any = geohashBounds(geohash);
        // const bounds: any = decodeGeohash(geohash);
        console.log(bounds);
        const rectangles = Cesium.Rectangle.fromDegrees(
          bounds.longitudeMin,
          bounds.latitudeMin,
          bounds.longitudeMax,
          bounds.latitudeMax,
          // bounds.longitude,
          // bounds.latitude,
          // bounds.latRange,
          // bounds.lonRange,
        );
        viewer.entities.add({
          rectangle: {
            coordinates: rectangles,
            fill: true,
            material: Cesium.Color.RED.withAlpha(0.5),
            outline: true,
            outlineColor: Cesium.Color.BLACK,
          },
        });
        viewer.camera.flyTo({
          destination: rectangle,
          duration: 1,
        });
      }, 100);
    }
  };

  return (
    <ProCard>
      {contextHolder}
      {viewer === null && <Spin spinning={true} />}
      <div id="cesiumContainer" />
      <div>
        <Button onClick={() => handleGeoHash()} className="mt-2">
          根据视图范围生成 GeoHash
        </Button>
        <span className="ml-4 text-red-600 text-success">{mapHash}</span>
      </div>
      <div>
        <Button onClick={() => handleCenterGeoHash()} className="mt-2">
          根据中心点生成 GeoHash
        </Button>
        <span className="ml-4 text-red-600 text-success">{centerHash}</span>
      </div>
      <div>
        <Button onClick={() => getCenterPosition()} className="mt-2">
          获取中心点坐标
        </Button>
        <span className="ml-4 text-orange-500 text-success">
          {centerPosition}
        </span>
      </div>
    </ProCard>
  );
}
