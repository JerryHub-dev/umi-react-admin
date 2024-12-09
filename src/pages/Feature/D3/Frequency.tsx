/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// 不检查该文件
import { ProCard } from '@ant-design/pro-components';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

const Frequency = () => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // 频率刻度点数组
  const frequencyTicks = [
    { value: 0, label: '0kHz' },
    { value: 500000, label: '500kHz' },
    { value: 1000000, label: '1000kHz' },
    { value: 100000000, label: '100MHz' },
    { value: 200000000, label: '200MHz' },
    { value: 300000000, label: '300MHz' },
    { value: 400000000, label: '400MHz' },
    { value: 500000000, label: '500MHz' },
    { value: 600000000, label: '600MHz' },
    { value: 700000000, label: '700MHz' },
    { value: 800000000, label: '800MHz' },
    { value: 900000000, label: '900MHz' },
    { value: 1000000000, label: '1000MHz' },
    { value: 15000000000, label: '15GHz' },
    { value: 30000000000, label: '30GHz' },
    { value: 45000000000, label: '45GHz' },
    { value: 60000000000, label: '60GHz' },
  ];

  const data = [
    {
      typeName: '无线设备',
      ranges: [
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: false, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
      ],
    },
    {
      typeName: '无线设备',
      ranges: [
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
      ],
    },
    {
      typeName: '无线设备',
      ranges: [
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
      ],
    },
    {
      typeName: '无线设备',
      ranges: [
        {
          frequencyName: '设备A',
          range: [100000, 500000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
        {
          frequencyName: '设备A',
          range: [10000000, 50000000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: false },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
        {
          frequencyName: '设备A',
          range: [1000000, 500000000], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: true },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
        {
          frequencyName: '设备A',
          range: [0, 0], // 100kHz-500kHz
          color: '#4299e1',
          slashStyle: { forward: true, backward: true },
          customInfo: {
            description: '测试设备',
            power: '10W',
            status: '正常',
          },
        },
      ],
    },
  ];

  // 格式化频率显示
  const formatFrequency = (hz) => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(0)}GHz`;
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(0)}MHz`;
    return `${(hz / 1e3).toFixed(0)}kHz`;
  };

  useEffect(() => {
    if (!svgRef.current || !data?.length) return;

    // 清除现有内容
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置尺寸和边距
    const margin = { top: 50, right: 40, bottom: 50, left: 40 };
    const width = Math.max(containerRef.current.clientWidth - margin.left - margin.right, 800);
    const typeHeight = 150;
    const height = data.length * typeHeight + margin.top + margin.bottom;

    // 创建 SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建等距比例尺
    const xScale = d3
      .scalePoint()
      .domain(frequencyTicks.map((t) => t.label))
      .range([0, width])
      .padding(0.5);

    // 创建频率值映射
    const valueMap = new Map(frequencyTicks.map((t) => [t.label, t.value]));
    const labelMap = new Map(frequencyTicks.map((t) => [t.value, t.label]));

    // 创建tooltip
    const tooltip = d3
      .select(containerRef.current)
      .append('div')
      .attr('class', 'frequency-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '12px')
      .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
      .style('z-index', '9999')
      .style('max-width', '300px')
      .style('font-size', '12px');

    // 创建频率查找函数
    const findMatchingFrequencies = (hz) => {
      const matches = [];
      data.forEach((type) => {
        type.ranges.forEach((range) => {
          if (hz >= range.range[0] && hz <= range.range[1]) {
            matches.push({
              typeName: type.typeName,
              ...range,
            });
          }
        });
      });
      return matches;
    };

    // 创建轴
    const createAxis = (position) => {
      const axis = position === 'top' ? d3.axisTop(xScale) : d3.axisBottom(xScale);
      const yPos = position === 'top' ? 0 : height - margin.top - margin.bottom;

      const axisGroup = svg
        .append('g')
        .attr('class', `${position}-axis`)
        .attr('transform', `translate(0,${yPos})`)
        .call(axis);

      // 添加刻度点击事件
      axisGroup
        .selectAll('.tick')
        .style('cursor', 'pointer')
        .on('click', function (event, label) {
          const hz = valueMap.get(label);
          const matches = findMatchingFrequencies(hz);
          console.log(matches, 'matches');

          if (matches.length > 0) {
            const content = matches
              .map(
                (match) => `
              <div style="margin-bottom: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px;">
                  ${match.typeName} - ${match.frequencyName}
                </div>
                <div style="margin-bottom: 4px;">
                  频率范围: ${formatFrequency(match.range[0])} - ${formatFrequency(match.range[1])}
                </div>
                <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px; white-space: pre-wrap;">
${JSON.stringify(match.customInfo, null, 2)}
                </pre>
              </div>
            `,
              )
              .join('<hr style="margin: 8px 0;">');

            tooltip
              .style('visibility', 'visible')
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY + 10}px`)
              .html(content);
          }
        });
    };

    // 创建上下轴
    createAxis('top');
    createAxis('bottom');

    // 处理每个类型组
    data.forEach((typeData, typeIndex) => {
      const typeGroup = svg
        .append('g')
        .attr('class', 'type-group')
        .attr('transform', `translate(0,${typeIndex * typeHeight + 20})`);

      // 添加类型边框
      typeGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', typeHeight - 30)
        .attr('fill', 'none')
        .attr('stroke', '#e5e7eb')
        .attr('rx', 4);

      // 添加类型名称
      typeGroup.append('text').attr('x', 10).attr('y', 20).text(typeData.typeName).style('font-weight', 'bold');

      // 处理频率重叠
      const overlapGroups = new Map();
      typeData.ranges.forEach((range) => {
        let level = 0;
        while (true) {
          const currentLevel = overlapGroups.get(level) || [];
          const hasOverlap = currentLevel.some((r) => !(range.range[1] < r.range[0] || range.range[0] > r.range[1]));

          if (!hasOverlap) {
            if (!overlapGroups.has(level)) {
              overlapGroups.set(level, []);
            }
            overlapGroups.get(level).push(range);
            range.level = level;
            break;
          }
          level++;
        }
      });

      // 映射频率到刻度位置
      const getXPosition = (hz) => {
        const label = labelMap.get(
          frequencyTicks.reduce((prev, curr) => (Math.abs(curr.value - hz) < Math.abs(prev.value - hz) ? curr : prev))
            .value,
        );
        return xScale(label);
      };

      // 绘制频率块
      typeData.ranges.forEach((freq, i) => {
        const startX = getXPosition(freq.range[0]);
        const endX = getXPosition(freq.range[1]);
        const blockHeight = 25;
        const yOffset = 35 + freq.level * (blockHeight + 5);

        // 创建频率块组
        const freqGroup = typeGroup
          .append('g')
          .attr('class', 'frequency-block')
          .attr('transform', `translate(0,${yOffset})`);

        // 添加频率矩形
        const rect = freqGroup
          .append('rect')
          .attr('x', startX)
          .attr('y', 0)
          .attr('width', Math.max(endX - startX, 2))
          .attr('height', blockHeight)
          .attr('fill', freq.color)
          .attr('rx', 3)
          .style('cursor', 'pointer')
          .attr('opacity', 0.7)
          .on('click', (event) => {
            const matches = findMatchingFrequencies(freq.range[0]);
            console.log(matches, 'matches');

            if (matches.length > 0) {
              const content = matches
                .map(
                  (match) => `
                <div style="margin-bottom: 8px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">
                    ${match.typeName} - ${match.frequencyName}
                  </div>
                  <div style="margin-bottom: 4px;">
                    频率范围: ${formatFrequency(match.range[0])} - ${formatFrequency(match.range[1])}
                  </div>
                  <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px; white-space: pre-wrap;">
${JSON.stringify(match.customInfo, null, 2)}
                  </pre>
                </div>
              `,
                )
                .join('<hr style="margin: 8px 0;">');

              tooltip
                .style('visibility', 'visible')
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY + 10}px`)
                .html(content);
            }
          });

        // 添加斜线图案
        if (freq.slashStyle?.forward || freq.slashStyle?.backward) {
          const patternId = `pattern-${typeIndex}-${i}`;
          const defs = svg.append('defs');
          const pattern = defs
            .append('pattern')
            .attr('id', patternId)
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 10)
            .attr('height', 10);

          // 添加斜线
          if (freq.slashStyle.forward) {
            pattern
              .append('path')
              .attr('d', 'M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2')
              .attr('stroke', 'black')
              .attr('stroke-width', 1)
              .attr('opacity', 0.3);
          }

          // 添加反向斜线路径为斜线路径的反方向
          if (freq.slashStyle.backward) {
            pattern
              .append('path')
              // .attr('d', 'M-1,9 l12,-12 M-1,19 l22,-22 M-1,29 l32,-32')
              .attr('d', 'M-1,-1 l2,2 M0,0 l10,10 M9,9 l2,2') // 修改为反方向
              .attr('stroke', 'black')
              .attr('stroke-width', 1)
              .attr('opacity', 0.3);
          }

          // 添加矩形
          freqGroup
            .append('rect')
            .attr('x', startX)
            .attr('y', 0)
            .attr('width', Math.max(endX - startX, 2))
            .attr('height', blockHeight)
            .attr('fill', `url(#${patternId})`)
            .attr('rx', 3)
            .style('pointer-events', 'none'); // 确保斜线不会干扰点击事件
        }
      });
    });

    // 点击其他区域隐藏tooltip
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('click', () => {
        tooltip.style('visibility', 'hidden');
      });

    // 清理函数
    return () => {
      tooltip.remove();
    };
  }, []);

  return (
    <>
      <ProCard>
        <div ref={containerRef} className="w-full overflow-x-auto">
          <svg ref={svgRef} className="min-w-full" />
        </div>
      </ProCard>
    </>
  );
};

export default Frequency;
