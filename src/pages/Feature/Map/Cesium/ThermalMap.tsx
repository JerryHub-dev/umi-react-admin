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
  const [data, setData] = useState([] as any);
  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN as string;

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

    let obj = JSON.parse(JSON.stringify(thermal));
    let arrayResult = obj.coverageData.arrayResult;
    setData(arrayResult);

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

    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      handleIcon(viewer);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      handleMouse(viewer);
    }, 100);

    // 销毁
    return () => {
      viewer.destroy();
    };
  }, []);

  // NOTE 鼠标事件
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [positionInfo, setPositionInfo] = useState({} as any);
  const handleMouse = (viewer) => {
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
        if (!pickedObject.id || !pickedObject.id.label) {
          return;
        }
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

    let currentEntity = null;
    // 监听鼠标移入事件
    handler.setInputAction(function (movement) {
      let pickedObject = viewer.scene.pick(movement.endPosition);
      if (
        Cesium.defined(pickedObject) &&
        pickedObject.id &&
        pickedObject.id.label
      ) {
        pickedObject.id.label.text =
          '更新后的标签' + pickedObject.id.properties.text._value;
        currentEntity = pickedObject.id;
      }

      if (!Cesium.defined(pickedObject) || !pickedObject.id) {
        if (currentEntity) {
          currentEntity.label.text = currentEntity.properties.text._value;
          currentEntity = null;
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  };

  // NOTE 添加图标
  const handleIcon = (viewer) => {
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
          pixelOffsetScaleByDistance: new Cesium.NearFarScalar(
            1.5e2,
            1.5,
            8.0e6,
            0.5,
          ), // 偏移量随距离变化
        },
      });
      // 额外参数
      entity.properties = {
        text: item.label,
      };
    });
  };

  // NOTE 渲染热力图 (base64 图片数据)
  const handleClick = () => {
    setIsModalOpen(false);
    let obj = JSON.parse(JSON.stringify(thermal));
    console.log(obj);
    console.log(obj.coverageData.arrayResult);
    // let longitude = 105.658203125;
    // let latitude = 40.658203125;
    let longitude = 106.65;
    let latitude = 29.69;

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
          // coordinates: Cesium.Rectangle.fromDegrees(
          //   longitude - 0.1,
          //   latitude - 0.1,
          //   longitude + 0.1,
          //   latitude + 0.1,
          // ),
          coordinates: Cesium.Rectangle.fromDegrees(
            longitude - 0.1,
            latitude - 0.1,
            longitude + 0.3,
            latitude + 0.3,
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
  };

  // NOTE 渲染热力图 (点云效果)
  const handleClick2 = () => {
    const dataPoints = data.flat();

    function getColorForStrength(value) {
      if (value <= 25) return Cesium.Color.BLUE.withAlpha(0.5); // 蓝色
      if (value <= 40) return Cesium.Color.GREEN.withAlpha(0.5); // 绿色
      if (value <= 75) return Cesium.Color.YELLOW.withAlpha(0.5); // 黄色
      if (value <= 100) return Cesium.Color.RED.withAlpha(0.5); // 红色
      return Cesium.Color.RED.withAlpha(0.5);
    }

    dataPoints.forEach((point) => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          point.longitude,
          point.latitude,
        ),
        point: {
          pixelSize: 10,
          color: getColorForStrength(point.fieldStrength),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
    });

    viewer.zoomTo(viewer.entities);
  };

  // NOTE 绘制底部点
  const handlerBottomPoint = (dataPoints) => {
    // 第一个点和最后一个点存储
    let topPoint = [];
    let bottomPoint = [];
    dataPoints.forEach((item) => {
      let positions = [];
      // 每次
      item.forEach((point) => {
        let cartesian = Cesium.Cartesian3.fromDegrees(
          point.longitude,
          point.latitude,
        ); // 经纬度转笛卡尔坐标
        positions.push(cartesian);
      });
      topPoint.push(positions[0]);
      bottomPoint.push(positions[positions.length - 1]);

      // // 连接线
      // if (positions.length > 1) {
      //   viewer.entities.add({
      //     polyline: {
      //       positions: positions,
      //       width: 2,
      //       material: Cesium.Color.RED,
      //     },
      //   });
      // }
    });

    // 连接 bottomPoint 中的每个点
    if (bottomPoint.length > 1) {
      viewer.entities.add({
        polyline: {
          positions: bottomPoint,
          width: 2,
          material: Cesium.Color.RED,
        },
      });
    }
  };

  // NOTE 渲染热力图3
  const handleClick3 = () => {
    // 热力图要绘制的区域的经纬度范围
    // let longitude = 106.65;
    // let latitude = 29.69;

    let dataPoints = data.flat();
    // let dataPoints = data;
    handlerBottomPoint(dataPoints); // 绘制底部点

    // 创建一个 Canvas 元素
    // let canvas = document.createElement('canvas');
    // // canvas.width = window.innerWidth; // 设置 Canvas 元素的宽度为浏览器窗口的宽度
    // // canvas.height = window.innerHeight; // 设置 Canvas 元素的高度为浏览器窗口的高度

    // // 画布宽度设置为 cesium 容器的宽度
    // canvas.width = viewer.canvas.width;
    // canvas.height = viewer.canvas.height;
    // let context = canvas.getContext('2d');

    // // 使用透明度为 0.1 的白色填充整个 Canvas 元素
    // context.fillStyle = 'rgba(255, 255, 255, 0.5)';

    // // context.fillRect(0, 0, canvas.width, canvas.height); // 填充整个 Canvas 元素
    // context.clearRect(0, 0, canvas.width, canvas.height); // 清除整个 Canvas 元素

    // // 绘制热力图
    // dataPoints.forEach((point) => {
    //   const x = (point.longitude + 180) * (canvas.width / 360);
    //   const y = (90 - point.latitude) * (canvas.height / 180);

    //   // let x = point.longitude * 20037508.34 / 180;
    //   // let R = Math.log(Math.tan((90 + point.latitude) * Math.PI / 360)) / (Math.PI / 180);
    //   // let y = R * 20037508.34 / 180;

    //   // 绘制多种颜色, 根据强度值来决定颜色
    //   if (point.fieldStrength <= 25) {
    //     context.fillStyle = 'rgba(0, 0, 255, 0.1)'; // 蓝色
    //   } else if (point.fieldStrength <= 40) {
    //     context.fillStyle = 'rgba(0, 255, 0, 0.1)'; // 绿色
    //   } else if (point.fieldStrength <= 75) {
    //     context.fillStyle = 'rgba(255, 255, 0, 0.1)'; // 黄色
    //   } else if (point.fieldStrength <= 100) {
    //     context.fillStyle = 'rgba(255, 0, 255, 0.1)'; // 红色
    //   } else {
    //     context.fillStyle = 'rgba(0, 0, 255, 0.1)'; // 蓝色
    //     // context.fillStyle = 'rgba(255, 0, 255, 0.1)'; // 红色
    //   }

    //   // x, y 为矩形的左上角坐标 (x, y), 10, 10 为矩形的宽度和高度
    //   // context.fillRect(x, y, 0.5, 0.5); // 绘制一个矩形

    //   context.fillRect(x, y, 0.5, 0.5);

    //   // 绘制一个矩形
    //   // context.fillStyle = 'rgba(255, 0, 255, 0.1)';
    //   // context.fillRect(800, 800, 200, 100);
    // });

    // // 将 Canvas 元素转换为 Base64 数据
    // let base64Image = canvas.toDataURL('image/png');
    // console.log(base64Image); // base64 图片数据

    // // 将 Base64 数据转换为 Blob 对象
    // function base64ToBlob(base64, mime) {
    //   // eslint-disable-next-line no-param-reassign
    //   mime = mime || ''; // 如果 mime 类型为空，默认为 image/png
    //   let sliceSize = 1024; // 以 1024 字节为一个单位
    //   let byteChars = atob(base64.split(',')[1]); // base64 数据
    //   let byteArrays = []; // 存储生成的 Blob 对象

    //   // 将 base64 数据转换为二进制数据
    //   for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
    //     let slice = byteChars.slice(offset, offset + sliceSize); // 从 base64 数据中截取一部分
    //     let byteNumbers = new Array(slice.length); // 存储转换后的二进制数据

    //     // 将 base64 数据转换为二进制数据
    //     for (let i = 0; i < slice.length; i++) {
    //       byteNumbers[i] = slice.charCodeAt(i); // 获取每个字符的 Unicode 编码
    //     }
    //     let byteArray = new Uint8Array(byteNumbers); // 转换为二进制数据
    //     byteArrays.push(byteArray); // 存储二进制数据
    //   }

    //   return new Blob(byteArrays, { type: mime }); // 生成 Blob 对象
    // }

    // // 将 Base64 数据转换为 Blob 对象
    // // let blob = base64ToBlob(base64Image, 'image/png');
    // let blob = base64ToBlob(base64Image, 'image/png');
    // let url = URL.createObjectURL(blob); // 生成一个临时的 URL

    // // 创建一个 HTMLImageElement
    // let img = new Image(); // 创建一个图像对象
    // img.src = url; // 设置图像的 URL

    // // 图像加载完成后的回调函数
    // img.onload = function () {
    //   // 当图像加载完成后，将其应用为纹理
    //   let entity = viewer.entities.add({
    //     name: 'Heatmap', // 实体的名称
    //     rectangle: {
    //       // coordinates: Cesium.Rectangle.fromDegrees(-100.0, 20.0, -90.0, 30.0), // 矩形的坐标
    //       coordinates: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
    //       // coordinates: Cesium.Rectangle.fromDegrees(
    //       //   longitude - 0.1,
    //       //   latitude - 0.1,
    //       //   longitude + 0.3,
    //       //   latitude + 0.3,
    //       // ),
    //       material: new Cesium.ImageMaterialProperty({
    //         image: img, // 图像对象
    //         transparent: true, // 是否透明
    //       }),
    //     },
    //   });
    //   // 调整视角以查看热力图
    //   viewer.zoomTo(entity);
    // };
  };

  // NOTE 清楚所有地图数据
  const handleClear = () => {
    viewer.dataSources.removeAll();
    viewer.entities.removeAll();
  };

  return (
    <>
      <Alert message="热力图" type="success" showIcon className="mb-2" />
      <ProCard>
        {contextHolder}
        <Button className="mb-2" onClick={() => handleClick()}>
          渲染热力图数据 base64
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleClick2()}>
          渲染点云效果
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleClick3()}>
          渲染热力图数据2
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleClear()}>
          清除地图数据
        </Button>
        {/* <div id="cesiumContainer" style={{ width: '100%', height: '100vh' }} /> */}
        <div id="cesiumContainer" />
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
