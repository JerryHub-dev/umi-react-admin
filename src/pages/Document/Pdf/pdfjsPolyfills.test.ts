import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { installPdfjsPolyfills } from './pdfjsPolyfills.mjs';

type Scope = { Map: MapConstructor; WeakMap: WeakMapConstructor; Math: Math };
type Upsert = {
  getOrInsert(key: unknown, value: unknown): unknown;
  getOrInsertComputed(key: unknown, callback: (key: unknown) => unknown): unknown;
};
type SumPrecise = (items: Iterable<unknown>) => number;

const ALL = [
  'Map.prototype.getOrInsert',
  'Map.prototype.getOrInsertComputed',
  'WeakMap.prototype.getOrInsert',
  'WeakMap.prototype.getOrInsertComputed',
  'Math.sumPrecise',
];

/** 全新 realm（独立的 Map / WeakMap / Math），不污染测试进程自身的内建对象 */
const freshRealm = (setup = ''): Scope => runInNewContext(`${setup}\n({ Map, WeakMap, Math })`);
/** 删掉原生实现的 realm：模拟 Chromium 141 这类早于 ES2026 的引擎（宿主 Node 有没有原生实现都一样） */
const legacyRealm = () =>
  freshRealm(`
    for (const C of [Map, WeakMap]) { delete C.prototype.getOrInsert; delete C.prototype.getOrInsertComputed; }
    delete Math.sumPrecise;
  `);
const lookup = (scope: Scope, path: string) => {
  const [owner, ...rest] = path.split('.');
  const target = rest.length > 1 ? scope[owner as 'Map' | 'WeakMap'].prototype : scope.Math;
  return Object.getOwnPropertyDescriptor(target, rest.at(-1)!);
};
/** 其他 realm 抛出的 TypeError 不是本 realm TypeError 的实例，按 name 比较 */
const thrown = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return (error as Error).name;
  }
  return 'nothing thrown';
};

const polyfilled = () => {
  const scope = legacyRealm();
  installPdfjsPolyfills(scope);
  return {
    scope,
    map: () => new scope.Map() as unknown as Map<unknown, unknown> & Upsert,
    weakMap: () => new scope.WeakMap() as unknown as WeakMap<WeakKey, unknown> & Upsert,
    sumPrecise: (scope.Math as Math & { sumPrecise: SumPrecise }).sumPrecise,
  };
};

describe('installPdfjsPolyfills', () => {
  it('installs every missing method with built-in property attributes', () => {
    const scope = legacyRealm();
    expect(installPdfjsPolyfills(scope)).toEqual(ALL);
    for (const path of ALL) {
      const descriptor = lookup(scope, path)!;
      expect(descriptor).toMatchObject({ writable: true, enumerable: false, configurable: true });
      const method = descriptor.value as (...args: unknown[]) => unknown;
      expect(method.name).toBe(path.split('.').at(-1));
      expect(method.length).toBe(path === 'Math.sumPrecise' ? 1 : 2);
      // 与内建方法一样不可 new
      expect(() => Reflect.construct(String, [], method)).toThrow(TypeError);
    }
  });

  it('never replaces an existing implementation', () => {
    const scope = legacyRealm();
    const existing = Object.fromEntries(ALL.map((path) => [path, Object.assign(() => path, { existing: true })]));
    const preset = { writable: true, configurable: true };
    Object.defineProperty(scope.Map.prototype, 'getOrInsertComputed', {
      ...preset,
      value: existing['Map.prototype.getOrInsertComputed'],
    });
    Object.defineProperty(scope.Math, 'sumPrecise', { ...preset, value: existing['Math.sumPrecise'] });

    expect(installPdfjsPolyfills(scope)).toEqual([
      'Map.prototype.getOrInsert',
      'WeakMap.prototype.getOrInsert',
      'WeakMap.prototype.getOrInsertComputed',
    ]);
    expect(lookup(scope, 'Map.prototype.getOrInsertComputed')!.value).toBe(
      existing['Map.prototype.getOrInsertComputed'],
    );
    expect(lookup(scope, 'Math.sumPrecise')!.value).toBe(existing['Math.sumPrecise']);

    const installed = ALL.map((path) => lookup(scope, path)!.value);
    expect(installPdfjsPolyfills(scope)).toEqual([]);
    expect(ALL.map((path) => lookup(scope, path)!.value)).toEqual(installed);
  });

  it('keeps whatever the host engine implements natively', () => {
    const scope = freshRealm();
    const before = ALL.map((path) => lookup(scope, path)?.value);
    const installed = installPdfjsPolyfills(scope);
    expect(installed).toEqual(ALL.filter((_, index) => before[index] === undefined));
    // 原生实现保持原样，缺失的才换成 polyfill
    const after = ALL.map((path) => lookup(scope, path)!.value);
    expect(after.filter((_, index) => before[index] !== undefined)).toEqual(before.filter(Boolean));
  });

  it('installs on the importing global as a side effect', () => {
    expect(typeof (Map.prototype as Map<unknown, unknown> & Partial<Upsert>).getOrInsertComputed).toBe('function');
    expect(typeof (WeakMap.prototype as WeakMap<WeakKey, unknown> & Partial<Upsert>).getOrInsert).toBe('function');
    expect(typeof (Math as Math & { sumPrecise?: SumPrecise }).sumPrecise).toBe('function');
  });
});

describe('Map.prototype.getOrInsert / getOrInsertComputed', () => {
  it('returns the stored value or inserts the new one', () => {
    const { map } = polyfilled();
    const m = map();
    m.set('a', 1);
    expect(m.getOrInsert('a', 2)).toBe(1);
    expect(m.getOrInsert('b', 2)).toBe(2);
    expect([...m]).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('computes only for missing keys, with a canonical -0 key', () => {
    const { map } = polyfilled();
    const m = map();
    const seen: unknown[] = [];
    const compute = (key: unknown) => (seen.push(key), `v${seen.length}`);
    expect(m.getOrInsertComputed('k', compute)).toBe('v1');
    expect(m.getOrInsertComputed('k', compute)).toBe('v1');
    expect(m.getOrInsertComputed(-0, compute)).toBe('v2');
    expect(seen).toEqual(['k', 0]);
    expect(Object.is(seen[1], 0)).toBe(true);
    expect(Object.is([...m.keys()][1], 0)).toBe(true);
  });

  it('lets the callback result win when the callback inserted the same key', () => {
    const { map } = polyfilled();
    const m = map();
    expect(
      m.getOrInsertComputed('k', () => {
        m.set('k', 'inner');
        return 'outer';
      }),
    ).toBe('outer');
    expect([...m]).toEqual([['k', 'outer']]);
  });

  it('checks the receiver and the callback before looking up', () => {
    const { scope, map } = polyfilled();
    const m = map();
    m.set('k', 1);
    expect(thrown(() => m.getOrInsertComputed('k', 1 as never))).toBe('TypeError');
    const callback = vi.fn();
    const upsert = scope.Map.prototype as unknown as Upsert;
    expect(thrown(() => upsert.getOrInsertComputed.call({}, 'k', callback))).toBe('TypeError');
    expect(thrown(() => upsert.getOrInsert.call(new scope.WeakMap(), {}, 1))).toBe('TypeError');
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('WeakMap.prototype.getOrInsert / getOrInsertComputed', () => {
  it('works with object and unregistered symbol keys', () => {
    const { weakMap } = polyfilled();
    const m = weakMap();
    const key = {};
    const symbol = Symbol('local');
    expect(m.getOrInsert(key, 1)).toBe(1);
    expect(m.getOrInsert(key, 2)).toBe(1);
    expect(m.getOrInsertComputed(symbol, () => 'computed')).toBe('computed');
    expect(m.getOrInsertComputed(symbol, () => 'again')).toBe('computed');
  });

  it('rejects keys that cannot be held weakly before running the callback', () => {
    const { weakMap } = polyfilled();
    const m = weakMap();
    const callback = vi.fn();
    for (const key of [1, 'k', null, undefined, Symbol.for('registered')]) {
      expect(thrown(() => m.getOrInsert(key, 1))).toBe('TypeError');
      expect(thrown(() => m.getOrInsertComputed(key, callback))).toBe('TypeError');
    }
    expect(callback).not.toHaveBeenCalled();
    expect(thrown(() => m.getOrInsertComputed({}, 'nope' as never))).toBe('TypeError');
  });

  it('checks the receiver', () => {
    const { scope } = polyfilled();
    const upsert = scope.WeakMap.prototype as unknown as Upsert;
    expect(thrown(() => upsert.getOrInsert.call(new scope.Map(), {}, 1))).toBe('TypeError');
    expect(thrown(() => upsert.getOrInsertComputed.call({}, {}, () => 1))).toBe('TypeError');
  });
});

describe('Math.sumPrecise', () => {
  const { sumPrecise } = polyfilled();
  const MAX = Number.MAX_VALUE;
  const MIN = Number.MIN_VALUE;

  it.each([
    ['empty', [], -0],
    ['only -0', [-0, -0], -0],
    ['+0 wins over -0', [-0, 0], 0],
    ['cancelling integers give +0', [5, -5], 0],
    ['cancelling fractions give +0', [0.5, -0.5], 0],
    ['integers', [1, 2, 3], 6],
    ['ordinary doubles', [0.1, 0.2], 0.30000000000000004],
    ['catastrophic cancellation', [1e20, 0.1, -1e20], 0.1],
    ['no lost low bits', [1, 1e-16, 1e-16], 1.0000000000000002],
    ['leaves the safe-integer fast path exactly', [2 ** 53 - 1, 2, -1], 2 ** 53],
    ['ties round to even', [2 ** 53, 1], 2 ** 53],
    ['just above a tie rounds up', [2 ** 53, 1, MIN], 2 ** 53 + 2],
    ['negative values', [-0.5, -0.5, -2], -3],
    ['no intermediate overflow', [1e308, 1e308, -1e308], 1e308],
    ['overflow', [MAX, MAX], Infinity],
    ['negative overflow', [-MAX, -MAX], -Infinity],
    ['tie at the overflow threshold rounds to Infinity', [MAX, 2 ** 970], Infinity],
    ['below the overflow threshold rounds to MAX_VALUE', [MAX, 2 ** 969], MAX],
    ['subnormals', [MIN, MIN], 2 * MIN],
    ['largest subnormal', [2 ** -1022, -MIN], 2 ** -1022 - MIN],
    ['subnormals cancel to +0', [MIN, -MIN], 0],
    ['+Infinity absorbs finite values', [1, Infinity, -1e308], Infinity],
    ['-Infinity absorbs finite values', [-Infinity, MAX], -Infinity],
    ['opposite infinities', [Infinity, -Infinity], NaN],
    ['NaN', [1, NaN, Infinity], NaN],
  ])('%s', (_, items, expected) => {
    expect(Object.is(sumPrecise(items as number[]), expected)).toBe(true);
  });

  it('accepts any iterable', () => {
    expect(sumPrecise(new Set([1, 2, 0.5]))).toBe(3.5);
    expect(
      sumPrecise(
        (function* () {
          yield 0.25;
          yield 0.25;
        })(),
      ),
    ).toBe(0.5);
  });

  it('rejects non-numbers, closing the iterator, even after NaN', () => {
    let closed = false;
    const items = (function* () {
      try {
        yield NaN;
        yield '1';
        yield 1;
      } finally {
        closed = true;
      }
    })();
    expect(() => sumPrecise(items)).toThrow(TypeError);
    expect(closed).toBe(true);
    expect(() => sumPrecise([1n] as never)).toThrow(TypeError);
    expect(() => sumPrecise(1 as never)).toThrow(TypeError);
    expect(() => sumPrecise(undefined as never)).toThrow(TypeError);
  });

  // 线性同余伪随机：固定种子，失败可复现
  const random = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) % 2 ** 31;
      return state / 2 ** 31;
    };
  };
  const randomDoubles = (next: () => number, length: number) =>
    Array.from({ length }, () => (next() - 0.5) * 2 ** Math.floor(next() * 2000 - 1000));

  it('is exact: order does not matter and opposite values cancel to +0', () => {
    const next = random(20261016);
    for (let round = 0; round < 50; round += 1) {
      const values = randomDoubles(next, 40);
      const shuffled = values.toSorted(() => next() - 0.5);
      expect(sumPrecise(shuffled)).toBe(sumPrecise(values));
      expect(sumPrecise(values.map((value) => -value))).toBe(-sumPrecise(values));
      expect(Object.is(sumPrecise([...values, ...values.map((value) => -value)]), 0)).toBe(true);
    }
  });

  const native = (freshRealm().Math as Math & { sumPrecise?: SumPrecise }).sumPrecise;
  it.runIf(typeof native === 'function')('matches the engine implementation where one exists', () => {
    const next = random(42);
    for (let round = 0; round < 200; round += 1) {
      const values = randomDoubles(next, 1 + Math.floor(next() * 30));
      expect(sumPrecise(values)).toBe(native!(values));
    }
  });
});
