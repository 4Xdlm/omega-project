/**
 * OMEGA — CROSS-TEST JUGE : Ollama vs Claude sur MÊMES proses
 * 4 runs (1 par scène). Génère Ollama, score Ollama + Claude, compare.
 * Usage : npx tsx scripts/cross-test-judge.ts
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { createOllamaProvider } from '../src/runtime/ollama-provider.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';
import { runSovereignForgeWithPacket } from '../src/engine.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

const SCENES = [
  { id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude', dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'The dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
    sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'] },
  { id: 'menace', conflict: 'external', goal: 'Femme en foret, danger', story: 'Peur', dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Marche crepuscule',sensory:['sight','sound']},{id:'b2',action:'Branche cassee',sensory:['sound']},{id:'b3',action:'Accelere',sensory:['touch']},{id:'b4',action:'Lisiere',sensory:['sight']}],
    sig: ['ombre','branche','souffle','nuit'], motifs: ['foret','crepuscule'] },
  { id: 'revelation', conflict: 'internal', goal: 'Enfant trouve une lettre', story: 'Innocence brisee', dq1: 'trust', dq3: 'surprise', dq4: 'sadness',
    beats: [{id:'b1',action:'Grenier',sensory:['touch','smell']},{id:'b2',action:'Boite de lettres',sensory:['touch','sight']},{id:'b3',action:'Lit la lettre',sensory:['sight']},{id:'b4',action:'Descend escalier',sensory:['touch']}],
    sig: ['poussiere','papier','encre','secret'], motifs: ['grenier','lettres'] },
  { id: 'confrontation', conflict: 'societal', goal: 'Deux associes reglent leurs comptes', story: 'Trahison', dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Entre sans frapper',sensory:['sound']},{id:'b2',action:'Mots tranchants',sensory:['sound']},{id:'b3',action:'Dossier jete',sensory:['touch']},{id:'b4',action:'Sort sans un mot',sensory:['sight']}],
    sig: ['acier','verre','silence','machoire'], motifs: ['bureau','lumiere'] },
];

function buildPacket(scene: typeof SCENES[0]): ForgePacket {
  const ts = Date.now();
  return {
    packet_id: `CROSS_${scene.id}`, packet_hash: 'a'.repeat(64),
    scene_id: `cross_${scene.id}`, run_id: `cross_${scene.id}_${ts}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: scene.story, scene_goal: scene.goal, conflict_type: scene.conflict, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(scene.dq1), valence: -0.1, arousal: 0.3, dominant: scene.dq1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(scene.dq3, 0.35), valence: -0.2, arousal: 0.4, dominant: scene.dq3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(scene.dq3), valence: -0.4, arousal: 0.6, dominant: scene.dq3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(scene.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dq4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(scene.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dq4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: scene.dq3, after_dominant: scene.dq4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: scene.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' : 'progression', emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [{ category: 'sight', min_count: 2, signature_words: [] },{ category: 'sound', min_count: 2, signature_words: [] },{ category: 'touch', min_count: 1, signature_words: [] },{ category: 'smell', min_count: 1, signature_words: [] },{ category: 'taste', min_count: 0, signature_words: [] },{ category: 'proprioception', min_count: 0, signature_words: [] },{ category: 'interoception', min_count: 1, signature_words: [] }], recurrent_motifs: scene.motifs, banned_metaphors: [] },
    style_genome: { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: scene.sig, forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 }, rhythm: { avg_sentence_length_target: 35, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 }, tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] }, imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] } },
    kill_lists: { banned_words: ['soudain'], banned_cliches: ['coeur de pierre'], banned_ai_patterns: ['il ne pouvait s\'empecher'], banned_filter_words: ['effectivement'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `cross_${scene.id}_${ts}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

async function main() {
  const ollamaModel = process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  // P3.1.6 FIX (2026-05-16): createOllamaProvider requires full OllamaProviderConfig
  // (pattern identique au fix bench-bestof3-ollama commit e97a55a4).
  const ollamaProvider = createOllamaProvider({
    model: ollamaModel,
    baseUrl: ollamaUrl,
    draftTemperature: 0.85,
    judgeTemperature: 0.0,
    draftMaxTokens: 2048,
    judgeMaxTokens: 512,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY required'); process.exit(1); }
  const claudeProvider = createAnthropicProvider({ apiKey, model: 'claude-sonnet-4-20250514', judgeStable: false, draftTemperature: 0.75, judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000 });

  const sessionDir = path.join(__dirname, '../sessions/CROSS_TEST_JUDGE');
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  console.log('═══════════════════════════════════════════════════');
  console.log(`CROSS-TEST JUGE — ${ollamaModel} vs Claude (4 runs)`);
  console.log('═══════════════════════════════════════════════════\n');

  const results: any[] = [];

  for (const scene of SCENES) {
    console.log(`\n── ${scene.id.toUpperCase()} ──`);
    try {
      const packet = buildPacket(scene);

      // STEP 1: Générer prose avec Ollama (pipeline complet, juges Ollama)
      console.log('[1] Generating with full Ollama pipeline...');
      const forgeResult = await runSovereignForgeWithPacket(packet, ollamaProvider);
      const prose = forgeResult.final_prose;
      const os = forgeResult.macro_score;
      console.log(`  Ollama score: comp=${os?.composite?.toFixed(1)} ECC=${os?.ecc_score?.toFixed(1)} RCI=${os?.macro_axes?.rci?.score?.toFixed(1)} SII=${os?.macro_axes?.sii?.score?.toFixed(1)} IFI=${os?.macro_axes?.ifi?.score?.toFixed(1)} AAI=${os?.macro_axes?.aai?.score?.toFixed(1)}`);

      // STEP 2: Re-scorer MÊME prose avec Claude
      console.log('[2] Re-scoring SAME prose with Claude judges...');
      const cs = await judgeAestheticV3(packet, prose, claudeProvider, null);
      console.log(`  Claude score: comp=${cs.composite.toFixed(1)} ECC=${cs.ecc_score.toFixed(1)} RCI=${cs.macro_axes?.rci?.score?.toFixed(1)} SII=${cs.macro_axes?.sii?.score?.toFixed(1)} IFI=${cs.macro_axes?.ifi?.score?.toFixed(1)} AAI=${cs.macro_axes?.aai?.score?.toFixed(1)}`);

      const delta = (os?.composite ?? 0) - cs.composite;
      console.log(`  DELTA: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} (Ollama ${delta > 0 ? 'plus généreux' : 'plus sévère'})`);

      results.push({
        scene: scene.id,
        words: prose.split(/\s+/).filter(w => w.length > 0).length,
        ollama_comp: os?.composite ?? 0,
        ollama_ECC: os?.ecc_score ?? 0,
        ollama_RCI: os?.macro_axes?.rci?.score ?? 0,
        ollama_SII: os?.macro_axes?.sii?.score ?? 0,
        ollama_IFI: os?.macro_axes?.ifi?.score ?? 0,
        ollama_AAI: os?.macro_axes?.aai?.score ?? 0,
        claude_comp: cs.composite,
        claude_ECC: cs.ecc_score,
        claude_RCI: cs.macro_axes?.rci?.score ?? 0,
        claude_SII: cs.macro_axes?.sii?.score ?? 0,
        claude_IFI: cs.macro_axes?.ifi?.score ?? 0,
        claude_AAI: cs.macro_axes?.aai?.score ?? 0,
        delta_comp: delta,
      });
    } catch (e: any) {
      console.error(`  ERROR: ${e.message?.slice(0, 150)}`);
      results.push({ scene: scene.id, error: e.message?.slice(0, 200) });
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  // ═══ ANALYSE ═══
  const valid = results.filter(r => !r.error);
  const n = valid.length;
  if (n === 0) { console.log('AUCUN RUN VALIDE'); return; }

  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('CROSS-TEST — RÉSULTATS');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('| Scene         | Ollama comp | Claude comp | Delta  |');
  console.log('|---------------|-------------|-------------|--------|');
  for (const r of valid) {
    console.log(`| ${r.scene.padEnd(13)} | ${r.ollama_comp.toFixed(1).padStart(11)} | ${r.claude_comp.toFixed(1).padStart(11)} | ${(r.delta_comp > 0 ? '+' : '') + r.delta_comp.toFixed(1).padStart(6)} |`);
  }

  const deltaComps = valid.map(r => r.delta_comp);
  const avgDelta = mean(deltaComps);
  console.log(`\nDelta moyen composite: ${avgDelta > 0 ? '+' : ''}${avgDelta.toFixed(1)}`);

  // Par axe
  console.log('\nDelta par axe (Ollama - Claude):');
  for (const axe of ['ECC', 'RCI', 'SII', 'IFI', 'AAI']) {
    const d = mean(valid.map(r => r[`ollama_${axe}`] - r[`claude_${axe}`]));
    console.log(`  ${axe}: ${d > 0 ? '+' : ''}${d.toFixed(1)}`);
  }

  // Verdict
  console.log('\n═══════════════════════════════════════════════════');
  if (Math.abs(avgDelta) <= 3) {
    console.log(`VERDICT: JUGE OLLAMA FIABLE (delta ${avgDelta > 0 ? '+' : ''}${avgDelta.toFixed(1)} ≤ ±3)`);
    console.log('→ Les scores Ollama à 92.0 sont RÉELS');
  } else if (avgDelta > 3) {
    console.log(`VERDICT: JUGE OLLAMA COMPLAISANT (delta +${avgDelta.toFixed(1)} > +3)`);
    console.log('→ Les scores Ollama sont GONFLÉS de ~' + avgDelta.toFixed(0) + ' pts');
    console.log('→ Score réel estimé: ' + (92.0 - avgDelta).toFixed(1));
  } else {
    console.log(`VERDICT: JUGE OLLAMA PLUS SÉVÈRE (delta ${avgDelta.toFixed(1)} < -3)`);
    console.log('→ Les scores Ollama sous-estiment la qualité réelle');
  }
  console.log('═══════════════════════════════════════════════════');

  // Save
  fs.writeFileSync(path.join(sessionDir, 'cross_test_results.json'), JSON.stringify({ results: valid, avg_delta: avgDelta, model: ollamaModel }, null, 2));
  console.log(`\nSaved: ${sessionDir}/cross_test_results.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
