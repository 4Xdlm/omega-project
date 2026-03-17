/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — W-BENCHMARK: Damage Gate Validation (8 scènes W.INT-4)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * HOTFIX v2 — Structures corrigées pour correspondre aux types réels :
 *   - StyleProfile  : lexicon/rhythm/tone/imagery corrects
 *   - KillLists     : banned_words/banned_cliches/banned_ai_patterns/banned_filter_words
 *   - CanonEntry    : { id, statement } uniquement
 *   - ForgeContinuity : previous_scene_summary / character_states / open_threads
 *   - Arc           : scenes: Scene[] (pas chapters)
 *   - GenesisPlan   : tous les champs requis
 *   - Beat          : action/intention/pivot/tension_delta/information_revealed/withheld
 *   - Scene         : objective/conflict(string)/conflict_type/emotion_target... corrects
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npm run benchmark:phase-w
 *
 * Modes:
 *   $env:BENCH_MICRO     = "1"   → 3 scènes (vérification rapide)
 *   $env:DAMAGE_GATE_OFF = "1"   → bypass Damage Gate (A/B)
 *
 * Livrables:
 *   sessions/BenchW_<mode>_<date>_<head>/
 *     config.json | runs.jsonl | summary.json | SHA256SUMS.txt
 *
 * Critère SEAL : composite ≥ 93.0, ALL FLOORS ≥ 85
 * Baseline Phase V : composite 92.0
 *
 * Standard: NASA-Grade L4 / DO-178C
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { runSovereignForge } from '../src/engine.js';
import type { ForgePacketInput } from '../src/input/forge-packet-assembler.js';
import type { Beat, GenesisPlan, Scene, Arc } from '@omega/genesis-planner';
import type {
  StyleProfile,
  KillLists,
  CanonEntry,
  ForgeContinuity,
  SovereignProvider,
} from '../src/types.js';
import { DEFAULT_VOICE_GENOME } from '../src/voice/voice-genome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT_DIR   = path.resolve(__dirname, '../../..');

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL_ID      = 'claude-sonnet-4-20250514';
const ROOT_SEED     = 'omega-validation-2026-phase-w-int4';
const OUT_DIR       = path.join(__dirname, '..', 'sessions');
const BASELINE_COMP = 92.0;
const TARGET_COMP   = 93.0;
const TARGET_FLOOR  = 85.0;

const IS_MICRO  = process.env['BENCH_MICRO'] === '1';
const GATE_OFF  = process.env['DAMAGE_GATE_OFF'] === '1';

function getGitHead(): string {
  try { return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim(); }
  catch { return 'unknown'; }
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ── Shared style / kill_lists — STRUCTURES CORRIGÉES ─────────────────────────

const BASE_STYLE: StyleProfile = {
  version: '1.0.0',
  universe: 'literary_contemporary',
  lexicon: {
    // Correction : abstraction_max_ratio + concrete_min_ratio requis (pas 'register')
    signature_words: ['silence', 'lumière', 'ombre', 'chair', 'souffle',
                      'regard', 'main', 'voix', 'corps', 'froid'],
    forbidden_words: ['soudainement', 'mystérieusement', 'tout à coup'],
    abstraction_max_ratio: 0.20,
    concrete_min_ratio: 0.60,
  },
  rhythm: {
    // Correction : champs exacts du type StyleProfile (pas target_sentence_length)
    avg_sentence_length_target: 18,
    gini_target: 0.45,
    max_consecutive_similar: 2,
    min_syncopes_per_scene: 2,
    min_compressions_per_scene: 1,
  },
  tone: {
    // Correction : dominant_register + intensity_range (pas formality)
    dominant_register: 'soutenu',
    intensity_range: [0.3, 0.85],
  },
  imagery: {
    // Correction : champ imagery requis (absent dans l'ancienne version)
    recurrent_motifs: ['obscurité', 'métal', 'sel'],
    density_target_per_100_words: 3,
    banned_metaphors: ['heart of stone', 'eyes like stars'],
  },
  voice: DEFAULT_VOICE_GENOME,
};

const BASE_KILL_LISTS: KillLists = {
  // Correction : banned_words/banned_cliches/banned_ai_patterns/banned_filter_words
  // (pas cliches/weak_verbs/forbidden_patterns)
  banned_words: ['soudain', 'brusquement', 'subitement'],
  banned_cliches: [
    'le cœur battant', 'les larmes aux yeux', 'un frisson parcourut',
    'elle retint son souffle', 'le temps s\'arrêta', 'comme dans un rêve',
    'une bouffée d\'air frais', 'le sang se glaça', 'les jambes en coton',
    'un nœud dans la gorge', 'les poings serrés', 'mâchoire contractée',
    'front perlé de sueur', 'regard perdu dans le vague', 'cœur serré',
    'sourire triste', 'silence pesant', 'atmosphère lourde',
    'le monde sembla s\'effondrer', 'gorge nouée', 'souffle court',
    'mains tremblantes', 'regard fuyant', 'voix brisée',
    'la tension était palpable', 'son sang ne fit qu\'un tour',
  ],
  banned_ai_patterns: [
    'il est important de noter', 'en conclusion', 'en résumé',
    'en effet,', 'il convient de', 'force est de constater',
    'au fil du temps', 'dans un premier temps', 'dans ce contexte',
    'il va sans dire', 'c\'est ainsi que', 'à cet égard',
    'on peut dire que', 'il semblerait que', 'n\'en demeure pas moins',
    'en d\'autres termes', 'par ailleurs', 'de surcroît',
    'à titre d\'exemple', 'dans le cadre de', 'à cet instant précis',
  ],
  banned_filter_words: [
    'vraiment', 'très', 'tellement', 'extrêmement', 'absolument',
    'totalement', 'complètement', 'profondément', 'littéralement',
    'simplement', 'clairement', 'certainement', 'évidemment',
    'manifestement', 'visiblement', 'incroyablement', 'étrangement',
    'soudainement', 'immédiatement', 'doucement',
  ],
};

// Correction CanonEntry : { id, statement } uniquement (pas type/name/facts)
function makeCanon(id: string, statements: string[]): readonly CanonEntry[] {
  return statements.map((s, i) => ({ id: `${id}_C${i + 1}`, statement: s }));
}

// Correction ForgeContinuity : previous_scene_summary / character_states / open_threads
function makeContinuity(
  summary: string,
  charName: string,
  emotionalState: string,
  location: string,
): ForgeContinuity {
  return {
    previous_scene_summary: summary,
    character_states: [{
      character_id: 'char_01',
      character_name: charName,
      emotional_state: emotionalState,
      physical_state: 'debout, en tension',
      location,
    }],
    open_threads: ['Qu\'est-ce qui les attend ?'],
  };
}

// Correction Beat : action/intention/pivot/tension_delta/information_revealed/withheld
function makeBeat(
  id: string,
  action: string,
  intention: string,
  pivot: boolean,
  delta: -1 | 0 | 1,
): Beat {
  return {
    beat_id: id,
    action,
    intention,
    pivot,
    tension_delta: delta,
    information_revealed: [],
    information_withheld: [],
  };
}

// Correction Scene : tous les champs requis
function makeScene(
  sceneId: string,
  objective: string,
  conflict: string,                              // string, pas objet
  conflictType: 'external' | 'internal' | 'relational',
  emotionTarget: string,
  intensity: number,
  sensoryAnchor: string,
  beats: readonly Beat[],
  subtext: {
    character_thinks: string;
    reader_knows: string;
    tension_type: string;
    implied_emotion: string;
  },
  wordCount = 600,
): Scene {
  return {
    scene_id: sceneId,
    arc_id: 'arc_w4',
    objective,
    conflict,
    conflict_type: conflictType,
    emotion_target: emotionTarget,
    emotion_intensity: intensity,
    seeds_planted: [],
    seeds_bloomed: [],
    subtext,
    sensory_anchor: sensoryAnchor,
    constraints: [],
    beats,
    target_word_count: wordCount,
    justification: objective,
  };
}

// Correction Arc : scenes: Scene[] (pas chapters)
function makeArc(scene: Scene): Arc {
  return {
    arc_id: 'arc_w4',
    theme: 'La frontière entre créer et détruire',
    progression: 'montante',
    scenes: [scene],
    justification: 'arc principal Phase W',
  };
}

// Correction GenesisPlan : tous les champs requis (plan_hash, version, hashes...)
function makePlan(planId: string, scene: Scene, emotionTarget: string, intensity: number): GenesisPlan {
  const arc = makeArc(scene);
  return {
    plan_id: planId,
    plan_hash: 'c'.repeat(64),
    version: '1.0.0',
    intent_hash: 'd'.repeat(64),
    canon_hash: 'e'.repeat(64),
    constraints_hash: 'f'.repeat(64),
    genome_hash: '0'.repeat(64),
    emotion_hash: '1'.repeat(64),
    arcs: [arc],
    seed_registry: [],
    tension_curve: [0.2, 0.4, 0.6, 0.8, 0.7],
    emotion_trajectory: [
      { position: 0.0,  emotion: emotionTarget, intensity: intensity * 0.4 },
      { position: 0.25, emotion: emotionTarget, intensity: intensity * 0.7 },
      { position: 0.5,  emotion: emotionTarget, intensity: intensity },
      { position: 0.75, emotion: emotionTarget, intensity: intensity * 0.9 },
      { position: 1.0,  emotion: 'sadness',     intensity: intensity * 0.5 },
    ],
    scene_count: 1,
    beat_count: scene.beats.length,
    estimated_word_count: scene.target_word_count,
  };
}

function makeInput(
  i: number,
  scene: Scene,
  plan: GenesisPlan,
  canon: readonly CanonEntry[],
  continuity: ForgeContinuity,
): ForgePacketInput {
  return {
    plan,
    scene,
    style_profile: BASE_STYLE,
    kill_lists: BASE_KILL_LISTS,
    canon,
    continuity,
    run_id: `bench-w4-${i}-${scene.scene_id}`,
    language: 'fr',
  };
}

// ── 8 Scènes W.INT-4 (Elena Vasquez & Marcus Delacroix, port maritime) ────────

function buildInputs(): ForgePacketInput[] {
  const SCENES: Array<{
    s: Scene;
    canon: readonly CanonEntry[];
    continuity: ForgeContinuity;
    archetype: string;  // metadata tracking uniquement
    label: string;
  }> = [

    // ── S1: Confrontation (tension haute — BRUTAL) ──
    {
      label: 'Confrontation',
      archetype: 'BRUTAL',
      s: makeScene(
        'w4-confrontation',
        'Elena confronte Marcus sur le mensonge du contrat naval',
        'Elena vs. trahison de Marcus',
        'relational',
        'anger',
        0.85,
        'Métal froid de l\'établi, odeur de solvant, lumière rasante',
        [
          makeBeat('b1', 'Elena entre dans l\'atelier, le contrat froissé à la main', 'installer la menace', false, 0),
          makeBeat('b2', 'Marcus tente de justifier — Elena refuse chaque argument', 'escalade factuelle', false, 1),
          makeBeat('b3', 'Elena pose le contrat sur l\'établi. Silence absolu.', 'pivot révélation', true, 1),
          makeBeat('b4', 'Elena sort. Marcus reste seul avec le métal froid.', 'rupture sans résolution', false, 0),
        ],
        {
          character_thinks: 'Il m\'a menti sur l\'origine de la commande',
          reader_knows: 'Marcus cache aussi la mort du patient',
          tension_type: 'hidden_motive',
          implied_emotion: 'betrayal',
        },
        620,
      ),
      canon: makeCanon('w4-c1', [
        'Elena Vasquez est architecte navale, 34 ans, mains calleuses, précision obsessionnelle',
        'Marcus Delacroix est ancien chirurgien reconverti sculpteur, 41 ans, calme masquant une rage froide',
        'L\'atelier est un ancien entrepôt maritime, verrières sales, odeur de sel et de métal',
      ]),
      continuity: makeContinuity(
        'Elena a découvert une anomalie dans le contrat et se rend à l\'atelier',
        'Elena Vasquez',
        'déterminée, froide',
        'atelier du port',
      ),
    },

    // ── S2: Élégie (intériorité profonde — INTERIOR) ──
    {
      label: 'Élégie',
      archetype: 'INTERIOR',
      s: makeScene(
        'w4-elegie',
        'Marcus retrouve le moulage en plâtre de la main d\'un enfant perdu',
        'Marcus vs. culpabilité de chirurgien',
        'internal',
        'sadness',
        0.75,
        'Plâtre froid, lumière de crépuscule, silence du port',
        [
          makeBeat('b1', 'Marcus découvre le moulage dans un carton oublié', 'déclencheur mnésique', false, 0),
          makeBeat('b2', 'Souvenirs fragmentés du bloc opératoire et du silence après', 'descente mémorielle', false, 0),
          makeBeat('b3', 'Il sculpte autour du moulage — prière laïque', 'transformation créatrice', true, 0),
          makeBeat('b4', 'Il pose la sculpture terminée. Il n\'a plus besoin de pleurer.', 'résolution silencieuse', false, 0),
        ],
        {
          character_thinks: 'Ces mains ont failli sauver quelqu\'un',
          reader_knows: 'C\'est le patient mort sur la table',
          tension_type: 'dramatic_irony',
          implied_emotion: 'grief',
        },
        560,
      ),
      canon: makeCanon('w4-c2', [
        'Marcus Delacroix a perdu un enfant sur la table d\'opération il y a dix ans',
        'Il a quitté la chirurgie pour la sculpture sur métal',
        'L\'atelier est plein d\'œuvres non vendues',
      ]),
      continuity: makeContinuity(
        'Marcus est seul dans l\'atelier au crépuscule après le départ d\'Elena',
        'Marcus Delacroix',
        'absent, accablé',
        'atelier du port',
      ),
    },

    // ── S3: Panique (rythme rapide, tension — BRUTAL) ──
    {
      label: 'Panique',
      archetype: 'BRUTAL',
      s: makeScene(
        'w4-panique',
        'Elena fuit l\'entrepôt en feu avec les plans du prototype',
        'Elena vs. effondrement de la structure',
        'external',
        'fear',
        0.90,
        'Chaleur du métal, fumée âcre, vibrations dans le sol',
        [
          makeBeat('b1', 'Craquement dans la structure — le sol vibre', 'déclencheur physique', false, 1),
          makeBeat('b2', 'Elena calcule la résistance de l\'acier à la chaleur', 'expertise qui paralyse', false, 1),
          makeBeat('b3', 'L\'escalier cède — elle saute, plans contre la poitrine', 'action instinctive', true, 1),
          makeBeat('b4', 'Dehors. Vivante. La verrière explose derrière elle.', 'survie amère', false, -1),
        ],
        {
          character_thinks: 'Combien de secondes avant l\'effondrement',
          reader_knows: 'Les plans valent moins que sa vie',
          tension_type: 'suspense',
          implied_emotion: 'fear',
        },
        580,
      ),
      canon: makeCanon('w4-c3', [
        'L\'entrepôt maritime est une structure ancienne avec des problèmes structurels',
        'Elena connaît les limites de résistance des matériaux par formation',
        'Le prototype naval est la clé du contrat litigieux',
      ]),
      continuity: makeContinuity(
        'Elena est revenue chercher les plans du prototype dans l\'atelier vide',
        'Elena Vasquez',
        'concentrée, en danger',
        'entrepôt maritime en feu',
      ),
    },

    // ── S4: Contemplation (sensoriel, musicalité — SENSORY) ──
    {
      label: 'Contemplation',
      archetype: 'SENSORY',
      s: makeScene(
        'w4-contemplation',
        'Elena marche au port à l\'aube, entre les coques retournées',
        'Elena vs. besoin de lâcher prise',
        'internal',
        'trust',
        0.60,
        'Odeur de goudron, cri des mouettes, bois chaud malgré l\'heure',
        [
          makeBeat('b1', 'Elena marche entre les coques retournées dans la lumière d\'aube', 'ouverture sensorielle', false, 0),
          makeBeat('b2', 'Elle pose la main sur la coque d\'un chalutier — années de sel dans les fibres', 'contact matériel', false, 0),
          makeBeat('b3', 'Le port vu comme organisme — chaque quai une artère', 'pensée architecturale', false, 0),
          makeBeat('b4', 'Elle reste. Pas pour calculer. Pour être là.', 'acceptation', true, 0),
        ],
        {
          character_thinks: 'Pourquoi est-ce que j\'ai besoin de comprendre tout',
          reader_knows: 'Elle ne peut pas s\'arrêter de calculer',
          tension_type: 'suppressed_emotion',
          implied_emotion: 'intimacy',
        },
        520,
      ),
      canon: makeCanon('w4-c4', [
        'Elena n\'a pas dormi depuis la découverte du mensonge de Marcus',
        'Le port est son lieu de ressourcement depuis l\'enfance',
        'Elle pense naturellement en structures et en charges',
      ]),
      continuity: makeContinuity(
        'Elena est sortie marcher après une nuit sans sommeil',
        'Elena Vasquez',
        'épuisée, en suspension',
        'quais du port à l\'aube',
      ),
    },

    // ── S5: Dialogue tendu (tension + intériorité — BALANCED) ──
    {
      label: 'Dialogue tendu',
      archetype: 'BALANCED',
      s: makeScene(
        'w4-dialogue-tendu',
        'Elena et Marcus se retrouvent dans un café du port, chacun sachant que l\'autre cache quelque chose',
        'Elena vs. Marcus — guerre des silences',
        'relational',
        'anticipation',
        0.80,
        'Tasse de café tiède, bruit de la rue, lumière de milieu de journée',
        [
          makeBeat('b1', 'Conversation apparemment banale sur un projet commun', 'sous-texte masqué', false, 0),
          makeBeat('b2', 'Marcus parle de précision dans le geste — Elena entend mensonge', 'double lecture', false, 1),
          makeBeat('b3', 'Marcus pose sa tasse avec une exactitude chirurgicale — Elena reconnaît le geste', 'révélation silencieuse', true, 1),
          makeBeat('b4', 'Ils se quittent sans rien résoudre — géométrie de la relation changée', 'non-résolution', false, 0),
        ],
        {
          character_thinks: 'Il sait que je sais',
          reader_knows: 'Ils savent tous les deux tout',
          tension_type: 'hidden_motive',
          implied_emotion: 'anxiety',
        },
        570,
      ),
      canon: makeCanon('w4-c5', [
        'Elena et Marcus ont une relation professionnelle et ambiguë depuis six mois',
        'Marcus a des gestes de précision chirurgicale qu\'il ne peut pas effacer',
        'Chaque mot entre eux a un sous-texte depuis la découverte du contrat',
      ]),
      continuity: makeContinuity(
        'Marcus a proposé un café pour apaiser la confrontation de la veille',
        'Elena Vasquez',
        'méfiante, maîtrisée',
        'café du port',
      ),
    },

    // ── S6: Description lyrique (musicalité + lexique — CATHEDRAL) ──
    {
      label: 'Description lyrique',
      archetype: 'CATHEDRAL',
      s: makeScene(
        'w4-lyrique',
        'Marcus traduit la lumière du couchant sur la cale sèche en volume et matière',
        'Marcus vs. la beauté inutile',
        'internal',
        'joy',
        0.65,
        'Métal cuivré par le soleil, flaques de feu, ombres qui s\'allongent',
        [
          makeBeat('b1', 'La cale sèche au couchant — métal rouillé devenu cuivre', 'transformation lumineuse', false, 0),
          makeBeat('b2', 'Marcus installe son matériel — il traduit, pas il peint', 'acte créatif défini', false, 0),
          makeBeat('b3', 'Ombres comme des doigts — le port entier sculpture non commandée', 'expansion poétique', true, 0),
          makeBeat('b4', 'La dernière lumière. Marcus range. La cale redevient ordinaire.', 'fermeture', false, 0),
        ],
        {
          character_thinks: 'Il n\'y a pas de commande pour cette beauté',
          reader_knows: 'C\'est la première fois depuis dix ans qu\'il crée sans culpabilité',
          tension_type: 'unspoken_desire',
          implied_emotion: 'quiet pride',
        },
        490,
      ),
      canon: makeCanon('w4-c6', [
        'Marcus n\'a pas créé par plaisir pur depuis la mort du patient',
        'La cale sèche est visible depuis l\'atelier',
        'Marcus a étudié les beaux-arts avant la médecine',
      ]),
      continuity: makeContinuity(
        'Marcus a terminé sa journée de sculpture et descend vers la cale',
        'Marcus Delacroix',
        'apaisé, attentif',
        'cale sèche du port au couchant',
      ),
    },

    // ── S7: Action pure (tension maximale — BRUTAL) ──
    {
      label: 'Action pure',
      archetype: 'BRUTAL',
      s: makeScene(
        'w4-action',
        'Elena descend l\'escalier de l\'entrepôt en flammes, les plans serrés contre elle',
        'Elena vs. physique de la catastrophe',
        'external',
        'fear',
        0.95,
        'Chaleur irradiante, métal tordu, fumée qui aveugle, bruit de structure',
        [
          makeBeat('b1', 'Incendie — solvants embrasés, Elena à l\'étage avec les plans', 'situation de crise', false, 1),
          makeBeat('b2', 'Descente par l\'escalier brûlant — calcul de résistance des marches', 'expertise automatique', false, 1),
          makeBeat('b3', 'L\'escalier cède — saut — réception sur les genoux — plans intacts', 'action décisive', true, 1),
          makeBeat('b4', 'L\'air marin frappe. Derrière elle, la verrière explose.', 'sortie', false, -1),
        ],
        {
          character_thinks: 'Acier — résistance à la traction à 600°C — deux minutes',
          reader_knows: 'Elle ne lâchera jamais les plans',
          tension_type: 'suspense',
          implied_emotion: 'paralysis',
        },
        540,
      ),
      canon: makeCanon('w4-c7', [
        'Elena connaît les propriétés physiques des matériaux de construction',
        'Les plans du prototype représentent six mois de travail',
        'L\'incendie a été déclenché par des solvants mal rangés',
      ]),
      continuity: makeContinuity(
        'Elena est entrée dans l\'entrepôt pour récupérer les derniers plans originaux',
        'Elena Vasquez',
        'en danger, calculatrice',
        'entrepôt en feu, étage supérieur',
      ),
    },

    // ── S8: Monologue intérieur (intériorité + lexique — INTERIOR) ──
    {
      label: 'Monologue intérieur',
      archetype: 'INTERIOR',
      s: makeScene(
        'w4-monologue',
        'Marcus contemple ses mains devant le miroir de l\'atelier et interroge son passage du scalpel au burin',
        'Marcus vs. continuité de soi',
        'internal',
        'disgust',
        0.70,
        'Miroir piqué, doigts longs et précis, lumière froide de néon',
        [
          makeBeat('b1', 'Marcus regarde ses mains — scalpels et burins, même précision', 'observation initiale', false, 0),
          makeBeat('b2', 'Flux de conscience — réparer vs. créer — chaque sculpture une compensation ?', 'descente intérieure', false, 0),
          makeBeat('b3', 'Le souvenir du patient — pas l\'opération, l\'après — le néon qui grésillait', 'rupture mémorielle', true, 0),
          makeBeat('b4', 'Il frappe le bronze. Ce n\'est pas du pardon. C\'est autre chose sans nom.', 'acte non résolu', false, 0),
        ],
        {
          character_thinks: 'Est-ce que je répare ou est-ce que je remplace',
          reader_knows: 'Il ne peut pas réparer ce qu\'il a perdu',
          tension_type: 'suppressed_emotion',
          implied_emotion: 'self-disgust',
        },
        560,
      ),
      canon: makeCanon('w4-c8', [
        'Marcus a les mains d\'un chirurgien — doigts longs, mouvements millimétrés',
        'Il n\'a jamais parlé de la mort de son patient à personne',
        'Chacune de ses sculptures est une main, un organe, un corps fragmenté',
      ]),
      continuity: makeContinuity(
        'Marcus est seul dans l\'atelier après une longue nuit de travail',
        'Marcus Delacroix',
        'hanté, vigilant',
        'atelier du port, nuit',
      ),
    },
  ];

  const selectedScenes = IS_MICRO ? SCENES.slice(0, 3) : SCENES;

  return selectedScenes.map((def, i) => {
    const plan = makePlan(
      `plan-w4-${i}`,
      def.s,
      def.s.emotion_target,
      def.s.emotion_intensity,
    );
    return makeInput(i, def.s, plan, def.canon, def.continuity);
  });
}

// ── Types ValidationPack ──────────────────────────────────────────────────────

interface WBenchRunRecord {
  readonly scene_index:  number;
  readonly scene_id:     string;
  readonly scene_label:  string;
  readonly archetype:    string;
  readonly seed:         string;
  readonly input_hash:   string;
  readonly output_hash:  string;
  readonly verdict:      'SEAL' | 'REJECT' | 'ERROR';
  readonly s_composite:  number;
  readonly s_axes:       Record<string, number>;
  readonly min_axis:     { name: string; value: number };
  readonly gate_enabled: boolean;
  readonly gate_stats:   { blocked: number; passed: number; total: number } | null;
  readonly elapsed_ms:   number;
  readonly error?:       string;
}

interface WBenchSummary {
  readonly mode:             string;
  readonly gate_enabled:     boolean;
  readonly scene_count:      number;
  readonly seal_count:       number;
  readonly seal_rate:        number;
  readonly reject_count:     number;
  readonly error_count:      number;
  readonly composite_median: number;
  readonly composite_mean:   number;
  readonly composite_min:    number;
  readonly composite_max:    number;
  readonly min_axis_global:  { name: string; value: number };
  readonly all_floors_green: boolean;
  readonly vs_baseline:      { baseline: number; delta: number; improved: boolean };
  readonly vs_target:        { target: number; reached: boolean };
  readonly per_scene:        Array<{
    scene_id: string; label: string; archetype: string;
    verdict: string; composite: number; min_axis: { name: string; value: number };
  }>;
}

interface WBenchConfig {
  readonly version:      string;
  readonly gate_enabled: boolean;
  readonly micro_mode:   boolean;
  readonly scene_count:  number;
  readonly model:        string;
  readonly git_head:     string;
  readonly root_seed:    string;
  readonly created_at:   string;
  readonly baseline:     number;
  readonly target:       number;
}

// ── Exécution scène ───────────────────────────────────────────────────────────

const SCENE_LABELS: Record<string, string> = {
  'w4-confrontation':    'Confrontation',
  'w4-elegie':           'Élégie',
  'w4-panique':          'Panique',
  'w4-contemplation':    'Contemplation',
  'w4-dialogue-tendu':   'Dialogue tendu',
  'w4-lyrique':          'Description lyrique',
  'w4-action':           'Action pure',
  'w4-monologue':        'Monologue intérieur',
};

const SCENE_ARCHETYPES: Record<string, string> = {
  'w4-confrontation':  'BRUTAL',
  'w4-elegie':         'INTERIOR',
  'w4-panique':        'BRUTAL',
  'w4-contemplation':  'SENSORY',
  'w4-dialogue-tendu': 'BALANCED',
  'w4-lyrique':        'CATHEDRAL',
  'w4-action':         'BRUTAL',
  'w4-monologue':      'INTERIOR',
};

async function runScene(
  input: ForgePacketInput,
  provider: SovereignProvider,
  seed: string,
): Promise<{
  verdict: 'SEAL' | 'REJECT' | 'ERROR';
  composite: number;
  axes: Record<string, number>;
  min_axis: { name: string; value: number };
  gate_stats: { blocked: number; passed: number; total: number } | null;
  prose: string;
  error?: string;
}> {
  try {
    const result = await runSovereignForge(input, provider);

    const axes: Record<string, number> = {};
    if (result.macro_score) {
      const ma = result.macro_score.macro_axes;
      axes['ECC'] = ma.ecc.score;
      axes['RCI'] = ma.rci.score;
      axes['SII'] = ma.sii.score;
      axes['IFI'] = ma.ifi.score;
      axes['AAI'] = ma.aai.score;
    }

    let minAxis = { name: 'unknown', value: 100 };
    for (const [name, value] of Object.entries(axes)) {
      if (value < minAxis.value) minAxis = { name, value };
    }

    let gateStats = null;
    // Note: microsurgery_report non exposé directement — on infère si possible
    // Le Damage Gate bloque les interventions dont le coût prédit dépasse le seuil.
    // Le report est dans les logs console de runSovereignForge.

    return {
      verdict: result.verdict,
      composite: result.s_score.composite,
      axes,
      min_axis: minAxis,
      gate_stats: gateStats,
      prose: result.final_prose,
    };
  } catch (err) {
    return {
      verdict: 'ERROR',
      composite: 0,
      axes: {},
      min_axis: { name: 'error', value: 0 },
      gate_stats: null,
      prose: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

// ── Write ValidationPack ──────────────────────────────────────────────────────

function writeWBenchPack(
  config: WBenchConfig,
  runs: WBenchRunRecord[],
  summary: WBenchSummary,
  outDir: string,
): string {
  const modeLabel  = config.gate_enabled ? 'gate-ON' : 'gate-OFF';
  const microLabel = config.micro_mode ? '_micro' : '';
  const dateStr    = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const dirName    = `BenchW_${modeLabel}${microLabel}_${dateStr}_${config.git_head}`;
  const packDir    = path.join(outDir, dirName);

  fs.mkdirSync(packDir, { recursive: true });

  fs.writeFileSync(path.join(packDir, 'config.json'),  JSON.stringify(config, null, 2));
  fs.writeFileSync(path.join(packDir, 'runs.jsonl'),   runs.map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(packDir, 'summary.json'), JSON.stringify(summary, null, 2));

  const files = ['config.json', 'runs.jsonl', 'summary.json'];
  const sums  = files.map(f => {
    const hash = createHash('sha256').update(fs.readFileSync(path.join(packDir, f))).digest('hex');
    return `${hash}  ${f}`;
  });
  fs.writeFileSync(path.join(packDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n');

  return packDir;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey?.trim()) {
    console.error('[FATAL] ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const gitHead    = getGitHead();
  const gateEnabled = !GATE_OFF;

  if (GATE_OFF) {
    process.env['OMEGA_DAMAGE_GATE_BYPASS'] = '1';
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA W-BENCH — Damage Gate Validation');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`[W-BENCH] HEAD=${gitHead}`);
  console.log(`[W-BENCH] Model: ${MODEL_ID}`);
  console.log(`[W-BENCH] Damage Gate: ${gateEnabled ? 'ON' : 'OFF (A/B bypass)'}`);
  console.log(`[W-BENCH] Mode: ${IS_MICRO ? 'MICRO (3 scènes)' : 'FULL (8 scènes)'}`);
  console.log(`[W-BENCH] Baseline: ${BASELINE_COMP} | Target: ${TARGET_COMP}`);
  console.log('');

  const inputs = buildInputs();
  console.log(`[W-BENCH] Built ${inputs.length} ForgePacketInputs`);

  const provider = createAnthropicProvider({
    apiKey,
    model: MODEL_ID,
    judgeStable: true,
    draftTemperature: 1.0,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 200,
  });

  console.log(`[W-BENCH] Starting execution — ${inputs.length} scenes...`);
  console.log(`[W-BENCH] Estimated: ~${inputs.length * 15}-${inputs.length * 25} API calls`);
  console.log('');

  const runs: WBenchRunRecord[]  = [];
  const startTotal = Date.now();

  for (let i = 0; i < inputs.length; i++) {
    const input    = inputs[i];
    const sceneId  = input.scene.scene_id;
    const label    = SCENE_LABELS[sceneId] ?? sceneId;
    const archetype = SCENE_ARCHETYPES[sceneId] ?? 'BALANCED';
    const seed     = sha256(`${ROOT_SEED}:w-bench:${i}`);
    const inputHash = sha256(JSON.stringify(input));

    console.log(`[SCENE ${i + 1}/${inputs.length}] ${label} (${archetype}) ...`);
    const startScene = Date.now();

    const result = await runScene(input, provider, seed);

    const elapsedMs  = Date.now() - startScene;
    const outputHash = sha256(result.prose || '');

    const record: WBenchRunRecord = {
      scene_index: i,
      scene_id:    sceneId,
      scene_label: label,
      archetype,
      seed,
      input_hash:  inputHash,
      output_hash: outputHash,
      verdict:     result.verdict,
      s_composite: result.composite,
      s_axes:      result.axes,
      min_axis:    result.min_axis,
      gate_enabled: gateEnabled,
      gate_stats:  result.gate_stats,
      elapsed_ms:  elapsedMs,
      error:       result.error,
    };

    runs.push(record);

    const icon = result.verdict === 'SEAL' ? '✅' : result.verdict === 'REJECT' ? '❌' : '💥';
    console.log(
      `  ${icon} ${result.verdict} | composite=${result.composite.toFixed(1)} ` +
      `| min_axis=${result.min_axis.name}:${result.min_axis.value.toFixed(1)} ` +
      `| ${(elapsedMs / 1000).toFixed(1)}s` +
      (result.error ? ` | ERROR: ${result.error}` : ''),
    );

    if (i < inputs.length - 1) await new Promise(r => setTimeout(r, 3000));
  }

  const totalElapsed = Math.round((Date.now() - startTotal) / 1000);

  // ── Summary ─────────────────────────────────────────────────────────────

  const composites  = runs.filter(r => r.verdict !== 'ERROR').map(r => r.s_composite);
  const sealRuns    = runs.filter(r => r.verdict === 'SEAL');
  const rejectRuns  = runs.filter(r => r.verdict === 'REJECT');
  const errorRuns   = runs.filter(r => r.verdict === 'ERROR');

  let globalMinAxis = { name: 'none', value: 100 };
  for (const r of runs.filter(r => r.verdict !== 'ERROR')) {
    if (r.min_axis.value < globalMinAxis.value) globalMinAxis = r.min_axis;
  }

  const compMedian = median(composites);
  const compMean   = mean(composites);
  const compMin    = composites.length > 0 ? Math.min(...composites) : 0;
  const compMax    = composites.length > 0 ? Math.max(...composites) : 0;

  const allFloorsGreen = runs
    .filter(r => r.verdict !== 'ERROR')
    .every(r => r.min_axis.value >= TARGET_FLOOR);

  const summary: WBenchSummary = {
    mode:             IS_MICRO ? 'micro' : 'full',
    gate_enabled:     gateEnabled,
    scene_count:      inputs.length,
    seal_count:       sealRuns.length,
    seal_rate:        inputs.length > 0 ? sealRuns.length / inputs.length : 0,
    reject_count:     rejectRuns.length,
    error_count:      errorRuns.length,
    composite_median: compMedian,
    composite_mean:   compMean,
    composite_min:    compMin,
    composite_max:    compMax,
    min_axis_global:  globalMinAxis,
    all_floors_green: allFloorsGreen,
    vs_baseline: {
      baseline: BASELINE_COMP,
      delta:    compMedian - BASELINE_COMP,
      improved: compMedian > BASELINE_COMP,
    },
    vs_target: {
      target:  TARGET_COMP,
      reached: compMedian >= TARGET_COMP && allFloorsGreen,
    },
    per_scene: runs.map(r => ({
      scene_id:  r.scene_id,
      label:     r.scene_label,
      archetype: r.archetype,
      verdict:   r.verdict,
      composite: r.s_composite,
      min_axis:  r.min_axis,
    })),
  };

  // ── Output ──────────────────────────────────────────────────────────────

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  W-BENCH RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Gate:          ${gateEnabled ? 'ON' : 'OFF'}`);
  console.log(`  Scenes:        ${inputs.length}`);
  console.log(`  SEAL:          ${sealRuns.length}/${inputs.length} (${(summary.seal_rate * 100).toFixed(1)}%)`);
  console.log(`  REJECT:        ${rejectRuns.length}`);
  console.log(`  ERROR:         ${errorRuns.length}`);
  console.log(`  Composite:     median=${compMedian.toFixed(1)} mean=${compMean.toFixed(1)} [${compMin.toFixed(1)}..${compMax.toFixed(1)}]`);
  console.log(`  Min axis:      ${globalMinAxis.name}=${globalMinAxis.value.toFixed(1)}`);
  console.log(`  All floors ≥${TARGET_FLOOR}: ${allFloorsGreen ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  vs baseline:   ${compMedian.toFixed(1)} vs ${BASELINE_COMP} → Δ=${summary.vs_baseline.delta > 0 ? '+' : ''}${summary.vs_baseline.delta.toFixed(1)}`);
  console.log(`  vs target:     ${summary.vs_target.reached ? 'REACHED ✅' : 'NOT REACHED ❌'}`);
  console.log(`  Duration:      ${totalElapsed}s`);
  console.log('');

  console.log('  Per-scene:');
  for (const r of runs) {
    const icon = r.verdict === 'SEAL' ? '✅' : r.verdict === 'REJECT' ? '❌' : '💥';
    console.log(
      `    ${icon} ${r.scene_label.padEnd(22)} ${r.archetype.padEnd(10)} ` +
      `comp=${r.s_composite.toFixed(1).padStart(5)} ` +
      `min=${r.min_axis.name}:${r.min_axis.value.toFixed(1)}`,
    );
  }

  // ── Write pack ──────────────────────────────────────────────────────────

  const config: WBenchConfig = {
    version:      '2.0.0',
    gate_enabled: gateEnabled,
    micro_mode:   IS_MICRO,
    scene_count:  inputs.length,
    model:        MODEL_ID,
    git_head:     gitHead,
    root_seed:    ROOT_SEED,
    created_at:   new Date().toISOString(),
    baseline:     BASELINE_COMP,
    target:       TARGET_COMP,
  };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const packDir = writeWBenchPack(config, runs, summary, OUT_DIR);

  console.log('');
  console.log(`[W-BENCH] ValidationPack: ${packDir}`);
  console.log('[W-BENCH] SHA256SUMS.txt: OK');

  // ── Verdict ─────────────────────────────────────────────────────────────

  if (summary.vs_target.reached) {
    console.log('');
    console.log('🏆 W-BENCH VERDICT: TARGET REACHED — composite ≥ 93.0, ALL FLOORS GREEN');
    console.log('   → Phase W SEAL candidat. Comparaison A/B gate ON vs OFF requise.');
  } else if (summary.vs_baseline.improved) {
    console.log('');
    console.log('📈 W-BENCH VERDICT: IMPROVED vs baseline — target non atteint');
    console.log(`   → Δ = +${summary.vs_baseline.delta.toFixed(1)} vs Phase V (${BASELINE_COMP})`);
    console.log('   → Sprint W.INT-5 requis (raffinements)');
  } else if (errorRuns.length === inputs.length) {
    console.log('');
    console.log('💥 W-BENCH VERDICT: ALL ERRORS — vérifier configuration pipeline');
    process.exit(2);
  } else {
    console.log('');
    console.log('⚠️  W-BENCH VERDICT: NO IMPROVEMENT — diagnostic requis');
    console.log('   → Analyser les runs REJECT/ERROR, vérifier gate stats');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
