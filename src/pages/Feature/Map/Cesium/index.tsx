import { ProCard } from '@ant-design/pro-components';
import { useMount } from 'ahooks';
import {
  Cartesian3,
  Math as CesiumMath,
  Ion,
  Terrain,
  Viewer,
  createOsmBuildingsAsync,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

export default function CesiumMap() {
  Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZjBmZTAzMS1jMTJkLTQ5OGQtYTkyYS0xODcyMjU3MTQzMmUiLCJpZCI6MTg2MDcxLCJpYXQiOjE3MDM0MDIwMzl9.DQzBf8T_0U92DwjBcYQqdgwhFs-Cx7EacplwoL_ypjY';

  useMount(async () => {
    const viewer = new Viewer('cesiumContainer', {
      terrain: Terrain.fromWorldTerrain(),
    });

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(-122.4175, 37.655, 400),
      orientation: {
        heading: CesiumMath.toRadians(0.0),
        pitch: CesiumMath.toRadians(-15.0),
      },
    });

    const buildingTileset = await createOsmBuildingsAsync();
    viewer.scene.primitives.add(buildingTileset);
  });

  return (
    <ProCard>
      <div id="cesiumContainer" />
    </ProCard>
  );
}
