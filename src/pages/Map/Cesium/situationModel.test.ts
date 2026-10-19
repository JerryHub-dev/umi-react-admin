import { describe, expect, it } from 'vitest';
import { buildFleet, positionAt, simulateEvents, ZONES } from './situationModel';

describe('situationModel', () => {
  it('builds a deterministic fleet of the expected size and mix', () => {
    const a = buildFleet();
    const b = buildFleet();
    expect(a).toEqual(b);
    expect(a).toHaveLength(61);
    expect(a.filter((t) => t.kind === 'aircraft').length).toBe(14);
    expect(a.filter((t) => t.affiliation === 'hostile').length).toBe(2);
    expect(new Set(a.map((t) => t.group)).size).toBe(6);
  });

  it('keeps positions inside the area of interest across the loop', () => {
    const fleet = buildFleet();
    for (let sec = 0; sec <= 12 * 3600; sec += 900) {
      fleet.forEach((target) => {
        const [lng, lat] = positionAt(target, sec);
        expect(lng).toBeGreaterThan(120);
        expect(lng).toBeLessThan(129);
        expect(lat).toBeGreaterThan(29);
        expect(lat).toBeLessThan(37.5);
      });
    }
  });

  it('simulates zone events in time order with alerts for hostiles entering warning zones', () => {
    const fleet = buildFleet();
    const events = simulateEvents(fleet);
    expect(events.length).toBeGreaterThan(0);
    const times = events.map((e) => e.atSec);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // 两条敌意航线直插核心区：至少产生进入警戒区/核心区的告警事件
    const hostileAlerts = events.filter((e) => e.alert && (e.targetId === 'V-X1' || e.targetId === 'A-X1'));
    expect(hostileAlerts.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(ZONES.map((z) => z.id)).toContain(event.zone);
      expect(['enter', 'exit']).toContain(event.kind);
    });
  });

  it('pairs enter/exit per target and zone (strictly alternating, at most one unmatched)', () => {
    const events = simulateEvents(buildFleet());
    const byPair = new Map<string, typeof events>();
    events.forEach((event) => {
      const key = `${event.targetId}|${event.zone}`;
      byPair.set(key, [...(byPair.get(key) ?? []), event]);
    });
    expect(byPair.size).toBeGreaterThan(0);
    byPair.forEach((list) => {
      for (let i = 1; i < list.length; i++) {
        expect(list[i].kind).not.toBe(list[i - 1].kind);
        expect(list[i].atSec).toBeGreaterThan(list[i - 1].atSec);
      }
      const enters = list.filter((e) => e.kind === 'enter').length;
      expect(Math.abs(enters - (list.length - enters))).toBeLessThanOrEqual(1);
      // 只有 enter 会告警
      list.filter((e) => e.kind === 'exit').forEach((e) => expect(e.alert).toBe(false));
    });
    // 事件 id 唯一（页面用作 React key）
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('simulates events deterministically', () => {
    expect(simulateEvents(buildFleet())).toEqual(simulateEvents(buildFleet()));
    // 不同种子的舰队给出不同的事件流（确定性来自种子，不是常量）
    expect(simulateEvents(buildFleet(1))).not.toEqual(simulateEvents(buildFleet()));
  });
});
