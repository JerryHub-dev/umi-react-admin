import { getEntitiesInRectangle } from '@/utils/MapCompute/cesiumCompute.ts';
import { iconData } from '@/utils/MapCompute/dataEnd';
import { GatewayOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Button, message } from 'antd';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useEffect, useRef, useState } from 'react';

const Unit = () => {
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN as string;
  const [messageApi, contextHolder] = message.useMessage();
  const [viewer, setViewer] = useState(null as any);
  const viewerRef = useRef(viewer);

  // NOTE 添加图标
  const handleIcon = (viewer: any) => {
    iconData.forEach((item) => {
      let entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude),
        id: item.id,
        billboard: {
          image: require('@/assets/Detection.png'),
          // width: 40,
          // height: 40,
          scale: 0.3,
        },
        label: {
          text: item.label, // 文本内容
          font: '14px sans-serif', // 字体大小
          backgroundColor: Cesium.Color.fromCssColorString('#0094ff'), // 背景颜色
          showBackground: true, // 是否显示背景
          style: Cesium.LabelStyle.FILL_AND_OUTLINE, // 样式
          fillColor: Cesium.Color.WHITE, // 填充颜色
          outlineColor: Cesium.Color.BLACK, // 边框颜色
          outlineWidth: 2, // 边框宽度
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER, // 水平对齐方式
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 垂直对齐方式
          pixelOffset: new Cesium.Cartesian2(0, 55), // 偏移量
          pixelOffsetScaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.5, 8.0e6, 0.5), // 偏移量随距离变化
        },
      });
      // 额外参数
      entity.properties = {
        text: item.label,
      };
    });
  };

  // NOTE 初始化 Cesium
  useEffect(() => {
    // 创建一个 Cesium Viewer 实例
    const viewer = new Cesium.Viewer('cesiumContainer', {
      // 去除所有的控件
      animation: false, // 是否显示动画控件
      baseLayerPicker: false, // 是否显示图层选择控件
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
      sceneMode: Cesium.SceneMode.SCENE2D, // 2D 模式
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
    viewerRef.current = viewer;

    setTimeout(() => {
      handleIcon(viewer);
    }, 100);

    // 销毁 Cesium
    return () => {
      viewer.destroy();
    };
  }, []);

  // NOTE ref
  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);

  // NOTE 绘制矩形区域
  const handlerRef = useRef() as any;
  const FnSquareRegion = () => {
    viewer.cesiumWidget._element.style.cursor = 'crosshair'; // 光标变为十字
    let drawingMode = false;
    let firstPoint: any; // 第一个点
    let rectangleEntity: any; // 矩形实体
    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    let lastUpdate = Date.now();
    const updateInterval = 100; // 更新间隔（毫秒）

    // 监听点击事件以绘制正方形
    handlerRef.current.setInputAction((click: any) => {
      // 获取点击位置的经纬度坐标
      const earthPosition = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
      if (!earthPosition) return;

      if (!drawingMode) {
        // 开始绘制
        drawingMode = true;
        // 记录第一个点
        firstPoint = Cesium.Cartographic.fromCartesian(earthPosition);

        // 创建矩形实体
        rectangleEntity = viewer.entities.add({
          rectangle: {
            coordinates: new Cesium.CallbackProperty(() => {
              if (firstPoint && drawingMode) {
                const rectangle = Cesium.Rectangle.fromCartographicArray([firstPoint, firstPoint]);
                return rectangle;
              }
            }, false), // 计算属性
            material: Cesium.Color.YELLOW.withAlpha(0.2), // 材质
            outline: true, // 是否显示轮廓
            outlineColor: Cesium.Color.YELLOW, // 轮廓颜色
            outlineWidth: 2, // 轮廓宽度
            height: 0, // 高度
          },
        });
      } else {
        // 结束绘制
        viewer.cesiumWidget._element.style.cursor = ''; // 光标恢复
        drawingMode = false;
        // 计算第二个点
        rectangleEntity.rectangle.coordinates = Cesium.Rectangle.fromCartographicArray([
          firstPoint,
          Cesium.Cartographic.fromCartesian(earthPosition),
        ]);
        rectangleEntity.rectangle.material = Cesium.Color.BLACK.withAlpha(0.2); // 黑色
        rectangleEntity.rectangle.outlineColor = Cesium.Color.BLACK; // 黑色

        // 获取矩形的坐标
        const rectangle = rectangleEntity.rectangle.coordinates.getValue(); // 获取矩形坐标
        const west = Cesium.Math.toDegrees(rectangle.west); // 转换为经度
        const south = Cesium.Math.toDegrees(rectangle.south); // 转换为纬度
        const east = Cesium.Math.toDegrees(rectangle.east); // 转换为经度
        const north = Cesium.Math.toDegrees(rectangle.north); // 转换为纬度
        messageApi.success(`${west},${south},${east},${north}`);

        const entitiesInside = getEntitiesInRectangle(viewer, rectangle);
        console.log('矩形实体内的实体', entitiesInside);

        // 销毁事件
        handlerRef.current.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handlerRef.current.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 监听鼠标移动
    handlerRef.current.setInputAction((movement: any) => {
      // 如果正在绘制并且有第一个点，并且距离上次更新时间大于间隔时间，则更新
      if (drawingMode && firstPoint && Date.now() - lastUpdate > updateInterval) {
        lastUpdate = Date.now(); // 更新时间
        const endPosition = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid); // 获取鼠标位置的笛卡尔坐标
        if (!endPosition) return;

        const endPoint = Cesium.Cartographic.fromCartesian(endPosition); // 转换为经纬度坐标
        rectangleEntity.rectangle.coordinates = Cesium.Rectangle.fromCartographicArray([firstPoint, endPoint]); // 更新矩形坐标
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  };

  return (
    <>
      {contextHolder}
      <ProCard>
        {/* <div id="cesiumContainer" className="relative" style={{ width: '100%', height: '100vh' }} /> */}
        <div id="cesiumContainer" className="relative" />
        <div className="absolute z-10 flex flex-col items-center justify-center rounded-full top-16 right-8">
          <Button className="w-8 h-8 p-0" onClick={() => FnSquareRegion()}>
            <GatewayOutlined className="text-lg text-center align-middle text-sky-400 hover:text-sky-400 " />
          </Button>
          {/* <Button className="w-8 h-8 p-0 m-2" onClick={() => {}}>
            <GatewayOutlined className="text-lg text-center align-middle text-sky-400 hover:text-sky-400 " />
          </Button> */}
        </div>
      </ProCard>
    </>
  );
};

export default Unit;
