/**
 * DEC-010 WS-A — emotion contract derivation V2 (flag OMEGA_EMOTION_DERIV_V2).
 * Prouve : flag OFF = trajectoire intra-scene PLATE (bug trust:1.0) ; flag ON = variation
 * Q1->Q4 >= 0.15 (DEC-010 D11.4) en gardant le dominant d'arc. Cause T0 : scene-0 capte <=1 waypoint.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGenesisPlan } from '../../../genesis-planner/src/planner.js';
import { createDefaultConfig } from '../../../genesis-planner/src/config.js';
import type { Scene } from '../../../genesis-planner/src/types.js';
import { assembleForgePacket } from '../../src/input/forge-packet-assembler.js';
import { DEFAULT_VOICE_GENOME } from '../../src/voice/voice-genome.js';
import type { StyleProfile, KillLists, CanonEntry, ForgeContinuity } from '../../src/types.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const TS = '2026-01-01T00:00:00.000Z';

function cosineDist(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) { const x = a[k] ?? 0, y = b[k] ?? 0; dot += x * y; na += x * x; nb += y * y; }
  if (na === 0 || nb === 0) return 0;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function buildPacket() {
  const pack = JSON.parse(fs.readFileSync(path.join(REPO, 'golden/intents/intent_pack_gardien.json'), 'utf8'));
  const { plan } = createGenesisPlan(pack.intent, pack.canon, pack.constraints, pack.genome, pack.emotion, createDefaultConfig(), TS);
  const scene0: Scene = plan.arcs.flatMap((a: any) => a.scenes)[0]!;
  const style: StyleProfile = { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: [], forbidden_words: [], abstraction_max_ratio: 0.95, concrete_min_ratio: 0.0 }, rhythm: { avg_sentence_length_target: 20, gini_target: 0.45, max_consecutive_similar: 3, min_syncopes_per_scene: 0, min_compressions_per_scene: 0 }, tone: { dominant_register: 'soutenu', intensity_range: [0.0, 1.0] as readonly [number, number] }, imagery: { recurrent_motifs: [], density_target_per_100_words: 0, banned_metaphors: [] }, voice: DEFAULT_VOICE_GENOME };
  return assembleForgePacket({ plan, scene: scene0, style_profile: style, kill_lists: { banned_words: [], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] } as KillLists, canon: [] as CanonEntry[], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] } as ForgeContinuity, run_id: 'deriv_v2_test', language: 'fr' });
}

describe('DEC-010 WS-A emotion derivation V2 (flag)', () => {
  afterEach(() => { delete process.env.OMEGA_EMOTION_DERIV_V2; });

  it('flag OFF (default): scene-0 trajectory is FLAT (documents the trust:1.0 bug)', () => {
    delete process.env.OMEGA_EMOTION_DERIV_V2;
    const q = (buildPacket() as any).emotion_contract.curve_quartiles;
    const d = cosineDist(q[0].target_14d, q[3].target_14d);
    expect(d).toBeLessThan(0.01); // flat: Q1 == Q4
  });

  it('flag ON: scene-0 trajectory VARIES Q1->Q4 (>=0.15) while keeping arc dominant', () => {
    process.env.OMEGA_EMOTION_DERIV_V2 = '1';
    const q = (buildPacket() as any).emotion_contract.curve_quartiles;
    const d = cosineDist(q[0].target_14d, q[3].target_14d);
    expect(d).toBeGreaterThanOrEqual(0.15); // variation per quartile (D11.4)
    // arc dominant preserved at Q1 (Le Gardien opens on trust)
    expect(q[0].dominant).toBe('trust');
    // no empty 14d on any quartile
    for (const quart of q) expect(Object.keys(quart.target_14d).length).toBeGreaterThan(0);
  });
});
