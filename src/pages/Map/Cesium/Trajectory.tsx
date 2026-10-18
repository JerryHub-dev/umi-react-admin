import { CesiumStage, useCesiumViewer } from '@/components/CesiumViewer';
import { glowMaterial, targetIcon } from '@/components/CesiumViewer/effects';
import { pickLngLat } from '@/components/CesiumViewer/stations';
import DemoPage from '@/components/DemoPage';
import { BASE_STATIONS, buildPatrolRoute, qualityColor, SAMPLES_PER_SECOND, sampleRoute, type PatrolSample } from './patrolModel';
import { CheckOutlined, NodeIndexOutlined, PauseCircleOutlined, PlayCircleOutlined, RedoOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, App, Button, Card, Segmented } from 'antd';
import * as Cesium from 'cesium';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 巡检任务页：飞机沿任务线循环飞行（SampledPositionProperty 回放），
 * 身后拖出一条**随进度生长的覆盖走廊**（corridor 的 positions 是 CallbackProperty），
 * 沿途按覆盖质量铺采样点（绿/黄/红）。也支持手绘自定义巡检线后同样的回放。
 * 数据层见 patrolModel.ts（程序生成，不依赖静态 JSON）。
 */
export default function Trajectory() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const { message } = App.useApp();
  const [drawing, setDrawing] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [hasPlayback, setHasPlayback] = useState(false);
  const drawingRef = useRef(false);
  const waypointsRef = useRef<{ longitude: number; latitude: number }[]>([]);
  const layerRef = useRef<Cesium.CustomDataSource>(null);
  const samplesRef = useRef<PatrolSample[]>([]);
  const positionsRef = useRef<Cesium.Cartesian3[]>([]);
  const dotsRef = useRef<Cesium.PointPrimitiveCollection>(null);
  const dotsDoneRef = useRef(0);
  const startRef = useRef<Cesium.JulianDate>(null);

  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer({
    home: [116.65, 30.5, 260_000],
    entry: { pitch: Cesium.Math.toRadians(-38) },
    onReady: (instance) => {
      const layer = new Cesium.CustomDataSource('patrol');
      instance.dataSources.add(layer);
      layerRef.current = layer;
      // 画线模式下点击追加航路点；实时连线用 CallbackProperty 跟随数组
      const handler = new Cesium.ScreenSpaceEventHandler(instance.scene.canvas);
      handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
        if (!drawingRef.current) return;
        const lngLat = pickLngLat(instance, click.position);
        if (!lngLat) return;
        waypointsRef.current.push({ longitude: lngLat[0], latitude: lngLat[1] });
        layer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(...lngLat),
          point: { pixelSize: 8, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
        });
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      return () => handler.destroy();
    },
  });

  /** 回放推进：覆盖走廊 positions 只取当前时刻之前的采样（生长效果），沿途铺质量采样点 */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    const onTick = () => {
      const start = startRef.current;
      if (!start || !samplesRef.current.length) return;
      const elapsed = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, start);
      const progress = Math.min(
        samplesRef.current.length,
        Math.max(2, Math.floor(elapsed * SAMPLES_PER_SECOND * speed)),
      );
      positionsRef.current = positionsRef.current.slice(0, progress);
      const dots = dotsRef.current;
      if (dots) {
        while (dotsDoneRef.current < progress) {
          const sample = samplesRef.current[dotsDoneRef.current];
          if (dotsDoneRef.current % 5 === 0) {
            dots.add({
              position: Cesium.Cartesian3.fromDegrees(sample.lng, sample.lat),
              pixelSize: 5,
              color: Cesium.Color.fromCssColorString(qualityColor(sample.quality)).withAlpha(0.9),
            });
          }
          dotsDoneRef.current += 1;
        }
      }
    };
    viewer.clock.onTick.addEventListener(onTick);
    return () => {
      if (!viewer.isDestroyed()) viewer.clock.onTick.removeEventListener(onTick);
    };
  }, [viewer, speed]);

  useEffect(() => {
    if (viewer) viewer.clock.shouldAnimate = playing;
  }, [viewer, playing]);

  useEffect(() => {
    if (viewer) viewer.clock.multiplier = speed;
  }, [viewer, speed]);

  /** 搭建一段回放：时钟 + 巡检机 + 生长走廊 + 质量采样点容器 */
  const playRoute = useCallback(
    (samples: PatrolSample[]) => {
      const instance = viewer!;
      samplesRef.current = samples;
      positionsRef.current = samples.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat));
      dotsDoneRef.current = 0;
      if (dotsRef.current) instance.scene.primitives.remove(dotsRef.current);
      dotsRef.current = instance.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      const start = Cesium.JulianDate.now();
      startRef.current = start.clone();
      const total = samples.length / SAMPLES_PER_SECOND;
      Object.assign(instance.clock, {
        startTime: start.clone(),
        stopTime: Cesium.JulianDate.addSeconds(start, total, new Cesium.JulianDate()),
        currentTime: start.clone(),
        clockRange: Cesium.ClockRange.LOOP_STOP,
        shouldAnimate: playing,
        multiplier: speed,
      });
      const position = new Cesium.SampledPositionProperty();
      samples.forEach((p, i) =>
        position.addSample(
          Cesium.JulianDate.addSeconds(start, i / SAMPLES_PER_SECOND, new Cesium.JulianDate()),
          Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.alt),
        ),
      );
      instance.entities.add({
        position,
        billboard: { image: targetIcon('aircraft', '#ffd666'), width: 30, height: 30 },
        path: { leadTime: 0, trailTime: 25, width: 3, material: glowMaterial('#fadb14', 0.9) },
      });
      // 覆盖走廊：positions 只取当前进度以内的采样（onTick 里截断 positionsRef）
      instance.entities.add({
        corridor: {
          positions: new Cesium.CallbackProperty(() => positionsRef.current, false),
          width: 2600,
          cornerType: Cesium.CornerType.ROUNDED,
          material: glowMaterial('#36cfc9', 0.55),
        },
      });
      setHasPlayback(true);
      instance.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(samples[0].lng, samples[0].lat - 0.28, 120_000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-38), roll: 0 },
        duration: 1.8,
      });
    },
    [viewer, playing, speed],
  );

  // 进页自动回放内置巡检任务（程序生成，确定性）
  const autoPlayed = useRef(false);
  useEffect(() => {
    if (!viewer || autoPlayed.current) return;
    autoPlayed.current = true;
    playRoute(buildPatrolRoute());
  }, [playRoute, viewer]);

  const clearPlayback = useCallback(() => {
    if (viewer && !viewer.isDestroyed()) {
      viewer.entities.removeAll();
      if (dotsRef.current) viewer.scene.primitives.remove(dotsRef.current);
    }
    dotsRef.current = null;
    layerRef.current?.entities.removeAll();
    samplesRef.current = [];
    positionsRef.current = [];
    startRef.current = null;
    setHasPlayback(false);
  }, [viewer]);

  const startDrawing = () => {
    clearPlayback();
    drawingRef.current = true;
    setDrawing(true);
    (viewer!.container as HTMLElement).style.cursor = 'crosshair';
    layerRef.current!.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(
          () => Cesium.Cartesian3.fromDegreesArray(waypointsRef.current.flatMap((p) => [p.longitude, p.latitude])),
          false,
        ),
        width: 3,
        material: glowMaterial('#fadb14', 0.9),
        clampToGround: true,
      },
    });
  };

  const finishDrawing = () => {
    drawingRef.current = false;
    setDrawing(false);
    (viewer!.container as HTMLElement).style.cursor = '';
    const waypoints = waypointsRef.current;
    if (waypoints.length < 2) {
      message.warning(t('cesium.route.tooShort'));
      return;
    }
    layerRef.current?.entities.removeAll();
    playRoute(sampleRoute(waypoints));
  };

  const replay = () => {
    if (viewer && startRef.current) {
      positionsRef.current = [];
      dotsDoneRef.current = 0;
      if (dotsRef.current) dotsRef.current.removeAll();
      viewer.clock.currentTime = startRef.current.clone();
    }
  };

  const stations = BASE_STATIONS.map(([lng, lat]) => ({ lng, lat }));
  const legend = (
    <Card size="small" className="pointer-events-auto opacity-95">
      <div className="flex flex-col gap-1 text-xs">
        {[
          ['#52c41a', 'cesium.route.good'],
          ['#fadb14', 'cesium.route.fair'],
          ['#f5222d', 'cesium.route.poor'],
        ].map(([color, key]) => (
          <span key={key} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {t(key)}
          </span>
        ))}
      </div>
    </Card>
  );

  return (
    <DemoPage
      descriptionId="page.cesium.trajectory.desc"
      source="src/pages/Map/Cesium/patrolModel.ts"
      extra={
        <>
          {drawing ? (
            <Button type="primary" icon={<CheckOutlined />} onClick={finishDrawing}>
              {t('cesium.route.finish')}
            </Button>
          ) : (
            <Button icon={<NodeIndexOutlined />} disabled={!viewer} onClick={startDrawing}>
              {t('cesium.route.draw')}
            </Button>
          )}
          <Button
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            disabled={drawing || !hasPlayback}
            onClick={() => setPlaying((v) => !v)}
          >
            {t(playing ? 'cesium.route.pause' : 'cesium.route.play')}
          </Button>
          <Button icon={<RedoOutlined />} disabled={drawing || !hasPlayback} onClick={replay}>
            {t('cesium.route.replay')}
          </Button>
          <Button disabled={drawing || !hasPlayback} onClick={clearPlayback}>
            {t('map.clear')}
          </Button>
          {!drawing && (
            <Segmented
              value={speed}
              onChange={(value) => setSpeed(value as number)}
              options={[
                { value: 1, label: '×1' },
                { value: 2, label: '×2' },
                { value: 4, label: '×4' },
              ]}
            />
          )}
        </>
      }
    >
      <Alert
        type={drawing ? 'warning' : 'info'}
        showIcon
        className="mb-4"
        title={
          drawing
            ? t('cesium.route.drawing')
            : t('cesium.route.summary', {
                count: samplesRef.current.length,
                good: samplesRef.current.filter((s) => s.quality > 0.66).length,
                stations: stations.length,
              })
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
