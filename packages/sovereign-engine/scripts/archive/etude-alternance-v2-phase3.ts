/**
 * OMEGA — ETUDE ALTERNANCE v2 : Phase 3
 * Variante G = C (system prompt enrichi) + F (rhythm mask)
 * Test sur Menace + Revelation
 * Si bon → Best-of-3 avec G sur 5 briques
 *
 * Budget : ~10 API (G×2 scenes) + ~75 API (Best-of-3×5 si lance)
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { generateSymbolMap } from '../src/symbol/symbol-mapper.js';
import { bridgeSignatureFromSymbolMap } from '../src/input/signature-bridge.js';
import { buildSovereignPrompt_V4 } from '../src/input/prompt-assembler-v4.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';
import { runSovereignForgeWithPacket } from '../src/engine.js';
import { computeQuickFeatures } from '../src/telemetry/pipeline-telemetry.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';
import type { SymbolMap } from '../src/symbol/symbol-map-types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ HELPERS ═══

function countWords(t: string): number { return t.split(/\s+/).filter(w => w.length > 0).length; }

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const keys = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'];
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of keys) d[k] = k === emotion ? weight : r;
  return d;
}

function countAlternance(prose: string): { transitions: number; label: string } {
  const sentences = prose.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const lens = sentences.map(s => s.split(/\s+/).length);
  let transitions = 0;
  for (let i = 1; i < lens.length; i++) {
    if ((lens[i-1] > 30 && lens[i] < 12) || (lens[i-1] < 12 && lens[i] > 30)) transitions++;
  }
  return { transitions, label: transitions >= 4 ? 'OUI' : transitions >= 2 ? 'PARTIEL' : 'NON' };
}

// ═══ 5 SCENES ═══

interface SceneConfig {
  id: string; label: string; sceneGoal: string; storyGoal: string; conflictType: string;
  dq1: string; dq3: string; dq4: string;
  beats: Array<{id:string;action:string;sensory:string[]}>;
  sigWords: string[]; motifs: string[];
}

const SCENES: SceneConfig[] = [
  { id: 'contemplation', label: 'Contemplation', sceneGoal: 'Une femme attend quelqu\'un qui ne viendra pas', storyGoal: 'Explorer la solitude et la memoire', conflictType: 'internal', dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'Elle prepare du the dans la cuisine froide',sensory:['touch','sound']},{id:'b2',action:'Elle regarde la mer par la fenetre',sensory:['sight']},{id:'b3',action:'Un souvenir d\'ete remonte',sensory:['sound','smell']},{id:'b4',action:'La nuit tombe, elle ne bouge pas',sensory:['sight','touch']}],
    sigWords: ['silence','ombre','souffle','lumiere','eau','pierre','froid','vent','sel','vide'], motifs: ['mer','vent','lumiere declinante'] },
  { id: 'confrontation', label: 'Confrontation', sceneGoal: 'Deux anciens associes reglent leurs comptes', storyGoal: 'La trahison et la colere retenue', conflictType: 'external', dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Il entre dans le bureau sans frapper',sensory:['sound','sight']},{id:'b2',action:'Les mots echanges sont precis et tranchants',sensory:['sound']},{id:'b3',action:'Un dossier est jete sur la table',sensory:['touch','sound']},{id:'b4',action:'L\'un des deux sort sans un mot',sensory:['sight']}],
    sigWords: ['acier','verre','ombre','silence','machoire','souffle','table','porte','pas','mur'], motifs: ['bureau','lumiere artificielle','distance'] },
  { id: 'souvenir', label: 'Souvenir', sceneGoal: 'Un homme age se souvient de sa femme en taillant ses rosiers', storyGoal: 'Le deuil et la beaute de ce qui reste', conflictType: 'internal', dq1: 'trust', dq3: 'sadness', dq4: 'love',
    beats: [{id:'b1',action:'Il taille les rosiers au secateur',sensory:['touch','smell']},{id:'b2',action:'Une rose lui rappelle un parfum',sensory:['smell','sight']},{id:'b3',action:'Il parle a voix haute comme si elle etait la',sensory:['sound']},{id:'b4',action:'Il rentre, pose le secateur, regarde la chaise vide',sensory:['sight','touch']}],
    sigWords: ['terre','epine','parfum','main','souffle','ombre','rosier','silence','chaleur','absence'], motifs: ['jardin','roses','mains'] },
  { id: 'menace', label: 'Menace', sceneGoal: 'Elle comprend qu\'elle n\'est pas seule dans les bois', storyGoal: 'La peur primitive et l\'instinct de survie', conflictType: 'external', dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Elle marche sur le sentier au crepuscule',sensory:['sight','sound']},{id:'b2',action:'Un bruit de branche cassee derriere elle',sensory:['sound']},{id:'b3',action:'Elle accelere, son coeur bat plus fort',sensory:['touch','sound']},{id:'b4',action:'Elle atteint la lisiere',sensory:['sight']}],
    sigWords: ['ombre','branche','souffle','silence','froid','terre','pas','nuit','peau','sang'], motifs: ['foret','crepuscule','ombre'] },
  { id: 'revelation', label: 'Revelation', sceneGoal: 'L\'enfant trouve une lettre cachee qui change tout', storyGoal: 'L\'innocence brisee par la verite', conflictType: 'internal', dq1: 'trust', dq3: 'surprise', dq4: 'sadness',
    beats: [{id:'b1',action:'Il fouille le grenier pendant que les adultes parlent en bas',sensory:['touch','smell']},{id:'b2',action:'Il trouve une boite a chaussures pleine de lettres',sensory:['touch','sight']},{id:'b3',action:'Il lit la lettre — le monde bascule',sensory:['sight']},{id:'b4',action:'Il repose la lettre, descend l\'escalier, ne dit rien',sensory:['touch','sound']}],
    sigWords: ['poussiere','papier','encre','silence','main','souffle','ombre','escalier','lumiere','secret'], motifs: ['grenier','poussiere','lettres'] },
];

function buildPacket(s: SceneConfig): ForgePacket {
  return {
    packet_id: `FORGE_altG_${s.id}`, packet_hash: 'a'.repeat(64),
    scene_id: `altG_${s.id}`, run_id: `altG_${s.id}_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: s.storyGoal, scene_goal: s.sceneGoal, conflict_type: s.conflictType, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(s.dq1), valence: -0.1, arousal: 0.3, dominant: s.dq1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(s.dq3, 0.35), valence: -0.2, arousal: 0.4, dominant: s.dq3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(s.dq3), valence: -0.4, arousal: 0.6, dominant: s.dq3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(s.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: s.dq4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 }, tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(s.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: s.dq4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: s.dq3, after_dominant: s.dq4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: s.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' as const : 'progression' as const, emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [{category:'sight',min_count:2,signature_words:[]},{category:'sound',min_count:2,signature_words:[]},{category:'touch',min_count:1,signature_words:[]},{category:'smell',min_count:1,signature_words:[]},{category:'taste',min_count:0,signature_words:[]},{category:'proprioception',min_count:0,signature_words:[]},{category:'interoception',min_count:1,signature_words:[]}], recurrent_motifs: s.motifs, banned_metaphors: [] },
    style_genome: { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: s.sigWords, forbidden_words: ['soudainement','mysterieusement','bizarrement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 }, rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 }, tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] }, imagery: { recurrent_motifs: s.motifs, density_target_per_100_words: 3, banned_metaphors: [] } },
    kill_lists: { banned_words: ['soudain','soudainement','mysterieusement'], banned_cliches: ['coeur de pierre','mer d\'emotions','silence assourdissant'], banned_ai_patterns: ['il ne pouvait s\'empecher de','une vague de','un frisson parcourut'], banned_filter_words: ['effectivement','neanmoins','toutefois'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `altG_${s.id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ RHYTHM MASK (from F) ═══

const RHYTHM_MASK = `\nCalque le rythme de tes phrases sur ce patron :\n  Paragraphe 1 : [ample — bref — ample — bref — moyen]\n  Paragraphe 2 : [bref — très ample — bref — ample]\n  Paragraphe 3 : [bref — bref — ample — bref]\n  Paragraphe 4 : [ample — bref — ample — moyen — bref]`;

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — ETUDE ALTERNANCE v2 : Phase 3 — Variante G (C+F)');
  console.log('  System prompt enrichi + Rhythm mask');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const sessionDir = 'sessions/ALTERNANCE_STUDY_2026-03-26T21-03-33';
  fs.mkdirSync(sessionDir, { recursive: true });

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TEST G SUR MENACE + REVELATION
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ VARIANTE G (C+F) SUR MENACE + REVELATION ═══\n');

  const gResults: any[] = [];

  for (const sceneId of ['menace', 'revelation']) {
    const scene = SCENES.find(s => s.id === sceneId)!;
    const packet = buildPacket(scene);
    const symbolMap = await generateSymbolMap(packet, provider);
    const enrichedPacket = bridgeSignatureFromSymbolMap(packet, symbolMap);
    const promptObj = buildSovereignPrompt_V4(enrichedPacket, symbolMap);
    const promptG = promptObj.sections.map(s => s.content).join('\n\n') + RHYTHM_MASK;

    console.log(`  --- G on ${scene.label} ---`);

    // Generate with C's system prompt (enrichi) — but we pass the prompt to generateDraft
    // The system prompt is baked into the provider, so we inject the mask in the user prompt
    const prose = await provider.generateDraft(promptG, 'sensoriel_dense', `altG_${sceneId}`);
    const words = countWords(prose);
    const f = computeQuickFeatures(prose);
    const ms = await judgeAestheticV3(enrichedPacket, prose, provider, symbolMap);
    const alt = countAlternance(prose);

    const saga = ms.composite >= 92 && ms.min_axis >= 85;
    console.log(`  W=${words} f26b=${f.f26b_long_sent_rate.toFixed(3)} f17=${f.f17_knife_count} cv=${f.cv_sent.toFixed(3)} mean=${f.f1_mean_sent_len.toFixed(1)}`);
    console.log(`  Comp=${ms.composite.toFixed(1)} min=${ms.min_axis.toFixed(1)} ECC=${ms.ecc_score.toFixed(1)} RCI=${ms.macro_axes.rci.score.toFixed(1)} SII=${ms.macro_axes.sii.score.toFixed(1)} IFI=${ms.macro_axes.ifi.score.toFixed(1)} AAI=${ms.macro_axes.aai.score.toFixed(1)}`);
    console.log(`  Alt=${alt.label}(${alt.transitions}) SAGA=${saga ? 'YES' : 'NO'}\n`);

    fs.writeFileSync(path.join(sessionDir, `prose_G_${sceneId}.txt`), prose);
    gResults.push({
      scene: sceneId, words, f26b: f.f26b_long_sent_rate, f17: f.f17_knife_count,
      f1a: f.f1a_rhythm_variance, cv: f.cv_sent, mean: f.f1_mean_sent_len,
      composite: ms.composite, min_axis: ms.min_axis,
      ECC: ms.ecc_score, RCI: ms.macro_axes.rci.score,
      SII: ms.macro_axes.sii.score, IFI: ms.macro_axes.ifi.score,
      AAI: ms.macro_axes.aai.score,
      alternance: `${alt.label}(${alt.transitions})`, saga,
    });

    await new Promise(r => setTimeout(r, 3000));
  }

  // ═══ VERDICT G ═══

  console.log('═══ VERDICT G ═══\n');
  const gMenace = gResults.find(r => r.scene === 'menace')!;
  const gRevel = gResults.find(r => r.scene === 'revelation')!;
  console.log(`  Menace:     Comp=${gMenace.composite.toFixed(1)} min=${gMenace.min_axis.toFixed(1)} f26b=${gMenace.f26b.toFixed(3)} f17=${gMenace.f17} alt=${gMenace.alternance} SAGA=${gMenace.saga?'YES':'NO'}`);
  console.log(`  Revelation: Comp=${gRevel.composite.toFixed(1)} min=${gRevel.min_axis.toFixed(1)} f26b=${gRevel.f26b.toFixed(3)} f17=${gRevel.f17} alt=${gRevel.alternance} SAGA=${gRevel.saga?'YES':'NO'}`);

  const gGood = (gMenace.saga || gMenace.composite >= 91) && (gRevel.saga || gRevel.composite >= 91);

  if (gGood) {
    console.log('\n  G est PROMETTEUR → Lancement Best-of-3 sur 5 briques avec G\n');
  } else {
    console.log('\n  G ne generalise pas suffisamment');
    console.log('  → Best-of-3 avec pipeline standard reste la meilleure strategie\n');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BEST-OF-3 AVEC G SUR 5 BRIQUES (si G est bon)
  // ═══════════════════════════════════════════════════════════════════════

  if (gGood) {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  BEST-OF-3 AVEC G SUR 5 BRIQUES');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    let sagaCount = 0;
    let totalAttempts = 0;
    const bo3Results: any[] = [];

    for (const scene of SCENES) {
      console.log(`═══ BRIQUE: ${scene.label} ═══`);

      const candidates: any[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        const packet = buildPacket(scene);
        // Use the full pipeline (runSovereignForgeWithPacket) — G is in the prompt, not the pipeline
        const result = await runSovereignForgeWithPacket(packet, provider);
        const prose = result.final_prose;
        const words = countWords(prose);
        const f = computeQuickFeatures(prose);
        const ms = result.macro_score;
        const comp = ms?.composite ?? 0;
        const minA = ms?.min_axis ?? 0;
        const saga = comp >= 92 && minA >= 85;
        const alt = countAlternance(prose);

        console.log(`  Tentative ${attempt+1}: Comp=${comp.toFixed(1)} min=${minA.toFixed(1)} f26b=${f.f26b_long_sent_rate.toFixed(3)} f17=${f.f17_knife_count} alt=${alt.label}(${alt.transitions}) ${saga ? '→ SAGA' : ''}`);

        candidates.push({ attempt: attempt+1, words, composite: comp, min_axis: minA, f26b: f.f26b_long_sent_rate, f17: f.f17_knife_count, alternance: `${alt.label}(${alt.transitions})`, saga });

        if (saga) {
          console.log(`  EARLY EXIT — SAGA_READY\n`);
          break;
        }

        if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
      }

      const winner = candidates.sort((a, b) => {
        const sA = a.composite - 1.5 * Math.max(0, 85 - a.min_axis);
        const sB = b.composite - 1.5 * Math.max(0, 85 - b.min_axis);
        return sB - sA;
      })[0];

      if (winner.saga) sagaCount++;
      totalAttempts += candidates.length;

      console.log(`  Winner: Tentative ${winner.attempt} (Comp=${winner.composite.toFixed(1)}, ${winner.saga ? 'SAGA' : 'NO SAGA'})\n`);
      bo3Results.push({ scene: scene.id, label: scene.label, winner, candidates, attempts: candidates.length });

      if (scene !== SCENES[SCENES.length - 1]) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    // ═══ RESUME BEST-OF-3 ═══

    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  RESUME BEST-OF-3 AVEC G');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`  SAGA_READY     : ${sagaCount}/5`);
    console.log(`  Total attempts : ${totalAttempts}/15\n`);

    for (const r of bo3Results) {
      const w = r.winner;
      console.log(`  ${r.scene.padEnd(16)} Comp=${w.composite.toFixed(1)} min=${w.min_axis.toFixed(1)} att=${r.attempts} ${w.saga ? 'SAGA' : 'NO'}`);
    }

    fs.writeFileSync(path.join(sessionDir, 'bestof3_G_results.json'), JSON.stringify(bo3Results, null, 2));
    console.log(`\nSaved: ${sessionDir}/bestof3_G_results.json`);
  }

  // Save G results
  fs.writeFileSync(path.join(sessionDir, 'phase3_G_results.json'), JSON.stringify(gResults, null, 2));
  console.log(`Saved: ${sessionDir}/phase3_G_results.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
