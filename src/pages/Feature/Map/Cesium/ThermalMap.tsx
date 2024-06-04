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
  const handleIcon = (viewer) => {
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
  };

  // NOTE 渲染热力图2
  const handleClick2 = () => {
    let obj = JSON.parse(JSON.stringify(thermal));
    console.log(obj);
    console.log(obj.coverageData.arrayResult);

    const data = obj.coverageData.arrayResult;

    // 创建一个空的CustomDataSource
    const customDataSource = new Cesium.CustomDataSource('heatmap');

    // 将数据添加到CustomDataSource中
    data.forEach((arr) => {
      arr.forEach((point) => {
        customDataSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            point.longitude,
            point.latitude,
          ),
          point: {
            pixelSize: 10,
            color: Cesium.Color.RED.withAlpha(point.fieldStrength / 100), // 根据磁场强度设置透明度
          },
        });
      });
    });

    // 添加CustomDataSource到viewer
    viewer.dataSources.add(customDataSource);

    // 缩放到热力图区域
    viewer.zoomTo(customDataSource);

    // 创建热力图的shader
    const heatmapShader = `
      czm_material czm_getMaterial(czm_materialInput materialInput)
      {
          // 计算颜色和透明度
          czm_material material = czm_getDefaultMaterial(materialInput);
          float intensity = materialInput.strength;
          material.diffuse = vec3(intensity, 0.0, 0.0);
          material.alpha = intensity;
          return material;
      }
    `;

    // 创建热力图材质
    const heatmapMaterial = new Cesium.Material({
      fabric: {
        type: 'Heatmap',
        uniforms: {
          color: new Cesium.Color(1.0, 0.0, 0.0, 0.5),
        },
        source: heatmapShader,
      },
    });

    // 将材质应用于每个点
    customDataSource.entities.values.forEach((entity) => {
      entity.point.material = heatmapMaterial;
    });
  };

  // NOTE 渲染热力图4
  const handleClick3 = () => {
    let obj = JSON.parse(JSON.stringify(thermal));
    let arrayResult = obj.coverageData.arrayResult.flat();
    console.log(arrayResult);

    const data = arrayResult;
    console.log(data);
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
          渲染热力图数据 data
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleClick3()}>
          渲染热力图数据 data3
        </Button>
        <Button className="mb-2 ml-2" onClick={() => handleClear()}>
          清除地图数据
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
