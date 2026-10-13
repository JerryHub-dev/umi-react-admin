import { readBuildGlobal } from '@/utils/buildGlobals';
import { Navigate } from '@umijs/max';

/**
 * /map 的默认入口：配置了高德 Key 才默认进高德；未配置时默认进入无需凭据的 OpenLayers
 * （审查整改：未配置 Key 时高德首屏是大块空白错误，不应作为默认地图）。高德页仍可从菜单进入。
 * AMAP_KEY 经 config.ts define 注入（构建期常量）。
 */
const MapRedirect = () => <Navigate replace to={readBuildGlobal('AMAP_KEY') ? '/map/amap' : '/map/openlayers'} />;

export default MapRedirect;
