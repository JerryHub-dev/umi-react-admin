import { CesiumStage, useCesiumViewer } from '@/components/CesiumViewer';
import { addStationPoints } from '@/components/CesiumViewer/stations';
import DemoPage from '@/components/DemoPage';
import { useApi } from '@/hooks/useApi';
import { listAllDevices } from '@/services/ops';
import { centerGeoHash, geohashBounds } from '@/utils/MapCompute/geoHash';
import { AimOutlined, AppstoreOutlined, ClearOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, InputNumber, Listy, Segmented, Space, Tag, Typography } from 'antd';
import * as Cesium from 'cesium';
import { useEffect, useRef, useState } from 'react';

type Cell = { hash: string; count: number };

/** 计数 → 颜色：由浅蓝到深红，站点越多越「热」（深蓝星球底上要压得住，饱和度与下限 alpha 都偏高） */
const cellColor = (ratio: number) => Cesium.Color.fromHsl(0.6 - 0.6 * ratio, 0.9, 0.56, 0.4 + 0.45 * ratio);

/** 计数 → 挤出高度：把「格子里的站点数」变成看得见的立体柱（数据长在 3D 上） */
const cellHeight = (ratio: number) => 12_000 + ratio * 320_000;

export default function GeoHashPage() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const { data: devices } = useApi(listAllDevices);
  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer();
  const [precision, setPrecision] = useState(3);
  const [cells, setCells] = useState<Cell[]>([]);
  const [center, setCenter] = useState<string>();
  const [tilted, setTilted] = useState(false);
  const layerRef = useRef<Cesium.CustomDataSource>(null);

  // 站点点位：设备数据与 viewer 都就绪后画一次
  useEffect(() => {
    if (!viewer || !devices) return undefined;
    const points = addStationPoints(viewer, devices, 7);
    const layer = new Cesium.CustomDataSource('geohash');
    viewer.dataSources.add(layer);
    layerRef.current = layer;
    return () => {
      if (viewer.isDestroyed()) return;
      viewer.scene.primitives.remove(points);
      viewer.dataSources.remove(layer, true);
    };
  }, [viewer, devices]);

  const drawCell = (hash: string, color: Cesium.Color, label?: string, ratio?: number) => {
    const b = geohashBounds(hash);
    if (!b) return undefined;
    return layerRef.current?.entities.add({
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(b.longitudeMin, b.latitudeMin, b.longitudeMax, b.latitudeMax),
        material: color,
        // 有占比就挤出成 3D 柱：高度即数据（中心格定位那类临时高亮仍是贴地面）
        ...(ratio !== undefined ? { height: 0, extrudedHeight: cellHeight(ratio) } : {}),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
      },
      position: label
        ? Cesium.Cartesian3.fromDegrees((b.longitudeMin + b.longitudeMax) / 2, (b.latitudeMin + b.latitudeMax) / 2)
        : undefined,
      label: label
        ? { text: label, font: '13px sans-serif', fillColor: Cesium.Color.WHITE, showBackground: true }
        : undefined,
    });
  };

  /** 每个站点按当前精度编码，按网格计数后画出来（GeoHash 最典型的用法：空间分桶） */
  const aggregate = () => {
    if (!devices || !layerRef.current) return;
    layerRef.current.entities.removeAll();
    const counts = new Map<string, number>();
    devices.forEach((d) => {
      const hash = centerGeoHash(d.lat, d.lng, precision);
      counts.set(hash, (counts.get(hash) ?? 0) + 1);
    });
    const list = [...counts.entries()].map(([hash, count]) => ({ hash, count })).sort((a, b) => b.count - a.count);
    const max = list[0]?.count ?? 1;
    list.forEach((cell) => drawCell(cell.hash, cellColor(cell.count / max), String(cell.count), cell.count / max));
    setCells(list);
    setCenter(undefined);
  };

  // 进页自动聚合、精度变化自动重算：演示一进来就是「密度立方」，不用先找按钮
  useEffect(() => {
    if (!viewer || !devices || !layerRef.current) return;
    aggregate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, devices, precision]);

  /** 俯视 ↔ 侧视：侧视才能看出挤出高度的数据差异，这是这页的「定妆镜头」 */
  const flyView = (next: boolean) => {
    setTilted(next);
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: next
        ? Cesium.Cartesian3.fromDegrees(104, 24.5, 3_400_000)
        : Cesium.Cartesian3.fromDegrees(108, 35, 7_000_000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(next ? -36 : -90), roll: 0 },
      duration: 1.8,
    });
  };

  const locateCenter = () => {
    if (!viewer || !layerRef.current) return;
    const rect = viewer.camera.computeViewRectangle();
    if (!rect) return;
    const c = Cesium.Rectangle.center(rect);
    const lng = Cesium.Math.toDegrees(c.longitude);
    const lat = Cesium.Math.toDegrees(c.latitude);
    const hash = centerGeoHash(lat, lng, precision);
    const entity = drawCell(hash, Cesium.Color.ORANGE.withAlpha(0.45));
    if (entity) viewer.flyTo(entity, { duration: 1.2 });
    setCenter(t('cesium.geohash.centerResult', { lng: lng.toFixed(3), lat: lat.toFixed(3), hash }));
  };

  const clear = () => {
    layerRef.current?.entities.removeAll();
    setCells([]);
    setCenter(undefined);
  };

  return (
    <DemoPage
      descriptionId="page.cesium.geohash.desc"
      source="src/pages/Map/Cesium/GeoHash.tsx"
      extra={
        <>
          <Segmented
            value={tilted ? 'tilt' : 'top'}
            onChange={(value) => flyView(value === 'tilt')}
            options={[
              { value: 'top', label: t('cesium.geohash.viewTop') },
              { value: 'tilt', label: t('cesium.geohash.viewTilt') },
            ]}
          />
          <Space.Compact>
            <Button disabled>{t('cesium.geohash.precision')}</Button>
            <InputNumber min={2} max={6} value={precision} onChange={(v) => v && setPrecision(v)} className="w-16" />
          </Space.Compact>
          <Button type="primary" icon={<AppstoreOutlined />} disabled={!viewer || !devices} onClick={aggregate}>
            {t('cesium.geohash.aggregate')}
          </Button>
          <Button icon={<AimOutlined />} disabled={!viewer} onClick={locateCenter}>
            {t('cesium.geohash.center')}
          </Button>
          <Button icon={<ClearOutlined />} onClick={clear}>
            {t('map.clear')}
          </Button>
        </>
      }
    >
      <Alert type="info" showIcon className="mb-4" title={t('cesium.geohash.hint')} />
      <div className="flex flex-col gap-4 xl:flex-row">
        <Card className="min-w-0 flex-1" styles={{ body: { padding: 0 } }}>
          <CesiumStage
            containerRef={containerRef}
            viewer={viewer}
            error={error}
            basemapFailed={basemapFailed}
            onRetryBasemap={retry}
          />
        </Card>
        {(cells.length > 0 || center) && (
          <Card className="xl:w-72" size="small">
            {center && <Typography.Paragraph>{center}</Typography.Paragraph>}
            {cells.length > 0 && (
              <>
                <Typography.Paragraph type="secondary">
                  {t('cesium.geohash.cells', { cells: cells.length, max: cells[0].count })}
                </Typography.Paragraph>
                <Listy
                  items={cells.slice(0, 12)}
                  rowKey="hash"
                  styles={{ item: { paddingBlock: 8, paddingInline: 0 } }}
                  itemRender={(cell) => (
                    <div className="flex items-center justify-between gap-2">
                      <Typography.Text code>{cell.hash}</Typography.Text>
                      <Tag>{cell.count}</Tag>
                    </div>
                  )}
                />
              </>
            )}
          </Card>
        )}
      </div>
    </DemoPage>
  );
}
