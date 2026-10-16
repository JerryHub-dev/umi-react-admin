import { describe, expect, it } from 'vitest';
import { normalizeApiBase, resolveApiUrl } from './apiBoundary';

/**
 * 这一层是「凭据挂载边界」：请求层在把 token 附到 URL 之前先在这里做同源与路径校验，
 * 所以每个拒绝分支都要有回归测试——放宽任何一条都等于把凭据送给攻击者可控的目标。
 */
describe('normalizeApiBase', () => {
  it('accepts literal same-origin prefixes and strips trailing slashes', () => {
    expect(normalizeApiBase('/')).toBe('/');
    expect(normalizeApiBase('/backend')).toBe('/backend');
    expect(normalizeApiBase('/backend/')).toBe('/backend');
    expect(normalizeApiBase('/a/b/')).toBe('/a/b');
  });

  it.each([
    ['', '空值'],
    ['backend', '缺少前导斜杠'],
    ['https://evil.example', '绝对地址'],
    ['//evil.example', '协议相对地址'],
    ['/a//b', '重复斜杠'],
    ['/a/../b', '上级目录段'],
    ['/a/./b', '当前目录段'],
    ['/a?b=c', '查询串'],
    ['/a#b', '片段'],
    ['/a%2fb', '百分号编码'],
    ['/a b', '空格'],
    ['/a\\b', '反斜杠'],
    ['/a\u0000b', 'NUL 字符'],
    ['/a\u007fb', 'DEL 字符'],
    [`/${'a'.repeat(1025)}`, '超出长度上限'],
  ])('rejects %j (%s)', (value) => {
    expect(() => normalizeApiBase(value)).toThrow(/UMI_APP_API_BASE/);
  });
});

describe('resolveApiUrl', () => {
  const origin = 'https://admin.example';

  it('resolves /api/v1 destinations against the configured base', () => {
    expect(resolveApiUrl('/api/v1/users', '/', origin)).toBe(`${origin}/api/v1/users`);
    expect(resolveApiUrl('/api/v1/users?page=2', '/backend', origin)).toBe(`${origin}/backend/api/v1/users?page=2`);
    expect(resolveApiUrl('/api/v1/users?page=2', '/backend/', origin)).toBe(`${origin}/backend/api/v1/users?page=2`);
  });

  it.each([
    ['/api/v2/users', '不在 /api/v1/ 之下'],
    ['/other/api/v1/users', '前缀不符'],
    ['https://evil.example/api/v1/users', '绝对地址'],
    ['//evil.example/api/v1/users', '协议相对地址'],
    ['/api/v1/../../admin', '上级目录穿越'],
    ['/api/v1/%2e%2e/admin', '编码后的上级目录'],
    ['/api/v1/%2E%2E/admin', '大写编码穿越'],
    ['/api/v1/%2fadmin', '编码后的斜杠'],
    ['/api/v1/%5cadmin', '编码后的反斜杠'],
    ['/api/v1/%252e%252e/admin', '双重编码'],
    ['/api/v1/./users', '当前目录段'],
    ['/api/v1//users', '重复斜杠'],
    ['/api/v1/users#fragment', '片段'],
    ['/api/v1/us ers', '空格'],
    ['/api/v1/users\\..\\admin', '反斜杠路径'],
    ['/api/v1/users\u0007', '控制字符'],
  ])('rejects %j (%s)', (url) => {
    expect(() => resolveApiUrl(url, '/', origin)).toThrow();
  });

  it('rejects empty and over-long destinations', () => {
    expect(() => resolveApiUrl(undefined, '/', origin)).toThrow(/Invalid API request destination/);
    expect(() => resolveApiUrl('', '/', origin)).toThrow(/Invalid API request destination/);
    expect(() => resolveApiUrl(`/api/v1/${'a'.repeat(8192)}`, '/', origin)).toThrow(/Invalid API request destination/);
  });

  it('propagates a rejected base instead of silently falling back to origin root', () => {
    expect(() => resolveApiUrl('/api/v1/users', 'https://evil.example', origin)).toThrow(/UMI_APP_API_BASE/);
  });
});
