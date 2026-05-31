import { describe, it, expect } from 'vitest';
import { createLogger, consoleSink, formatEntry, type LogEntry } from '../../src/util/logger.js';
import type { Clock } from '../../src/util/clock.js';

const fixedClock: Clock = {
  now: () => 0,
  nowISO: () => '2026-01-01T00:00:00.000Z',
};

describe('canonical logger (DEC-20260531-006)', () => {
  it('emet les entrees au-dessus du minLevel (defaut info)', () => {
    const log = createLogger();
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    const levels = log.getEntries().map((x) => x.level);
    expect(levels).toEqual(['info', 'warn', 'error']); // debug filtre
  });

  it('minLevel debug emet tout', () => {
    const log = createLogger({ minLevel: 'debug' });
    log.debug('d');
    expect(log.getEntries().map((x) => x.level)).toEqual(['debug']);
  });

  it('mode DETERMINISTE: aucun timestamp sans Clock', () => {
    const log = createLogger();
    log.info('x');
    expect(log.getEntries()[0].timestamp).toBeUndefined();
  });

  it('mode AFFICHAGE: timestamp present si Clock injecte', () => {
    const log = createLogger({ clock: fixedClock });
    log.info('x');
    expect(log.getEntries()[0].timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('preserve le context', () => {
    const log = createLogger();
    log.info('m', { a: 1, b: 'z' });
    expect(log.getEntries()[0].context).toEqual({ a: 1, b: 'z' });
  });

  it('appelle le sink a chaque entree emise', () => {
    const seen: LogEntry[] = [];
    const log = createLogger({ sink: (e) => seen.push(e) });
    log.info('m');
    log.warn('w');
    expect(seen.map((e) => e.level)).toEqual(['info', 'warn']);
  });

  it('toText est deterministe (context trie)', () => {
    const log = createLogger();
    log.info('hello', { b: 2, a: 1 });
    const text = log.toText();
    expect(text).toContain('[INFO ] hello');
    expect(text).toContain('"a":1');
    // ordre stable des cles via stableStringify
    expect(text.indexOf('"a"')).toBeLessThan(text.indexOf('"b"'));
  });

  it('formatEntry inclut le timestamp si present', () => {
    const entry: LogEntry = { level: 'warn', message: 'hi', timestamp: '2026-01-01T00:00:00.000Z' };
    expect(formatEntry(entry)).toBe('[2026-01-01T00:00:00.000Z] [WARN ] hi');
  });

  it('consoleSink ne jette pas', () => {
    expect(() => consoleSink({ level: 'info', message: 'ok' })).not.toThrow();
  });
});