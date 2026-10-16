import type { ThemeConfig } from 'antd';
import { describe, expect, it } from 'vitest';
import { a11yThemeTokens } from './themeTokens';

/**
 * `ThemeConfig['token']` 含 undefined，且 `Object.keys` 的重载不接受它。
 * 这里用「非空返回值」的显式类型收窄，而不是 `as Record<string, unknown>`：
 * 断言本身要的正是「一定拿到对象」这个前提，把它写进类型比断言里更诚实。
 */
const tokensOf = (mode: 'light' | 'realDark'): NonNullable<ThemeConfig['token']> => {
  const tokens = a11yThemeTokens(mode);
  expect(tokens, `${mode} 必须返回 token 对象`).toBeDefined();
  if (!tokens) throw new Error(`${mode} 返回了空的 token 配置`);
  return tokens;
};

/**
 * 回归（独立评审发现的缺陷）：浅色 → 暗色的**热切换**走的是 umi `setAntdConfig` 的深合并
 * （`merge({}, prev, next)`，只覆盖 next 里出现的键），所以两套 token 的键集合必须完全一致。
 * 少一个键，切换后就会残留浅色的值：例如暗色那套省略 colorPrimary 时，#0958d9 会被留下，
 * 暗色算法从它重新派生，主色文字在 #141414 上只剩 2.48:1 —— 而冷启动暗色是正常的。
 * 这条断言把该不变量钉死，成本为零。
 */
describe('a11yThemeTokens', () => {
  it('明暗两套的键集合完全一致（深合并下不会残留另一主题的值）', () => {
    expect(Object.keys(tokensOf('realDark')).sort()).toEqual(Object.keys(tokensOf('light')).sort());
  });

  it('两套取值确实不同（不是同一份对象的两次返回）', () => {
    expect(tokensOf('light')).not.toEqual(tokensOf('realDark'));
  });

  it('每个 token 都有非空字符串值（undefined 会让深合并退化成保留旧值）', () => {
    for (const mode of ['light', 'realDark'] as const) {
      const tokens = tokensOf(mode);
      const entries = Object.entries(tokens as Record<string, unknown>);
      expect(entries.length).toBeGreaterThan(0);
      for (const [key, value] of entries) {
        expect(typeof value, `${mode}.${key} 必须是字符串`).toBe('string');
        expect(String(value).length, `${mode}.${key} 不能为空`).toBeGreaterThan(0);
      }
    }
  });
});
