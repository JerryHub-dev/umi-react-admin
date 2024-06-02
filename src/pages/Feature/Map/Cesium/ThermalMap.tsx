import thermal from '@/utils/MapCompute/ThermalMapData.json';
import { ProCard } from '@ant-design/pro-components';
import { Alert, Button, message } from 'antd';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useEffect, useState } from 'react';

const ThermalMap = () => {
  const [viewer, setViewer] = useState(null as any);
  const [messageApi, contextHolder] = message.useMessage();

  Cesium.Ion.defaultAccessToken = process.env.CESIUM_ION_TOKEN as string;

  useEffect(() => {
    // 创建一个 Cesium Viewer 实例
    const viewer = new Cesium.Viewer('cesiumContainer', {
      // 去除所有的控件
      animation: false, // 是否显示动画控件
      // baseLayerPicker: false, // 是否显示图层选择控件
      // fullscreenButton: false, // 是否显示全屏按钮
      // geocoder: false, // 是否显示地名查找控件
      // homeButton: false, // 是否显示Home按钮
      infoBox: false, // 是否显示信息框
      sceneModePicker: true, // 是否显示3D/2D选择器
      selectionIndicator: false, // 是否显示选取指示器组件
      timeline: false, // 是否显示时间轴
      navigationHelpButton: false, // 是否显示帮助信息按钮
      navigationInstructionsInitiallyVisible: false, // 是否显示导航指示
      // scene3DOnly: true, // 是否只显示3D
      shouldAnimate: true, // 是否显示动画
      skyAtmosphere: false, // 是否显示大气层
      skyBox: false, // 是否显示天空盒
      vrButton: false, // 是否显示VR按钮
    });

    // 1, 去除版权信息
    (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

    // 修改 homeButton 的位置
    let initView = {
      destination: Cesium.Cartesian3.fromDegrees(116.3974, 39.9093, 15000000),
    };
    // viewer.camera.setView(initView);
    viewer.camera.flyTo(initView);

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

  // NOTE 渲染热力图
  const handleClick = () => {
    console.log(viewer);
    let obj = JSON.parse(JSON.stringify(thermal));
    console.log(obj);
    console.log(obj.coverageData.arrayResult);
  };

  return (
    <>
      <Alert message="热力图" type="success" showIcon className="mb-2" />
      <ProCard>
        {contextHolder}
        <div id="cesiumContainer" style={{ width: '100%', height: '100vh' }} />
        <Button className="mt-2" onClick={() => handleClick()}>
          click
        </Button>
      </ProCard>
    </>
  );
};

export default ThermalMap;
