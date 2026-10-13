/**
 * 读取构建期注入的可选全局常量（config 的 define：AMAP_KEY / AMAP_SECURITY_CODE / CESIUM_ION_TOKEN）。
 *
 * 两条通道（复查 P1 修复）：
 * 1. 编译期标识符替换（umi define → webpack DefinePlugin）：BUILD_LITERALS 里的裸标识符会被替换成
 *    配置值。umi 对「值为空」的键会注入 `${KEY}` 字面量占位（真值字符串），下面统一过滤；
 *    `typeof` 守卫保证未进 define 表时也不抛 ReferenceError。
 * 2. 运行期 globalThis 兜底（define 只做编译期替换，不会给 globalThis 赋值——此通道为测试/非 define
 *    环境准备，正常产线走第 1 条）。
 */
const BUILD_LITERALS: Record<string, string> = {
  AMAP_KEY: typeof AMAP_KEY !== 'undefined' ? AMAP_KEY : '',
  AMAP_SECURITY_CODE: typeof AMAP_SECURITY_CODE !== 'undefined' ? AMAP_SECURITY_CODE : '',
  CESIUM_ION_TOKEN: typeof CESIUM_ION_TOKEN !== 'undefined' ? CESIUM_ION_TOKEN : '',
};

const usable = (value: unknown): value is string => typeof value === 'string' && !!value && !value.startsWith('${');

export const readBuildGlobal = (name: string): string => {
  const literal = BUILD_LITERALS[name];
  if (usable(literal)) return literal;
  const runtime = (globalThis as Record<string, unknown>)[name];
  return usable(runtime) ? runtime : '';
};
