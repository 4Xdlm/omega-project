/**
 * OMEGA — BLACKBOX PHASE B : 95 API RUNS
 * 5 blocs sequentiels, sauvegarde incrementale
 * Standard: NASA-Grade L4
 *
 * B1: Baseline etendue (30 runs = 10 scenes x 3 runs)
 * B2: Gradient semicolons (15 runs = 5 niveaux x 3 runs)
 * B3: Gradient mean_sent_len (15 runs = 5 niveaux x 3 runs)
 * B4: Conflits (15 runs = 5 paires x 3 runs)
 * B5: Stabilite (20 runs = 2 prompts x 10 runs)
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SESSION_DIR = path.join('sessions', 'CLAUDE_BLACKBOX_PHASE_B');
fs.mkdirSync(SESSION_DIR, { recursive: true });

// ═══ HELPERS ═══

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

function buildPacket(id: string, sceneGoal: string, storyGoal: string, conflict: string,
  domQ1: string, domQ3: string, domQ4: string,
  beats: Array<{id: string; action: string; sensory: string[]}>,
  sigWords: string[], motifs: string[],
  extraConstraints: string = ''): ForgePacket {

  const styleOverride = extraConstraints ? {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: {
      signature_words: sigWords,
      forbidden_words: ['soudainement', 'mysterieusement'],
      abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60,
    },
    rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] },
    imagery: { recurrent_motifs: motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    extra_constraints: extraConstraints,
  } : {
    version: '1.0.0', universe: 'literary_fiction',
    lexicon: { signature_words: sigWords, forbidden_words: ['soudainement', 'mysterieusement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
    rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] },
    imagery: { recurrent_motifs: motifs, density_target_per_100_words: 3, banned_metaphors: [] },
  };

  return {
    packet_id: `BB_${id}_${Date.now()}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `bb_${id}`,
    run_id: `bb_${id}_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: storyGoal,
      scene_goal: sceneGoal,
      conflict_type: conflict,
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(domQ1), valence: -0.1, arousal: 0.3, dominant: domQ1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(domQ3, 0.35), valence: -0.2, arousal: 0.4, dominant: domQ3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(domQ3), valence: -0.4, arousal: 0.6, dominant: domQ3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(domQ4, 0.40), valence: -0.2, arousal: 0.3, dominant: domQ4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(domQ4, 0.40), valence: -0.2, arousal: 0.3, dominant: domQ4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: domQ3, after_dominant: domQ4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: beats.map((b, i) => ({
      beat_id: b.id, beat_order: i, action: b.action, dialogue: '',
      subtext_type: i === 2 ? 'pivot' : 'progression',
      emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [],
    })),
    subtext: {
      layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }],
      tension_type: 'absence', tension_intensity: 0.4,
    },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 2, signature_words: [] },
        { category: 'sound', min_count: 2, signature_words: [] },
        { category: 'touch', min_count: 1, signature_words: [] },
        { category: 'smell', min_count: 1, signature_words: [] },
        { category: 'taste', min_count: 0, signature_words: [] },
        { category: 'proprioception', min_count: 0, signature_words: [] },
        { category: 'interoception', min_count: 1, signature_words: [] },
      ],
      recurrent_motifs: motifs, banned_metaphors: [],
    },
    style_genome: styleOverride as any,
    kill_lists: {
      banned_words: ['soudain', 'soudainement', 'mysterieusement'],
      banned_cliches: ['coeur de pierre', 'mer d\'emotions', 'silence assourdissant'],
      banned_ai_patterns: ['il ne pouvait s\'empecher de', 'une vague de', 'un frisson parcourut'],
      banned_filter_words: ['effectivement', 'neanmoins', 'toutefois'],
    },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `bb_${id}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

function extractFeatures(prose: string) {
  const words = prose.split(/\s+/).filter(w => w.length > 0);
  const nw = words.length;
  const sents = prose.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
  const ns = Math.max(sents.length, 1);
  const lens = sents.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  const mean = lens.reduce((a, b) => a + b, 0) / ns;
  const std = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(ns - 1, 1));
  const cv = mean > 0 ? std / mean : 0;
  const f26b = lens.filter(l => l > 40).length / ns;
  const f17 = lens.filter(l => l <= 5).length;
  const knR = f17 / ns;
  let tLC = 0, tCL = 0;
  for (let i = 0; i < lens.length - 1; i++) {
    if (lens[i] > 30 && lens[i + 1] < 10) tLC++;
    if (lens[i] < 10 && lens[i + 1] > 30) tCL++;
  }
  const ratioAlt = (tLC + tCL) / ns;
  return {
    words: nw, sentence_count: ns, mean_sent_len: +mean.toFixed(2), std_sent_len: +std.toFixed(2),
    cv_sent: +cv.toFixed(4), f26b_long_sent_rate: +f26b.toFixed(4),
    f17_knife_count: f17, knife_rate: +knR.toFixed(4), ratio_alt: +(ratioAlt).toFixed(4),
    T_LC: tLC, T_CL: tCL,
    semicolon_count: (prose.match(/;/g) || []).length,
    dash_count: (prose.match(/[\u2014\u2013]/g) || []).length,
    colon_count: (prose.match(/:/g) || []).length,
    excl_count: (prose.match(/!/g) || []).length,
    quest_count: (prose.match(/\?/g) || []).length,
    ellipsis_count: (prose.match(/\.{3}|\u2026/g) || []).length,
    longest_sent: Math.max(...lens, 0),
    shortest_sent: Math.min(...lens, 999),
  };
}

async function runOne(packet: ForgePacket, provider: SovereignProvider, label: string) {
  const result = await runSovereignForgeWithPacket(packet, provider);
  const prose = result.final_prose;
  const ms = result.macro_score;
  const feats = extractFeatures(prose);
  return {
    label,
    prose,
    words: feats.words,
    composite: ms?.composite ?? 0,
    min_axis: ms?.min_axis ?? 0,
    axes: {
      ECC: ms?.ecc_score ?? 0,
      RCI: ms?.macro_axes?.rci.score ?? 0,
      SII: ms?.macro_axes?.sii.score ?? 0,
      IFI: ms?.macro_axes?.ifi.score ?? 0,
      AAI: ms?.macro_axes?.aai.score ?? 0,
    },
    features: feats,
  };
}

function saveBloc(name: string, data: any) {
  const p = path.join(SESSION_DIR, `${name}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  console.log(`  Saved: ${p}`);
}

// ═══ SCENE DEFINITIONS (10 types) ═══
const SCENES = [
  { id: 'contemplation', goal: 'Femme seule au bord de la mer, melancolie', story: 'La solitude', conflict: 'internal', dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'Elle prepare du the',sensory:['touch','sound']},{id:'b2',action:'Elle regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir d ete',sensory:['sound','smell']},{id:'b4',action:'La nuit tombe',sensory:['sight','touch']}], sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'] },
  { id: 'confrontation', goal: 'Deux associes reglent leurs comptes', story: 'Trahison', conflict: 'external', dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Il entre sans frapper',sensory:['sound','sight']},{id:'b2',action:'Mots tranchants',sensory:['sound']},{id:'b3',action:'Dossier jete sur la table',sensory:['touch']},{id:'b4',action:'Il sort sans un mot',sensory:['sight']}], sig: ['acier','verre','silence','machoire'], motifs: ['bureau','lumiere'] },
  { id: 'souvenir', goal: 'Vieil homme taille ses rosiers, se souvient', story: 'Deuil et beaute', conflict: 'internal', dq1: 'trust', dq3: 'sadness', dq4: 'love',
    beats: [{id:'b1',action:'Il taille les rosiers',sensory:['touch','smell']},{id:'b2',action:'Parfum rappelle un souvenir',sensory:['smell']},{id:'b3',action:'Il parle a voix haute',sensory:['sound']},{id:'b4',action:'Chaise vide',sensory:['sight','touch']}], sig: ['terre','parfum','main','rosier'], motifs: ['jardin','roses'] },
  { id: 'menace', goal: 'Femme seule en foret, danger', story: 'Peur primitive', conflict: 'external', dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Marche au crepuscule',sensory:['sight','sound']},{id:'b2',action:'Branche cassee',sensory:['sound']},{id:'b3',action:'Elle accelere',sensory:['touch']},{id:'b4',action:'Lisiere atteinte',sensory:['sight']}], sig: ['ombre','branche','souffle','nuit'], motifs: ['foret','crepuscule'] },
  { id: 'revelation', goal: 'Enfant trouve une lettre secrete', story: 'Innocence brisee', conflict: 'internal', dq1: 'trust', dq3: 'surprise', dq4: 'sadness',
    beats: [{id:'b1',action:'Fouille le grenier',sensory:['touch','smell']},{id:'b2',action:'Boite de lettres',sensory:['touch','sight']},{id:'b3',action:'Lit la lettre',sensory:['sight']},{id:'b4',action:'Descend sans rien dire',sensory:['touch','sound']}], sig: ['poussiere','papier','encre','secret'], motifs: ['grenier','lettres'] },
  { id: 'dialogue_pur', goal: 'Couple qui se separe, conversation finale', story: 'Rupture', conflict: 'external', dq1: 'trust', dq3: 'sadness', dq4: 'remorse',
    beats: [{id:'b1',action:'Ils sont assis face a face',sensory:['sight']},{id:'b2',action:'Elle dit ce qu elle taisait',sensory:['sound']},{id:'b3',action:'Silence apres les mots',sensory:['sound']},{id:'b4',action:'Elle prend ses cles et sort',sensory:['touch','sound']}], sig: ['table','cle','porte','voix'], motifs: ['cuisine','lumiere'] },
  { id: 'action_pure', goal: 'Poursuite dans une ville la nuit', story: 'Fuite', conflict: 'external', dq1: 'fear', dq3: 'fear', dq4: 'anticipation',
    beats: [{id:'b1',action:'Il court dans la ruelle',sensory:['touch','sound']},{id:'b2',action:'Saute un mur',sensory:['touch']},{id:'b3',action:'Se cache dans l ombre',sensory:['sight','sound']},{id:'b4',action:'Les pas s eloignent',sensory:['sound']}], sig: ['pavé','mur','souffle','ombre'], motifs: ['ruelles','nuit'] },
  { id: 'description_pure', goal: 'Maison abandonnee au milieu des champs', story: 'Lieu sans vie', conflict: 'internal', dq1: 'sadness', dq3: 'awe', dq4: 'sadness',
    beats: [{id:'b1',action:'Vue exterieure de la maison',sensory:['sight']},{id:'b2',action:'Interieur poussiereux',sensory:['touch','smell']},{id:'b3',action:'Objet familier reste',sensory:['sight','touch']},{id:'b4',action:'Lumiere par la fenetre brisee',sensory:['sight']}], sig: ['pierre','lierre','poussiere','fenetre'], motifs: ['maison','champs'] },
  { id: 'interieur', goal: 'Insomniaque qui pense dans le noir', story: 'Rumination', conflict: 'internal', dq1: 'fear', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'Allonge les yeux ouverts',sensory:['sight','touch']},{id:'b2',action:'Pensees en boucle',sensory:['sound']},{id:'b3',action:'Se leve pour boire',sensory:['touch']},{id:'b4',action:'Retourne au lit',sensory:['touch']}], sig: ['obscurite','plafond','souffle','draps'], motifs: ['nuit','chambre'] },
  { id: 'sensoriel', goal: 'Marche au matin dans un marche provencal', story: 'Eveil sensoriel', conflict: 'internal', dq1: 'joy', dq3: 'awe', dq4: 'trust',
    beats: [{id:'b1',action:'Odeurs du marche',sensory:['smell','sight']},{id:'b2',action:'Toucher des fruits',sensory:['touch']},{id:'b3',action:'Voix des marchands',sensory:['sound']},{id:'b4',action:'Soleil sur la nuque',sensory:['touch','sight']}], sig: ['lavande','tomate','voix','soleil'], motifs: ['marche','matin'] },
];

// ═══ MAIN ═══
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — BLACKBOX PHASE B — 95 API RUNS');
  console.log('═══════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const pause = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ═══ BLOC 1 — BASELINE ETENDUE (30 runs) ═══
  console.log('\n═══ BLOC 1 — BASELINE ETENDUE (10 scenes x 3 runs) ═══');
  const b1Results: any[] = [];

  for (const scene of SCENES) {
    for (let run = 0; run < 3; run++) {
      const label = `baseline_${scene.id}_run${run}`;
      console.log(`\n  [B1] ${scene.id} run ${run + 1}/3...`);
      try {
        const packet = buildPacket(label, scene.goal, scene.story, scene.conflict,
          scene.dq1, scene.dq3, scene.dq4, scene.beats, scene.sig, scene.motifs);
        const r = await runOne(packet, provider, label);
        b1Results.push({ scene: scene.id, run, ...r });
        console.log(`    words=${r.words} comp=${r.composite.toFixed(1)} min=${r.min_axis.toFixed(1)} ;=${r.features.semicolon_count} —=${r.features.dash_count} f17=${r.features.f17_knife_count}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        b1Results.push({ scene: scene.id, run, label, error: e.message?.slice(0, 200) });
      }
      await pause(2000);
    }
  }
  saveBloc('B1_BASELINE', b1Results);

  // ═══ BLOC 2 — GRADIENT SEMICOLONS (15 runs) ═══
  console.log('\n═══ BLOC 2 — GRADIENT SEMICOLONS (5 niveaux x 3 runs) ═══');
  const b2Results: any[] = [];
  const semicolonLevels = [
    { level: 0, constraint: '' },
    { level: 1, constraint: 'Utilise des points-virgules pour lier les propositions.' },
    { level: 2, constraint: 'REGLE ABSOLUE : chaque paragraphe doit contenir au moins un point-virgule (;). Le point-virgule lie les propositions avec elegance.' },
    { level: 3, constraint: 'REGLE ABSOLUE : utilise au minimum 5 points-virgules (;) dans le texte. Le point-virgule est ton outil principal de subordination. Chaque phrase complexe doit etre articulee par un ; plutot que par un point.' },
    { level: 4, constraint: 'REGLE ABSOLUE PRIORITAIRE : le texte DOIT contenir au minimum 8 points-virgules (;). Le point-virgule remplace le point dans toutes les phrases de plus de 20 mots. Construis des phrases-fleuves articulees par des ; successifs, a la maniere de Proust ou Balzac. METRIQUE : au moins 8 occurrences de ; dans le texte final.' },
  ];

  const baseScene = SCENES[0]; // contemplation
  for (const { level, constraint } of semicolonLevels) {
    for (let run = 0; run < 3; run++) {
      const label = `semicolon_L${level}_run${run}`;
      console.log(`\n  [B2] semicolon level ${level} run ${run + 1}/3...`);
      try {
        const packet = buildPacket(label, baseScene.goal, baseScene.story, baseScene.conflict,
          baseScene.dq1, baseScene.dq3, baseScene.dq4, baseScene.beats, baseScene.sig, baseScene.motifs,
          constraint);
        const r = await runOne(packet, provider, label);
        b2Results.push({ level, run, constraint: constraint.slice(0, 80), ...r });
        console.log(`    ;=${r.features.semicolon_count} words=${r.words} comp=${r.composite.toFixed(1)} mean=${r.features.mean_sent_len}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        b2Results.push({ level, run, label, error: e.message?.slice(0, 200) });
      }
      await pause(2000);
    }
  }
  saveBloc('B2_GRADIENT_SEMICOLONS', b2Results);

  // ═══ BLOC 3 — GRADIENT MEAN_SENT_LEN (15 runs) ═══
  console.log('\n═══ BLOC 3 — GRADIENT MEAN_SENT_LEN (5 niveaux x 3 runs) ═══');
  const b3Results: any[] = [];
  const sentLenLevels = [
    { level: 0, target: 12, constraint: 'REGLE : phrases courtes. Maximum 12 mots par phrase en moyenne. Coupe. Hache. Syncope.' },
    { level: 1, target: 18, constraint: 'REGLE : phrases moyennes. Environ 18 mots par phrase en moyenne.' },
    { level: 2, target: 25, constraint: 'REGLE : phrases longues. Au moins 25 mots par phrase en moyenne. Developpe chaque idee.' },
    { level: 3, target: 35, constraint: 'REGLE : phrases tres longues. Au moins 35 mots par phrase. Phrases amples, subordonnees, deploiement progressif de la pensee.' },
    { level: 4, target: 50, constraint: 'REGLE ABSOLUE : phrases-fleuves. Minimum 50 mots par phrase. Prose proustienne. Chaque phrase est un paragraphe en soi, avec des subordonnees enchassees, des incises, des relatives, des participiales. Aucune phrase de moins de 30 mots.' },
  ];

  for (const { level, target, constraint } of sentLenLevels) {
    for (let run = 0; run < 3; run++) {
      const label = `sentlen_L${level}_t${target}_run${run}`;
      console.log(`\n  [B3] sentlen target=${target} run ${run + 1}/3...`);
      try {
        const packet = buildPacket(label, baseScene.goal, baseScene.story, baseScene.conflict,
          baseScene.dq1, baseScene.dq3, baseScene.dq4, baseScene.beats, baseScene.sig, baseScene.motifs,
          constraint);
        const r = await runOne(packet, provider, label);
        b3Results.push({ level, target, run, ...r });
        console.log(`    mean=${r.features.mean_sent_len} words=${r.words} comp=${r.composite.toFixed(1)} cv=${r.features.cv_sent}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        b3Results.push({ level, target, run, label, error: e.message?.slice(0, 200) });
      }
      await pause(2000);
    }
  }
  saveBloc('B3_GRADIENT_SENTLEN', b3Results);

  // ═══ BLOC 4 — CONFLITS (15 runs) ═══
  console.log('\n═══ BLOC 4 — CONFLITS (5 paires x 3 runs) ═══');
  const b4Results: any[] = [];
  const conflicts = [
    { id: 'long_vs_hook', constraint: 'CONFLIT : ecris des phrases tres longues (40+ mots) ET commence chaque paragraphe par une phrase-couteau de moins de 5 mots. Les deux sont obligatoires.' },
    { id: 'ampeur_vs_secheresse', constraint: 'CONFLIT : alterne rigoureusement entre un paragraphe de prose ample proustienne (phrases de 50+ mots) et un paragraphe ultra sec hemingwayen (phrases de 5-8 mots). Aucun compromis.' },
    { id: 'dialogue_vs_prose', constraint: 'CONFLIT : le texte doit etre 50% dialogue brut et 50% description sensorielle dense. Pas de narration, pas d introspection. Seulement paroles et perceptions.' },
    { id: 'noirceur_vs_sobriete', constraint: 'CONFLIT : le texte doit etre extremement noir et violent dans le fond (mort, souffrance, cruaute) mais la forme doit etre d une retenue absolue, quasi clinique. Aucun pathos, aucune emphase.' },
    { id: 'oral_vs_litteraire', constraint: 'CONFLIT : le texte doit etre ecrit dans un registre tres oral (contractions, tournures parlees, syntaxe relachee) tout en maintenant une haute tenue litteraire (metaphores rares, rythme controle, subordination complexe).' },
  ];

  for (const { id, constraint } of conflicts) {
    for (let run = 0; run < 3; run++) {
      const label = `conflict_${id}_run${run}`;
      console.log(`\n  [B4] ${id} run ${run + 1}/3...`);
      try {
        const packet = buildPacket(label, baseScene.goal, baseScene.story, baseScene.conflict,
          baseScene.dq1, baseScene.dq3, baseScene.dq4, baseScene.beats, baseScene.sig, baseScene.motifs,
          constraint);
        const r = await runOne(packet, provider, label);
        b4Results.push({ conflict: id, run, ...r });
        console.log(`    words=${r.words} comp=${r.composite.toFixed(1)} mean=${r.features.mean_sent_len} f17=${r.features.f17_knife_count} ;=${r.features.semicolon_count} cv=${r.features.cv_sent}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        b4Results.push({ conflict: id, run, label, error: e.message?.slice(0, 200) });
      }
      await pause(2000);
    }
  }
  saveBloc('B4_CONFLICTS', b4Results);

  // ═══ BLOC 5 — STABILITE (20 runs) ═══
  console.log('\n═══ BLOC 5 — STABILITE (2 prompts x 10 runs) ═══');
  const b5Results: any[] = [];

  for (const scene of [SCENES[0], SCENES[3]]) { // contemplation + menace
    for (let run = 0; run < 10; run++) {
      const label = `stability_${scene.id}_run${run}`;
      console.log(`\n  [B5] ${scene.id} run ${run + 1}/10...`);
      try {
        const packet = buildPacket(label, scene.goal, scene.story, scene.conflict,
          scene.dq1, scene.dq3, scene.dq4, scene.beats, scene.sig, scene.motifs);
        const r = await runOne(packet, provider, label);
        b5Results.push({ scene: scene.id, run, ...r });
        console.log(`    words=${r.words} comp=${r.composite.toFixed(1)} mean=${r.features.mean_sent_len} cv=${r.features.cv_sent}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        b5Results.push({ scene: scene.id, run, label, error: e.message?.slice(0, 200) });
      }
      await pause(2000);
    }
  }
  saveBloc('B5_STABILITY', b5Results);

  // ═══ FINAL SUMMARY ═══
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  PHASE B COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  B1 Baseline  : ${b1Results.filter(r => !r.error).length}/${b1Results.length} OK`);
  console.log(`  B2 Semicolons: ${b2Results.filter(r => !r.error).length}/${b2Results.length} OK`);
  console.log(`  B3 SentLen   : ${b3Results.filter(r => !r.error).length}/${b3Results.length} OK`);
  console.log(`  B4 Conflicts : ${b4Results.filter(r => !r.error).length}/${b4Results.length} OK`);
  console.log(`  B5 Stability : ${b5Results.filter(r => !r.error).length}/${b5Results.length} OK`);
  console.log(`  TOTAL        : ${[b1Results,b2Results,b3Results,b4Results,b5Results].flat().filter(r => !r.error).length}/95`);
  console.log(`\n  Session: ${SESSION_DIR}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
