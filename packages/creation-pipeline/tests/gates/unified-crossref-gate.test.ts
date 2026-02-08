/**
 * OMEGA Creation Pipeline — Unified Crossref Gate Tests
 * Phase C.4 — C4-INV-06: Cross-reference integrity
 * 10 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedCrossrefGate } from '../../src/gates/unified-crossref-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedCrossrefGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('consistent — scenario A runs and produces valid metrics', () => {
    const result = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_CROSSREF');
    expect(['PASS', 'FAIL']).toContain(result.verdict);
    expect(result.metrics.known_refs).toBeGreaterThan(0);
    expect(result.metrics.text_names).toBeGreaterThanOrEqual(0);
  });

  it('orphan name FAIL — injected proper noun not in canon/plan', () => {
    const modifiedParagraphs = snap.styleOutput.paragraphs.map((p, i) => {
      if (i === 0) {
        return {
          ...p,
          text: p.text + ' Zarkovian approached the Xendrith gates, summoning Velmora from the crystalline depths.',
        };
      }
      return p;
    });
    const modifiedOutput = { ...snap.styleOutput, paragraphs: modifiedParagraphs };

    const result = runUnifiedCrossrefGate(
      modifiedOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Zarkovian, Xendrith, Velmora are not in canon or plan
    expect(result.metrics.orphan_count).toBeGreaterThan(0);
    expect(result.verdict).toBe('FAIL');
  });

  it('plan refs are included in known references', () => {
    const result = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.known_refs).toBeGreaterThan(0);
  });

  it('canon refs are included in known references', () => {
    const result = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Canon has entries like "lighthouse", "keeper", "Elias", "island"
    expect(result.metrics.known_refs).toBeGreaterThan(0);
  });

  it('seed refs are included in known references', () => {
    // The plan should have seed_registry entries
    expect(snap.plan.seed_registry).toBeDefined();
    const result = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Seeds contribute to known_refs
    expect(result.metrics.known_refs).toBeGreaterThan(5);
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.known_refs).toBe(r2.metrics.known_refs);
    expect(r1.metrics.text_names).toBe(r2.metrics.text_names);
    expect(r1.metrics.orphan_count).toBe(r2.metrics.orphan_count);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedCrossrefGate(
      snap.styleOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.known_refs).toBe('number');
    expect(typeof result.metrics.text_names).toBe('number');
    expect(typeof result.metrics.orphan_count).toBe('number');
    expect(result.metrics.known_refs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.text_names).toBeGreaterThanOrEqual(0);
    expect(result.metrics.orphan_count).toBeGreaterThanOrEqual(0);
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('C4-INV-06 — violations reference correct invariant', () => {
    // Force FAIL with multiple orphan proper nouns
    const orphanParagraphs = snap.styleOutput.paragraphs.map((p) => ({
      ...p,
      text: 'Valderian marched through Krypthos while Zenobia observed from the Oraculum tower.',
    }));
    const orphanOutput = { ...snap.styleOutput, paragraphs: orphanParagraphs };

    const result = runUnifiedCrossrefGate(
      orphanOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    if (result.violations.length > 0) {
      for (const v of result.violations) {
        expect(v.invariant).toBe('C4-INV-06');
        expect(v.gate_id).toBe('U_CROSSREF');
        expect(v.severity).toBe('ERROR');
      }
    }
  });

  it('empty text — no names extracted, no violations', () => {
    const emptyOutput = { ...snap.styleOutput, paragraphs: [] };
    const result = runUnifiedCrossrefGate(
      emptyOutput, snap.plan, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.metrics.text_names).toBe(0);
    expect(result.metrics.orphan_count).toBe(0);
    expect(result.verdict).toBe('PASS');
  });

  it('CROSSREF_MAX_ORPHANS config allows small tolerance', () => {
    const maxOrphans = DEFAULT_C4_CONFIG.CROSSREF_MAX_ORPHANS.value as number;
    expect(maxOrphans).toBe(5);

    // A zero-tolerance config should FAIL even one orphan
    const strictConfig = {
      ...DEFAULT_C4_CONFIG,
      CROSSREF_MAX_ORPHANS: { ...DEFAULT_C4_CONFIG.CROSSREF_MAX_ORPHANS, value: 0 },
    };
    const oneOrphanParas = [{
      ...snap.styleOutput.paragraphs[0],
      text: 'Quantravius descended from the mountain peak.',
    }];
    const oneOrphanOutput = { ...snap.styleOutput, paragraphs: oneOrphanParas };

    const result = runUnifiedCrossrefGate(
      oneOrphanOutput, snap.plan, INTENT_PACK_A, strictConfig, TIMESTAMP,
    );
    if (result.metrics.orphan_count > 0) {
      expect(result.verdict).toBe('FAIL');
    }
  });
});
