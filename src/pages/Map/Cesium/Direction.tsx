import { CesiumStage, useCesiumViewer } from '@/components/CesiumViewer';
import { addScanRing, targetIcon } from '@/components/CesiumViewer/effects';
import DemoPage from '@/components/DemoPage';
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Badge, Button, Card, Segmented, Space } from 'antd';
import * as Cesium from 'cesium';
import { useEffect, useRef, useState } from 'react';
import {
  CAPABILITIES,
  CAPABILITY_COLOR,
  capabilityStats,
  envelopeRing,
  isIntercepted,
  STATION,
  sweepAngle,
  targetPosition,
  TARGETS,
  type SimTarget,
} from './capabilityModel';

type Mode = 'domes' | 'sweep' | 'both';

const TIME = { elapsed: 0, last: performance.now() };
const tick = (playing: boolean) => {
  const now = performance.now();
  if (playing) TIME.elapsed += (now - TIME.last) / 1000;
  TIME.last = now;
  return TIME.elapsed;
};

/**
 * 监测站能力页：天线方向图模型（capabilityModel.ts）驱动——
 * 三种能力的穹顶随传播条件「呼吸」，测向波束持续旋转扫描，
 * 绕站目标实时判定「此刻是否在截获包络内」。数据全部程序生成。
 */
export default function Direction() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const [mode, setMode] = useState<Mode>('both');
  const [playing, setPlaying] = useState(true);
  const [picked, setPicked] = useState<SimTarget>();
  const layerRef = useRef<Cesium.CustomDataSource>(null);
  const domesRef = useRef<Cesium.Entity[]>([]);
  const sweepRef = useRef<Cesium.Entity>(null);
  const targetsRef = useRef<Map<string, Cesium.Entity>>(new Map());
  // 回放时钟的原点：目标位置的采样与时间推算都基于它
  const epoch = useRef(Cesium.JulianDate.now()).current;

  // 测向波束用「静态圆形 + 旋转纹理」实现（社区雷达扫描的经典做法）：
  // 逐帧重建 polygon hierarchy 的动态多边形会产生空批次包围球（NaN），渲染循环停摆
  const sweepCanvas = useRef<HTMLCanvasElement>(null);
  const renderSweep = (angle: number) => {
    const canvas = sweepCanvas.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = center - 2;
    // 波束后方 100° 的余辉：越靠近前缘越亮
    const wedges = 40;
    for (let i = 0; i < wedges; i++) {
      const start = angle - (i + 1) * (100 / wedges);
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, ((start - 90) * Math.PI) / 180, ((start + 100 / wedges - 90) * Math.PI) / 180);
      ctx.closePath();
      const alpha = 0.34 * (1 - i / wedges) ** 1.6;
      ctx.fillStyle = `rgba(64, 140, 255, ${alpha.toFixed(3)})`;
      ctx.fill();
    }
    // 前缘
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + radius * Math.cos(((angle - 90) * Math.PI) / 180),
      center + radius * Math.sin(((angle - 90) * Math.PI) / 180),
    );
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer({
    // 定妆镜头：正俯视（环形对称构图天然适合雷达视角），高度按最大能力环直径（~500km）留边
    home: [STATION.lng, STATION.lat, 780_000],
    onReady: (instance) => {
      const layer = new Cesium.CustomDataSource('capability');
      instance.dataSources.add(layer);
      layerRef.current = layer;

      // 监测站：标记 + 心跳扫描
      instance.entities.add({
        position: Cesium.Cartesian3.fromDegrees(STATION.lng, STATION.lat),
        point: { pixelSize: 10, color: Cesium.Color.ORANGE, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
        label: {
          text: t('cesium.direction.station'),
          font: '12px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -18),
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
        },
      });
      addScanRing(instance, { lon: STATION.lng, lat: STATION.lat, color: '#fa8c16', maxRadius: 280_000, duration: 4 });

      // 测向波束：静态圆几何 + canvas 余辉纹理（100ms 重绘）
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      sweepCanvas.current = canvas;
      renderSweep(0);
      sweepRef.current = layer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(STATION.lng, STATION.lat),
        ellipse: {
          semiMajorAxis: 240_000,
          semiMinorAxis: 240_000,
          material: new Cesium.ImageMaterialProperty({ image: canvas, transparent: true }),
        },
      });

      // 绕站目标：位置用 SampledPositionProperty 预展开 20 分钟循环（与 Situation 同模式）；
      // 「是否被截获」在 onTick 里翻转样式
      const loop = 20 * 60;
      instance.clock.shouldAnimate = true;
      TARGETS.forEach((target) => {
        const position = new Cesium.SampledPositionProperty();
        for (let s = 0; s <= loop; s += 10) {
          const p = targetPosition(target, s);
          position.addSample(
            Cesium.JulianDate.addSeconds(epoch, s, new Cesium.JulianDate()),
            Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.altitude),
          );
        }
        const entity = layer.entities.add({
          id: target.id,
          position,
          billboard: {
            image: targetIcon(target.kind, '#8c8c8c'),
            width: target.kind === 'aircraft' ? 28 : 24,
            height: target.kind === 'aircraft' ? 28 : 24,
            color: Cesium.Color.fromCssColorString('#8c8c8c'),
          },
          label: {
            text: target.id,
            font: '11px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -22),
            fillColor: Cesium.Color.WHITE.withAlpha(0.75),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.45),
          },
        });
        targetsRef.current.set(target.id, entity);
      });

      // 点击目标查看详情
      const handler = new Cesium.ScreenSpaceEventHandler(instance.scene.canvas);
      handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
        const entity = instance.scene.pick(click.position)?.id as Cesium.Entity | undefined;
        setPicked(TARGETS.find((target) => target.id === entity?.id));
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      return () => {
        handler.destroy();
        if (!instance.isDestroyed()) instance.dataSources.remove(layer, true);
      };
    },
  });

  // 波束旋转：100ms 重绘纹理并换材质；暂停即冻结
  useEffect(() => {
    if (!viewer || !sweepCanvas.current || !sweepRef.current?.ellipse) return undefined;
    const canvas = sweepCanvas.current;
    const ellipse = sweepRef.current.ellipse;
    const timer = window.setInterval(() => {
      renderSweep(((sweepAngle(TIME.elapsed) * 180) / Math.PI) % 360);
      ellipse.material = new Cesium.ImageMaterialProperty({ image: canvas, transparent: true });
    }, 100);
    return () => window.clearInterval(timer);
  }, [viewer]);

  /** 能力环（平面）：贴地多边形承载方位差异（方向瓣 + 地形阴影）。
   * 本页刻意不用任何挤出/墙体高度：实测该引擎版本的大尺寸挤出几何（polygon/ellipse 挤出、
   * 密环变高墙）在几何 worker 里非确定性崩溃（splitLongitude 属性数不匹配 / NaN 包围球 /
   * 法线 NaN），渲染循环停摆；挤出数据可视化由 GeoHash 的挤出矩形（稳定）承担 */
  useEffect(() => {
    if (!viewer || !layerRef.current) return undefined;
    const layer = layerRef.current!;
    domesRef.current = CAPABILITIES.map((capability) => {
      const ring = [...envelopeRing(capability, 0), ...envelopeRing(capability, 0).slice(0, 1)];
      return layer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.map((p) => [p.longitude, p.latitude]).flat()),
          material: Cesium.Color.fromCssColorString(CAPABILITY_COLOR[capability]).withAlpha(0.12),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(CAPABILITY_COLOR[capability]).withAlpha(0.85),
        },
      });
    });
    return () => {
      domesRef.current.forEach((entity) => layer.entities.remove(entity));
      domesRef.current = [];
    };
  }, [viewer]);

  /** 心跳：推波束纹理时间；目标位置跟随 Cesium 时钟，检测判定用同一时间源 */
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    const onTick = () => {
      tick(playing);
      const seconds = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, epoch);
      TARGETS.forEach((target) => {
        const entity = targetsRef.current.get(target.id);
        if (!entity) return;
        const detected = isIntercepted(target, seconds);
        const next = Cesium.Color.fromCssColorString(detected ? '#52c41a' : '#8c8c8c');
        if (
          entity.billboard &&
          !Cesium.Color.equals(entity.billboard.color?.getValue(viewer.clock.currentTime), next)
        ) {
          entity.billboard.color = new Cesium.ConstantProperty(next);
          if (entity.label) {
            entity.label.text = new Cesium.ConstantProperty(
              detected ? `${target.id} · ${t('cesium.direction.detected')}` : target.id,
            );
            entity.label.fillColor = new Cesium.ConstantProperty(
              detected ? Cesium.Color.fromCssColorString('#95de64') : Cesium.Color.WHITE.withAlpha(0.75),
            );
          }
        }
      });
    };
    viewer.clock.onTick.addEventListener(onTick);
    return () => {
      if (!viewer.isDestroyed()) viewer.clock.onTick.removeEventListener(onTick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, playing]);

  // 暂停同时冻结目标（位置跟随 Cesium 时钟）
  useEffect(() => {
    if (viewer) viewer.clock.shouldAnimate = playing;
  }, [viewer, playing]);

  // 模式切换：穹顶与波束各自显隐
  useEffect(() => {
    domesRef.current.forEach((entity) => {
      entity.show = mode !== 'sweep';
    });
    if (sweepRef.current) sweepRef.current.show = mode !== 'domes';
  }, [mode, viewer]);

  const stats = CAPABILITIES.map((capability) => ({ capability, ...capabilityStats(capability) }));
  const legend = (
    <Card size="small" className="pointer-events-auto opacity-95">
      <Space orientation="vertical" size={2}>
        {stats.map((row) => (
          <Badge
            key={row.capability}
            color={CAPABILITY_COLOR[row.capability]}
            text={t('cesium.direction.stats', {
              name: t(`cesium.direction.${row.capability}`),
              max: row.max.toFixed(0),
              min: row.min.toFixed(0),
              avg: row.avg.toFixed(0),
            })}
          />
        ))}
      </Space>
    </Card>
  );

  return (
    <DemoPage
      descriptionId="page.cesium.direction.desc"
      source="src/pages/Map/Cesium/capabilityModel.ts"
      extra={
        <>
          <Segmented
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            options={[
              { value: 'domes', label: t('cesium.direction.modeDomes') },
              { value: 'sweep', label: t('cesium.direction.modeSweep') },
              { value: 'both', label: t('cesium.direction.modeBoth') },
            ]}
          />
          <Button
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setPlaying((v) => !v)}
          >
            {t(playing ? 'cesium.direction.pause' : 'cesium.direction.play')}
          </Button>
        </>
      }
    >
      <Alert
        type={picked ? 'success' : 'info'}
        showIcon
        className="mb-4"
        title={
          picked
            ? t('cesium.direction.target', {
                name: picked.id,
                radius: picked.radiusKm,
                speed: (Math.abs(picked.angularSpeed) * picked.radiusKm * 36).toFixed(0),
              })
            : t('cesium.direction.hint')
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
