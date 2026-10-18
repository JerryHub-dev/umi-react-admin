import { CesiumStage, useCesiumViewer } from '@/components/CesiumViewer';
import { scanRingMaterial, targetIcon } from '@/components/CesiumViewer/effects';
import DemoPage from '@/components/DemoPage';
import { distanceKm } from '@/utils/MapCompute/geodesy';
import { PauseCircleOutlined, PlayCircleOutlined, UnlockOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Segmented, Select, Space, Switch, Typography } from 'antd';
import * as Cesium from 'cesium';
import CesiumNavigation from 'cesium-navigation-es6';
import { useEffect, useRef, useState } from 'react';

type Kind = 'ship' | 'aircraft';
type Target = { id: string; kind: Kind; knots: number; altitude: number; route: [number, number][] };

/** 关注海域（黄海南部—东海北部），目标与航线均为模拟数据 */
const AREA: [number, number][] = [
  [122.1, 36.6],
  [126.2, 36.3],
  [126.6, 30.4],
  [122.5, 29.9],
];

const TARGETS: Target[] = [
  {
    id: 'V-01',
    kind: 'ship',
    knots: 14,
    altitude: 0,
    route: [
      [122.6, 35.8],
      [123.8, 34.9],
      [124.6, 33.6],
      [125.2, 32.4],
    ],
  },
  {
    id: 'V-02',
    kind: 'ship',
    knots: 18,
    altitude: 0,
    route: [
      [125.8, 31.0],
      [124.9, 31.8],
      [123.6, 32.3],
      [122.8, 33.1],
    ],
  },
  {
    id: 'V-03',
    kind: 'ship',
    knots: 11,
    altitude: 0,
    route: [
      [123.2, 30.6],
      [123.9, 31.4],
      [124.3, 32.6],
      [124.1, 33.9],
    ],
  },
  {
    id: 'V-04',
    kind: 'ship',
    knots: 16,
    altitude: 0,
    route: [
      [125.6, 35.6],
      [124.8, 34.6],
      [124.9, 33.2],
      [125.7, 32.1],
    ],
  },
  {
    id: 'A-01',
    kind: 'aircraft',
    knots: 450,
    altitude: 9800,
    route: [
      [121.2, 31.2],
      [124.0, 33.0],
      [127.5, 35.2],
      [129.8, 37.0],
    ],
  },
  {
    id: 'A-02',
    kind: 'aircraft',
    knots: 420,
    altitude: 8900,
    route: [
      [128.5, 30.2],
      [125.5, 31.4],
      [122.6, 32.8],
      [120.4, 34.0],
    ],
  },
  {
    id: 'A-03',
    kind: 'aircraft',
    knots: 380,
    altitude: 7600,
    route: [
      [122.2, 37.4],
      [123.6, 35.2],
      [124.8, 32.9],
      [125.6, 30.1],
    ],
  },
];

const KNOT_KMH = 1.852;
const KIND_COLOR: Record<Kind, Cesium.Color> = {
  ship: Cesium.Color.fromCssColorString('#13c2c2'),
  aircraft: Cesium.Color.fromCssColorString('#fa8c16'),
};
const KIND_CSS: Record<Kind, string> = { ship: '#13c2c2', aircraft: '#fa8c16' };

/** 按航速把航线点换成时间样本：往返运动，时长覆盖整个演示时段 */
const buildPosition = (target: Target, start: Cesium.JulianDate, totalSeconds: number) => {
  const property = new Cesium.SampledPositionProperty();
  const loop = [...target.route, ...target.route.slice(0, -1).reverse()];
  let elapsed = 0;
  let index = 0;
  while (elapsed <= totalSeconds) {
    const point = loop[index % loop.length];
    property.addSample(
      Cesium.JulianDate.addSeconds(start, elapsed, new Cesium.JulianDate()),
      Cesium.Cartesian3.fromDegrees(point[0], point[1], target.altitude),
    );
    const next = loop[(index + 1) % loop.length];
    elapsed += (distanceKm(point, next) / (target.knots * KNOT_KMH)) * 3600;
    index += 1;
  }
  return property;
};

const DURATION_SECONDS = 12 * 3600;

/** 由位置属性求航向（弧度，顺时针自北），转成 billboard 的 rotation（逆时针）——图标始终指着前进方向 */
const headingRotation = (viewer: Cesium.Viewer, position: Cesium.PositionProperty, sampleSeconds = 180) =>
  new Cesium.CallbackProperty(() => {
    const now = viewer.clock.currentTime;
    const p1 = position.getValue(now);
    const p2 = position.getValue(Cesium.JulianDate.addSeconds(now, sampleSeconds, new Cesium.JulianDate()));
    if (!p1 || !p2) return 0;
    const c1 = viewer.scene.globe.ellipsoid.cartesianToCartographic(p1);
    const c2 = viewer.scene.globe.ellipsoid.cartesianToCartographic(p2);
    const heading = Math.atan2(
      (c2.longitude - c1.longitude) * Math.cos((c1.latitude + c2.latitude) / 2),
      c2.latitude - c1.latitude,
    );
    return -heading;
  }, false);

export default function Situation() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const [speed, setSpeed] = useState(120);
  const [trails, setTrails] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [picked, setPicked] = useState<Target>();
  const [locked, setLocked] = useState<string>();
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const scanRef = useRef<Cesium.Entity | undefined>(undefined);

  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer({
    // 定妆镜头：黄海南部斜视角，入场从高空推近
    home: [124.4, 27.6, 1_100_000],
    entry: { pitch: Cesium.Math.toRadians(-42) },
    onReady: (instance) => {
      new CesiumNavigation(instance, { enableCompass: true, enableZoomControls: true, enableDistanceLegend: true });
      const start = Cesium.JulianDate.now();
      const stop = Cesium.JulianDate.addSeconds(start, DURATION_SECONDS, new Cesium.JulianDate());
      Object.assign(instance.clock, {
        startTime: start.clone(),
        stopTime: stop,
        currentTime: start.clone(),
        clockRange: Cesium.ClockRange.LOOP_STOP,
        shouldAnimate: true,
      });

      // 关注海域：贴地面 + 立起 80km 的半透明围栏，把「区域感」从平面变成立体
      instance.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(AREA.flat()),
          material: Cesium.Color.DODGERBLUE.withAlpha(0.08),
          outline: true,
          outlineColor: Cesium.Color.DODGERBLUE,
        },
      });
      instance.entities.add({
        wall: {
          positions: Cesium.Cartesian3.fromDegreesArray([...AREA, AREA[0]].flat()),
          maximumHeights: [...AREA, AREA[0]].map(() => 80_000),
          minimumHeights: [...AREA, AREA[0]].map(() => 0),
          material: Cesium.Color.DODGERBLUE.withAlpha(0.1),
        },
      });

      entitiesRef.current = TARGETS.map((target) => {
        const position = buildPosition(target, start, DURATION_SECONDS);
        return instance.entities.add({
          id: target.id,
          position,
          // 剪影图标 + 航向朝向：比 9px 圆点像「被指挥的目标」得多
          billboard: {
            image: targetIcon(target.kind, KIND_CSS[target.kind]),
            width: target.kind === 'aircraft' ? 30 : 26,
            height: target.kind === 'aircraft' ? 30 : 26,
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            rotation: headingRotation(instance, position),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
          },
          label: {
            text: target.id,
            font: '12px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -24),
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
          },
          path: {
            leadTime: 0,
            trailTime: target.kind === 'aircraft' ? 1800 : 5400,
            width: 2,
            material: KIND_COLOR[target.kind].withAlpha(0.7),
          },
        });
      });

      const handler = new Cesium.ScreenSpaceEventHandler(instance.scene.canvas);
      handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
        const entity = instance.scene.pick(click.position)?.id as Cesium.Entity | undefined;
        setPicked(TARGETS.find((target) => target.id === entity?.id));
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      return () => handler.destroy();
    },
  });

  useEffect(() => {
    if (viewer) viewer.clock.multiplier = speed;
  }, [viewer, speed]);

  useEffect(() => {
    if (viewer) viewer.clock.shouldAnimate = playing;
  }, [viewer, playing]);

  useEffect(() => {
    entitiesRef.current.forEach((entity) => {
      if (entity.path) entity.path.show = new Cesium.ConstantProperty(trails);
    });
  }, [trails, viewer]);

  /** 锁定目标：相机切换为跟踪视角，目标脚下出现循环扩张的扫描圈；解锁回到区域俯瞰 */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    if (scanRef.current) {
      viewer.entities.remove(scanRef.current);
      scanRef.current = undefined;
    }
    const entity = entitiesRef.current.find((e) => e.id === locked);
    if (!entity) {
      viewer.trackedEntity = undefined;
      return undefined;
    }
    viewer.trackedEntity = entity;
    const target = TARGETS.find((tg) => tg.id === locked);
    const kind = target?.kind ?? 'ship';
    scanRef.current = viewer.entities.add({
      position: new Cesium.CallbackPositionProperty(() => entity.position?.getValue(viewer.clock.currentTime), false),
      ellipse: scanRingMaterial(KIND_CSS[kind], kind === 'aircraft' ? 160_000 : 60_000, 3.2),
    });
    return () => {
      if (scanRef.current && !viewer.isDestroyed()) viewer.entities.remove(scanRef.current);
    };
  }, [viewer, locked]);

  const kindLabel = (kind: Kind) => t(`cesium.situation.${kind}`);

  const legend = (
    <Card size="small" className="opacity-95">
      <Space orientation="vertical" size={2} className="text-xs">
        {(['ship', 'aircraft'] as Kind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: KIND_COLOR[kind].toCssColorString() }}
            />
            {kindLabel(kind)}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 border border-solid" style={{ borderColor: '#1e90ff' }} />
          {t('cesium.situation.area')}
        </span>
      </Space>
    </Card>
  );

  return (
    <DemoPage
      descriptionId="page.cesium.situation.desc"
      source="src/pages/Map/Cesium/Situation.tsx"
      extra={
        <>
          <Select
            allowClear
            showSearch
            value={locked}
            onChange={setLocked}
            placeholder={t('cesium.situation.lock')}
            className="w-36"
            options={TARGETS.map((target) => ({
              value: target.id,
              label: `${target.id} · ${kindLabel(target.kind)}`,
            }))}
          />
          {locked && (
            <Button icon={<UnlockOutlined />} onClick={() => setLocked(undefined)}>
              {t('cesium.situation.unlock')}
            </Button>
          )}
          <Button
            type={playing ? 'default' : 'primary'}
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setPlaying((v) => !v)}
          >
            {t(playing ? 'cesium.situation.pause' : 'cesium.situation.play')}
          </Button>
          <Space>
            <Typography.Text type="secondary">{t('cesium.situation.speed')}</Typography.Text>
            <Segmented
              value={speed}
              onChange={(value) => setSpeed(value as number)}
              options={[1, 60, 120, 600].map((value) => ({ value, label: `×${value}` }))}
            />
          </Space>
          <Space>
            <Switch size="small" checked={trails} onChange={setTrails} />
            {t('cesium.situation.trails')}
          </Space>
        </>
      }
    >
      <Alert
        type={picked ? 'success' : 'info'}
        showIcon
        className="mb-4"
        title={
          picked
            ? t('cesium.situation.target', { name: picked.id, kind: kindLabel(picked.kind), speed: picked.knots })
            : t('cesium.situation.hint')
        }
      />
      <Card styles={{ body: { padding: 0 } }}>
        <CesiumStage
          containerRef={containerRef}
          viewer={viewer}
          error={error}
          basemapFailed={basemapFailed}
          onRetryBasemap={retry}
          overlay={legend}
        />
      </Card>
    </DemoPage>
  );
}
