import { ProCard } from '@ant-design/pro-components';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { data, frequencyTicks } from './components/DataUnit.ts';

const Frequency = () => {
  const svgRef = useRef(null) as any;
  const containerRef = useRef(null) as any;

  // 格式化频率显示
  const formatFrequency = (hz: any) => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(0)}GHz`;
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(0)}MHz`;
    return `${(hz / 1e3).toFixed(0)}kHz`;
  };

  // 首先定义一个函数来计算每个类型组所需的实际高度
  const calculateTypeHeight = (ranges: any[]) => {
    // 创建一个更精确的重叠检测算法
    const levels = new Map();
    ranges.forEach((range) => {
      let level = 0;
      let placed = false;

      while (!placed) {
        const currentLevel = levels.get(level) || [];
        // 检查当前级别是否有重叠
        const hasOverlap = currentLevel.some((existing: any) => {
          const [start1, end1] = range.range;
          const [start2, end2] = existing.range;
          return !(end1 < start2 || start1 > end2);
        });

        if (!hasOverlap) {
          // 将范围添加到当前级别
          if (!levels.has(level)) {
            levels.set(level, []);
          }
          levels.get(level).push(range);
          range.level = level; // 存储级别信息
          placed = true;
        } else {
          level++;
        }
      }
    });

    const blockHeight = 25; // 每个频率块的高度
    const blockSpacing = 10; // 块之间的垂直间距
    const headerHeight = 30; // 类型标题的高度
    const paddingBottom = 20; // 底部填充

    // 计算总高度：标题 + (块高度 + 间距) * 层数 + 底部填充
    return headerHeight + (blockHeight + blockSpacing) * levels.size + paddingBottom;
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

    // 计算每个类型的高度并存储
    const typeHeights = data.map((typeData: any) => calculateTypeHeight(typeData.ranges));

    // 计算总高度
    const totalHeight = typeHeights.reduce((acc: any, height: any) => acc + height, 0) + margin.top + margin.bottom;

    // 创建 SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', totalHeight + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建虚线组
    const guidelineGroup = svg.append('g').attr('class', 'guidelines');

    const mainGroup = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建等距比例尺
    const xScale: any = d3
      .scalePoint()
      .domain(frequencyTicks.map((t: any) => t.label))
      .range([0, width])
      .padding(0.5);

    // 创建频率值映射
    const valueMap = new Map(frequencyTicks.map((t: any) => [t.label, t.value]));
    const labelMap = new Map(frequencyTicks.map((t: any) => [t.value, t.label]));

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
      .style('font-size', '12px')
      .style('max-height', '500px')
      .style('overflow-y', 'auto');

    // 创建hover tooltip
    const hoverTooltip = d3
      .select(svgRef.current.parentNode)
      .append('div')
      .attr('class', 'hover-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // 创建频率查找函数
    const findMatchingFrequencies = (hz: any) => {
      const matches: any = [];
      data.forEach((type: any) => {
        type.ranges.forEach((range: any) => {
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
    const createAxis = (position: any) => {
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
        .each(function (tickValue: any) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const tickNode = this as any;
          tickNode.addEventListener('click', (event: any) => {
            event.stopPropagation();

            // 清除之前的虚线
            guidelineGroup.selectAll('*').remove();

            // 获取刻度的x位置
            const xPos: any = xScale(tickValue);

            // 添加新的虚线
            guidelineGroup
              .append('line')
              .attr('class', 'guideline')
              .attr('x1', xPos)
              .attr('y1', 0)
              .attr('x2', xPos)
              .attr('y2', height - margin.top - margin.bottom)
              .attr('stroke', '#666')
              .attr('stroke-width', 1)
              .attr('stroke-dasharray', '4,4')
              .style('pointer-events', 'none');

            // 查找匹配的频率
            const tickHz = frequencyTicks.find((t: any) => t.label === tickValue)?.value;
            if (tickHz) {
              const matches: any = [];
              data.forEach((type: any) => {
                type.ranges.forEach((range: any) => {
                  if (tickHz >= range.range[0] && tickHz <= range.range[1]) {
                    matches.push({
                      typeName: type.typeName,
                      ...range,
                    });
                  }
                });
              });
              if (matches.length > 0) {
                tooltip
                  .style('visibility', 'visible')
                  .style('left', `${event.pageX + 10}px`)
                  .style('top', `${event.pageY - 10}px`).html(`
                    <div>
                      <div style="font-weight: bold; margin-bottom: 8px;">
                        频率: ${tickValue}
                      </div>
                      ${matches
                        .map(
                          (match: any) => `
                        <div style="margin-bottom: 8px;">
                          <div style="color: ${match.color};">
                            ${match.typeName} - ${match.frequencyName}
                          </div>
                          <div>
                            范围: ${formatFrequency(match.range[0])} - ${formatFrequency(match.range[1])}
                          </div>
                          <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px;">
${JSON.stringify(match.customInfo, null, 2)}
                          </pre>
                        </div>
                      `,
                        )
                        .join('<hr style="margin: 8px 0;">')}
                    </div>
                  `);
              }
            }
          });
        })
        .on('click', function (event, label: any) {
          const hz = valueMap.get(label);
          const matches = findMatchingFrequencies(hz);
          console.log(matches, 'matches');

          if (matches.length > 0) {
            const content = matches
              .map(
                (match: any) => `
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
        })
        .on('mouseout', function () {
          // tooltip.style('visibility', 'hidden'); // 隐藏tooltip
          // guidelineGroup.selectAll('*').remove(); // 清除虚线
        });
    };

    // 创建上下轴
    createAxis('top');
    createAxis('bottom');

    // 处理每个类型组
    let currentY = 0;
    data.forEach((typeData: any, typeIndex: any) => {
      const typeHeight = typeHeights[typeIndex];
      const typeGroup = mainGroup.append('g').attr('class', 'type-group').attr('transform', `translate(0,${currentY})`);

      // 添加类型边框
      // 使用实际计算的高度绘制边框
      typeGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', typeHeight - 20) // 减去底部填充
        .attr('fill', 'none')
        .attr('stroke', '#e5e7eb')
        .attr('rx', 4);

      // 添加类型名称
      typeGroup.append('text').attr('x', 10).attr('y', 20).text(typeData.typeName).style('font-weight', 'bold');

      // 处理频率重叠
      const overlapGroups = new Map();
      typeData.ranges.forEach((range: any) => {
        let level: any = 0;
        while (true) {
          const currentLevel = overlapGroups.get(level) || [];
          const hasOverlap = currentLevel.some(
            (r: any) => !(range.range[1] < r.range[0] || range.range[0] > r.range[1]),
          );

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
      const getXPosition = (hz: any) => {
        const label: any = labelMap.get(
          frequencyTicks.reduce((prev: any, curr: any) =>
            Math.abs(curr.value - hz) < Math.abs(prev.value - hz) ? curr : prev,
          ).value,
        );
        return xScale(label);
      };

      // 绘制频率块
      typeData.ranges.forEach((freq: any, i: any) => {
        const startX = getXPosition(freq.range[0]);
        const endX = getXPosition(freq.range[1]);
        console.log(startX, endX, 'startX, endX');
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
          .style('pointer-events', 'all');

        // 添加鼠标事件监听
        // 鼠标悬停时显示tooltip
        rect.on('mouseover', function (event) {
          console.log('mouseover', event);
          // 高亮显示当前频率块
          d3.select(this).attr('opacity', 0.9).attr('stroke', '#000').attr('stroke-width', 1);

          // 清除刻度线和刻度 tooltip
          tooltip.style('visibility', 'hidden'); // 隐藏tooltip
          guidelineGroup.selectAll('*').remove(); // 清除虚线

          // 显示hover tooltip
          hoverTooltip
            .style('visibility', 'visible')
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`).html(`
              <div>
                <div style="font-weight: bold; margin-bottom: 4px;">
                  ${typeData.typeName} - ${freq.frequencyName}
                </div>
                <div style="margin-bottom: 4px;">
                  频率范围: ${formatFrequency(freq.range[0])} - ${formatFrequency(freq.range[1])}
                </div>
                <pre style="background: #f5f5f5; padding: 8px; margin-top: 4px; border-radius: 4px;">
                  ${JSON.stringify(freq.customInfo, null, 2)}
                </pre>
              </div>
            `);
        });

        // 鼠标移出时隐藏tooltip
        rect.on('mouseout', function () {
          console.log('mouseout');
          d3.select(this).attr('opacity', 0.7).attr('stroke', 'none');

          hoverTooltip.style('visibility', 'hidden');
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
      currentY += typeHeight; // 更新下一个类型组的位置
    });

    // 点击其他区域隐藏tooltip
    // svg
    //   .append('rect') // 添加一个透明的矩形，用于点击隐藏tooltip
    //   .attr('width', width) // 设置宽度
    //   .attr('height', height) // 设置高度
    //   .attr('fill', 'none') // 设置颜色
    //   .attr('pointer-events', 'all')
    //   .on('click', () => {
    //     tooltip.style('visibility', 'hidden');
    //     guidelineGroup.selectAll('*').remove();
    //   });

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
