/* eslint-disable local/no-cjk-literal -- 省份名是簇标签数据（region 字段供统计分组），不是界面文案 */
/**
 * 合成监测站网（GeoHash 页的数据层）：34 个省级簇中心 + 人口权重，
 * 高斯散布生成数千站（确定性种子）。真实设备（服务端 240 站）仍是默认数据源，
 * 合成站网用于演示「规模」——让密度立方、精度切换在大数据量下依然成立。
 */

export interface SyntheticStation {
  lng: number;
  lat: number;
  region: string;
}

/** 省级簇中心（粗略地理，仅作散布锚点）与权重（站数占比） */
const CLUSTERS: { region: string; lng: number; lat: number; weight: number; spread: number }[] = [
  { region: '北京', lng: 116.4, lat: 39.9, weight: 6, spread: 0.55 },
  { region: '上海', lng: 121.47, lat: 31.23, weight: 6, spread: 0.5 },
  { region: '广东', lng: 113.27, lat: 23.13, weight: 8, spread: 1.3 },
  { region: '江苏', lng: 118.78, lat: 32.06, weight: 6, spread: 1.1 },
  { region: '浙江', lng: 120.16, lat: 30.29, weight: 5, spread: 1.0 },
  { region: '山东', lng: 117.0, lat: 36.67, weight: 5, spread: 1.1 },
  { region: '四川', lng: 104.07, lat: 30.67, weight: 5, spread: 1.4 },
  { region: '湖北', lng: 114.31, lat: 30.6, weight: 4, spread: 1.2 },
  { region: '河南', lng: 113.63, lat: 33.9, weight: 4, spread: 1.3 },
  { region: '福建', lng: 119.3, lat: 26.08, weight: 3.4, spread: 1.0 },
  { region: '湖南', lng: 112.94, lat: 28.23, weight: 3.6, spread: 1.2 },
  { region: '河北', lng: 114.51, lat: 38.04, weight: 3.6, spread: 1.3 },
  { region: '陕西', lng: 108.95, lat: 34.27, weight: 3, spread: 1.3 },
  { region: '安徽', lng: 117.28, lat: 31.86, weight: 3, spread: 1.1 },
  { region: '辽宁', lng: 123.43, lat: 41.8, weight: 2.8, spread: 1.2 },
  { region: '江西', lng: 115.89, lat: 28.68, weight: 2.6, spread: 1.1 },
  { region: '广西', lng: 108.32, lat: 22.82, weight: 2.6, spread: 1.2 },
  { region: '云南', lng: 102.83, lat: 24.88, weight: 2.4, spread: 1.4 },
  { region: '山西', lng: 112.55, lat: 37.87, weight: 2.2, spread: 1.1 },
  { region: '贵州', lng: 106.63, lat: 26.65, weight: 2, spread: 1.2 },
  { region: '重庆', lng: 106.55, lat: 29.56, weight: 2.4, spread: 0.9 },
  { region: '天津', lng: 117.2, lat: 39.13, weight: 2.2, spread: 0.45 },
  { region: '黑龙江', lng: 126.64, lat: 45.75, weight: 2, spread: 1.6 },
  { region: '吉林', lng: 125.32, lat: 43.9, weight: 1.8, spread: 1.3 },
  { region: '内蒙古', lng: 111.75, lat: 40.84, weight: 1.8, spread: 2.2 },
  { region: '甘肃', lng: 103.83, lat: 36.06, weight: 1.5, spread: 1.8 },
  { region: '新疆', lng: 87.62, lat: 43.79, weight: 1.4, spread: 2.6 },
  { region: '海南', lng: 110.35, lat: 20.02, weight: 1.2, spread: 0.7 },
  { region: '宁夏', lng: 106.23, lat: 38.49, weight: 0.9, spread: 0.9 },
  { region: '青海', lng: 101.78, lat: 36.62, weight: 0.7, spread: 1.8 },
  { region: '西藏', lng: 91.11, lat: 29.65, weight: 0.5, spread: 2.2 },
  { region: '香港', lng: 114.17, lat: 22.32, weight: 0.6, spread: 0.15 },
  { region: '澳门', lng: 113.55, lat: 22.2, weight: 0.3, spread: 0.1 },
  { region: '台湾', lng: 121.01, lat: 23.75, weight: 1.2, spread: 0.8 },
];

const mulberry32 = (initial: number) => {
  let seed = initial | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Box-Muller 高斯（0 均值单位方差，确定性 PRNG 驱动） */
const gaussian = (rand: () => number) => {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const clampChina = (lng: number, lat: number): [number, number] => [
  Math.min(135, Math.max(73, lng)),
  Math.min(54, Math.max(18, lat)),
];

/** 生成合成站网（默认 8000 站，簇内高斯散布，越界钳回国内范围） */
export const buildStationFleet = (count = 8000, seed = 20261018): SyntheticStation[] => {
  const rand = mulberry32(seed);
  const totalWeight = CLUSTERS.reduce((s, c) => s + c.weight, 0);
  const stations: SyntheticStation[] = [];
  const scatter = (cluster: (typeof CLUSTERS)[number]) => {
    const [lng, lat] = clampChina(
      cluster.lng + gaussian(rand) * cluster.spread * 0.45,
      cluster.lat + gaussian(rand) * cluster.spread * 0.38,
    );
    stations.push({ lng, lat, region: cluster.region });
  };
  CLUSTERS.forEach((cluster) => {
    const quota = Math.max(1, Math.round((cluster.weight / totalWeight) * count));
    for (let i = 0; i < quota && stations.length < count; i++) scatter(cluster);
  });
  // 配额四舍五入的缺口：按权重继续散布补齐到精确数量
  while (stations.length < count) {
    const r = rand() * totalWeight;
    let acc = 0;
    const cluster = CLUSTERS.find((c) => (acc += c.weight) >= r) ?? CLUSTERS[0];
    scatter(cluster);
  }
  return stations;
};
