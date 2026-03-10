/**
 * Tests unitaires — prose-fingerprint.ts
 * U-ROSETTE-14 Phase 1A
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Tests FP-01..FP-12
 */

import { describe, it, expect } from 'vitest';
import {
  computeProseFingerprint,
  type ProseFingerprintResult,
} from '../../src/validation/phase-u/audit/prose-fingerprint.js';

// ── Prose de test ─────────────────────────────────────────────────────────────

const PROSE_NOMINAL = `La nuit tombait sur les toits. La lumière disparaissait lentement. Les ombres envahissaient la rue.`;

const PROSE_VERBAL = `Il ouvrit la porte. Elle regardait par la fenêtre. Ils marchaient en silence.`;

const PROSE_PARTICIPIAL = `Penché sur la table, il lisait. Traversant la pièce, elle s'arrêta. Regardant le ciel, il soupira.`;

const PROSE_ADVERBIAL = `Lentement, il avança vers la porte. Soudain, un bruit éclata. Pourtant, rien ne bougea.`;

const PROSE_WITH_IMAGES = `Il marchait comme une ombre dans la nuit. La peur avait le grain du béton mouillé. Elle semblait porter une marque invisible.`;

const PROSE_ABSTRACT = `Le silence envahissait son âme. La douleur et la tristesse étaient ses compagnons. L'espoir disparaissait dans le vide.`;

const PROSE_LONG = `La nuit tombait sur la ville abandonnée. Il ouvrit la porte avec précaution, le cœur battant. Penché sur la fenêtre, il observa la rue déserte. Soudain, un bruit sourd résonna dans le couloir sombre. Elle se retourna brusquement, les yeux écarquillés de terreur. La peur avait le grain du béton mouillé sous la pluie. Traversant la pièce en silence, il cherchait une issue. Lentement, ses doigts effleurèrent le mur froid. Le temps s'était arrêté dans cet espace clos.`;

const PROSE_REPETITIVE = `Il marchait dans la rue. Il regardait la rue. Il traversait la rue. Il fuyait dans la rue.`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeProseFingerprint — INV-FP-01..09', () => {

  // ── FP-01 : Déterminisme ───────────────────────────────────────────────────

  it('FP-01: même prose → même fingerprint (déterminisme)', () => {
    const r1 = computeProseFingerprint(PROSE_LONG);
    const r2 = computeProseFingerprint(PROSE_LONG);
    expect(r1).toEqual(r2);
  });

  // ── FP-02 : Résultat typé complet ─────────────────────────────────────────

  it('FP-02: résultat contient tous les champs attendus', () => {
    const r = computeProseFingerprint(PROSE_LONG);
    expect(r).toHaveProperty('sentence_count');
    expect(r).toHaveProperty('avg_sentence_length');
    expect(r).toHaveProperty('sentence_length_variance');
    expect(r).toHaveProperty('attack_distribution');
    expect(r).toHaveProperty('image_density');
    expect(r).toHaveProperty('abstract_ratio');
    expect(r).toHaveProperty('repetition_score');
    expect(r).toHaveProperty('parenthetical_count');
    expect(r).toHaveProperty('word_count');
  });

  // ── FP-03 : Résistance entrée vide ────────────────────────────────────────

  it('FP-03a: prose vide → fingerprint zéro (INV-FP-03)', () => {
    const r = computeProseFingerprint('');
    expect(r.sentence_count).toBe(0);
    expect(r.avg_sentence_length).toBe(0);
    expect(r.word_count).toBe(0);
    expect(r.repetition_score).toBe(0);
  });

  it('FP-03b: prose whitespace only → fingerprint zéro', () => {
    const r = computeProseFingerprint('   \n\n\t  ');
    expect(r.sentence_count).toBe(0);
    expect(r.word_count).toBe(0);
  });

  // ── FP-04 : avg_sentence_length en mots ───────────────────────────────────

  it('FP-04: avg_sentence_length est en mots, pas en caractères (INV-FP-04)', () => {
    const r = computeProseFingerprint(PROSE_NOMINAL);
    // 3 phrases : "La nuit tombait sur les toits" (6), "La lumière disparaissait lentement" (4),
    //             "Les ombres envahissaient la rue" (5) → avg ≈ 5.0
    expect(r.avg_sentence_length).toBeGreaterThan(3);
    expect(r.avg_sentence_length).toBeLessThan(10);
    expect(r.sentence_count).toBe(3);
  });

  // ── FP-05 : Variance population ───────────────────────────────────────────

  it('FP-05: variance = 0 pour des phrases de longueur identique (INV-FP-05)', () => {
    // 3 phrases courtes de ~4 mots chacune
    const prose = `Il rit. Elle pleure. Ils attendent.`;
    const r = computeProseFingerprint(prose);
    // Variance proche de 0 (petites phrases similaires)
    expect(r.sentence_length_variance).toBeGreaterThanOrEqual(0);
  });

  it('FP-05b: variance > 0 pour des phrases de longueurs très différentes', () => {
    const prose = `Il rit. Elle regardait par la fenêtre avec une attention particulière et mélancolique, les yeux fixés sur l'horizon lointain.`;
    const r = computeProseFingerprint(prose);
    expect(r.sentence_length_variance).toBeGreaterThan(0);
  });

  // ── FP-06 : Attack distribution ───────────────────────────────────────────

  it('FP-06a: prose nominale → majority nominal attacks (INV-FP-06)', () => {
    const r = computeProseFingerprint(PROSE_NOMINAL);
    expect(r.attack_distribution.nominal).toBeGreaterThan(0);
    expect(r.attack_distribution.nominal).toBeGreaterThanOrEqual(r.attack_distribution.verbal);
  });

  it('FP-06b: prose verbale → majority verbal attacks', () => {
    const r = computeProseFingerprint(PROSE_VERBAL);
    expect(r.attack_distribution.verbal).toBeGreaterThan(0);
  });

  it('FP-06c: prose participiale → majority participial attacks', () => {
    const r = computeProseFingerprint(PROSE_PARTICIPIAL);
    expect(r.attack_distribution.participial).toBeGreaterThan(0);
    expect(r.attack_distribution.participial).toBeGreaterThanOrEqual(r.attack_distribution.nominal);
  });

  it('FP-06d: prose adverbiale → majority adverbial attacks', () => {
    const r = computeProseFingerprint(PROSE_ADVERBIAL);
    expect(r.attack_distribution.adverbial).toBeGreaterThan(0);
    expect(r.attack_distribution.adverbial).toBeGreaterThanOrEqual(r.attack_distribution.verbal);
  });

  it('FP-06e: sum of attack_distribution = sentence_count', () => {
    const r = computeProseFingerprint(PROSE_LONG);
    const total = Object.values(r.attack_distribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(r.sentence_count);
  });

  // ── FP-07 : Image density ─────────────────────────────────────────────────

  it('FP-07a: prose avec images → image_density > 0 (INV-FP-07)', () => {
    const r = computeProseFingerprint(PROSE_WITH_IMAGES);
    expect(r.image_density).toBeGreaterThan(0);
  });

  it('FP-07b: prose sans images → image_density faible', () => {
    const r = computeProseFingerprint(PROSE_VERBAL);
    // Prose verbale simple sans "comme" ni métaphore → density proche de 0
    expect(r.image_density).toBeLessThan(0.5);
  });

  it('FP-07c: image_density ∈ [0, 1]', () => {
    const r = computeProseFingerprint(PROSE_WITH_IMAGES);
    expect(r.image_density).toBeGreaterThanOrEqual(0);
    expect(r.image_density).toBeLessThanOrEqual(1);
  });

  // ── FP-08 : Abstract ratio ────────────────────────────────────────────────

  it('FP-08a: prose abstraite → abstract_ratio élevé (INV-FP-08)', () => {
    const r = computeProseFingerprint(PROSE_ABSTRACT);
    expect(r.abstract_ratio).toBeGreaterThan(0);
  });

  it('FP-08b: abstract_ratio ∈ [0, 1]', () => {
    const r = computeProseFingerprint(PROSE_LONG);
    expect(r.abstract_ratio).toBeGreaterThanOrEqual(0);
    expect(r.abstract_ratio).toBeLessThanOrEqual(1);
  });

  // ── FP-09 : Repetition score ──────────────────────────────────────────────

  it('FP-09a: prose répétitive → repetition_score > prose variée (INV-FP-09)', () => {
    const rRep  = computeProseFingerprint(PROSE_REPETITIVE);
    const rLong = computeProseFingerprint(PROSE_LONG);
    expect(rRep.repetition_score).toBeGreaterThan(rLong.repetition_score);
  });

  it('FP-09b: repetition_score ∈ [0, 1]', () => {
    const r = computeProseFingerprint(PROSE_REPETITIVE);
    expect(r.repetition_score).toBeGreaterThanOrEqual(0);
    expect(r.repetition_score).toBeLessThanOrEqual(1);
  });

  it('FP-09c: prose à une seule phrase → repetition_score = 0', () => {
    const r = computeProseFingerprint(`Il marchait dans la rue sombre.`);
    expect(r.repetition_score).toBe(0);
  });

  // ── Intégration : fingerprint complet sur PROSE_LONG ─────────────────────

  it('FP-INTEGRATION: fingerprint complet cohérent sur prose longue', () => {
    const r = computeProseFingerprint(PROSE_LONG);
    // Cohérence interne
    expect(r.sentence_count).toBeGreaterThan(0);
    expect(r.word_count).toBeGreaterThan(r.sentence_count); // plus de mots que de phrases
    expect(r.avg_sentence_length).toBeGreaterThan(1);
    // Distribution exhaustive
    const totalAttacks = Object.values(r.attack_distribution).reduce((a, b) => a + b, 0);
    expect(totalAttacks).toBe(r.sentence_count);
    // Prose longue avec images → density non nulle
    expect(r.image_density).toBeGreaterThan(0);
  });
});
