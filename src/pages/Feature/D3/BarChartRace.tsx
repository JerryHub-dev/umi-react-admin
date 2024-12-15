/* eslint-disable */
import { ProCard } from '@ant-design/pro-components';
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import dataBar from './components/data.json';

const BarChartRace = () => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // 深拷贝数据以避免修改原始数据
    const data = JSON.parse(JSON.stringify(dataBar));

    // 设置基本参数
    const duration = 250; // 每一帧动画的持续时间
    const n = 12; // 显示的最大条目数
    const barSize = 48; // 条形图的高度
    const margin = { top: 16, right: 6, bottom: 6, left: 0 };
    const width = 975; // SVG 的宽度
    const height = margin.top + barSize * n + margin.bottom; // SVG 的高度

    // 清除已有的 SVG 内容
    d3.select(svgRef.current).selectAll('*').remove();
  }, []);

  return (
    <>
      <ProCard>
        <svg ref={svgRef} width="100%" height="600"></svg>
      </ProCard>
    </>
  );
};

export default BarChartRace;
