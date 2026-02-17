/**
 * Tests: Certification + Roadmap ART v2 (Sprint 20)
 * Invariants: ART-CERT-01, ART-CERT-02, ART-CERT-03
 */

import { describe, it, expect } from 'vitest';
import { runCertificationGates } from '../../src/proofpack/certification.js';
import { generateRoadmapV2, ROADMAP_V2_ITEMS, ROADMAP_V2_PHASES } from '../../src/proofpack/roadmap-art-v2.js';

describe('Certification (ART-CERT-01)', () => {
  it('CERT-01: all 10 gates PASS → GO verdict', () => {
    const verdict = runCertificationGates();

    expect(verdict.verdict).toBe('GO');
    expect(verdict.version_tag).toBe('v3.0.0-art');
    expect(verdict.gates_passed).toBe(verdict.gates_total);
    expect(verdict.gates_total).toBe(10);
  });

  it('CERT-02: gate details are complete', () => {
    const verdict = runCertificationGates();

    for (const gate of verdict.gates) {
      expect(gate.gate_id).toMatch(/^CERT-GATE-\d{2}$/);
      expect(gate.status).toBe('PASS');
      expect(gate.description.length).toBeGreaterThan(0);
      expect(gate.detail.length).toBeGreaterThan(0);
    }
  });

  it('CERT-03: summary matches expected counts', () => {
    const verdict = runCertificationGates();
    const s = verdict.summary;

    expect(s.sprints_sealed).toBe(11);         // 9-19
    expect(s.invariants_pass).toBe(s.invariants_total);
    expect(s.invariants_total).toBeGreaterThanOrEqual(27);
    expect(s.axes_total).toBeGreaterThanOrEqual(18);
    expect(s.macro_axes_total).toBe(5);
    expect(s.modules_total).toBeGreaterThanOrEqual(11);
    expect(s.original_holes_fixed).toBe(7);
    expect(s.original_holes_total).toBe(7);
  });

  it('CERT-04: determinism', () => {
    const v1 = runCertificationGates();
    const v2 = runCertificationGates();

    expect(v1.verdict).toBe(v2.verdict);
    expect(v1.gates_passed).toBe(v2.gates_passed);
  });
});

describe('RoadmapV2 (ART-CERT-03)', () => {
  it('RMAP-01: 12 roadmap items defined', () => {
    expect(ROADMAP_V2_ITEMS.length).toBe(12);

    for (const item of ROADMAP_V2_ITEMS) {
      expect(item.id).toMatch(/^ART2-\d{3}$/);
      expect(['P0', 'P1', 'P2', 'P3']).toContain(item.priority);
      expect(['accuracy', 'performance', 'coverage', 'innovation', 'production']).toContain(item.category);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.estimated_sprints).toBeGreaterThan(0);
    }
  });

  it('RMAP-02: 4 phases defined', () => {
    expect(ROADMAP_V2_PHASES.length).toBe(4);

    const phaseNames = ROADMAP_V2_PHASES.map(p => p.phase);
    expect(phaseNames).toEqual(['A', 'B', 'C', 'D']);
  });

  it('RMAP-03: all items assigned to a phase', () => {
    const allPhaseItems = ROADMAP_V2_PHASES.flatMap(p => p.items);
    const allItemIds = ROADMAP_V2_ITEMS.map(i => i.id);

    for (const id of allItemIds) {
      expect(allPhaseItems).toContain(id);
    }
  });

  it('RMAP-04: P0 items have highest priority', () => {
    const p0Items = ROADMAP_V2_ITEMS.filter(i => i.priority === 'P0');
    expect(p0Items.length).toBeGreaterThanOrEqual(3);

    // P0 items should be in Phase A
    const phaseA = ROADMAP_V2_PHASES.find(p => p.phase === 'A')!;
    for (const p0 of p0Items) {
      expect(phaseA.items).toContain(p0.id);
    }
  });

  it('RMAP-05: generateRoadmapV2 produces valid output', () => {
    const roadmap = generateRoadmapV2();

    expect(roadmap.version).toBe('2.0');
    expect(roadmap.art_v1_status).toBe('COMPLETED');
    expect(roadmap.items.length).toBe(12);
    expect(roadmap.phases.length).toBe(4);
    expect(roadmap.total_estimated_sprints).toBeGreaterThan(10);
  });
});
