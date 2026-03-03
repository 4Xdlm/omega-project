/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTS — BANALITY BUDGET [U-W3]
 * ═══════════════════════════════════════════════════════════════════════════════
 * INV-U-07 : BanalityBudget appliqué AVANT judge LLM — CALC — 0 token
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  scoreBanalityBudget,
  DEFAULT_BANALITY_CONFIG,
  BUDGET_MAX,
  type BanalityConfig,
} from '../../src/filter/banality-budget.js';

describe('BanalityBudget — Phase U W3', () => {

  // ─── INVARIANTS ────────────────────────────────────────────────────────────

  it('INV-U-07-A: prose vide → budget 0, veto false (pas de faux positif)', () => {
    const result = scoreBanalityBudget('');
    expect(result.budget_used).toBe(0);
    expect(result.veto).toBe(false);
    expect(result.veto_reason).toBe('');
  });

  it('INV-U-07-B: même prose + même config → résultat identique (déterminisme)', () => {
    const prose = 'La gorge serrée, il remarqua la fenêtre ouverte.';
    const r1 = scoreBanalityBudget(prose);
    const r2 = scoreBanalityBudget(prose);
    expect(r1.budget_used).toBe(r2.budget_used);
    expect(r1.veto).toBe(r2.veto);
    expect(r1.details).toBe(r2.details);
  });

  it('INV-U-07-C: budget_max toujours = BUDGET_MAX (6)', () => {
    const result = scoreBanalityBudget('Prose quelconque sans patterns.');
    expect(result.budget_max).toBe(BUDGET_MAX);
  });

  // ─── TIER ACCEPTABLE ───────────────────────────────────────────────────────

  it('B-01: 1 cliché acceptable → 2pts, veto false', () => {
    const prose = 'Son cœur se serra quand il vit la lettre.';
    const result = scoreBanalityBudget(prose);
    expect(result.budget_used).toBe(2);
    expect(result.veto).toBe(false);
    expect(result.acceptable_hits).toBe(1);
  });

  it('B-02: 2 clichés acceptables DIFFÉRENTS → acceptable_overflow → veto true', () => {
    const prose = 'Son cœur se serra. Un silence lourd s\'installa.';
    const result = scoreBanalityBudget(prose);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('acceptable_overflow');
  });

  it('B-03: même cliché acceptable répété 2x → capped à 1 hit → 2pts seulement', () => {
    const prose = 'Son cœur se serra. Son cœur se serra encore.';
    const result = scoreBanalityBudget(prose);
    // max_per_scene = 1 → raw=2 capped=1 → 2pts
    const hit = result.hits.find((h) => h.pattern === 'son cœur se serra');
    expect(hit).toBeDefined();
    expect(hit!.raw_hits).toBe(2);
    expect(hit!.capped_hits).toBe(1);
    expect(hit!.pts_charged).toBe(2);
    expect(result.budget_used).toBe(2);
    expect(result.veto).toBe(false);
  });

  // ─── TIER TOXIC ────────────────────────────────────────────────────────────

  it('B-04: 1 cliché toxic → 5pts, veto false (budget 5/6)', () => {
    const prose = 'Une vague d\'émotion le submergea.';
    const result = scoreBanalityBudget(prose);
    expect(result.budget_used).toBe(5);
    expect(result.veto).toBe(false);
    expect(result.toxic_hits).toBe(1);
  });

  it('B-05: 1 toxic (5pts) + 1 acceptable (2pts) → budget 7 > 6 → veto budget_exceeded', () => {
    const prose = 'Une vague d\'émotion le submergea. Son cœur se serra.';
    const result = scoreBanalityBudget(prose);
    expect(result.budget_used).toBe(7);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('budget_exceeded');
  });

  it('B-06: 2 clichés toxic → budget 10 → veto budget_exceeded', () => {
    const prose = 'Comme un coup de tonnerre. Les larmes coulaient.';
    const result = scoreBanalityBudget(prose);
    expect(result.budget_used).toBe(10);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('budget_exceeded');
  });

  // ─── TIER IA_GENERIC ───────────────────────────────────────────────────────

  it('B-07: 1 marqueur ia_generic → veto immédiat (ia_generic)', () => {
    const prose = 'Il ressentit une étrange sensation qu\'il ne pouvait nommer.';
    const result = scoreBanalityBudget(prose);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('ia_generic');
    expect(result.ia_generic_hits).toBeGreaterThan(0);
  });

  it('B-08: ia_generic présent même si budget < 6 → veto ia_generic prime', () => {
    // Prose propre sauf ia_generic → veto garanti
    const prose = 'Il marchait. Tout semblait irréel autour de lui.';
    const result = scoreBanalityBudget(prose);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('ia_generic');
  });

  it('B-09: "comme dans un rêve" → veto ia_generic', () => {
    const prose = 'Elle avançait comme dans un rêve, sans se retourner.';
    const result = scoreBanalityBudget(prose);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('ia_generic');
  });

  // ─── PROSE PROPRE ──────────────────────────────────────────────────────────

  it('B-10: prose littéraire propre → budget 0, veto false', () => {
    const prose = [
      'Le fer brûlait sous ses doigts, odeur âcre de rouille.',
      'Il posa l\'outil. La fenêtre était ouverte depuis le matin.',
      'Dehors, rien ne bougeait dans la lumière blanche.',
    ].join(' ');
    const result = scoreBanalityBudget(prose);
    expect(result.budget_used).toBe(0);
    expect(result.veto).toBe(false);
    expect(result.details).toContain('PASS');
  });

  it('B-11: prose Hemingway-style → budget 0, veto false', () => {
    const prose = [
      'Elle ne dit rien. Il attendit.',
      'La porte était restée ouverte.',
      'Le bruit de la rue montait jusqu\'à eux.',
    ].join(' ');
    const result = scoreBanalityBudget(prose);
    expect(result.budget_used).toBe(0);
    expect(result.veto).toBe(false);
  });

  // ─── MATCHING ROBUSTESSE ───────────────────────────────────────────────────

  it('B-12: matching insensible à la casse', () => {
    const prose = 'SON CŒUR SE SERRA quand il entra.';
    const result = scoreBanalityBudget(prose);
    expect(result.acceptable_hits).toBe(1);
    expect(result.budget_used).toBe(2);
  });

  it('B-13: matching insensible aux accents (NFD normalization)', () => {
    // "cœur" vs "coeur" — même pattern après NFD
    const prose = 'Son coeur se serra lentement.';
    const result = scoreBanalityBudget(prose);
    expect(result.acceptable_hits).toBe(1);
  });

  // ─── CONFIG PERSONNALISÉE ──────────────────────────────────────────────────

  it('B-14: config personnalisée budget_max=3 → toxic (5pts) → veto budget_exceeded', () => {
    const customConfig: BanalityConfig = {
      budget_max: 3,
      entries: [
        { pattern: 'les larmes coulaient', cost: 5, tier: 'toxic' },
      ],
    };
    const prose = 'Les larmes coulaient sur ses joues.';
    const result = scoreBanalityBudget(prose, customConfig);
    expect(result.veto).toBe(true);
    expect(result.veto_reason).toBe('budget_exceeded');
    expect(result.budget_max).toBe(3);
  });

  it('B-15: config vide → budget 0, veto false', () => {
    const emptyConfig: BanalityConfig = { budget_max: 6, entries: [] };
    const result = scoreBanalityBudget('N\'importe quelle prose.', emptyConfig);
    expect(result.budget_used).toBe(0);
    expect(result.veto).toBe(false);
  });

  // ─── DETAILS FIELD ─────────────────────────────────────────────────────────

  it('B-16: details contient le verdict PASS ou VETO', () => {
    const clean = scoreBanalityBudget('Prose propre.');
    expect(clean.details).toContain('PASS');

    const dirty = scoreBanalityBudget('Tout semblait irréel.');
    expect(dirty.details).toContain('VETO');
  });

  it('B-17: hits array vide si prose sans patterns', () => {
    const result = scoreBanalityBudget('Le soleil se levait sur la ville.');
    expect(result.hits).toHaveLength(0);
  });

});
