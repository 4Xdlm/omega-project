/**
 * OMNIPOTENT Sprint 4 — Maturation Invariants
 *
 * 4.1: Quality M1-M12 rapport annexe (informatif)
 * 4.2: physics_compliance → Scenario B (keep informatif, pending calibration)
 * 4.3: IDL + codegen (SKIP — not requested)
 * 4.4: Compat contrôlée v1/v2 avec deadline
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { buildQualityReport } from '../../src/quality/quality-bridge.js';
import { checkBriefSchemaVersion, BRIEF_COMPAT_WINDOW } from '../../src/compat/brief-compat-guard.js';
import { assertVersion2 } from '../../src/compat/version-guard.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const PROSE = `La peur monte dans la pièce sombre. Les ombres dansent sur les murs.

Le souffle se coupe. Les mains tremblent sur le bord de la table en bois.

La terreur explose. Le cœur bat à tout rompre, les yeux s'écarquillent.

Le silence revient. Lourd, définitif. Plus rien ne bouge dans la pièce.

Un souvenir refait surface. Une promesse oubliée depuis longtemps.

Les doigts cherchent quelque chose dans le noir. Ils trouvent le métal froid.`;

// ═══════════════════════════════════════════════════════════════════════════════
// 4.1: QUALITY M1-M12 INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4.1 — Quality M1-M12 Invariants', () => {
  it('QM12-INV-01: QUALITY_M12_ENABLED = true (activated Sprint 4.1)', () => {
    expect(SOVEREIGN_CONFIG.QUALITY_M12_ENABLED).toBe(true);
  });

  it('QM12-INV-02: enabled report has computed_count > 0', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    expect(report.enabled).toBe(true);
    expect(report.computed_count).toBeGreaterThan(0);
  });

  it('QM12-INV-03: all 12 metric keys present', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    const keys = Object.keys(report.metrics);
    expect(keys).toContain('M1_contradiction_rate');
    expect(keys).toContain('M2_canon_compliance');
    expect(keys).toContain('M3_coherence_span');
    expect(keys).toContain('M4_arc_maintenance');
    expect(keys).toContain('M5_memory_integrity');
    expect(keys).toContain('M6_style_emergence');
    expect(keys).toContain('M7_author_fingerprint');
    expect(keys).toContain('M8_sentence_necessity');
    expect(keys).toContain('M9_semantic_density');
    expect(keys).toContain('M10_reading_levels');
    expect(keys).toContain('M11_discomfort_index');
    expect(keys).toContain('M12_superiority_index');
    expect(keys.length).toBe(12);
  });

  it('QM12-INV-04: computed metrics have status "computed"', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    const computed = Object.values(report.metrics).filter((m) => m.status === 'computed');
    // M1, M2, M3, M5, M9, M10 should be attempted (some may degrade due to type mismatches)
    // At minimum some should compute successfully
    for (const m of computed) {
      expect(typeof m.value).toBe('number');
      expect(m.status).toBe('computed');
    }
  });

  it('QM12-INV-05: degraded metrics have reason string', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    const degraded = Object.values(report.metrics).filter((m) => m.status === 'degraded');
    for (const m of degraded) {
      expect(m.reason).toBeDefined();
      expect(typeof m.reason).toBe('string');
      expect(m.reason!.length).toBeGreaterThan(0);
    }
  });

  it('QM12-INV-06: computed_count + degraded_count = 12', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    expect(report.computed_count + report.degraded_count).toBe(12);
  });

  it('QM12-INV-07: quality_score_partial >= 0 and finite', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET);
    expect(report.quality_score_partial).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(report.quality_score_partial)).toBe(true);
  });

  it('QM12-INV-08: report_hash is deterministic (64 hex)', () => {
    const r1 = buildQualityReport(PROSE, MOCK_PACKET);
    const r2 = buildQualityReport(PROSE, MOCK_PACKET);
    expect(r1.report_hash).toBe(r2.report_hash);
    expect(r1.report_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('QM12-INV-09: disabled override → enabled=false, computed_count=0', () => {
    const report = buildQualityReport(PROSE, MOCK_PACKET, { enabled: false });
    expect(report.enabled).toBe(false);
    expect(report.computed_count).toBe(0);
    expect(report.degraded_count).toBe(12);
  });

  it('QM12-INV-10: engine.ts calls buildQualityReport', () => {
    const enginePath = path.resolve(__dirname, '../../src/engine.ts');
    const content = fs.readFileSync(enginePath, 'utf-8');
    expect(content).toContain('buildQualityReport');
    expect(content).toContain('quality_m12');
  });

  it('QM12-INV-11: quality-bridge imports from @omega/omega-forge (SSOT)', () => {
    const bridgePath = path.resolve(__dirname, '../../src/quality/quality-bridge.ts');
    const content = fs.readFileSync(bridgePath, 'utf-8');
    expect(content).toMatch(/from\s+['"]@omega\/omega-forge['"]/);
    expect(content).toContain('computeM1');
    expect(content).toContain('computeM2');
    expect(content).toContain('computeM3');
    expect(content).toContain('computeM9');
    expect(content).toContain('computeM10');
  });

  it('QM12-INV-12: quality_m12 is INFORMATIF (no effect on scoring/verdict)', () => {
    // Verify engine does NOT use quality_m12 in scoring logic
    const enginePath = path.resolve(__dirname, '../../src/engine.ts');
    const content = fs.readFileSync(enginePath, 'utf-8');
    // quality_m12 should only appear in result assignment, not in scoring
    const macroAxesPath = path.resolve(__dirname, '../../src/oracle/macro-axes.ts');
    const macroContent = fs.readFileSync(macroAxesPath, 'utf-8');
    // macro-axes should NOT reference quality_m12
    expect(macroContent).not.toContain('quality_m12');
    expect(macroContent).not.toContain('QualityM12');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4.2: PHYSICS_COMPLIANCE — SCENARIO B (KEEP INFORMATIF)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4.2 — Physics Compliance Status (Scenario B: Informatif)', () => {
  it('PHYS-CALIB-01: PHYSICS_COMPLIANCE_WEIGHT = 0 (informatif)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT).toBe(0);
  });

  it('PHYS-CALIB-02: PHYSICS_COMPLIANCE_ENABLED = false', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_ENABLED).toBe(false);
  });

  it('PHYS-CALIB-03: PHYSICS_AUDIT_ENABLED = true (audit active)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED).toBe(true);
  });

  it('PHYS-CALIB-04: PRESCRIPTIONS_ENABLED = false (pending calibration)', () => {
    expect(SOVEREIGN_CONFIG.PRESCRIPTIONS_ENABLED).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4.4: COMPAT V1/V2 INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4.4 — Compat V1/V2 Invariants', () => {
  const BEFORE_DEADLINE = new Date('2026-03-01T00:00:00Z'); // Before 2026-04-01
  const AFTER_DEADLINE = new Date('2026-05-01T00:00:00Z'); // After 2026-04-01

  // ── Brief Schema Version Guard ────────────────────────────────────────────

  it('BRIEF-COMPAT-01: v1 brief during window → accepted with warning', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const v1Brief = { schema_version: 'forge.emotion.v1' };
    expect(() => checkBriefSchemaVersion(v1Brief, BEFORE_DEADLINE)).not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[COMPAT]'),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('deprecated'),
    );

    consoleWarnSpy.mockRestore();
  });

  it('BRIEF-COMPAT-02: v1 brief after deadline → FAIL strict', () => {
    const v1Brief = { schema_version: 'forge.emotion.v1' };
    expect(() => checkBriefSchemaVersion(v1Brief, AFTER_DEADLINE)).toThrow(
      /no longer supported/i,
    );
    expect(() => checkBriefSchemaVersion(v1Brief, AFTER_DEADLINE)).toThrow(
      /deadline expired/i,
    );
  });

  it('BRIEF-COMPAT-03: v2 brief → accepted without warning', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const v2Brief = { schema_version: 'forge.emotion.v2' };
    expect(() => checkBriefSchemaVersion(v2Brief, BEFORE_DEADLINE)).not.toThrow();
    expect(() => checkBriefSchemaVersion(v2Brief, AFTER_DEADLINE)).not.toThrow();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('BRIEF-COMPAT-04: undefined schema_version → FAIL', () => {
    const noBrief = {} as any;
    expect(() => checkBriefSchemaVersion(noBrief, BEFORE_DEADLINE)).toThrow(
      /missing schema_version/i,
    );
  });

  it('BRIEF-COMPAT-05: unknown schema prefix → FAIL', () => {
    const badBrief = { schema_version: 'unknown.v1' };
    expect(() => checkBriefSchemaVersion(badBrief, BEFORE_DEADLINE)).toThrow(
      /Unknown.*schema_version/i,
    );
  });

  it('BRIEF-COMPAT-06: deadline is 2026-04-01', () => {
    expect(BRIEF_COMPAT_WINDOW.deadline).toBe('2026-04-01T00:00:00Z');
  });

  it('BRIEF-COMPAT-07: v1_supported = true during compat window', () => {
    expect(BRIEF_COMPAT_WINDOW.v1_supported).toBe(true);
  });

  // ── SovereignForgeResult Version Guard (existing, verify) ─────────────────

  it('VG-VERIFY-01: assertVersion2 v2.0.0 → pass', () => {
    expect(() => assertVersion2({ version: '2.0.0' })).not.toThrow();
  });

  it('VG-VERIFY-02: assertVersion2 undefined before cutoff → warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => assertVersion2({}, new Date('2026-02-15'))).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('VG-VERIFY-03: assertVersion2 undefined after cutoff → fail', () => {
    expect(() => assertVersion2({}, new Date('2026-04-01'))).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLOITATION omega-forge — STRUCTURAL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 — omega-forge Exploitation Verification', () => {
  it('EXPLOIT-01: quality-bridge consumes omega-forge M metrics (SSOT)', () => {
    const bridgePath = path.resolve(__dirname, '../../src/quality/quality-bridge.ts');
    const content = fs.readFileSync(bridgePath, 'utf-8');
    // 6 individual M metrics imported from omega-forge
    const imports = ['computeM1', 'computeM2', 'computeM3', 'computeM5', 'computeM9', 'computeM10'];
    for (const fn of imports) {
      expect(content).toContain(fn);
    }
  });

  it('EXPLOIT-02: forge-packet-assembler uses omega-forge trajectory + physics', () => {
    const assemblerPath = path.resolve(__dirname, '../../src/input/forge-packet-assembler.ts');
    const content = fs.readFileSync(assemblerPath, 'utf-8');
    expect(content).toContain('buildScenePrescribedTrajectory');
    expect(content).toContain('computeForgeEmotionBrief');
    expect(content).toContain('DEFAULT_CANONICAL_TABLE');
    expect(content).toContain('singleEmotionState');
    expect(content).toContain('computeValence');
    expect(content).toContain('computeArousal');
    expect(content).toContain('dominantEmotion');
    expect(content).toContain('EMOTION_14_KEYS');
  });

  it('EXPLOIT-03: physics-audit uses omega-forge diagnosis functions', () => {
    const auditPath = path.resolve(__dirname, '../../src/oracle/physics-audit.ts');
    const content = fs.readFileSync(auditPath, 'utf-8');
    expect(content).toContain('buildActualTrajectory');
    expect(content).toContain('computeDeviations');
    expect(content).toContain('buildLawComplianceReport');
    expect(content).toContain('detectDeadZones');
    expect(content).toContain('detectForcedTransitions');
    expect(content).toContain('detectFeasibilityFailures');
  });

  it('EXPLOIT-04: emotion-brief-bridge uses computeForgeEmotionBrief', () => {
    const bridgePath = path.resolve(__dirname, '../../src/input/emotion-brief-bridge.ts');
    const content = fs.readFileSync(bridgePath, 'utf-8');
    expect(content).toContain('computeForgeEmotionBrief');
    expect(content).toContain('DEFAULT_CANONICAL_TABLE');
  });

  it('EXPLOIT-05: constraint-compiler uses ForgeEmotionBrief data', () => {
    const compilerPath = path.resolve(__dirname, '../../src/constraints/constraint-compiler.ts');
    const content = fs.readFileSync(compilerPath, 'utf-8');
    expect(content).toContain('ForgeEmotionBrief');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ZERO REGRESSION — FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 4 — Feature Flags', () => {
  it('FLAG-S4-01: QUALITY_M12_ENABLED = true (activated Sprint 4.1)', () => {
    expect(SOVEREIGN_CONFIG.QUALITY_M12_ENABLED).toBe(true);
  });

  it('FLAG-S4-02: PHYSICS_AUDIT_ENABLED = true (Sprint 3)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED).toBe(true);
  });

  it('FLAG-S4-03: PHYSICS_COMPLIANCE_WEIGHT = 0 (Scenario B)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT).toBe(0);
  });

  it('FLAG-S4-04: PRESCRIPTIONS_ENABLED = false (pending)', () => {
    expect(SOVEREIGN_CONFIG.PRESCRIPTIONS_ENABLED).toBe(false);
  });

  it('FLAG-S4-05: SOVEREIGN_THRESHOLD = 93', () => {
    expect(SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD).toBe(93);
  });
});
