import { ProCard } from '@ant-design/pro-components';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

const Frequency = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // 清除之前的可视化
    d3.select(svgRef.current).selectAll('*').remove();

    // 频率刻度数据
    const frequencies = [
      { value: 0, label: '0kHz' },
      { value: 500, label: '500kHz' },
      { value: 1000, label: '1000kHz' },
      { value: 100000, label: '100MHz' },
      { value: 200000, label: '200MHz' },
      { value: 300000, label: '300MHz' },
      { value: 400000, label: '400MHz' },
      { value: 500000, label: '500MHz' },
      { value: 600000, label: '600MHz' },
      { value: 700000, label: '700MHz' },
      { value: 800000, label: '800MHz' },
      { value: 900000, label: '900MHz' },
      { value: 1000000, label: '1000MHz' },
      { value: 15000000, label: '15GHz' },
      { value: 30000000, label: '30GHz' },
      { value: 45000000, label: '45GHz' },
      { value: 60000000, label: '60GHz' },
    ];

    // 范围数据，为每个范围添加自定义颜色和额外信息
    const ranges = [
      {
        name: 'WiFi 2.4GHz',
        ranges: [
          {
            start: 240000,
            end: 250000,
            color: '#FF6B6B', // 自定义颜色
            info: {
              protocol: 'IEEE 802.11',
              channels: '1-14',
              bandwidth: '20/40 MHz',
              maxSpeed: '300 Mbps',
            },
          },
        ],
      },
      {
        name: 'WiFi 5GHz',
        ranges: [
          {
            start: 500000,
            end: 700000,
            color: '#4ECDC4', // 自定义颜色
            info: {
              protocol: 'IEEE 802.11ac',
              channels: '36-165',
              bandwidth: '20/40/80/160 MHz',
              maxSpeed: '3.5 Gbps',
            },
          },
        ],
      },
      {
        name: '5G',
        ranges: [
          {
            start: 600000,
            end: 900000,
            color: '#45B7D1', // 自定义颜色
            info: {
              band: 'Sub-6 FR1',
              bandwidth: '100 MHz',
              usage: 'Urban coverage',
              features: 'Better building penetration',
            },
          },
          {
            start: 15000000,
            end: 45000000,
            color: '#96CEB4', // 自定义颜色
            info: {
              band: 'mmWave FR2',
              bandwidth: '400 MHz',
              usage: 'Dense urban areas',
              features: 'Ultra-high speeds',
            },
          },
        ],
      },
    ];

    // 设置尺寸和边距
    const margin = { top: 60, right: 40, bottom: 60, left: 100 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    const bandHeight = 30;
    const typeSpacing = 80;

    // 创建SVG容器
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建线性比例尺
    const xScale = d3
      .scaleLinear()
      .domain([0, frequencies.length - 1])
      .range([0, width]);

    // 创建x轴
    const xAxis = (g: any, transform: any) => {
      g.attr('transform', transform)
        .call(
          d3
            .axisBottom(xScale)
            .tickFormat((d) => frequencies[d].label)
            .tickValues(d3.range(frequencies.length)),
        )
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    };

    // 添加上下轴
    svg
      .append('g')
      .attr('class', 'x-axis top')
      .call((g) => xAxis(g, 'translate(0,0)'));

    svg
      .append('g')
      .attr('class', 'x-axis bottom')
      .call((g) => xAxis(g, `translate(0,${height})`));

    // 显示频段详细信息
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const showRangeInfo = (range: any, event: any, element: any) => {
      // 移除现有的信息框
      svg.selectAll('.range-info').remove();

      // 获取鼠标位置
      const [mouseX, mouseY] = d3.pointer(event);

      // 创建信息框
      const info = svg
        .append('g')
        .attr('class', 'range-info')
        .attr('transform', `translate(${mouseX + 10},${mouseY - 10})`);

      // 创建信息框背景
      const padding = 10;
      const infoItems = Object.entries(range.info);
      const boxWidth = 200;
      const boxHeight = (infoItems.length + 1) * 20 + padding * 2;

      // 绘制矩形
      info
        .append('rect')
        .attr('width', boxWidth)
        .attr('height', boxHeight)
        .attr('fill', 'white')
        .attr('stroke', range.color)
        .attr('rx', 5)
        .attr('ry', 5)
        .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))');

      // 添加标题
      info
        .append('text')
        .attr('x', padding)
        .attr('y', padding + 15)
        .text(`${range.start / 1000}MHz - ${range.end / 1000}MHz`)
        .style('font-weight', 'bold')
        .style('font-size', '12px');

      // 添加详细信息
      infoItems.forEach(([key, value], i) => {
        info
          .append('text')
          .attr('x', padding)
          .attr('y', padding + 35 + i * 20)
          .text(`${key}: ${value}`)
          .style('font-size', '12px')
          .style('fill', '#666');
      });
    };

    // 绘制频率范围
    ranges.forEach((typeRange, typeIndex) => {
      const baseY = typeIndex * typeSpacing;

      // 添加类型标签
      svg
        .append('text')
        .attr('x', -10)
        .attr('y', baseY + bandHeight)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'red')
        .text(typeRange.name)
        .style('font-size', '14px')
        .style('font-weight', 'bold');

      // 绘制每个范围
      typeRange.ranges.forEach((range, rangeIndex) => {
        const startIndex = frequencies.findIndex((f) => f.value >= range.start);
        const endIndex = frequencies.findIndex((f) => f.value >= range.end);
        const yPosition = baseY + rangeIndex * (bandHeight + 5);

        // 绘制范围矩形
        const rangeRect = svg
          .append('rect')
          .attr('x', xScale(startIndex))
          .attr('y', yPosition)
          .attr('width', xScale(endIndex) - xScale(startIndex))
          .attr('height', bandHeight)
          .attr('fill', range.color)
          .attr('opacity', 0.5)
          .attr('rx', 5)
          .attr('ry', 5)
          .style('cursor', 'pointer');

        // 添加交互效果
        rangeRect
          .on('mouseover', function () {
            d3.select(this).transition().duration(200).attr('opacity', 0.8);
          })
          .on('mouseout', function () {
            d3.select(this).transition().duration(200).attr('opacity', 0.5);
            // 移除信息框
            svg.selectAll('.range-info').remove();
          })
          .on('click', function (event) {
            // 显示详细信息
            showRangeInfo(range, event, this);
            // 阻止事件冒泡
            event.stopPropagation();
          });
      });
    });

    // 点击空白处清除信息框
    svg.on('click', () => {
      svg.selectAll('.range-info').remove();
    });

    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
      .tick:hover {
        font-weight: bold;
      }
      .range-info {
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <ProCard>
        {/* <div>Frequency</div> */}
        <div className="w-full overflow-x-auto">
          <svg ref={svgRef} className="w-full" />
        </div>
      </ProCard>
    </>
  );
};

export default Frequency;
