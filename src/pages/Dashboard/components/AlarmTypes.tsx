import { ALARM_TYPE_COLOR, DEVICE_STATUS_CSS } from '@/constants/semantic';
import { useChartTheme } from '@/hooks/useChartTheme';
import type { DashboardOverview } from '@/services/types';
import { formatNumber } from '@/utils/format';
import { Pie } from '@ant-design/plots';
import { useIntl } from '@umijs/max';

/** 近 30 天告警类型占比（环图，中心显示总数） */
export default function AlarmTypes({ data, height }: { data: DashboardOverview['alarmTypes']; height: number }) {
  const intl = useIntl();
  const chart = useChartTheme();
  const rows = [...data]
    .sort((a, b) => b.count - a.count)
    .map((row) => ({ ...row, typeLabel: intl.formatMessage({ id: `alarmType.${row.type}` }) }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  // 灰色取实色（与地图上的离线点位同值）：图表的 grey 是 25% 透明的禁用文字色，做扇区太淡
  const typeColor = (type: keyof typeof ALARM_TYPE_COLOR) =>
    ALARM_TYPE_COLOR[type] === 'grey' ? DEVICE_STATUS_CSS.offline : chart.color(ALARM_TYPE_COLOR[type]);

  return (
    <Pie
      data={rows}
      angleField="count"
      colorField="typeLabel"
      innerRadius={0.64}
      height={height}
      theme={chart.g2Theme}
      scale={{ color: { domain: rows.map((row) => row.typeLabel), range: rows.map((row) => typeColor(row.type)) } }}
      label={false}
      legend={{ color: { position: 'right', rowPadding: 6 } }}
      tooltip={{ items: [{ field: 'count', name: intl.formatMessage({ id: 'dashboard.types.total' }) }] }}
      annotations={[
        {
          type: 'text',
          style: {
            text: formatNumber(total, intl.locale),
            x: '50%',
            y: '46%',
            textAlign: 'center',
            fontSize: 26,
            fontWeight: 600,
            fill: chart.text,
          },
        },
        {
          type: 'text',
          style: {
            text: intl.formatMessage({ id: 'dashboard.types.total' }),
            x: '50%',
            y: '57%',
            textAlign: 'center',
            fontSize: 12,
            fill: chart.textSecondary,
          },
        },
      ]}
    />
  );
}
