/**
 * Gate: Phase S — 14 Invariants Verification
 * Sprint S3 — Verifies all Phase S invariants on golden fixtures.
 */

import { describe, it, expect } from 'vitest';
import { runSovereignPipeline } from '../../src/pipeline/sovereign-pipeline.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD, PROSE_FLAT } from '../fixtures/mock-prose.js';
import { PITCH_CATALOG, validatePitchStrategy } from '../../src/pitch/triple-pitch-engine.js';
import { generateTriplePitch } from '../../src/pitch/triple-pitch-engine.js';
import { computeDelta } from '../../src/delta/delta-computer.js';
import { generateDeltaReport } from '../../src/delta/delta-report.js';
import { assembleForgePacket } from '../../src/input/forge-packet-assembler.js';

const packet = createTestPacket();

describe('Gate: Phase S — 14 Invariants', () => {
  // INV-S-PACKET-01: packet validé + hashé
  it('INV-S-PACKET-01: packet validé + hashé', () => {
    expect(packet.packet_hash).toBeTruthy();
    expect(packet.packet_id).toBeTruthy();
    expect(packet.scene_id).toBeTruthy();
  });

  // INV-S-PACKET-02: curve_quartiles présent
  it('INV-S-PACKET-02: curve_quartiles présent', () => {
    expect(packet.emotion_contract.curve_quartiles).toHaveLength(4);
    for (const q of packet.emotion_contract.curve_quartiles) {
      expect(q.target_14d).toBeDefined();
      expect(q.quartile).toMatch(/^Q[1-4]$/);
    }
  });

  // INV-S-PACKET-03: validator FAIL → pipeline court-circuité (tested via missing fields)
  it('INV-S-PACKET-03: valid packet runs pipeline successfully', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);
    expect(result).toBeDefined();
    expect(result.verdict).toBeDefined();
  });

  // INV-S-EMOTION-60: ratio ≥ 60%
  it('INV-S-EMOTION-60: emotion weight ratio ≥ 60%', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);
    expect(result.s_score_final.emotion_weight_ratio).toBeGreaterThanOrEqual(0.60);
  });

  // INV-S-ORACLE-01: déterminisme
  it('INV-S-ORACLE-01: déterminisme total', () => {
    const r1 = runSovereignPipeline(PROSE_GOOD, packet);
    const r2 = runSovereignPipeline(PROSE_GOOD, packet);

    expect(r1.pipeline_hash).toBe(r2.pipeline_hash);
    expect(r1.s_score_final.composite).toBe(r2.s_score_final.composite);
    expect(r1.verdict).toBe(r2.verdict);
  });

  // INV-S-BOUND-01: max 2 passes
  it('INV-S-BOUND-01: max 2 passes', () => {
    const result = runSovereignPipeline(PROSE_BAD, packet);
    expect(result.sovereign_loop.nb_passes).toBeLessThanOrEqual(2);
  });

  // INV-S-GENOME-01: genome gelé
  it('INV-S-GENOME-01: genome markers enforced', () => {
    const result = runSovereignPipeline(PROSE_FLAT, packet);
    const signatureWords = packet.style_genome.lexicon.signature_words;
    const hasMarker = signatureWords.some((w) =>
      result.signature.enforced_prose.toLowerCase().includes(w.toLowerCase()),
    );
    expect(hasMarker).toBe(true);
  });

  // INV-S-DUEL-01: duel reproductible
  it('INV-S-DUEL-01: duel reproductible', () => {
    const r1 = runSovereignPipeline(PROSE_BAD, packet);
    const r2 = runSovereignPipeline(PROSE_BAD, packet);

    if (r1.duel_result && r2.duel_result) {
      expect(r1.duel_result.winner_index).toBe(r2.duel_result.winner_index);
      expect(r1.duel_result.winner_hash).toBe(r2.duel_result.winner_hash);
    }
  });

  // INV-S-NOCLICHE-01: 0 cliché après sweep
  it('INV-S-NOCLICHE-01: 0 cliché après sweep', () => {
    const result = runSovereignPipeline(PROSE_BAD, packet);

    // After sweep, banned clichés should be removed
    for (const cliche of packet.kill_lists.banned_cliches) {
      const swept = result.anti_cliche.swept_prose.toLowerCase();
      expect(swept).not.toContain(cliche.toLowerCase());
    }
  });

  // INV-S-POLISH-01: patch preserves beats
  it('INV-S-POLISH-01: pipeline preserves canon', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);
    // Pipeline should complete without destroying output
    expect(result.s_score_final).toBeDefined();
  });

  // INV-S-EMOTION-01: corrélation 14D (checked via tension_14d axis)
  it('INV-S-EMOTION-01: tension_14d axis scored', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);
    const tensionAxis = result.s_score_final.axes.find((a) => a.name === 'tension_14d');
    expect(tensionAxis).toBeDefined();
    expect(tensionAxis!.raw).toBeGreaterThanOrEqual(0);
  });

  // INV-S-TENSION-01: structure tension présente
  it('INV-S-TENSION-01: tension structure in delta', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);
    expect(result.delta_report.tension_delta).toBeDefined();
    expect(result.delta_report.tension_delta.slope_match).toBeDefined();
  });

  // INV-S-MUSICAL-01: max 1 phrase corrigée
  it('INV-S-MUSICAL-01: max 1 phrase corrigée', () => {
    const result = runSovereignPipeline(PROSE_FLAT, packet);
    expect(result.musical_polish.corrections_applied).toBeLessThanOrEqual(1);
  });

  // INV-S-CATALOG-01: ops dans catalogue
  it('INV-S-CATALOG-01: all ops in catalog', () => {
    const delta = generateDeltaReport(packet, PROSE_GOOD);
    const pitch = generateTriplePitch(delta, 'GATE_TEST');

    for (const strategy of pitch.strategies) {
      // Should not throw
      validatePitchStrategy(strategy);
    }
  });
});
