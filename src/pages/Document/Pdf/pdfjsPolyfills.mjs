// @ts-check
/**
 * pdf.js 6（pdfjs-dist modern 构建）直接调用 ES2026 新增内建方法，较旧的浏览器没有：
 *
 * | 方法 | 原生支持 | pdf.js 中的用途 |
 * | --- | --- | --- |
 * | Map / WeakMap.prototype.getOrInsert(Computed) | Chrome/Edge 145、Firefox 144、Safari 26.2 | 主线程渲染与 worker 解析，每份文档必经 |
 * | Math.sumPrecise | Chrome/Edge 147、Firefox 137、Safari 26.2 | worker 转换 / 修复内嵌字体（name 表、glyf 表） |
 *
 * 本模块只在方法**缺失**时定义，从不覆盖已有实现，也不做「合规性探测不过就强制替换」。
 * 不用 pdfjs-dist 的 legacy 构建正是因为后者：它内置的 core-js 3.50 在所有当前浏览器上强制替换
 * Promise.try，并在部分浏览器上替换 DOMException 构造器与 Iterator helpers。
 * 全局 polyfill 只引 core-js/stable 的原因见 config/config.ts 的 polyfill 注释。
 *
 * 两处加载，都必须先于 pdf.js 求值：
 * - 主线程：Pdf/index.tsx 在 react-pdf 之前 `import './pdfjsPolyfills.mjs'`（打包进页面 chunk）；
 * - worker：独立的全局作用域。pdfWorkerSrc.ts 生成的 worker 入口先 import 本文件的产物 URL，
 *   再执行 pdf.js 自带的 worker。所以本文件必须是**没有 import 的纯 ES module**：
 *   webpack 经 `new URL(..., import.meta.url)` 把它作为静态资源产出，worker 按 URL 直接加载；
 *   这份产物不经 babel（config/urlAssets.ts），否则会被注入 @babel/runtime 的 import。
 */

/**
 * 方法缺失时按内建方法的属性特性（可写、不可枚举、可配置）定义；已存在（含原型链上）则不动。
 * @param {object} target
 * @param {Record<string, Function>} methods
 * @param {string} owner 返回值里的名字前缀，如 'Map.prototype'
 * @returns {string[]} 本次实际安装的方法
 */
const defineMissing = (target, methods, owner) =>
  Object.entries(methods)
    .filter(([name]) => !(name in target))
    .map(([name, value]) => {
      Object.defineProperty(target, name, { value, writable: true, enumerable: false, configurable: true });
      return `${owner}.${name}`;
    });

/**
 * has/get/set 取安装时的原生实现：它们自带 brand check（接收者不是 Map 时抛 TypeError），
 * set 还会把 -0 规范成 +0（规范的 CanonicalizeKeyedCollectionKey）。
 * @param {MapConstructor} MapCtor
 */
const mapMethods = (MapCtor) => {
  const { has, get, set } = MapCtor.prototype;
  return {
    /**
     * @this {Map<unknown, unknown>}
     * @param {unknown} key
     * @param {unknown} value
     */
    getOrInsert(key, value) {
      if (has.call(this, key)) return get.call(this, key);
      set.call(this, key, value);
      return value;
    },
    /**
     * @this {Map<unknown, unknown>}
     * @param {unknown} key
     * @param {(key: unknown) => unknown} callbackfn
     */
    getOrInsertComputed(key, callbackfn) {
      // 规范顺序：brand check（has 内完成）→ 校验回调（键已存在也要校验）→ 查找
      const found = has.call(this, key);
      if (typeof callbackfn !== 'function') {
        throw new TypeError('Map.prototype.getOrInsertComputed: callback is not a function');
      }
      if (found) return get.call(this, key);
      const canonical = key === 0 ? 0 : key; // -0 → +0：回调收到的是规范化后的键
      const value = callbackfn(canonical);
      set.call(this, canonical, value); // 回调内已插入同一键时，规范要求以回调返回值覆盖
      return value;
    },
  };
};

/**
 * 规范的 CanBeHeldWeakly：对象、函数，或未注册（非 Symbol.for）的 symbol。
 * @param {unknown} key
 */
const canBeHeldWeakly = (key) =>
  (typeof key === 'object' && key !== null) ||
  typeof key === 'function' ||
  (typeof key === 'symbol' && Symbol.keyFor(key) === undefined);

/**
 * 原生 has 对非法键只返回 false 而不抛错，非法键须在调用回调之前按规范抛 TypeError。
 * @param {WeakMapConstructor} WeakMapCtor
 */
const weakMapMethods = (WeakMapCtor) => {
  const { has, get, set } = WeakMapCtor.prototype;
  return {
    /**
     * @this {WeakMap<WeakKey, unknown>}
     * @param {WeakKey} key
     * @param {unknown} value
     */
    getOrInsert(key, value) {
      const found = has.call(this, key); // brand check
      if (!canBeHeldWeakly(key)) throw new TypeError('WeakMap.prototype.getOrInsert: invalid weak map key');
      if (found) return get.call(this, key);
      set.call(this, key, value);
      return value;
    },
    /**
     * @this {WeakMap<WeakKey, unknown>}
     * @param {WeakKey} key
     * @param {(key: WeakKey) => unknown} callbackfn
     */
    getOrInsertComputed(key, callbackfn) {
      const found = has.call(this, key); // brand check
      if (typeof callbackfn !== 'function') {
        throw new TypeError('WeakMap.prototype.getOrInsertComputed: callback is not a function');
      }
      if (!canBeHeldWeakly(key)) throw new TypeError('WeakMap.prototype.getOrInsertComputed: invalid weak map key');
      if (found) return get.call(this, key);
      const value = callbackfn(key);
      set.call(this, key, value);
      return value;
    },
  };
};

const float64 = new DataView(new ArrayBuffer(8));
/** 有限 double 都是 m·2^e（e ≥ -1074）形式的二进制有理数：统一放大 2^1074 后可以用 BigInt 精确累加 */
const SCALE_BITS = 1074n;

/**
 * 有限 double n 放大 2^1074 后的精确整数。
 * @param {number} n
 */
const scaledBigInt = (n) => {
  float64.setFloat64(0, n);
  const high = float64.getUint32(0);
  const exponent = (high >>> 20) & 0x7ff;
  let significand = (BigInt(high & 0xfffff) << 32n) | BigInt(float64.getUint32(4));
  // 正规数隐含最高位 1，值 = significand·2^(exponent-1075)；次正规数值 = significand·2^-1074
  if (exponent !== 0) significand = (significand | (1n << 52n)) << BigInt(exponent - 1);
  return high >>> 31 ? -significand : significand;
};

/**
 * 把非零的精确和 scaled·2^-1074 按 roundTiesToEven 舍入成 double：直接拼 IEEE 754 位，不经过任何近似运算。
 * @param {bigint} scaled
 */
const roundScaled = (scaled) => {
  const negative = scaled < 0n;
  let magnitude = negative ? -scaled : scaled;
  let exponent = -1074; // 值 = magnitude·2^exponent
  const bits = magnitude.toString(2).length;
  if (bits > 53) {
    const shift = BigInt(bits - 53);
    const rest = magnitude & ((1n << shift) - 1n);
    const half = 1n << (shift - 1n);
    magnitude >>= shift;
    exponent += bits - 53;
    if (rest > half || (rest === half && (magnitude & 1n) === 1n)) magnitude += 1n;
    if (magnitude === 1n << 53n) {
      magnitude >>= 1n;
      exponent += 1;
    }
  }
  // 此时 magnitude < 2^53：≥ 2^52 为正规数；否则只可能是未移位（exponent = -1074）的次正规数
  const normal = magnitude >= 1n << 52n;
  const biased = normal ? exponent + 1075 : 0;
  if (biased >= 0x7ff) return negative ? -Infinity : Infinity;
  const fraction = normal ? magnitude - (1n << 52n) : magnitude;
  float64.setUint32(0, ((negative ? 0x80000000 : 0) | (biased << 20) | Number(fraction >> 32n)) >>> 0);
  float64.setUint32(4, Number(fraction & 0xffffffffn));
  return float64.getFloat64(0);
};

const mathMethods = {
  /**
   * Math.sumPrecise（ES2026）：可迭代对象中全部 Number 的精确和，只在最后舍入一次。
   * pdf.js 只拿它累加整数长度，走安全整数快路径；超出安全整数或遇到小数后转 BigInt 精确累加。
   * @param {Iterable<unknown>} items
   * @returns {number}
   */
  sumPrecise(items) {
    /** @type {'minus-zero' | 'finite' | 'plus-infinity' | 'minus-infinity' | 'not-a-number'} */
    let state = 'minus-zero';
    let fast = 0;
    /** @type {bigint | undefined} 离开快路径后的精确和（放大 2^1074） */
    let scaled;
    // for...of 即规范的 RequireObjectCoercible + GetIterator；循环体内抛错会关闭迭代器（IteratorClose）
    for (const n of items) {
      if (typeof n !== 'number') throw new TypeError('Math.sumPrecise: every item must be a number');
      if (state === 'not-a-number') continue;
      if (Number.isNaN(n)) state = 'not-a-number';
      else if (n === Infinity) state = state === 'minus-infinity' ? 'not-a-number' : 'plus-infinity';
      else if (n === -Infinity) state = state === 'plus-infinity' ? 'not-a-number' : 'minus-infinity';
      else if (!Object.is(n, -0) && (state === 'minus-zero' || state === 'finite')) {
        state = 'finite';
        if (scaled === undefined && Number.isSafeInteger(n) && Number.isSafeInteger(fast + n)) fast += n;
        else scaled = (scaled ?? BigInt(fast) << SCALE_BITS) + scaledBigInt(n);
      }
    }
    if (state === 'not-a-number') return NaN;
    if (state === 'plus-infinity') return Infinity;
    if (state === 'minus-infinity') return -Infinity;
    if (state === 'minus-zero') return -0;
    if (scaled === undefined) return fast; // 整数相加不会得到 -0：1 + -1 是 +0
    return scaled === 0n ? 0 : roundScaled(scaled);
  },
};

/**
 * 在给定全局对象上补齐 pdf.js 6 需要、但当前环境缺失的内建方法。
 * @param {{ Map: MapConstructor; WeakMap: WeakMapConstructor; Math: Math }} scope 默认当前全局（测试可传入新的 realm）
 * @returns {string[]} 实际安装的方法；原生已有的不出现在结果里
 */
export const installPdfjsPolyfills = (scope = globalThis) => [
  ...defineMissing(scope.Map.prototype, mapMethods(scope.Map), 'Map.prototype'),
  ...defineMissing(scope.WeakMap.prototype, weakMapMethods(scope.WeakMap), 'WeakMap.prototype'),
  ...defineMissing(scope.Math, mathMethods, 'Math'),
];

installPdfjsPolyfills();
