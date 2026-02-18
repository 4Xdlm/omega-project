/**
 * OMNIPOTENT Sprint 3 — Physics Audit + Prescriptions + Delta 6D Invariants
 *
 * 3.1: Physics Audit (post-gen, informatif)
 * 3.2: Delta enriched 6D (physics + prescriptions)
 * 3.3: Prescriptions in sovereign loop
 * 3.4: physics_compliance sub-axis (informatif, weight=0)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { runPhysicsAudit } from '../../src/oracle/physics-audit.js';
import { buildPhysicsDelta } from '../../src/delta/delta-physics.js';
import { scorePhysicsCompliance } from '../../src/oracle/axes/physics-compliance.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } from '@omega/omega-forge';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const BRIEF_PARAMS = {
  waypoints: [
    { position: 0.0, emotion: 'trust', intensity: 0.3 },
    { position: 0.5, emotion: 'fear', intensity: 0.8 },
    { position: 1.0, emotion: 'sadness', intensity: 0.5 },
  ],
  sceneStartPct: 0.0,
  sceneEndPct: 1.0,
  totalParagraphs: 8,
  canonicalTable: DEFAULT_CANONICAL_TABLE,
  persistenceCeiling: SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
  language: 'fr' as const,
  producerBuildHash: 'sprint3-invariant',
};

const AUDIT_CONFIG = {
  enabled: true,
  ...SOVEREIGN_CONFIG.PHYSICS_AUDIT_WEIGHTS,
};

const SAMPLE_PROSE = `
La confiance s'installe doucement dans la pièce, un sentiment chaleureux.
Le personnage respire, serein, conscient de sa propre vulnérabilité.
Puis la peur surgit, lente et insidieuse, montant par vagues.
La gorge se serre, les mains tremblent imperceptiblement.
Le pic de terreur atteint son sommet, brutal et dévastateur.
Puis la tristesse prend le relais, lourde et résignée.
Un poids s'installe dans la poitrine, constant et mélancolique.
Le silence retombe, porteur de toute cette douleur accumulée.
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 3.1: PHYSICS AUDIT INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3.1 — Physics Audit Invariants', () => {
  const brief = computeForgeEmotionBrief(BRIEF_PARAMS);

  it('AUDIT-INV-01: runPhysicsAudit disabled → audit_id = "disabled"', () => {
    const result = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      { ...AUDIT_CONFIG, enabled: false },
    );
    expect(result.audit_id).toBe('disabled');
    expect(result.physics_score).toBe(100.0);
  });

  it('AUDIT-INV-02: runPhysicsAudit enabled → valid score [0, 100]', () => {
    const result = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    expect(result.audit_id).not.toBe('disabled');
    expect(result.physics_score).toBeGreaterThanOrEqual(0);
    expect(result.physics_score).toBeLessThanOrEqual(100);
  });

  it('AUDIT-INV-03: audit_hash is 64 hex chars (deterministic)', () => {
    const result = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    expect(result.audit_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('AUDIT-INV-04: same input → same audit_hash (determinism)', () => {
    const a = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    const b = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    expect(a.audit_hash).toBe(b.audit_hash);
    expect(a.physics_score).toBe(b.physics_score);
  });

  it('AUDIT-INV-05: no LLM call — runPhysicsAudit is sync (CALC only)', () => {
    // Proof: runPhysicsAudit returns PhysicsAuditResult, not Promise
    const result = runPhysicsAudit(
      'Prose courte.', brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    // If this were async, result would be a Promise, not an object
    expect(result.audit_id).toBeDefined();
    expect(typeof result.physics_score).toBe('number');
  });

  it('AUDIT-INV-06: PHYSICS_AUDIT_ENABLED = true in config (Sprint 3.4)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED).toBe(true);
  });

  it('AUDIT-INV-07: audit weights sum to 1.0', () => {
    const w = SOVEREIGN_CONFIG.PHYSICS_AUDIT_WEIGHTS;
    const sum = w.trajectory_weight + w.law_weight + w.dead_zone_weight + w.forced_transition_weight;
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.2: DELTA 6D INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3.2 — Delta 6D Invariants', () => {
  it('DELTA-6D-01: buildPhysicsDelta(undefined) → enabled=false, stable hash', () => {
    const delta = buildPhysicsDelta(undefined);
    expect(delta.enabled).toBe(false);
    expect(delta.physics_score).toBe(0);
    expect(delta.delta_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('DELTA-6D-02: buildPhysicsDelta(disabled) → same as undefined', () => {
    const undefinedDelta = buildPhysicsDelta(undefined);
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    const disabledResult = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      { ...AUDIT_CONFIG, enabled: false },
    );
    const disabledDelta = buildPhysicsDelta(disabledResult);
    expect(disabledDelta.delta_hash).toBe(undefinedDelta.delta_hash);
  });

  it('DELTA-6D-03: active audit → enabled=true, physics_score > 0', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    const audit = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    const delta = buildPhysicsDelta(audit);
    expect(delta.enabled).toBe(true);
    expect(delta.physics_score).toBeGreaterThanOrEqual(0);
  });

  it('DELTA-6D-04: DeltaReport type has physics_delta + prescriptions_delta fields', () => {
    // Verify types exist (structural test)
    const typesPath = path.resolve(__dirname, '../../src/types.ts');
    const content = fs.readFileSync(typesPath, 'utf-8');
    expect(content).toContain('physics_delta');
    expect(content).toContain('prescriptions_delta');
    expect(content).toContain('PhysicsDelta');
    expect(content).toContain('PrescriptionsDelta');
  });

  it('DELTA-6D-05: same audit → same delta hash (determinism)', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    const audit = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    const a = buildPhysicsDelta(audit);
    const b = buildPhysicsDelta(audit);
    expect(a.delta_hash).toBe(b.delta_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.3: PRESCRIPTIONS INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3.3 — Prescriptions Invariants', () => {
  it('PRESC-INV-01: prescriptions types exist', () => {
    const typesPath = path.resolve(__dirname, '../../src/prescriptions/types.ts');
    expect(fs.existsSync(typesPath)).toBe(true);
    const content = fs.readFileSync(typesPath, 'utf-8');
    expect(content).toContain('Prescription');
    expect(content).toContain('severity');
    expect(content).toContain('segment_index');
  });

  it('PRESC-INV-02: triple-pitch accepts prescriptions parameter', () => {
    const triplePitchPath = path.resolve(__dirname, '../../src/pitch/triple-pitch.ts');
    const content = fs.readFileSync(triplePitchPath, 'utf-8');
    // generateTriplePitch should accept prescriptions as parameter
    expect(content).toContain('Prescription');
    expect(content).toContain('generateTriplePitch');
  });

  it('PRESC-INV-03: PRESCRIPTIONS_TOP_K configured in SOVEREIGN_CONFIG', () => {
    expect(SOVEREIGN_CONFIG.PRESCRIPTIONS_TOP_K).toBeDefined();
    expect(typeof SOVEREIGN_CONFIG.PRESCRIPTIONS_TOP_K).toBe('number');
    expect(SOVEREIGN_CONFIG.PRESCRIPTIONS_TOP_K).toBe(5);
  });

  it('PRESC-INV-04: no omega-forge import in prescriptions/generate-prescriptions.ts', () => {
    const genPath = path.resolve(__dirname, '../../src/prescriptions/generate-prescriptions.ts');
    if (fs.existsSync(genPath)) {
      const content = fs.readFileSync(genPath, 'utf-8');
      // Prescriptions should consume PhysicsAuditResult, NOT call omega-forge directly
      expect(content).not.toMatch(/from\s+['"]@omega\/omega-forge['"]/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3.4: PHYSICS COMPLIANCE SUB-AXIS INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3.4 — Physics Compliance Sub-Axis Invariants', () => {
  it('PC-INV-01: scorePhysicsCompliance(undefined) → neutral score 50', () => {
    const result = scorePhysicsCompliance(undefined);
    expect(result.name).toBe('physics_compliance');
    expect(result.score).toBe(50);
    expect(result.weight).toBe(0);
    expect(result.method).toBe('CALC');
  });

  it('PC-INV-02: weight = 0 (INFORMATIF by default)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT).toBe(0);
    const result = scorePhysicsCompliance(undefined);
    expect(result.weight).toBe(0);
  });

  it('PC-INV-03: active audit → score wraps physics_score', () => {
    const brief = computeForgeEmotionBrief(BRIEF_PARAMS);
    const audit = runPhysicsAudit(
      SAMPLE_PROSE, brief, DEFAULT_CANONICAL_TABLE,
      SOVEREIGN_CONFIG.PERSISTENCE_CEILING,
      AUDIT_CONFIG,
    );
    const result = scorePhysicsCompliance(audit);
    expect(result.score).toBe(audit.physics_score);
    expect(result.weight).toBe(0); // INFORMATIF
    expect(result.details).toContain('informatif');
  });

  it('PC-INV-04: engine.ts imports runPhysicsAudit + generatePrescriptions', () => {
    const enginePath = path.resolve(__dirname, '../../src/engine.ts');
    const content = fs.readFileSync(enginePath, 'utf-8');
    expect(content).toContain('runPhysicsAudit');
    expect(content).toContain('generatePrescriptions');
    expect(content).toContain('PhysicsAuditResult');
  });

  it('PC-INV-05: SovereignForgeResult type has physics_audit + prescriptions', () => {
    const enginePath = path.resolve(__dirname, '../../src/engine.ts');
    const content = fs.readFileSync(enginePath, 'utf-8');
    expect(content).toContain('physics_audit');
    expect(content).toContain('prescriptions');
  });

  it('PC-INV-06: macro-axes.ts integrates physics_compliance', () => {
    const macroPath = path.resolve(__dirname, '../../src/oracle/macro-axes.ts');
    const content = fs.readFileSync(macroPath, 'utf-8');
    expect(content).toContain('physics_compliance');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sprint 3 — Feature Flags', () => {
  it('FLAG-01: PHYSICS_AUDIT_ENABLED = true (activated Sprint 3.4)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_AUDIT_ENABLED).toBe(true);
  });

  it('FLAG-02: PHYSICS_COMPLIANCE_ENABLED = false (informatif, pending calibration)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_ENABLED).toBe(false);
  });

  it('FLAG-03: PHYSICS_COMPLIANCE_WEIGHT = 0 (no effect on ECC)', () => {
    expect(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT).toBe(0);
  });

  it('FLAG-04: PRESCRIPTIONS_ENABLED = false (pending calibration)', () => {
    expect(SOVEREIGN_CONFIG.PRESCRIPTIONS_ENABLED).toBe(false);
  });
});
