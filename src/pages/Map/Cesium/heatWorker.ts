/// <reference lib="webworker" />
import { gridValues } from './fieldModel';

/**
 * 场强计算 Worker：接收 {cols, rows, seconds, powers?}，回传 Float32Array（transfer 零拷贝）。
 * 网格约定与 contours.ts/heatRender.ts 一致：行优先、row 0 = 北。
 * 计算是纯 CPU（43k 格点 × fBm），放主线程会顶掉渲染帧，故整段挪进 Worker；
 * Worker 不可用时页面自动降级为主线程低分辨率采样。
 */
self.onmessage = (event: MessageEvent<{ cols: number; rows: number; seconds: number; powers?: number[] }>) => {
  const { cols, rows, seconds, powers } = event.data;
  const values = gridValues(cols, rows, seconds, powers);
  (self as unknown as Worker).postMessage({ cols, rows, seconds, values }, [values.buffer]);
};
