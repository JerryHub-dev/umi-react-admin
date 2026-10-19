import * as Cesium from 'cesium';

/** 相机位姿：经纬高 + 可选姿态（度制 heading/pitch，直观好调） */
export interface CameraPose {
  lng: number;
  lat: number;
  height: number;
  heading?: number;
  pitch?: number;
  roll?: number;
  duration?: number;
}

const destinationOf = (pose: CameraPose) => Cesium.Cartesian3.fromDegrees(pose.lng, pose.lat, pose.height);
const orientationOf = (pose: CameraPose) => ({
  heading: Cesium.Math.toRadians(pose.heading ?? 0),
  pitch: Cesium.Math.toRadians(pose.pitch ?? -90),
  roll: Cesium.Math.toRadians(pose.roll ?? 0),
});

/**
 * 镜头导演：关键帧巡礼（入场动画/「导览」按钮重放）。flyTo 链式推进，
 * 返回 stop()——再次播放或用户手动操作前必须先 stop 上一场。
 * onDone 只在最后一个关键帧正常落位后调用：stop() 取消、用户拖动打断飞行
 * （flyTo 走 cancel 回调，complete 不触发）都不会调用它。
 */
export const playTour = (viewer: Cesium.Viewer, poses: CameraPose[], onDone?: () => void) => {
  let cancelled = false;
  let index = 0;
  const step = () => {
    if (index >= poses.length) {
      onDone?.();
      return;
    }
    const pose = poses[index];
    index += 1;
    viewer.camera.flyTo({
      destination: destinationOf(pose),
      orientation: orientationOf(pose),
      duration: pose.duration ?? 2.4,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        if (!cancelled) step();
      },
    });
  };
  step();
  return () => {
    cancelled = true;
    if (!viewer.isDestroyed()) viewer.camera.cancelFlight();
  };
};
