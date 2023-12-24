import { ProCard } from '@ant-design/pro-components';
import { useMount } from 'ahooks';
import { Cartesian3, Math, Terrain, Viewer } from 'cesium';

export default function Cesium() {
  useMount(() => {
    const viewer = new Viewer('cesiumContainer', {
      terrain: Terrain.fromWorldTerrain(),
    });
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(-122.4175, 37.655, 400),
      orientation: {
        heading: Math.toRadians(0.0),
        pitch: Math.toRadians(-15.0),
      },
    });
  });

  return (
    <ProCard>
      <div id="cesiumContainer" />
    </ProCard>
  );
}
