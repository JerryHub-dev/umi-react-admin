import { REGION_KEYS } from '@/constants/enums';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { DashboardOverview } from '@/services/types';
import { Scatter } from '@ant-design/plots';
import { useIntl } from '@umijs/max';

/**
 * 确定性抖动（按设备 ID 散列，刷新不跳）：两百多台设备大多在线率 99.x%、告警 0~3 条，
 * 同值的点完全重合，看上去只有一小撮。只挪画点位置，提示框仍显示真实值
 */
const jitter = (seed: string, span: number) => {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (((hash >>> 0) % 1000) / 1000 - 0.5) * span;
};

/** 设备健康：近 30 天在线率 × 告警数，每个点是一台设备，按大区着色 */
export default function DeviceHealth({ data, height }: { data: DashboardOverview['deviceHealth']; height: number }) {
  const intl = useIntl();
  const chart = useChartTheme();
  const regionLabel = (region: string) => intl.formatMessage({ id: `region.${region}` });
  const rows = data.map((row) => ({
    ...row,
    regionLabel: regionLabel(row.region),
    plotX: Math.min(100, row.uptime30d + jitter(`${row.id}:x`, 0.2)),
    // 0 条告警只往上抖，不画到坐标轴以下
    plotY: Math.max(0, row.alarms30d + jitter(row.id, 0.6)) + (row.alarms30d === 0 ? 0.15 : 0),
  }));

  return (
    <Scatter
      data={rows}
      xField="plotX"
      yField="plotY"
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
        // 抖动后的最小值略大于 0，显式从 0 起，保留 0 刻度
        y: { domainMin: 0, nice: true },
        size: { range: [4, 4] },
      }}
      style={{ fillOpacity: 0.6, lineWidth: 0 }}
      axis={{
        x: { title: intl.formatMessage({ id: 'dashboard.health.x' }), titleFill: chart.textSecondary },
        y: { title: intl.formatMessage({ id: 'dashboard.health.y' }), titleFill: chart.textSecondary },
      }}
      legend={{ color: { position: 'top', layout: { justifyContent: 'flex-end' } } }}
      // 提示框给字段配上文案（此前直接显示字段名 uptime30d / alarms30d）
      tooltip={{
        title: 'name',
        items: [
          { field: 'uptime30d', name: intl.formatMessage({ id: 'dashboard.health.x' }) },
          { field: 'alarms30d', name: intl.formatMessage({ id: 'dashboard.health.y' }) },
        ],
      }}
    />
  );
}
