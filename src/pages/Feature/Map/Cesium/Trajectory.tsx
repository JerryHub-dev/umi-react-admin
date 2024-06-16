import { ProCard } from '@ant-design/pro-components';
import { Alert, Button } from 'antd';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import React, { useEffect, useState } from 'react';

const Trajectory: React.FC = () => {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN as string;
  const [viewer, setViewer] = useState(null as any);

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

    setViewer(viewer);

    // 销毁
    return () => {
      viewer.destroy();
    };
  }, []);

  // NOTE 绘制开始
  const [drawing, setDrawing] = useState(false); // 是否绘制中
  const [positions, setPositions] = useState([] as any); // 绘制的点
  //   Cesiumjs 在umijs 中如何绘制多线段?
  // 1, 点击按钮开始绘制多线段
  // 2, 点击地图后, 在点击处绘制圆形的形状
  // 3, 完成第二步后, 上一个点和鼠标移动改为虚线
  // 4, 点击第二个点后, 使用实线连接上一个点和当前点
  const handlerDraw = () => {
    // 1, 点击按钮开始绘制
    setDrawing(true);
    viewer.cesiumWidget._element.style.cursor = 'crosshair'; // 鼠标样式为十字

    // 2, 点击地图后, 在点击处绘制圆形的形状, 并且在地图上显示坐标
    let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas); // 鼠标事件处理器
    handler.setInputAction((movement: any) => {
      let cartesian = viewer.camera.pickEllipsoid(
        movement.position,
        viewer.scene.globe.ellipsoid,
      ); // 获取鼠标位置的笛卡尔坐标
      if (cartesian) {
        let cartographic = Cesium.Cartographic.fromCartesian(cartesian); // 笛卡尔坐标转经纬度
        let longitudeString = Cesium.Math.toDegrees(
          cartographic.longitude,
        ).toFixed(2); // 经度
        let latitudeString = Cesium.Math.toDegrees(
          cartographic.latitude,
        ).toFixed(2); // 纬度
        let heightString = cartographic.height.toFixed(2); // 高度
        console.log(
          '经度: ',
          longitudeString,
          '纬度: ',
          latitudeString,
          '高度: ',
          heightString,
        );

        // 绘制圆形
        viewer.entities.add({
          position: cartesian,
          ellipse: {
            semiMinorAxis: 30000.0,
            semiMajorAxis: 30000.0,
            material: new Cesium.Color(1.0, 1.0, 1.0, 0.5),
          },
        });

        // 连接上一个点和当前点
        if (positions.length >= 1) {
          let lastCartesian = positions[positions.length - 1]; // 上一个点
          // let polyline = viewer.entities.add({
          //   polyline: {
          //     positions: [lastCartesian, cartesian],
          //     width: 2,
          //     material: new Cesium.PolylineDashMaterialProperty({
          //       color: Cesium.Color.YELLOW,
          //     }),
          //   },
          // });
          // 绘制实线
          viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                // 实时更新
                return [lastCartesian, cartesian]; // 返回两个点
              }, false), // false 表示不更新
              width: 2, // 线宽
              // material: new Cesium.PolylineDashMaterialProperty({ // 虚线材质
              //   color: Cesium.Color.YELLOW,
              // }),
              material: Cesium.Color.YELLOW, // 实线材质
            },
          });
        }

        // 5, 存储点的数组
        positions.push(cartesian);
        setPositions(positions);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  };

  // NOTE 绘制完成回调
  const handlerDrawOk = () => {
    setDrawing(false);
    viewer.cesiumWidget._element.style.cursor = 'default'; // 鼠标样式为默认
    console.log('positions: ', positions);
    // 更改 positions 为经纬度
    let positionsGeo = positions.map((position) => {
      let cartographic = Cesium.Cartographic.fromCartesian(position);
      let longitudeString = Cesium.Math.toDegrees(
        cartographic.longitude,
      ).toFixed(2); // 经度
      let latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(
        2,
      ); // 纬度
      let heightString = cartographic.height.toFixed(2); // 高度
      return {
        longitude: longitudeString,
        latitude: latitudeString,
        height: heightString,
      };
    });
    console.log('positionsGeo: ', positionsGeo);
    // 清空绘制的点
    setPositions([]);
  };

  return (
    <>
      <Alert className="mb-2" message="轨迹" type="success" />
      <ProCard>
        <div id="cesiumContainer" className="static" />
        <div className="absolute top-8 left-8">
          {drawing ? (
            <Button
              id="startDrawing"
              className="text-cyan-50 hover:text-gray-900"
              onClick={() => handlerDrawOk()}
            >
              绘制完成
            </Button>
          ) : (
            <Button
              id="startDrawing"
              className="text-cyan-50 hover:text-gray-900"
              onClick={() => handlerDraw()}
            >
              开始绘制
            </Button>
          )}
          {/* <Button
            id="startDrawing"
            className="text-cyan-50 hover:text-gray-900"
            onClick={() => handlerTrigger()}
          >
            {drawing ? '绘制完成' : '开始绘制'}
          </Button> */}
        </div>
      </ProCard>
    </>
  );
};

export default Trajectory;
