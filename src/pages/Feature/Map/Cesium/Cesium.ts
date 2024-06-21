import * as Cesium from 'cesium';

// NOTE: 这里的 CesiumMap 类是对 Cesium.Viewer 的封装，方便使用
class CesiumMap {
  private viewer: Cesium.Viewer; // Cesium.Viewer 实例
  private cesiumContainer: string; // 容器 ID

  // 构造函数
  constructor(cesiumContainer: string) {
    this.cesiumContainer = cesiumContainer;
    this.viewer = this.initViewer();
  }

  // 初始化 Viewer
  private initViewer() {
    Cesium.Ion.defaultAccessToken = process.env.CESIUM_ION_TOKEN as string;
    return new Cesium.Viewer(this.cesiumContainer, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: true,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      shouldAnimate: true,
      skyAtmosphere: false,
      skyBox: false,
      vrButton: false,
    });
  }

  // 获取 Viewer 实例
  public getViewer() {
    return this.viewer;
  }

  // 销毁 Viewer
  public destroy() {
    this.viewer.destroy();
  }
}

export default CesiumMap;
