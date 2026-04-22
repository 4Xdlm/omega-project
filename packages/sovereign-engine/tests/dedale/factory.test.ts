/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — FACTORY TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Couverture :
 *   - resolveDedaleConfig : parsing OMEGA_DEDALE_MODE (off/shadow/on/invalid→off)
 *   - resolveDedaleConfig : OMEGA_DEDALE_TELEMETRY_DIR + default
 *   - resolveDedaleConfig : oracle_thresholds forwardés depuis env
 *   - buildDefaultDependencies : shape complète (9 champs) + exécutables
 *   - buildDefaultDependencies : overrides mergés correctement
 *   - createDedale : wire oracle + resetSession + telemetry + orchestrator + state
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDedaleConfig,
  buildDefaultDependencies,
  createDedale,
  defaultLogger,
} from '../../src/dedale/index.js';
import type { DedaleConfig, DedaleDependencies } from '../../src/dedale/index.js';

// ──────────────────────────────────────────────────────────────────────────────
// resolveDedaleConfig
// ──────────────────────────────────────────────────────────────────────────────

describe('resolveDedaleConfig', () => {
  it('returns mode=off by default when env var absent', () => {
    const cfg = resolveDedaleConfig({});
    expect(cfg.mode).toBe('off');
  });

  it('returns mode=off for invalid values (fail-safe)', () => {
    expect(resolveDedaleConfig({ OMEGA_DEDALE_MODE: 'on_please' }).mode).toBe('off');
    expect(resolveDedaleConfig({ OMEGA_DEDALE_MODE: 'true' }).mode).toBe('off');
    expect(resolveDedaleConfig({ OMEGA_DEDALE_MODE: '' }).mode).toBe('off');
    expect(resolveDedaleConfig({ OMEGA_DEDALE_MODE: 'ON' }).mode).toBe('off');
  });

  it('parses mode=shadow correctly', () => {
    const cfg = resolveDedaleConfig({ OMEGA_DEDALE_MODE: 'shadow' });
    expect(cfg.mode).toBe('shadow');
  });

  it('parses mode=on correctly', () => {
    const cfg = resolveDedaleConfig({ OMEGA_DEDALE_MODE: 'on' });
    expect(cfg.mode).toBe('on');
  });

  it('parses mode=off explicitly', () => {
    const cfg = resolveDedaleConfig({ OMEGA_DEDALE_MODE: 'off' });
    expect(cfg.mode).toBe('off');
  });

  it('uses default telemetry dir when env var absent', () => {
    const cfg = resolveDedaleConfig({});
    expect(cfg.telemetry_dir).toBe('./outputs/dedale_telemetry');
  });

  it('honors OMEGA_DEDALE_TELEMETRY_DIR when present', () => {
    const cfg = resolveDedaleConfig({
      OMEGA_DEDALE_TELEMETRY_DIR: '/custom/path/telemetry',
    });
    expect(cfg.telemetry_dir).toBe('/custom/path/telemetry');
  });

  it('includes oracle_thresholds (3 seuils canoniques)', () => {
    const cfg = resolveDedaleConfig({});
    expect(cfg.oracle_thresholds).toBeDefined();
    expect(cfg.oracle_thresholds.c1_threshold).toBeGreaterThan(0);
    expect(cfg.oracle_thresholds.c2_threshold).toBeGreaterThan(0);
    expect(cfg.oracle_thresholds.c4_threshold).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildDefaultDependencies
// ──────────────────────────────────────────────────────────────────────────────

describe('buildDefaultDependencies', () => {
  it('returns all 9 dependency fields', () => {
    const deps = buildDefaultDependencies();
    expect(typeof deps.execCmd).toBe('function');
    expect(typeof deps.fetchFn).toBe('function');
    expect(typeof deps.sleep).toBe('function');
    expect(typeof deps.clock).toBe('function');
    expect(typeof deps.clockMonotonic).toBe('function');
    expect(typeof deps.uuid).toBe('function');
    // nvidiaSmi optional — undefined in default
    expect(deps.nvidiaSmi).toBeUndefined();
    expect(typeof deps.atomicWrite).toBe('function');
    expect(deps.logger).toBeDefined();
    expect(typeof deps.logger.info).toBe('function');
    expect(typeof deps.logger.warn).toBe('function');
    expect(typeof deps.logger.error).toBe('function');
  });

  it('clock returns a finite number', () => {
    const deps = buildDefaultDependencies();
    const t = deps.clock();
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThan(0);
  });

  it('clockMonotonic returns a finite non-negative number', () => {
    const deps = buildDefaultDependencies();
    const t = deps.clockMonotonic();
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(0);
  });

  it('uuid returns a string', () => {
    const deps = buildDefaultDependencies();
    const u1 = deps.uuid();
    const u2 = deps.uuid();
    expect(typeof u1).toBe('string');
    expect(u1.length).toBeGreaterThan(10);
    expect(u1).not.toBe(u2);  // randomness — probabilité de collision ~0
  });

  it('sleep resolves after the requested delay', async () => {
    const deps = buildDefaultDependencies();
    const t0 = Date.now();
    await deps.sleep(10);
    const dt = Date.now() - t0;
    // Tolerance ±20ms (setTimeout drift sur Windows CI)
    expect(dt).toBeGreaterThanOrEqual(5);
  });

  it('merges overrides correctly (clock override)', () => {
    const fixedClock = (): number => 42;
    const deps = buildDefaultDependencies({ clock: fixedClock });
    expect(deps.clock()).toBe(42);
    // Les autres deps doivent rester les defaults
    expect(typeof deps.execCmd).toBe('function');
    expect(typeof deps.atomicWrite).toBe('function');
  });

  it('merges multiple overrides', () => {
    const override: Partial<DedaleDependencies> = {
      clock: () => 100,
      uuid: () => 'fixed-uuid',
    };
    const deps = buildDefaultDependencies(override);
    expect(deps.clock()).toBe(100);
    expect(deps.uuid()).toBe('fixed-uuid');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// defaultLogger
// ──────────────────────────────────────────────────────────────────────────────

describe('defaultLogger', () => {
  it('exposes info/warn/error methods', () => {
    expect(typeof defaultLogger.info).toBe('function');
    expect(typeof defaultLogger.warn).toBe('function');
    expect(typeof defaultLogger.error).toBe('function');
  });

  it('accepts calls with and without context (no-throw contract)', () => {
    // Smoke : doit juste ne pas throw
    expect(() => defaultLogger.info('hello')).not.toThrow();
    expect(() => defaultLogger.info('hello', { foo: 'bar' })).not.toThrow();
    expect(() => defaultLogger.warn('warn')).not.toThrow();
    expect(() => defaultLogger.error('err', { code: 42 })).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// createDedale — wiring complet
// ──────────────────────────────────────────────────────────────────────────────

describe('createDedale', () => {
  function fakeConfig(): DedaleConfig {
    return {
      mode: 'off',
      telemetry_dir: '/tmp/test',
      oracle_thresholds: {
        c1_threshold: 0.15,
        c1_high_threshold: 0.20,
        c2_threshold: 0.60,
        c4_threshold: 0.30,
      },
    };
  }

  it('returns the 6 wired components', () => {
    const deps = buildDefaultDependencies();
    const cfg = fakeConfig();
    const d = createDedale(cfg, deps);
    expect(d.oracle).toBeDefined();
    expect(d.resetSession).toBeDefined();
    expect(d.telemetry).toBeDefined();
    expect(d.orchestrator).toBeDefined();
    expect(d.state).toBeDefined();
    expect(d.config).toBe(cfg);
  });

  it('initial state has resets_used === 0', () => {
    const deps = buildDefaultDependencies();
    const d = createDedale(fakeConfig(), deps);
    expect(d.state.resets_used).toBe(0);
  });

  it('oracle is usable immediately (pure function, pas d\'I/O)', () => {
    const deps = buildDefaultDependencies();
    const d = createDedale(fakeConfig(), deps);
    const result = d.oracle.evaluate('Un texte de prose suffisamment long pour l\'oracle.');
    expect(result.verdict).toBeDefined();
    expect(result.metrics).toBeDefined();
  });

  it('telemetry.startRun is callable (pas d\'I/O synchrone)', () => {
    const deps = buildDefaultDependencies();
    const d = createDedale(fakeConfig(), deps);
    const ctx = d.telemetry.startRun('off', '/tmp/test');
    expect(ctx.run_id).toBeDefined();
    expect(ctx.mode).toBe('off');
    expect(Array.isArray(ctx.chunks)).toBe(true);
    expect(ctx.chunks.length).toBe(0);
  });

  it('config object is the same reference passed in', () => {
    const deps = buildDefaultDependencies();
    const cfg = fakeConfig();
    const d = createDedale(cfg, deps);
    expect(d.config).toBe(cfg);  // identité référentielle
  });
});
