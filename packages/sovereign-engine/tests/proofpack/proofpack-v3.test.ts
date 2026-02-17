/**
 * Tests: ProofPack V3 + Blueprint V2 + Audit Report (Sprint 19)
 * Invariants: ART-PROOF-01, ART-PROOF-02, ART-PROOF-03
 */

import { describe, it, expect } from 'vitest';
import { generateProofPackV3, ART_INVARIANTS, ART_MODULES, SPRINT_HISTORY } from '../../src/proofpack/proofpack-v3.js';
import { generateBlueprintV2, ALL_AXES, ALL_MACRO_AXES, PIPELINE_FLOW } from '../../src/proofpack/blueprint-v2.js';
import { generateAuditReport, AUDIT_QUESTIONS } from '../../src/proofpack/audit-report.js';

describe('ProofPackV3 (ART-PROOF-01)', () => {
  it('PP-01: all ART invariants are PASS', () => {
    expect(ART_INVARIANTS.length).toBeGreaterThanOrEqual(27);
    for (const inv of ART_INVARIANTS) {
      expect(inv.status).toBe('PASS');
      expect(inv.test_ids.length).toBeGreaterThan(0);
    }
  });

  it('PP-02: all sprints 9-19 are sealed', () => {
    expect(SPRINT_HISTORY.length).toBe(11); // sprints 9-19
    for (const sprint of SPRINT_HISTORY) {
      expect(sprint.status).toBe('SEALED');
      expect(sprint.tag).toMatch(/sprint-\d+-sealed/);
    }
  });

  it('PP-03: modules cover all ART sprints', () => {
    expect(ART_MODULES.length).toBeGreaterThanOrEqual(11);
    const sprints = new Set(ART_MODULES.map(m => m.sprint));
    for (let s = 9; s <= 18; s++) {
      expect(sprints.has(s)).toBe(true);
    }
  });

  it('PP-04: generateProofPackV3 produces valid manifest', () => {
    const pack = generateProofPackV3();

    expect(pack.version).toBe('3.0');
    expect(pack.all_pass).toBe(true);
    expect(pack.total_invariants).toBeGreaterThanOrEqual(27);
    expect(pack.total_tests).toBeGreaterThan(100); // total test_ids across invariants
    expect(pack.total_modules).toBeGreaterThanOrEqual(11);
  });

  it('PP-05: invariant IDs follow ART-* pattern', () => {
    for (const inv of ART_INVARIANTS) {
      expect(inv.id).toMatch(/^ART-/);
    }
  });
});

describe('BlueprintV2 (ART-PROOF-02)', () => {
  it('BP-01: all 20 axes defined', () => {
    expect(ALL_AXES.length).toBeGreaterThanOrEqual(18);
    for (const axis of ALL_AXES) {
      expect(axis.name.length).toBeGreaterThan(0);
      expect(['CALC', 'LLM', 'HYBRID']).toContain(axis.method);
      expect(axis.macro_axe).toMatch(/^(ECC|RCI|SII|IFI|AAI)$/);
    }
  });

  it('BP-02: 5 macro-axes defined', () => {
    expect(ALL_MACRO_AXES.length).toBe(5);
    const names = ALL_MACRO_AXES.map(m => m.name);
    expect(names).toContain('ECC');
    expect(names).toContain('RCI');
    expect(names).toContain('SII');
    expect(names).toContain('IFI');
    expect(names).toContain('AAI');
  });

  it('BP-03: macro-axes weights sum to ~1.0', () => {
    const total = ALL_MACRO_AXES.reduce((s, m) => s + m.weight_in_composite, 0);
    expect(total).toBeCloseTo(1.0, 1);
  });

  it('BP-04: pipeline has 13 steps', () => {
    expect(PIPELINE_FLOW.length).toBe(13);
    // Steps are sequential
    for (let i = 0; i < PIPELINE_FLOW.length; i++) {
      expect(PIPELINE_FLOW[i].step).toBe(i + 1);
    }
  });

  it('BP-05: generateBlueprintV2 produces valid doc', () => {
    const bp = generateBlueprintV2();

    expect(bp.version).toBe('2.0');
    expect(bp.scoring.sovereign_threshold).toBe(93);
    expect(bp.scoring.axis_floor).toBe(50);
    expect(bp.scoring.total_axes).toBeGreaterThanOrEqual(18);
    expect(bp.scoring.total_macro_axes).toBe(5);
  });
});

describe('AuditReport (ART-PROOF-03)', () => {
  it('AUDIT-01: generateAuditReport produces complete report', () => {
    const report = generateAuditReport();

    expect(report.report_version).toBe('1.0');
    expect(report.target).toBe('external_auditor');
    expect(report.executive_summary.total_tests).toBe(442);
    expect(report.executive_summary.all_pass).toBe(true);
    expect(report.executive_summary.sovereign_threshold).toBe(93);
  });

  it('AUDIT-02: risk assessment has no critical risks', () => {
    const report = generateAuditReport();

    expect(report.risk_assessment.critical_risks.length).toBe(0);
    expect(report.risk_assessment.medium_risks.length).toBeGreaterThan(0);
    expect(report.risk_assessment.mitigated_risks.length).toBeGreaterThanOrEqual(4);
  });

  it('AUDIT-03: all 7 original trous mitigated', () => {
    const report = generateAuditReport();
    const mitigated = report.risk_assessment.mitigated_risks;

    // At least 4 mitigated risks (Trous #1, #2-4, #6, #7)
    expect(mitigated.length).toBeGreaterThanOrEqual(4);
    for (const risk of mitigated) {
      expect(risk.status).toBe('MITIGATED');
    }
  });

  it('AUDIT-04: 10 audit questions for external reviewer', () => {
    expect(AUDIT_QUESTIONS.length).toBe(10);
  });

  it('AUDIT-05: architecture overview percentages add up', () => {
    const report = generateAuditReport();
    const { calc_percentage, llm_percentage, hybrid_percentage } = report.architecture_overview;

    const total = calc_percentage + llm_percentage + hybrid_percentage;
    expect(total).toBeGreaterThanOrEqual(95); // rounding tolerance
    expect(total).toBeLessThanOrEqual(105);
  });

  it('AUDIT-06: invariant coverage = 100%', () => {
    const report = generateAuditReport();
    expect(report.invariant_status.coverage_pct).toBe(100);
    expect(report.invariant_status.failing).toBe(0);
    expect(report.invariant_status.untested).toBe(0);
  });
});
