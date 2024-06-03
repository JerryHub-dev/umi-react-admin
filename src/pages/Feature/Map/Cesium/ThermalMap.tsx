import thermal from '@/utils/MapCompute/ThermalMapData.json';
import { iconData } from '@/utils/MapCompute/dataEnd';
import { ProCard } from '@ant-design/pro-components';
import { Alert, Button, Modal, message } from 'antd';
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

  // NOTE 鼠标事件
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [positionInfo, setPositionInfo] = useState({} as any);
  const handleMouse = () => {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    // 鼠标点击事件
    handler.setInputAction((movement) => {
      // 点击图标时触发
      let pickedObject = viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject)) {
        // 1, 显示弹窗 (显示位置)
        let position = {
          x: movement.position.x,
          y: movement.position.y,
        };
        // 获取当前图标的经纬度信息
        let pickedPosition = pickedObject.id.position;
        let cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(
          pickedPosition._value,
        );
        let lng = Cesium.Math.toDegrees(cartographic.longitude);
        let lat = Cesium.Math.toDegrees(cartographic.latitude);
        console.log(lng, lat);
        setPositionInfo(position);
        setIsModalOpen(true);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  };

  // NOTE 添加图标
  const handleIcon = () => {
    iconData.forEach((item) => {
      let entity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude),
        id: item.id,
        billboard: {
          image: require('@/assets/Detection.png'),
          width: 40,
          height: 40,
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
          pixelOffset: new Cesium.Cartesian2(0, 35), // 偏移量
        },
      });
      // 额外参数
      entity.properties = {};
    });
  };

  useEffect(() => {
    if (!viewer) return;
    handleMouse();
    handleIcon();
  }, [viewer]);

  // NOTE 渲染热力图
  const handleClick = () => {
    setIsModalOpen(false);
    let obj = JSON.parse(JSON.stringify(thermal));
    console.log(obj);
    console.log(obj.coverageData.arrayResult);
    let longitude = 105.658203125;
    let latitude = 40.658203125;

    let base64Image = 'data:image/png;base64,' + obj.diagramPngStream; // base64 图片数据

    // 将 Base64 数据转换为 Blob 对象
    function base64ToBlob(base64, mime) {
      // eslint-disable-next-line no-param-reassign
      mime = mime || ''; // 如果 mime 类型为空，默认为 image/png
      let sliceSize = 1024; // 以 1024 字节为一个单位
      let byteChars = atob(base64.split(',')[1]); // base64 数据
      let byteArrays = []; // 存储生成的 Blob 对象

      // 将 base64 数据转换为二进制数据
      for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
        let slice = byteChars.slice(offset, offset + sliceSize); // 从 base64 数据中截取一部分
        let byteNumbers = new Array(slice.length); // 存储转换后的二进制数据

        // 将 base64 数据转换为二进制数据
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i); // 获取每个字符的 Unicode 编码
        }
        let byteArray = new Uint8Array(byteNumbers); // 转换为二进制数据
        byteArrays.push(byteArray); // 存储二进制数据
      }

      return new Blob(byteArrays, { type: mime }); // 生成 Blob 对象
    }

    // 创建一个 Blob URL
    let blob = base64ToBlob(base64Image, 'image/png');
    let url = URL.createObjectURL(blob); // 生成一个临时的 URL

    // 创建一个 HTMLImageElement
    let img = new Image(); // 创建一个图像对象
    img.src = url; // 设置图像的 URL

    // 图像加载完成后的回调函数
    img.onload = function () {
      // 当图像加载完成后，将其应用为纹理
      let entity = viewer.entities.add({
        name: 'Heatmap', // 实体的名称
        rectangle: {
          // coordinates: Cesium.Rectangle.fromDegrees(-100.0, 20.0, -90.0, 30.0), // 矩形的坐标
          coordinates: Cesium.Rectangle.fromDegrees(
            longitude - 0.1,
            latitude - 0.1,
            longitude + 0.1,
            latitude + 0.1,
          ),
          material: new Cesium.ImageMaterialProperty({
            image: img, // 图像对象
            transparent: true, // 是否透明
          }),
        },
      });
      // 调整视角以查看热力图
      viewer.zoomTo(entity);
    };

    // 该示例报错: net::ERR_CONNECTION_RESET 431 (Request Header Fields Too Large)
    // note: 出现这个错误的原因是 base64 数据太大，导致 HTTP 请求头字段太大。为了避免这个问题，可以将 base64 数据转换为 Blob 对象，并通过 URL.createObjectURL 创建一个临时的 URL 来加载图像。
    // // 创建一个 HTMLImageElement
    // let img = new Image();
    // img.src = base64Image;
    // img.onload = function() {
    //     // 当图像加载完成后，将其应用为纹理
    //     let entity = viewer.entities.add({
    //         name: 'Heatmap',
    //         rectangle: {
    //             coordinates: Cesium.Rectangle.fromDegrees(-100.0, 20.0, -90.0, 30.0),
    //             material: new Cesium.ImageMaterialProperty({
    //                 image: img,
    //                 transparent: true
    //             })
    //         }
    //     });
    //     // 调整视角以查看热力图
    //     viewer.zoomTo(entity);
    // };

    // // 1, 创建热力图 Canvas
    // let canvas = document.createElement('canvas');
    // canvas.width = 1000;
    // canvas.height = 1000;
    // let ctx = canvas.getContext('2d');
    // ctx.fillStyle = '#fff';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // // 2, 绘制热力图
    // let gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    // gradient.addColorStop(0, '#fff');
    // gradient.addColorStop(1, '#000');
    // ctx.fillStyle = gradient;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // // 3, 绘制热力图数据
    // for (let i = 0; i < obj.coverageData.arrayResult.length; i++) {
    //   let data = obj.coverageData.arrayResult[i];
    //   ctx.fillStyle = 'rgba(' + data.color + ', ' + data.leveldBm + ')';
    //   ctx.fillRect(
    //     (data.longitude * canvas.width) / 360,
    //     (data.latitude * canvas.height) / 180,
    //     1,
    //     1,
    //   );
    // }

    // // 4, 将 Canvas 转换为 Base64 数据
    // let dataURL = canvas.toDataURL('image/png');

    // // 5, 将 Base64 数据传递给 Cesium 中 addImageryProvider 方法 error TypeError: Cannot read properties of undefined (reading 'tileXYToRectangle')
    // viewer.imageryLayers.addImageryProvider({
    //   url: dataURL,
    //   maximumLevel: 10,
    //   credit: '',
    //   rectangle: new Cesium.Rectangle(
    //     -180,
    //     -90,
    //     180,
    //     90,
    //     Cesium.Ellipsoid.WGS84,
    //   ),
    // });
  };

  // NOTE 渲染热力图2
  const handleClick2 = () => {
    let obj = JSON.parse(JSON.stringify(thermal));
    console.log(obj);
    console.log(obj.coverageData.arrayResult);

    let thermalData = obj.coverageData.arrayResult;
    // 创建热力图图层
    let heatMapLayer = new Cesium.PrimitiveCollection(); // 创建一个图元集合
    viewer.scene.primitives.add(heatMapLayer); // 添加到场景中

    // 循环遍历热力图数据并创建热力图要素
    for (let i = 0; i < thermalData.length; i++) {
      let heatMapData = thermalData[i]; // 获取热力图数据
      let heatMapPositions = []; // 存储热力图数据的位置
      let heatMapValues = []; // 存储热力图数据的值

      // 遍历热力图数据
      for (let j = 0; j < heatMapData.length; j++) {
        let dataPoint = heatMapData[j]; // 获取热力图数据点
        // 创建热力图数据点的位置
        let position = Cesium.Cartesian3.fromDegrees(
          dataPoint.longitude,
          dataPoint.latitude,
        );
        heatMapPositions.push(position); // 添加到位置数组中
        heatMapValues.push(dataPoint.fieldStrength); // 添加到值数组中
      }

      // 创建热力图要素
      let heatMapPrimitive = new Cesium.Primitive({
        // 创建矩形几何实例
        geometryInstances: new Cesium.GeometryInstance({
          // 创建矩形几何实例
          geometry: new Cesium.RectangleGeometry({
            rectangle: Cesium.Rectangle.fromCartesianArray(heatMapPositions), // 矩形的位置
            vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT, // 顶点格式
          }),
          id: 'heatMapPrimitive_' + i, // 实例的 ID
          // 创建矩形几何实例的属性
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              new Cesium.Color(1.0, 0.0, 0.0, 0.5), // 矩形的颜色
            ),
          },
        }),
        // 创建矩形几何实例的外观
        appearance: new Cesium.PerInstanceColorAppearance({
          flat: true, // 是否平整化
          translucent: true, // 是否半透明
        }),
      });

      // 添加热力图要素到图层
      heatMapLayer.add(heatMapPrimitive);
    }
  };

  //

  return (
    <>
      <Alert message="热力图" type="success" showIcon className="mb-2" />
      <ProCard>
        {contextHolder}
        <Button className="mb-2" onClick={() => handleClick()}>
          渲染热力图数据 base64
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleClick2()}>
          渲染热力图数据 result
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleIcon()}>
          icon
        </Button>
        <div id="cesiumContainer" style={{ width: '100%', height: '100vh' }} />
        {/* <div id="cesiumContainer" /> */}
        <Modal
          title=""
          open={isModalOpen}
          style={{ top: positionInfo.y + 100, left: positionInfo.x - 300 }}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={300}
        >
          <Button onClick={() => handleClick()}>渲染热力图数据</Button>
        </Modal>
      </ProCard>
    </>
  );
};

export default ThermalMap;
