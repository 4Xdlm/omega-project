/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTS — SOUL LAYER [U-W3]
 * ═══════════════════════════════════════════════════════════════════════════════
 * INV-U-03 : soul_layer présent 100% des runs validés
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  scoreSoulLayer,
  SOUL_WARMTH_FLOOR,
  SOUL_MIN_WORD_COUNT,
} from '../../src/filter/soul-layer.js';

describe('SoulLayer — Phase U W3', () => {

  // ─── INVARIANTS ────────────────────────────────────────────────────────────

  it('INV-U-03-A: même prose → résultat identique (déterminisme)', () => {
    const prose = 'Il remarqua la fenêtre ouverte. La gorge serrée, il attendit.';
    const r1 = scoreSoulLayer(prose);
    const r2 = scoreSoulLayer(prose);
    expect(r1.soul_present).toBe(r2.soul_present);
    expect(r1.human_warmth).toBe(r2.human_warmth);
    expect(r1.details).toBe(r2.details);
  });

  it('INV-U-03-B: SOUL_WARMTH_FLOOR = 0.5 (calibration RANKING_V4)', () => {
    expect(SOUL_WARMTH_FLOOR).toBe(0.5);
  });

  it('INV-U-03-C: prose vide → soul_present false, warmth 0', () => {
    const result = scoreSoulLayer('');
    expect(result.soul_present).toBe(false);
    expect(result.human_warmth).toBe(0);
    expect(result.warmth_floor_pass).toBe(false);
  });

  // ─── F1 INTÉRIORITÉ ────────────────────────────────────────────────────────

  it('S-01: verbe subjectif "remarqua" → F1 détecté, soul_present true', () => {
    const prose = 'Il remarqua que la porte était entrouverte depuis le matin.';
    const result = scoreSoulLayer(prose);
    expect(result.f1_interiorite).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-02: "comprit" → F1 détecté', () => {
    const prose = 'Elle comprit enfin ce que signifiait ce silence.';
    const result = scoreSoulLayer(prose);
    expect(result.f1_interiorite).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-03: multiple F1 → warmth augmente', () => {
    const prose = 'Il remarqua. Elle pensa. Il comprit. Elle devina.';
    const result = scoreSoulLayer(prose);
    expect(result.f1_interiorite).toBeGreaterThanOrEqual(4);
    expect(result.human_warmth).toBeGreaterThan(SOUL_WARMTH_FLOOR);
  });

  // ─── F2 CORPORÉITÉ ─────────────────────────────────────────────────────────

  it('S-04: "la gorge" → F2 détecté, soul_present true', () => {
    const prose = 'La gorge nouée, elle attendit que le bruit cesse.';
    const result = scoreSoulLayer(prose);
    expect(result.f2_corporeite).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-05: "ses doigts" → F2 détecté', () => {
    const prose = 'Ses doigts glissèrent sur le bord froid de la table.';
    const result = scoreSoulLayer(prose);
    expect(result.f2_corporeite).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-06: "son regard" → F2 détecté', () => {
    const prose = 'Son regard s\'attarda sur la fenêtre avant de se détourner.';
    const result = scoreSoulLayer(prose);
    expect(result.f2_corporeite).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  // ─── F3 IMPLICATION ────────────────────────────────────────────────────────

  it('S-07: "il se tut" → F3 détecté, soul_present true', () => {
    const prose = 'Il se tut. La pluie continuait de tomber sur les toits.';
    const result = scoreSoulLayer(prose);
    expect(result.f3_implication).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-08: "sans un mot" → F3 détecté', () => {
    const prose = 'Elle posa l\'enveloppe sur la table, sans un mot, et sortit.';
    const result = scoreSoulLayer(prose);
    expect(result.f3_implication).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-09: "ne répondit pas" → F3 détecté', () => {
    const prose = 'Il ne répondit pas. La question restait là, entre eux.';
    const result = scoreSoulLayer(prose);
    expect(result.f3_implication).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  // ─── SOUL ABSENT ───────────────────────────────────────────────────────────

  it('S-10: prose purement descriptive sans ancrage → soul_present false', () => {
    const prose = [
      'La voiture roula sur la route.',
      'Le moteur tournait régulièrement.',
      'Les arbres défilaient de chaque côté.',
      'Le soleil était haut dans le ciel bleu.',
      'La route était longue et droite.',
    ].join(' ');
    const result = scoreSoulLayer(prose);
    expect(result.soul_present).toBe(false);
    expect(result.f1_interiorite).toBe(0);
  });

  it('S-11: prose action pure sans intériorité → soul_present false', () => {
    const prose = [
      'Il courut jusqu\'à la porte.',
      'La porte s\'ouvrit.',
      'Il entra dans la pièce.',
      'La pièce était vide.',
      'Il ressortit aussitôt.',
    ].join(' ');
    const result = scoreSoulLayer(prose);
    expect(result.soul_present).toBe(false);
  });

  // ─── WARMTH FLOOR ──────────────────────────────────────────────────────────

  it('S-12: prose riche en marqueurs → warmth_floor_pass true', () => {
    const prose = [
      'Il remarqua la lumière changeante.',
      'La gorge serrée, il pensa à ce qu\'elle avait dit.',
      'Elle se tut. Ses doigts ne bougèrent plus.',
      'Il devina qu\'elle n\'ajouterait rien.',
      'Sans un mot, il attendit.',
    ].join(' ');
    const result = scoreSoulLayer(prose);
    expect(result.warmth_floor_pass).toBe(true);
    expect(result.human_warmth).toBeGreaterThanOrEqual(SOUL_WARMTH_FLOOR);
  });

  it('S-13: prose très longue avec 1 seul marqueur → warmth_floor peut échouer', () => {
    // 200 mots + 1 seul F2 → warmth faible
    const filler = Array(200).fill('Le bruit continuait.').join(' ');
    const prose = filler + ' La gorge sèche.';
    const result = scoreSoulLayer(prose);
    expect(result.f2_corporeite).toBeGreaterThanOrEqual(1);
    // warmth peut être < floor car ratio faible
    expect(result.human_warmth).toBeLessThan(3); // 1 hit / ~600 mots × 1000 ≈ 1.6
  });

  // ─── TOO_SHORT ─────────────────────────────────────────────────────────────

  it('S-14: prose < SOUL_MIN_WORD_COUNT mots → too_short true', () => {
    const prose = 'Il remarqua.'; // 2 mots
    const result = scoreSoulLayer(prose);
    expect(result.too_short).toBe(true);
    expect(result.word_count).toBeLessThan(SOUL_MIN_WORD_COUNT);
  });

  it('S-15: prose >= SOUL_MIN_WORD_COUNT mots → too_short false', () => {
    const words = Array(SOUL_MIN_WORD_COUNT).fill('mot').join(' ');
    const result = scoreSoulLayer(words);
    expect(result.too_short).toBe(false);
  });

  // ─── MATCHING ROBUSTESSE ───────────────────────────────────────────────────

  it('S-16: matching insensible à la casse', () => {
    const prose = 'IL REMARQUA la porte ouverte sur le couloir sombre.';
    const result = scoreSoulLayer(prose);
    expect(result.f1_interiorite).toBeGreaterThanOrEqual(1);
    expect(result.soul_present).toBe(true);
  });

  it('S-17: word_count correct (espaces multiples ignorés)', () => {
    const prose = 'Il   remarqua   la   fenêtre.';
    const result = scoreSoulLayer(prose);
    expect(result.word_count).toBe(4);
  });

  // ─── DETAILS FIELD ─────────────────────────────────────────────────────────

  it('S-18: details contient SOUL_PRESENT ou SOUL_ABSENT', () => {
    const present = scoreSoulLayer('Il remarqua le changement dans son attitude.');
    expect(present.details).toContain('SOUL_PRESENT');

    const absent = scoreSoulLayer(
      Array(40).fill('La voiture roula sur la route nationale.').join(' ')
    );
    expect(absent.details).toContain('SOUL_ABSENT');
  });

  it('S-19: details contient F1/F2/F3 counts', () => {
    const result = scoreSoulLayer('Il remarqua. La gorge serrée.');
    expect(result.details).toContain('F1=');
    expect(result.details).toContain('F2=');
    expect(result.details).toContain('F3=');
  });

});

