import type { Symbol as MilSymbolInstance, SymbolOptions } from 'milsymbol';
import * as milsymbolModule from 'milsymbol';
import { AFFILIATION_CSS, type Affiliation } from './palette';

/**
 * milsymbol 的运行时构造器解析：包的 browser 字段指向 UMD 构建（module.exports = {...}），
 * webpack 命名导入 `{ Symbol }` 会得到 undefined（实测 is not a constructor）；
 * ESM 入口则是命名导出。两种形态都兜住：优先命名导出，回退 default 上的属性。
 */
type MilSymbolCtor = new (code: string, options?: SymbolOptions) => MilSymbolInstance;

const resolveMilSymbolCtor = (): MilSymbolCtor => {
  const ns = milsymbolModule as unknown as Record<string, unknown>;
  const fromDefault = (ns.default as Record<string, unknown> | undefined)?.Symbol;
  const ctor = ns.Symbol ?? fromDefault;
  if (typeof ctor !== 'function') {
    throw new Error('milsymbol: Symbol constructor not found (check bundler interop)');
  }
  return ctor as MilSymbolCtor;
};

/** 目标维度（与 2525C letter-based SIDC 的 battle dimension 对应） */
export type TrackDimension = 'air' | 'sea' | 'ground';

/**
 * MIL-STD-2525C 字母式 SIDC 预设：
 * 编码 = 第 1 位编码方案(S 作战符号) + 第 2 位归属(F/N/U/S/H) + 第 3 位维度(A/S/G) + 第 4 位状态
 * + 功能码(MF 固定翼 / C 水面战斗舰艇 / X 水面非战斗船舶 / 空 = 仅维度框 / ES 传感器 / ESR 雷达)。
 * 归属只能写在第 2 位：曾把 unknown/hostile 写成 `UFA…`/`HFA…`（首位被当成编码方案），
 * milsymbol 判为无效码并按第 2 位的 F 画成友方蓝框。symbols.test.ts 逐个断言有效且归属一致。
 * 归属色遵循 2525 惯例（见 palette.AFFILIATION_CSS）。
 */
export const SIDC: Record<TrackDimension, Record<Affiliation, string>> = {
  air: {
    friend: 'SFA-MF-----',
    neutral: 'SNA-MF-----',
    unknown: 'SUA-MF-----',
    suspect: 'SSA-MF-----',
    hostile: 'SHA-MF-----',
  },
  sea: {
    friend: 'SFS-C------',
    neutral: 'SNS-X------',
    unknown: 'SUS--------',
    suspect: 'SSS--------',
    hostile: 'SHS-C------',
  },
  ground: {
    friend: 'SFG-ES-----',
    neutral: 'SNG-ES-----',
    unknown: 'SUG-ES-----',
    suspect: 'SSG-ES-----',
    hostile: 'SHG-ES-----',
  },
};

export const GROUND_RADAR_SIDC = 'SFG-ESR----';

export interface MilitarySymbol {
  /** billboard 的 image（SVG dataURL） */
  dataUrl: string;
  /** 符号的真实像素宽高：带附加文本（uniqueDesignation）或非对称画框时不是正方形，
   *  billboard 必须分别传 width/height，否则会被拉伸 */
  width: number;
  height: number;
  /** 地理位置锚点（milsymbol getAnchor，画框中心；带文本时偏离图片中心） */
  anchor: { x: number; y: number };
  /** 让锚点而不是图片中心落在地理位置所需的 pixelOffset（CENTER/CENTER 原点下） */
  offset: { x: number; y: number };
}

const cache = new Map<string, MilitarySymbol>();

/**
 * 渲染军标符号（缓存按 key 复用）。附加文本（uniqueDesignation 等）参与缓存键。
 * 返回的 dataUrl 直接作为 billboard image；anchor 用于 pixelOffset 校正。
 */
export const militarySymbol = (
  dimension: TrackDimension,
  affiliation: Affiliation,
  { size = 30, label, extra }: { size?: number; label?: string; extra?: Partial<SymbolOptions> } = {},
): MilitarySymbol => {
  const sidc = SIDC[dimension][affiliation];
  const key = `${sidc}:${size}:${label ?? ''}:${JSON.stringify(extra ?? {})}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const MilSymbol = resolveMilSymbolCtor();
  const symbol = new MilSymbol(sidc, {
    size,
    ...(label ? { uniqueDesignation: label } : {}),
    ...(extra as SymbolOptions),
  });
  const { width, height } = symbol.getSize();
  const rawAnchor = symbol.getAnchor();
  const anchor =
    Number.isFinite(rawAnchor?.x) && Number.isFinite(rawAnchor?.y) ? rawAnchor : { x: width / 2, y: height / 2 };
  const result: MilitarySymbol = {
    dataUrl: symbol.toDataURL(),
    width: Math.round(width),
    height: Math.round(height),
    anchor,
    offset: { x: Math.round(width / 2 - anchor.x), y: Math.round(height / 2 - anchor.y) },
  };
  cache.set(key, result);
  return result;
};

/** 归属 → 语义色（图例/详情卡与军标同源） */
export const affiliationCss = (affiliation: Affiliation) => AFFILIATION_CSS[affiliation];
