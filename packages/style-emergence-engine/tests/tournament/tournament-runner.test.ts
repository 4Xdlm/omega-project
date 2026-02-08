import { describe, it, expect } from 'vitest';
import { runTournament } from '../../src/tournament/tournament-runner.js';
import { buildMinimalProseParagraph, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, getDefaultEConfig, TIMESTAMP } from '../fixtures.js';

const config = getDefaultEConfig();

describe('Tournament Runner', () => {
  it('runs full tournament', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.tournament_id).toBeTruthy();
    expect(result.rounds.length).toBe(1);
  });

  it('rounds match paragraph count', () => {
    const paras = [
      buildMinimalProseParagraph({ paragraph_id: 'P1' }),
      buildMinimalProseParagraph({ paragraph_id: 'P2' }),
    ];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.total_rounds).toBe(2);
  });

  it('computes avg composite score', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.avg_composite_score).toBeGreaterThanOrEqual(0);
  });

  it('has tournament hash', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.tournament_hash).toBeTruthy();
    expect(result.tournament_hash).toHaveLength(64);
  });

  it('is deterministic', () => {
    const paras = [buildMinimalProseParagraph()];
    const r1 = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.tournament_hash).toBe(r2.tournament_hash);
  });

  it('generates min variants per round', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const round of result.rounds) {
      expect(round.variants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('handles single paragraph', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.total_rounds).toBe(1);
    expect(result.rounds[0].selected_variant_id).toBeTruthy();
  });

  it('handles multiple paragraphs', () => {
    const paras = [
      buildMinimalProseParagraph({ paragraph_id: 'P1', text: 'The keeper watched the ocean. Waves crashed.' }),
      buildMinimalProseParagraph({ paragraph_id: 'P2', text: 'The light swept the horizon. Fog rolled in.' }),
      buildMinimalProseParagraph({ paragraph_id: 'P3', text: 'Salt air filled the room. The mechanism hummed.' }),
    ];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.total_rounds).toBe(3);
  });

  it('selection is justified', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const round of result.rounds) {
      expect(round.selection_reason).toBeTruthy();
    }
  });

  it('tournament_id is non-empty', () => {
    const paras = [buildMinimalProseParagraph()];
    const result = runTournament(paras, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.tournament_id.startsWith('ETOURN-')).toBe(true);
  });
});
