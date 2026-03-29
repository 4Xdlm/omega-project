/**
 * OMEGA — I1 BLOC C : Test triple conflit (5 runs)
 * 3 consignes contradictoires simultanees
 */
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

const TRIPLE_CONSTRAINT = `TRIPLE CONFLIT SIMULTANE :
1. FOND NOIR + FORME RETENUE : le contenu est extremement noir (mort, souffrance) mais la forme est d une retenue clinique absolue.
2. PHRASES LONGUES + COUTEAUX : alterne entre phrases-fleuve de 50+ mots et phrases de 3-5 mots. Aucune phrase intermediaire.
3. CONTEMPLATION + EXPLOSION : 3 paragraphes de contemplation immobile puis un paragraphe d action explosive sans transition.
Les 3 consignes sont SIMULTANEES et OBLIGATOIRES.`;

async function main() {
  console.log('═══ I1 BLOC C — TRIPLE CONFLIT (5 runs) ═══');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const results: any[] = [];
  for (let run = 0; run < 5; run++) {
    console.log(`\n  Run ${run + 1}/5...`);
    try {
      const packet = {
        packet_id: `I1_triple_${run}_${Date.now()}`, packet_hash: 'a'.repeat(64),
        scene_id: `i1_triple_${run}`, run_id: `i1_triple_${run}_${Date.now()}`,
        quality_tier: 'sovereign', language: 'fr',
        intent: { story_goal: 'Explorer la solitude', scene_goal: 'Femme seule au bord de la mer', conflict_type: 'internal', pov: 'third_limited', tense: 'past', target_word_count: 2500 },
        emotion_contract: {
          curve_quartiles: [
            { quartile: 'Q1', target_14d: dominant14D('anticipation'), valence: -0.1, arousal: 0.3, dominant: 'anticipation', narrative_instruction: 'Installation' },
            { quartile: 'Q2', target_14d: dominant14D('sadness', 0.35), valence: -0.2, arousal: 0.4, dominant: 'sadness', narrative_instruction: 'Montee' },
            { quartile: 'Q3', target_14d: dominant14D('sadness'), valence: -0.4, arousal: 0.6, dominant: 'sadness', narrative_instruction: 'Climax' },
            { quartile: 'Q4', target_14d: dominant14D('sadness', 0.40), valence: -0.2, arousal: 0.3, dominant: 'sadness', narrative_instruction: 'Resolution' },
          ],
          intensity_range: { min: 0.2, max: 0.6 },
          tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
          terminal_state: { target_14d: dominant14D('sadness', 0.40), valence: -0.2, arousal: 0.3, dominant: 'sadness', reader_state: 'Resolution' },
          rupture: { exists: false, position_pct: 0, before_dominant: 'sadness', after_dominant: 'sadness', delta_valence: 0 },
          valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
        },
        beats: [
          { beat_id: 'b1', beat_order: 0, action: 'Elle prepare du the', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['touch'], canon_refs: [] },
          { beat_id: 'b2', beat_order: 1, action: 'Elle regarde la mer', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight'], canon_refs: [] },
          { beat_id: 'b3', beat_order: 2, action: 'Souvenir', dialogue: '', subtext_type: 'pivot', emotion_instruction: '', sensory_tags: ['smell'], canon_refs: [] },
          { beat_id: 'b4', beat_order: 3, action: 'Nuit tombe', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight'], canon_refs: [] },
        ],
        subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
        sensory: { density_target: 3, categories: [{ category: 'sight', min_count: 2, signature_words: [] }, { category: 'sound', min_count: 1, signature_words: [] }, { category: 'touch', min_count: 1, signature_words: [] }, { category: 'smell', min_count: 1, signature_words: [] }, { category: 'taste', min_count: 0, signature_words: [] }, { category: 'proprioception', min_count: 0, signature_words: [] }, { category: 'interoception', min_count: 1, signature_words: [] }], recurrent_motifs: ['mer'], banned_metaphors: [] },
        style_genome: { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: ['silence','ombre'], forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 }, rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 }, tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] }, imagery: { recurrent_motifs: ['mer'], density_target_per_100_words: 3, banned_metaphors: [] }, extra_constraints: TRIPLE_CONSTRAINT } as any,
        kill_lists: { banned_words: ['soudain'], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] },
        canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
        seeds: { llm_seed: `i1_triple_${run}_${Date.now()}`, determinism_level: 'absolute' },
        generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
      } as ForgePacket;

      const result = await runSovereignForgeWithPacket(packet, provider);
      const prose = result.final_prose;
      const ms = result.macro_score;
      const words = prose.split(/\s+/).filter(w => w.length > 0);
      const sents = prose.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
      const lens = sents.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
      const ns = Math.max(lens.length, 1);
      const mean = lens.reduce((a, b) => a + b, 0) / ns;

      const entry = {
        run, composite: ms?.composite ?? 0, min_axis: ms?.min_axis ?? 0,
        words: words.length, mean_sent_len: +mean.toFixed(2),
        f17: lens.filter(l => l <= 5).length,
        semicolons: (prose.match(/;/g) || []).length,
        cv_sent: +(Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(ns - 1, 1)) / mean).toFixed(4),
      };
      results.push(entry);
      console.log(`    comp=${entry.composite.toFixed(1)} min=${entry.min_axis.toFixed(1)} words=${entry.words} mean=${entry.mean_sent_len} f17=${entry.f17}`);
    } catch (e: any) {
      console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
      results.push({ run, error: e.message?.slice(0, 200) });
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const dir = path.join('sessions', 'CLAUDE_BLACKBOX_I1');
  fs.writeFileSync(path.join(dir, 'C_TRIPLE_CONFLICT_RAW.json'), JSON.stringify(results, null, 2));
  console.log(`\nSaved: ${dir}/C_TRIPLE_CONFLICT_RAW.json`);

  const ok = results.filter(r => !r.error);
  if (ok.length > 0) {
    const meanComp = ok.reduce((a: number, r: any) => a + r.composite, 0) / ok.length;
    console.log(`\nTriple conflict: mean comp=${meanComp.toFixed(1)} (baseline=89.6, best pair=+2.5)`);
    console.log(`Delta vs baseline: ${(meanComp - 89.6) > 0 ? '+' : ''}${(meanComp - 89.6).toFixed(1)}`);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
