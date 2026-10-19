import * as milsymbolModule from 'milsymbol';
import { describe, expect, it } from 'vitest';
import { GROUND_RADAR_SIDC, SIDC, militarySymbol } from './symbols';

const ns = milsymbolModule as unknown as { Symbol?: unknown; default?: { Symbol?: unknown } };
const MilSymbol = (ns.Symbol ?? ns.default?.Symbol) as new (
  code: string,
  options?: object,
) => {
  isValid: () => boolean;
  getMetadata: () => { affiliation: string };
};

/** milsymbol 的归属口径：suspect 按 2525C 用敌意画框（颜色差异由 AFFILIATION_CSS 表达） */
const EXPECTED_AFFILIATION = {
  friend: 'Friend',
  neutral: 'Neutral',
  unknown: 'Unknown',
  suspect: 'Hostile',
  hostile: 'Hostile',
} as const;

describe('militarySymbol SIDC table', () => {
  it('uses only valid codes whose affiliation matches the table key', () => {
    Object.values(SIDC).forEach((byAffiliation) => {
      (Object.keys(byAffiliation) as (keyof typeof EXPECTED_AFFILIATION)[]).forEach((affiliation) => {
        const sidc = byAffiliation[affiliation];
        const symbol = new MilSymbol(sidc, { size: 30 });
        // 带上 sidc 一起比较：失败时直接看出是哪个码
        expect({ sidc, valid: symbol.isValid(), affiliation: symbol.getMetadata().affiliation }).toEqual({
          sidc,
          valid: true,
          affiliation: EXPECTED_AFFILIATION[affiliation],
        });
      });
    });
    expect(new MilSymbol(GROUND_RADAR_SIDC).isValid()).toBe(true);
  });

  it('reports the real width/height instead of assuming a square', () => {
    const labelled = militarySymbol('ground', 'friend', { size: 30, label: 'MON-01' });
    // 附加文本让画布明显变宽：按正方形贴图会纵向拉伸
    expect(labelled.width).toBeGreaterThan(labelled.height * 1.5);
    // 锚点在画框中心而非图片中心：offset 把画框挪回地理位置
    expect(labelled.offset.x).not.toBe(0);

    const plain = militarySymbol('sea', 'neutral', { size: 22 });
    expect(plain.width).toBe(plain.height);
    expect(plain.offset).toEqual({ x: 0, y: 0 });
  });
});
