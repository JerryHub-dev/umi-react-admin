import { CesiumStage, useCesiumViewer } from '@/components/CesiumViewer';
import { addScanRing } from '@/components/CesiumViewer/effects';
import DemoPage from '@/components/DemoPage';
import { PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Segmented } from 'antd';
import * as Cesium from 'cesium';
import { useEffect, useRef, useState } from 'react';
import { coverageRadiusKm, REGION, renderHeatCanvas, strengthColor, transmitters } from './fieldModel';

type Mode = 'heat' | 'shells' | 'both';

const SHELLS: { threshold: number; alpha: number }[] = [
  { threshold: 60, alpha: 0.1 },
  { threshold: 45, alpha: 0.06 },
];

/**
 * 场强页：同一套传播模型（fieldModel.ts）驱动两种互补的表示——
 * 动态热力（canvas → 贴图，随时间呼吸）与覆盖壳层（60/45 dB 等场强覆盖体）。
 * 数据全部程序生成，不依赖静态 JSON；发射机持续扫描，构成页面的「心跳」。
 */
export default function Heatmap() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const [mode, setMode] = useState<Mode>('both');
  const [playing, setPlaying] = useState(true);
  const heatRef = useRef<Cesium.Entity>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<Cesium.CustomDataSource>(null);
  const timeRef = useRef({ elapsed: 0, last: performance.now() });

  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer({
    home: [106.64, 29.67, 78_000],
    entry: { pitch: Cesium.Math.toRadians(-30) },
    onReady: (instance) => {
      const layer = new Cesium.CustomDataSource('field');
      instance.dataSources.add(layer);
      layerRef.current = layer;

      // 热力贴图层：一个覆盖全区域的矩形，材质每 200ms 换一张新画的 canvas
      const canvas = document.createElement('canvas');
      canvas.width = 520;
      canvas.height = 340;
      canvasRef.current = canvas;
      renderHeatCanvas(canvas, 0);
      heatRef.current = instance.entities.add({
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(REGION.west, REGION.south, REGION.east, REGION.north),
          material: new Cesium.ImageMaterialProperty({ image: canvas, transparent: true }),
        },
      });

      // 发射机：标记 + 各自的覆盖壳层 + 持续扫描
      transmitters().forEach((tx) => {
        layer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(tx.lng, tx.lat),
          point: {
            pixelSize: 9,
            color: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#1677ff'),
            outlineWidth: 2,
          },
          label: {
            text: tx.id,
            font: '12px sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -16),
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
          },
        });
        SHELLS.forEach(({ threshold, alpha }) => {
          const r = coverageRadiusKm(tx.power, threshold) * 1000;
          layer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(tx.lng, tx.lat),
            ellipsoid: {
              radii: new Cesium.Cartesian3(r, r, r * 0.32),
              material: Cesium.Color.fromCssColorString(strengthColor(threshold + 10)).withAlpha(alpha),
              slicePartitions: 48,
              stackPartitions: 32,
            },
          });
        });
        addScanRing(instance, {
          lon: tx.lng,
          lat: tx.lat,
          color: '#1677ff',
          maxRadius: coverageRadiusKm(tx.power, 55) * 1000,
          duration: 3.4,
        });
      });
      return () => {
        if (!instance.isDestroyed()) instance.dataSources.remove(layer, true);
      };
    },
  });

  // 热力呼吸：暂停即冻结（elapsed 不再前进），200ms 重绘一次 canvas 并换材质
  useEffect(() => {
    if (!viewer || !canvasRef.current || !heatRef.current?.rectangle) return undefined;
    const canvas = canvasRef.current;
    const rectangle = heatRef.current.rectangle;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const state = timeRef.current;
      if (playing) state.elapsed += (now - state.last) / 1000;
      state.last = now;
      renderHeatCanvas(canvas, state.elapsed);
      rectangle.material = new Cesium.ImageMaterialProperty({ image: canvas, transparent: true });
    }, 200);
    return () => window.clearInterval(timer);
  }, [viewer, playing]);

  // 模式切换：热力矩形与壳层/扫描各自显隐
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const heat = heatRef.current;
    if (heat) heat.show = mode !== 'shells';
    const layer = layerRef.current;
    if (layer) layer.entities.show = mode !== 'heat';
  }, [viewer, mode]);

  const stops: [number, string][] = [
    [25, '#2f54eb'],
    [40, '#52c41a'],
    [60, '#fadb14'],
    [75, '#fa8c16'],
    [Infinity, '#f5222d'],
  ];
  const legend = (
    <Card size="small" className="opacity-95">
      <div className="mb-1 text-xs">{t('cesium.heatmap.legend')}</div>
      <div className="flex gap-1 text-[11px]">
        {stops.map(([limit, color], index) => (
          <div key={color} className="text-center">
            <div className="h-2 w-10 rounded-sm" style={{ background: color }} />
            {index === stops.length - 1 ? `> ${stops[index - 1][0]}` : `≤ ${limit}`}
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <DemoPage
      descriptionId="page.cesium.heatmap.desc"
      source="src/pages/Map/Cesium/fieldModel.ts"
      extra={
        <>
          <Segmented
            value={mode}
            onChange={(value) => setMode(value as Mode)}
            options={[
              { value: 'heat', label: t('cesium.heatmap.modeHeat') },
              { value: 'shells', label: t('cesium.heatmap.modeShells') },
              { value: 'both', label: t('cesium.heatmap.modeBoth') },
            ]}
          />
          <Button
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setPlaying((v) => !v)}
          >
            {t(playing ? 'cesium.heatmap.pause' : 'cesium.heatmap.play')}
          </Button>
        </>
      }
    >
      <Alert type="info" showIcon className="mb-4" title={t('cesium.heatmap.hint')} />
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
