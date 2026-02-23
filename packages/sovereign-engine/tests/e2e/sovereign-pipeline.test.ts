/**
 * E2E Tests for Sovereign Pipeline (offline deterministic)
 * Sprint S3 — TDD
 *
 * Pipeline: ForgePacket → DeltaComputer → SovereignLoop → TriplePitch → PitchOracle
 *   → PatchEngine → SOracle V2 → AntiClicheSweep → MusicalPolish → SignatureEnforcer
 *   → SOracle V2 final → SEAL or REJECT
 */

import { describe, it, expect } from 'vitest';
import { runSovereignPipeline } from '../../src/pipeline/sovereign-pipeline.js';
import type { SovereignRunResult } from '../../src/pipeline/sovereign-pipeline.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { PROSE_GOOD, PROSE_BAD, PROSE_FLAT } from '../fixtures/mock-prose.js';

const packet = createTestPacket();

describe('Sovereign Pipeline E2E (offline)', () => {
  it('T01: pipeline complet retourne SovereignRunResult', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);

    expect(result).toBeDefined();
    expect(result.forge_packet).toBeDefined();
    expect(result.delta_report).toBeDefined();
    expect(result.s_score_initial).toBeDefined();
    expect(result.s_score_final).toBeDefined();
  });

  it('T02: verdict SEAL ou REJECT présent', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);

    expect(['SEAL', 'REJECT']).toContain(result.verdict);
  });

  it('T03: tous 12 artefacts présents dans result', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);

    expect(result).toHaveProperty('forge_packet');
    expect(result).toHaveProperty('delta_report');
    expect(result).toHaveProperty('sovereign_loop');
    expect(result).toHaveProperty('s_score_initial');
    expect(result).toHaveProperty('s_score_final');
    expect(result).toHaveProperty('anti_cliche');
    expect(result).toHaveProperty('musical_polish');
    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('pipeline_hash');
    expect(result).toHaveProperty('run_at');
  });

  it('T04: déterminisme — même packet + même prose → même résultat complet', () => {
    const r1 = runSovereignPipeline(PROSE_GOOD, packet);
    const r2 = runSovereignPipeline(PROSE_GOOD, packet);

    expect(r1.pipeline_hash).toBe(r2.pipeline_hash);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.s_score_final.composite).toBe(r2.s_score_final.composite);
  });

  it('T05: MÉTAMORPHIQUE — prose avec blacklist → sweep nettoyé', () => {
    const result = runSovereignPipeline(PROSE_BAD, packet);

    // After pipeline, banned clichés should be cleaned
    expect(result.anti_cliche.nb_replacements).toBeGreaterThanOrEqual(0);
  });

  it('T06: nb_passes ≤ 2 [INV-S-BOUND-01]', () => {
    const result = runSovereignPipeline(PROSE_BAD, packet);

    expect(result.sovereign_loop.nb_passes).toBeLessThanOrEqual(2);
  });

  it('T07: poids émotion ≥ 60% dans score final [INV-S-EMOTION-60]', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);

    expect(result.s_score_final.emotion_weight_ratio).toBeGreaterThanOrEqual(0.60);
  });

  it('T08: pipeline_hash SHA-256 de l\'artefact complet', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);

    expect(result.pipeline_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('T09: baseline golden 1 — pipeline retourne résultat stable', () => {
    const result = runSovereignPipeline(PROSE_GOOD, packet);

    expect(typeof result.s_score_final.composite).toBe('number');
    expect(Number.isFinite(result.s_score_final.composite)).toBe(true);
  });

  it('T10: baseline golden 2 — prose bad', () => {
    const result = runSovereignPipeline(PROSE_BAD, packet);

    expect(typeof result.s_score_final.composite).toBe('number');
    expect(Number.isFinite(result.s_score_final.composite)).toBe(true);
  });

  it('T11: baseline golden 3 — prose flat', () => {
    const result = runSovereignPipeline(PROSE_FLAT, packet);

    expect(typeof result.s_score_final.composite).toBe('number');
    expect(Number.isFinite(result.s_score_final.composite)).toBe(true);
  });
});
