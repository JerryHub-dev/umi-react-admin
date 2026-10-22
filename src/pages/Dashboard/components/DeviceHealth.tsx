import { REGION_KEYS } from '@/constants/enums';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { DashboardOverview } from '@/services/types';
import { Scatter } from '@ant-design/plots';
import { useIntl } from '@umijs/max';

/** 设备健康：近 30 天在线率 × 告警数，每个点是一台设备，按大区着色 */
export default function DeviceHealth({ data, height }: { data: DashboardOverview['deviceHealth']; height: number }) {
  const intl = useIntl();
  const chart = useChartTheme();
  const regionLabel = (region: string) => intl.formatMessage({ id: `region.${region}` });
  const rows = data.map((row) => ({ ...row, regionLabel: regionLabel(row.region) }));

  return (
    <Scatter
      data={rows}
      xField="uptime30d"
      yField="alarms30d"
      colorField="regionLabel"
      shapeField="point"
      sizeField={4}
      height={height}
      theme={chart.g2Theme}
      // 颜色按大区固定顺序取（与旁边的设备分布旭日图同一映射）；不给 domain 时按数据出现顺序分配，
      // 两张图里同一大区颜色不同
      scale={{
        color: { domain: REGION_KEYS.map(regionLabel), range: chart.categories },
        x: { nice: true },
        size: { range: [4, 4] },
      }}
      style={{ fillOpacity: 0.75, lineWidth: 0 }}
      axis={{
        x: { title: intl.formatMessage({ id: 'dashboard.health.x' }), titleFill: chart.textSecondary },
        y: { title: intl.formatMessage({ id: 'dashboard.health.y' }), titleFill: chart.textSecondary },
      }}
      legend={{ color: { position: 'top', layout: { justifyContent: 'flex-end' } } }}
      tooltip={{ title: 'name', items: ['uptime30d', 'alarms30d'] }}
    />
  );
}
