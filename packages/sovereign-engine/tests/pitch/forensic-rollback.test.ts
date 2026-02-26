// tests/pitch/forensic-rollback.test.ts — INV-FORENSIC-01
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock des dependances LLM
vi.mock('../../src/oracle/aesthetic-oracle.js', () => ({
  judgeAesthetic: vi.fn(),
}));
vi.mock('../../src/delta/delta-report.js', () => ({
  generateDeltaReport: vi.fn().mockReturnValue({}),
}));
vi.mock('../../src/pitch/triple-pitch.js', () => ({
  generateTriplePitch: vi.fn().mockReturnValue([{ pitch_id: 'p1', strategy: 'test', items: [], total_expected_gain: 0 }]),
}));
vi.mock('../../src/pitch/pitch-oracle.js', () => ({
  selectBestPitch: vi.fn().mockReturnValue({ selected_pitch_id: 'p1', selection_score: 1, selection_reason: 'test' }),
}));
vi.mock('../../src/pitch/patch-engine.js', () => ({
  applyPatch: vi.fn().mockResolvedValue('patched prose'),
}));
vi.mock('../../src/prescriptions/index.js', () => ({
  generatePrescriptions: vi.fn().mockReturnValue(undefined),
}));

import { judgeAesthetic } from '../../src/oracle/aesthetic-oracle.js';
import { runSovereignLoop } from '../../src/pitch/sovereign-loop.js';

const mockJudge = vi.mocked(judgeAesthetic);

function makeScore(composite: number, axes?: Record<string,number>) {
  const axesArr = ['tension_14d','coherence_emotionnelle','interiorite','impact_ouverture_cloture',
    'densite_sensorielle','necessite_m8','anti_cliche','rythme_musical','signature'].map((name) => ({
    name, weight: 1, raw: axes?.[name] ?? composite/100, score: axes?.[name] ?? composite/100, weighted: composite/100,
  }));
  return {
    axes: axesArr, composite, emotion_weight_ratio: 0.63,
    verdict: composite >= 93 ? 'SEAL' : 'REJECT' as const,
    s_score_hash: 'mock', scored_at: new Date().toISOString(),
  };
}

const mockPacket = {
  packet_id: 'test', packet_hash: 'h', scene_id: 's', run_id: 'r',
  quality_tier: 'sovereign', language: 'fr',
  emotion_contract: { curve_quartiles: [], intensity_range: {min:0,max:1}, tension: {slope_target:'arc',pic_position_pct:0.5,faille_position_pct:0.8,silence_zones:[]}, terminal_state: {target_14d:{},valence:0,arousal:0,dominant:'',reader_state:''}, rupture: {exists:false,position_pct:0,before_dominant:'',after_dominant:'',delta_valence:0}, valence_arc: {start:0,end:0,direction:'stable'} },
  intent: {story_goal:'',scene_goal:'',conflict_type:'',pov:'',tense:'',target_word_count:500},
  beats: [], subtext: {layers:[],tension_type:'',tension_intensity:0},
  sensory: {density_target:8,categories:[],recurrent_motifs:[],banned_metaphors:[]},
  style_genome: {version:'1',universe:'test',lexicon:{signature_words:[],forbidden_words:[],abstraction_max_ratio:0.4,concrete_min_ratio:0.6},rhythm:{avg_sentence_length_target:15,gini_target:0.45,max_consecutive_similar:3,min_syncopes_per_scene:2,min_compressions_per_scene:1},tone:{dominant_register:'grave',intensity_range:[0,1]},imagery:{recurrent_motifs:[],density_target_per_100_words:8,banned_metaphors:[]}},
  kill_lists: {banned_words:[],banned_cliches:[],banned_ai_patterns:[],banned_filter_words:[]},
  canon: [], continuity: {previous_scene_summary:'',character_states:[],open_threads:[]},
  seeds: {llm_seed:'0',determinism_level:'absolute'},
  generation: {timestamp:'',generator_version:'1',constraints_hash:'h'},
} as any;

describe('INV-FORENSIC-01 — Rollback Forensic Logger', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('1. forensic_data present sur tout run (SEAL immediat)', async () => {
    mockJudge.mockResolvedValueOnce(makeScore(95));
    const r = await runSovereignLoop('prose', mockPacket, {} as any);
    expect(r.forensic_data).toBeDefined();
    expect(r.forensic_data.rollbacks).toBeInstanceOf(Array);
    expect(r.forensic_data.rollback_count).toBe(0);
  });

  it('2. forensic_data present sur run REJECT (max passes)', async () => {
    mockJudge.mockResolvedValue(makeScore(75));
    const r = await runSovereignLoop('prose', mockPacket, {} as any);
    expect(r.forensic_data).toBeDefined();
  });

  it('3. Rollback enregistre si patch degrade le score composite', async () => {
    // Initial: 75, apres patch pass 1: 60 (rollback), apres patch pass 2: 70
    mockJudge
      .mockResolvedValueOnce(makeScore(75))  // initial
      .mockResolvedValueOnce(makeScore(60))  // pass 1 -> rollback
      .mockResolvedValueOnce(makeScore(70)); // pass 2
    const r = await runSovereignLoop('prose', mockPacket, {} as any);
    expect(r.forensic_data.rollback_count).toBeGreaterThanOrEqual(1);
    expect(r.forensic_data.rollbacks.length).toBeGreaterThanOrEqual(1);
  });

  it('4. trigger_axes non vide sur rollback (axes degrades isoles)', async () => {
    // Pass qui rollback: un axe baisse
    const scoreHigh = makeScore(75);
    const scoreLow = makeScore(60, { tension_14d: 0.3 }); // tension_14d plus bas
    mockJudge
      .mockResolvedValueOnce(scoreHigh)
      .mockResolvedValueOnce(scoreLow)
      .mockResolvedValueOnce(makeScore(70));
    const r = await runSovereignLoop('prose', mockPacket, {} as any);
    const rollback = r.forensic_data.rollbacks[0];
    if (rollback) {
      expect(rollback.trigger_axes.length).toBeGreaterThan(0);
      expect(rollback.trigger_axes[0]).toHaveProperty('axis');
      expect(rollback.trigger_axes[0]).toHaveProperty('delta');
      expect(rollback.trigger_axes[0].delta).toBeLessThan(0);
    }
  });

  it('5. ForensicRollbackEntry a tous les champs requis', async () => {
    const scoreHigh = makeScore(75);
    const scoreLow = makeScore(60);
    mockJudge
      .mockResolvedValueOnce(scoreHigh)
      .mockResolvedValueOnce(scoreLow)
      .mockResolvedValueOnce(makeScore(70));
    const r = await runSovereignLoop('prose', mockPacket, {} as any);
    if (r.forensic_data.rollbacks.length > 0) {
      const rb = r.forensic_data.rollbacks[0];
      expect(rb).toHaveProperty('pass_index');
      expect(rb).toHaveProperty('delta_composite');
      expect(rb).toHaveProperty('trigger_axes');
      expect(rb).toHaveProperty('judge_latency_ms');
      expect(typeof rb.judge_latency_ms).toBe('number');
    }
  });
});
