import { SceneStage, useCesiumViewer } from '@/components/CesiumViewer';
import { playTour, type CameraPose } from '@/components/CesiumViewer/CameraDirector';
import { TimeDeck } from '@/components/CesiumViewer/TimeDeck';
import { breathingWall, headingRotation, pulseRing, setBloom, tagLabel } from '@/components/CesiumViewer/effects';
import { ACCENT_CSS, AFFILIATION_CSS } from '@/components/CesiumViewer/palette';
import { militarySymbol } from '@/components/CesiumViewer/symbols';
import DemoPage from '@/components/DemoPage';
import { CompassOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Empty, Select, Space, Switch, Tag, Typography } from 'antd';
import * as Cesium from 'cesium';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildFleet,
  DURATION_SECONDS,
  GROUPS,
  positionAt,
  simulateEvents,
  ZONES,
  type GroupKey,
  type ZoneEvent,
  type ZoneId,
} from './situationModel';

/** 入场后的巡礼镜头（「导览」重放）：东南高空进近 → 西侧扫过 → 定妆俯瞰 */
const TOUR: CameraPose[] = [
  { lng: 124.4, lat: 27.8, height: 2_200_000, pitch: -50, duration: 3 },
  { lng: 122.8, lat: 32.5, height: 1_500_000, pitch: -46, heading: 38, duration: 3.4 },
  { lng: 124.6, lat: 30.8, height: 1_100_000, pitch: -42, duration: 2.6 },
];

const ZONE_ORDER: ZoneId[] = ['core', 'warning', 'watch'];

/** KPI / 事件流心跳的墙钟最小间隔（≤4Hz） */
const HEARTBEAT_MIN_INTERVAL_MS = 250;

const fmtElapsed = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const insidePolygon = (p: [number, number], polygon: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const MetaItem = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <>
    <Typography.Text type="secondary" className="text-xs">
      {label}
    </Typography.Text>
    <span className={`text-xs ${mono ? 'font-mono' : ''}`}>{value}</span>
  </>
);

/**
 * 海域综合态势（旗舰场景）：61 个目标（军标 2525C 符号、AIS/航班元数据）在
 * 三层关注区（核心/警戒/监视，呼吸围栏 + bloom）内按 12 小时回放循环；
 * 越界事件离线推演、按回放时刻推送进事件流；左侧编成树、右侧详情卡与事件流、
 * 底部 TimeDeck。数据层见 situationModel.ts（确定性种子，刷新不变）。
 */
export default function Situation() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const fleet = useMemo(() => buildFleet(), []);
  const events = useMemo(() => simulateEvents(fleet), [fleet]);

  const [speed, setSpeed] = useState(120);
  const [playing, setPlaying] = useState(true);
  const [trails, setTrails] = useState(true);
  const [selectedId, setSelectedId] = useState<string>();
  const [lockedId, setLockedId] = useState<string>();
  const [feed, setFeed] = useState<ZoneEvent[]>([]);
  const [stats, setStats] = useState({ inside: 0, alerts: 0, elapsedSec: 0 });

  const entitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const feedCursorRef = useRef(0);
  const tourStopRef = useRef<(() => void) | undefined>(undefined);
  const epochRef = useRef<Cesium.JulianDate>(null!);
  const selected = fleet.find((target) => target.id === selectedId);

  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer({
    home: [124.4, 29.2, 1_400_000],
    entry: { pitch: Cesium.Math.toRadians(-48) },
    onReady: (instance) => {
      const start = Cesium.JulianDate.now();
      epochRef.current = start;
      // viewer 重建（底图重试等）时事件流从新纪元重新推演
      feedCursorRef.current = 0;
      setFeed([]);
      Object.assign(instance.clock, {
        startTime: start.clone(),
        stopTime: Cesium.JulianDate.addSeconds(start, DURATION_SECONDS, new Cesium.JulianDate()),
        currentTime: start.clone(),
        clockRange: Cesium.ClockRange.LOOP_STOP,
        shouldAnimate: true,
        multiplier: speed,
      });
      setBloom(instance, true, 0.3);

      const layer = new Cesium.CustomDataSource('situation');
      instance.dataSources.add(layer);

      // 三层关注区：贴地填充 + 呼吸围栏 + 区名标签
      ZONES.forEach((zone) => {
        const ring = [...zone.polygon, zone.polygon[0]];
        layer.entities.add({
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
            material: Cesium.Color.fromCssColorString(zone.css).withAlpha(0.05),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(zone.css).withAlpha(0.7),
          },
        });
        layer.entities.add({
          wall: {
            positions: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
            maximumHeights: ring.map(() => 70_000),
            minimumHeights: ring.map(() => 0),
            material: breathingWall(zone.css, zone.peakAlpha),
          },
        });
        const centroid = zone.polygon.reduce(
          (acc, p) => [acc[0] + p[0] / zone.polygon.length, acc[1] + p[1] / zone.polygon.length],
          [0, 0],
        );
        layer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(centroid[0], centroid[1], 78_000),
          label: {
            ...tagLabel({ font: '600 14px sans-serif', fillCss: zone.css, offset: [0, 0] }),
            text: t(`cesium.situation.zone.${zone.id}`),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_500_000),
          },
        });
      });

      // 目标：军标 billboard（旋转对航向）+ 航迹 + 标签
      fleet.forEach((target) => {
        const position = new Cesium.SampledPositionProperty();
        for (let s = 0; s <= DURATION_SECONDS; s += 90) {
          const [lng, lat] = positionAt(target, s);
          position.addSample(
            Cesium.JulianDate.addSeconds(start, s, new Cesium.JulianDate()),
            Cesium.Cartesian3.fromDegrees(lng, lat, target.altitude),
          );
        }
        const symbol = militarySymbol(target.kind === 'aircraft' ? 'air' : 'sea', target.affiliation, {
          size: target.kind === 'aircraft' ? 26 : 24,
        });
        const entity = layer.entities.add({
          id: target.id,
          position,
          billboard: {
            image: symbol.dataUrl,
            width: symbol.width,
            height: symbol.height,
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            rotation: headingRotation(instance, position, 120),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            ...tagLabel({ offset: [0, -24] }),
            text: target.id,
            fillColor: Cesium.Color.fromCssColorString(AFFILIATION_CSS[target.affiliation]),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          path: {
            leadTime: 0,
            trailTime: target.kind === 'aircraft' ? 1800 : 5400,
            width: 2,
            material: Cesium.Color.fromCssColorString(AFFILIATION_CSS[target.affiliation]).withAlpha(0.65),
          },
        });
        entitiesRef.current.set(target.id, entity);
      });

      const handler = new Cesium.ScreenSpaceEventHandler(instance.scene.canvas);
      handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
        const entity = instance.scene.pick(click.position)?.id as Cesium.Entity | undefined;
        if (entity?.id) setSelectedId(String(entity.id));
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      // 主体取景：三层关注区的外接球（watch 区半宽约 330km），pitch -42 斜视；
      // 显式 range——zoomTo 自动定距在含时变属性的编队上实测不生效
      const watch = ZONES.find((z) => z.id === 'watch')!.polygon;
      const center = watch.reduce((acc, p) => [acc[0] + p[0] / watch.length, acc[1] + p[1] / watch.length], [0, 0]);
      const radius = Math.max(...watch.map((p) => Math.hypot(p[0] - center[0], p[1] - center[1]))) * 111_000;
      void instance.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(center[0], center[1]), radius),
        {
          // range 按 direction 页实测标定（offset° ≈ range·cos(pitch)·0.92/111）：
          // 1300km @ -42° → 相机在中心南侧约 8°、高约 870km，整个关注区充满画面下 2/3
          offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-42), 1_300_000),
          duration: 2.8,
        },
      );
      return () => {
        handler.destroy();
        if (!instance.isDestroyed()) {
          instance.trackedEntity = undefined;
          instance.dataSources.remove(layer, true);
        }
        entitiesRef.current.clear();
        tourStopRef.current?.();
      };
    },
  });

  /* 回放心跳：KPI 与事件流按当前时刻推进——事件流是「活态势」的来源。
   * 按墙钟节流（≤4Hz）：按回放秒节流在 ×120/×600 下每帧都跨过一个回放秒，退化成逐帧 setStats；
   * 回放时刻不变（暂停）时不重算 */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    let lastEmitted = -1;
    let lastWallMs = -Infinity;
    const onTick = () => {
      const elapsed = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, epochRef.current);
      const second = Math.floor(elapsed);
      if (elapsed < 0 || second === lastEmitted) return;
      const wallMs = performance.now();
      if (wallMs - lastWallMs < HEARTBEAT_MIN_INTERVAL_MS) return;
      lastWallMs = wallMs;
      lastEmitted = second;
      const watch = ZONES.find((z) => z.id === 'watch')!.polygon;
      setStats({
        inside: fleet.filter((target) => {
          const [lng, lat] = positionAt(target, elapsed);
          return lng >= 122.1 && lng <= 126.6 && lat >= 29.9 && lat <= 36.6 && insidePolygon([lng, lat], watch);
        }).length,
        alerts: events.filter((e) => e.alert && e.atSec <= elapsed).length,
        elapsedSec: elapsed,
      });
      // 时间倒流（12h LOOP_STOP 回绕、TimeDeck 往回拖）：游标按当前时刻重定位并重建事件流，
      // 否则游标停在末尾，回绕后事件流永久空窗，与逐圈归零的告警 KPI 互相矛盾
      const cursor = feedCursorRef.current;
      if (cursor > 0 && events[cursor - 1].atSec > elapsed) {
        const next = events.findIndex((e) => e.atSec > elapsed);
        feedCursorRef.current = next === -1 ? events.length : next;
        setFeed(events.slice(0, feedCursorRef.current).reverse().slice(0, 40));
        return;
      }
      const fresh = events.slice(cursor).filter((e) => e.atSec <= elapsed);
      if (fresh.length) {
        feedCursorRef.current += fresh.length;
        setFeed((prev) => [...fresh.reverse(), ...prev].slice(0, 40));
      }
    };
    viewer.clock.onTick.addEventListener(onTick);
    return () => {
      if (!viewer.isDestroyed()) viewer.clock.onTick.removeEventListener(onTick);
    };
  }, [viewer, fleet, events]);

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

  /* 锁定跟随：trackedEntity + 脚下脉冲圈；解锁回到区域视角 */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    const entity = entitiesRef.current.get(lockedId ?? '');
    viewer.trackedEntity = entity;
    if (!entity) return undefined;
    const ring = viewer.entities.add({
      position: new Cesium.CallbackPositionProperty(() => entity.position?.getValue(viewer.clock.currentTime), false),
      ellipse: pulseRing(ACCENT_CSS.alert, 42_000, 1.8),
    });
    return () => {
      if (!viewer.isDestroyed()) viewer.entities.remove(ring);
    };
  }, [viewer, lockedId]);

  const flyToTarget = (id: string) => {
    setSelectedId(id);
    const entity = entitiesRef.current.get(id);
    if (viewer && entity) {
      viewer.trackedEntity = undefined;
      setLockedId(undefined);
      viewer.flyTo(entity, {
        duration: 1.4,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 240_000),
      });
    }
  };

  const replayTour = () => {
    if (!viewer) return;
    tourStopRef.current?.();
    tourStopRef.current = playTour(viewer, TOUR);
  };

  const groupList = (Object.keys(GROUPS) as GroupKey[]).map((key) => ({
    key,
    group: GROUPS[key],
    targets: fleet.filter((target) => target.group === key),
  }));

  const legend = (
    <div className="scene-panel">
      <div className="scene-panel-title">{t('cesium.situation.legend')}</div>
      <Space direction="vertical" size={2}>
        {(Object.keys(AFFILIATION_CSS) as (keyof typeof AFFILIATION_CSS)[]).map((aff) => (
          <span key={aff} className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: AFFILIATION_CSS[aff] }} />
            {t(`cesium.situation.aff.${aff}`)}
          </span>
        ))}
        {ZONE_ORDER.map((zoneId) => {
          const zone = ZONES.find((z) => z.id === zoneId)!;
          return (
            <span key={zoneId} className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: zone.css }} />
              {t(`cesium.situation.zone.${zoneId}`)}
            </span>
          );
        })}
      </Space>
    </div>
  );

  const detailPanel = selected ? (
    <div className="scene-panel">
      <div className="scene-panel-title flex items-center justify-between gap-2">
        <span>{selected.id}</span>
        <Tag color={AFFILIATION_CSS[selected.affiliation]} className="mr-0">
          {t(`cesium.situation.aff.${selected.affiliation}`)}
        </Tag>
      </div>
      <div className="flex items-start gap-3">
        <img
          alt=""
          src={
            militarySymbol(selected.kind === 'aircraft' ? 'air' : 'sea', selected.affiliation, {
              size: 34,
              label: selected.id,
            }).dataUrl
          }
          className="shrink-0"
        />
        <div className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {selected.meta.callsign && (
            <MetaItem label={t('cesium.situation.meta.callsign')} value={selected.meta.callsign} />
          )}
          {selected.meta.mmsi && <MetaItem label="MMSI" value={selected.meta.mmsi} />}
          {selected.meta.vessel && <MetaItem label={t('cesium.situation.meta.vessel')} value={selected.meta.vessel} />}
          {selected.meta.flight && <MetaItem label={t('cesium.situation.meta.flight')} value={selected.meta.flight} />}
          {selected.meta.airType && (
            <MetaItem label={t('cesium.situation.meta.airType')} value={selected.meta.airType} />
          )}
          <MetaItem label={t('cesium.situation.meta.speed')} value={`${selected.knots} kn`} mono />
          {selected.kind === 'aircraft' && (
            <MetaItem
              label={t('cesium.situation.meta.alt')}
              value={`FL${Math.round(selected.altitude / 30.48)}`}
              mono
            />
          )}
          {selected.meta.lengthM && (
            <MetaItem label={t('cesium.situation.meta.length')} value={`${selected.meta.lengthM} m`} mono />
          )}
        </div>
      </div>
      <Button
        size="small"
        block
        className="mt-2"
        type={lockedId === selected.id ? 'default' : 'primary'}
        icon={lockedId === selected.id ? <UnlockOutlined /> : <LockOutlined />}
        onClick={() => setLockedId(lockedId === selected.id ? undefined : selected.id)}
      >
        {t(lockedId === selected.id ? 'cesium.situation.unlock' : 'cesium.situation.lock')}
      </Button>
    </div>
  ) : (
    <div className="scene-panel">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t('cesium.situation.pickHint')}
        styles={{ image: { height: 36 } }}
        className="my-1"
      />
    </div>
  );

  const eventPanel = (
    <div className="scene-panel">
      <div className="scene-panel-title">
        {t('cesium.situation.events')} · {feed.length}
      </div>
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
        {feed.length === 0 && (
          <Typography.Text type="secondary" className="text-xs">
            {t('cesium.situation.eventsEmpty')}
          </Typography.Text>
        )}
        {feed.map((event) => (
          <button
            type="button"
            key={event.id}
            className={`scene-event${event.alert ? ' is-alert' : ''} w-full cursor-pointer border-0 bg-transparent p-0 text-left`}
            onClick={() => flyToTarget(event.targetId)}
          >
            <span className="font-mono text-[11px] opacity-70">{fmtElapsed(event.atSec)}</span>
            <span>
              <Typography.Text strong className="text-xs">
                {event.targetId}
              </Typography.Text>
              <span className="mx-1 opacity-60">·</span>
              <span className="text-xs">
                {t(`cesium.situation.zone.${event.zone}`)} {t(`cesium.situation.ev.${event.kind}`)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DemoPage descriptionId="page.cesium.situation.desc" source="src/pages/Map/Cesium/situationModel.ts">
      <SceneStage
        containerRef={containerRef}
        viewer={viewer}
        error={error}
        basemapFailed={basemapFailed}
        onRetryBasemap={retry}
        title={t('cesium.situation.title')}
        kpis={[
          { label: t('cesium.situation.kpi.targets'), value: fleet.length },
          { label: t('cesium.situation.kpi.air'), value: fleet.filter((f) => f.kind === 'aircraft').length },
          { label: t('cesium.situation.kpi.sea'), value: fleet.filter((f) => f.kind === 'ship').length },
          { label: t('cesium.situation.kpi.inside'), value: stats.inside },
          {
            label: t('cesium.situation.kpi.alerts'),
            value: stats.alerts,
            tone: stats.alerts > 0 ? 'danger' : 'default',
          },
          { label: 'T+', value: fmtElapsed(stats.elapsedSec) },
        ]}
        actions={
          <>
            <Button size="small" icon={<CompassOutlined />} onClick={replayTour}>
              {t('cesium.situation.tour')}
            </Button>
            <Select
              allowClear
              showSearch
              size="small"
              value={lockedId}
              onChange={(v) => setLockedId(v)}
              placeholder={t('cesium.situation.lock')}
              className="w-36"
              options={fleet.map((target) => ({ value: target.id, label: target.id }))}
            />
            <span className="scene-panel flex items-center gap-1.5 px-2 py-0.5">
              <Switch size="small" checked={trails} onChange={setTrails} />
              <span className="text-xs">{t('cesium.situation.trails')}</span>
            </span>
          </>
        }
        panels={
          <div className="scene-panel">
            <div className="scene-panel-title">{t('cesium.situation.orbat')}</div>
            <div className="flex flex-col gap-2">
              {groupList.map(({ key, group, targets }) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: AFFILIATION_CSS[group.affiliation] }}
                      />
                      {t(`cesium.situation.group.${key}`)}
                    </span>
                    <span className="opacity-60">{targets.length}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {targets.map((target) => (
                      <Button
                        key={target.id}
                        size="small"
                        type={selectedId === target.id ? 'primary' : 'text'}
                        className="h-6 px-1 font-mono text-[11px]"
                        onClick={() => flyToTarget(target.id)}
                        onDoubleClick={() => setLockedId(target.id)}
                      >
                        {target.id}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
        rightPanels={
          <>
            {detailPanel}
            {eventPanel}
          </>
        }
        legend={legend}
        timeDeck={
          <TimeDeck
            viewer={viewer}
            playing={playing}
            onPlayingChange={setPlaying}
            speed={speed}
            onSpeedChange={setSpeed}
            speeds={[1, 60, 120, 600]}
          />
        }
      />
    </DemoPage>
  );
}

/* ------------------------------ 页内小工具 ------------------------------ */
