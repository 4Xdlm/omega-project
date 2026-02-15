/**
 * OMEGA Forge — Trajectory Analyzer
 * Phase C.5 — Omega_target(t) vs Omega_actual(t) -> Delta_Omega(t)
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  IntentPack, GenesisPlan, StyledParagraph,
  CanonicalEmotionTable, F5Config,
  ParagraphEmotionState, PrescribedState, TrajectoryDeviation,
  TrajectoryAnalysis, EmotionState14D, Emotion14,
} from '../types.js';
import { EMOTION_14_KEYS } from '../types.js';
import { cosineSimilarity14D, euclideanDistance14D, vadDistance, computeValence, computeArousal, dominantEmotion, singleEmotionState } from './emotion-space.js';
import { toOmegaState } from './omega-state.js';
import { resolveF5ConfigValue } from '../config.js';

/** Extract emotion keywords from paragraph text */
const EMOTION_KEYWORDS: Readonly<Record<Emotion14, readonly string[]>> = {
  joy: ['joy', 'happy', 'delight', 'laugh', 'smile', 'warmth', 'elation', 'cheer', 'bliss', 'glee', 'jubilant'],
  trust: ['trust', 'faith', 'believe', 'rely', 'confident', 'safe', 'secure', 'loyal', 'steady', 'assurance'],
  fear: ['fear', 'terror', 'dread', 'panic', 'fright', 'horror', 'anxiety', 'afraid', 'tremble', 'shudder', 'dark', 'shadow', 'creep'],
  surprise: ['surprise', 'shock', 'astonish', 'unexpected', 'sudden', 'gasp', 'startle', 'stun', 'jolt', 'revelation'],
  sadness: ['sad', 'sorrow', 'grief', 'mourn', 'weep', 'cry', 'loss', 'melancholy', 'despair', 'lonely', 'ache'],
  disgust: ['disgust', 'revulsion', 'repulse', 'nausea', 'loathe', 'abhor', 'vile', 'foul', 'putrid', 'recoil'],
  anger: ['anger', 'rage', 'fury', 'wrath', 'hostile', 'furious', 'bitter', 'resent', 'seethe', 'burn', 'violent'],
  anticipation: ['anticipation', 'expect', 'await', 'hope', 'eager', 'watchful', 'ready', 'prepare', 'yearn', 'suspense'],
  love: ['love', 'adore', 'cherish', 'devotion', 'tender', 'embrace', 'affection', 'intimate', 'beloved', 'passion'],
  submission: ['submit', 'yield', 'obey', 'surrender', 'defer', 'comply', 'accept', 'resign', 'bow', 'passive'],
  awe: ['awe', 'wonder', 'marvel', 'magnificent', 'sublime', 'vast', 'profound', 'transcend', 'majestic', 'overwhelm'],
  disapproval: ['disapprove', 'reject', 'refuse', 'deny', 'condemn', 'criticize', 'oppose', 'object', 'scorn', 'disdain'],
  remorse: ['remorse', 'regret', 'guilt', 'shame', 'sorry', 'repent', 'atone', 'contrite', 'blame', 'fault'],
  contempt: ['contempt', 'scorn', 'disdain', 'mock', 'deride', 'sneer', 'belittle', 'dismiss', 'arrogant', 'superior'],
};

/**
 * FR emotion keywords — STEM-based for conjugation coverage.
 * All entries are NFKD-normalized (no diacritics).
 * Uses short stems so startsWith() catches conjugated forms:
 *   "trembl" matches tremblait/tremblant/tremblement/trembler
 *   "pleur" matches pleurait/pleurs/pleurais
 * Also includes literary/evocative terms for premium FR prose.
 */
const EMOTION_KEYWORDS_FR: Readonly<Record<Emotion14, readonly string[]>> = {
  joy: ['joie', 'heureux', 'heureuse', 'souri', 'rire', 'jubil', 'content', 'ravis', 'plaisir',
    'enchant', 'allegresse', 'bonheur', 'felicit', 'epanoui', 'radieux', 'radieuse',
    'luminos', 'eclat', 'rejou', 'exult', 'delectat', 'savour'],
  trust: ['confian', 'fier', 'fiere', 'serein', 'sereine', 'apais', 'assuran', 'foi', 'loyal',
    'stable', 'securit', 'certitud', 'ancr', 'enracin', 'socle', 'fondation', 'solidit',
    'fidel', 'fiable', 'robuste', 'constance', 'immuabl', 'inebranl', 'aplomb'],
  fear: ['peur', 'effroi', 'terreur', 'paniqu', 'angoiss', 'inquiet', 'crain', 'menac', 'trembl',
    'frayeur', 'epouvant', 'ombr', 'tenebr', 'abim', 'gouffr', 'vertig', 'frisson',
    'redout', 'horrif', 'effray', 'anxieu', 'obscur', 'sinistr', 'hant'],
  surprise: ['surpris', 'stupeu', 'etonn', 'choc', 'soudain', 'brusqu', 'inattendu', 'abasourdi',
    'stupefai', 'sursaut', 'ahuri', 'sidere', 'boulevers', 'interdite', 'interdits',
    'decontenanc', 'ebahi', 'medus', 'renvers'],
  sadness: ['triste', 'chagrin', 'melanc', 'pleur', 'larme', 'abattu', 'abattue', 'deuil',
    'douleur', 'solitud', 'desespo', 'peine', 'afflict', 'accabl', 'cendr', 'eros',
    'absenc', 'vide', 'perd', 'disparu', 'oubli', 'effac', 'nostalg', 'soupi'],
  disgust: ['degout', 'repuls', 'ecoeur', 'nausee', 'immond', 'infect', 'pourri', 'rance',
    'rebut', 'repugn', 'aversi', 'abject', 'fetid', 'puant', 'corromp', 'souill',
    'immondice', 'sordid', 'ignobl'],
  anger: ['coler', 'rage', 'fureur', 'furieu', 'haine', 'agacem', 'irrit', 'explos', 'emport',
    'hostil', 'rancoe', 'rancun', 'viol', 'brutal', 'destruct', 'vindic',
    'hargneu', 'feroce', 'incendi', 'dechai', 'fulmin'],
  anticipation: ['attent', 'anticip', 'pressent', 'prevoi', 'imminen', 'prepar', 'espoir',
    'apprehens', 'guett', 'impatien', 'suspens', 'vigilan', 'surveill', 'presag',
    'augur', 'bientot', 'prochain', 'approch', 'avenir'],
  love: ['amour', 'aimer', 'tendress', 'affection', 'cherir', 'desir', 'passion', 'intim',
    'enlac', 'chaleur', 'devou', 'adorat', 'etreint', 'caress', 'paume', 'ardeur',
    'embras', 'proximite', 'union', 'lien', 'attache', 'douceur', 'proteg'],
  submission: ['soumiss', 'obeir', 'docil', 'ceder', 'plier', 'capitul', 'consenti', 'subir',
    'resign', 'accept', 'abdiqu', 'effac', 'inclin', 'courb', 'prostern', 'humili'],
  awe: ['admirat', 'reveren', 'sublim', 'vertig', 'grandios', 'sacr', 'fascin', 'epoustoufl',
    'majest', 'emerveil', 'immens', 'infini', 'demesur', 'transcend', 'mystere',
    'prodig', 'splend', 'magnifi', 'extraordin'],
  disapproval: ['desapprob', 'reproch', 'blam', 'condemn', 'critiqu', 'mepris', 'desaccord',
    'severit', 'reprimand', 'censur', 'desavou', 'oppos', 'protest', 'refus',
    'rejet', 'rebuff', 'object'],
  remorse: ['remord', 'regret', 'culpabil', 'honte', 'pardonn', 'excus', 'repent', 'faute',
    'desol', 'contrit', 'expiat', 'rachet', 'autopunit', 'reproch',
    'tortur', 'ronge', 'pesant'],
  contempt: ['mepris', 'dedain', 'ironi', 'sarcasm', 'condescend', 'rican', 'rabaiss',
    'insignifi', 'minabl', 'derision', 'hautain', 'arrog', 'suffisan',
    'toiser', 'narquoi', 'cingl', 'morgue'],
};

/**
 * Normalize a word for emotion matching: strip diacritics, lowercase, letters only.
 * "colère" → "colere", "dégoût" → "degout", "mémoire" → "memoire"
 */
function normalizeToken(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/** Analyze emotion from paragraph text using keyword matching.
 *  Supports FR and EN via language parameter.
 *  Default 'auto' = union EN+FR (backward compatible). */
export function analyzeEmotionFromText(text: string, language: 'fr' | 'en' | 'auto' = 'auto'): EmotionState14D {
  const words = text.split(/\s+/);

  const counts: Record<string, number> = {};
  for (const key of EMOTION_14_KEYS) {
    counts[key] = 0;
  }

  // Select keyword tables based on language
  const tables: Readonly<Record<Emotion14, readonly string[]>>[] = [];
  if (language === 'en' || language === 'auto') tables.push(EMOTION_KEYWORDS);
  if (language === 'fr' || language === 'auto') tables.push(EMOTION_KEYWORDS_FR);

  for (const word of words) {
    const cleaned = normalizeToken(word);
    if (cleaned.length === 0) continue;
    for (const key of EMOTION_14_KEYS) {
      let matched = false;
      for (const table of tables) {
        for (const kw of table[key]) {
          if (cleaned === kw || cleaned.startsWith(kw)) {
            counts[key]++;
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
  }

  const maxCount = Math.max(1, ...Object.values(counts));
  const state: Record<string, number> = {};
  for (const key of EMOTION_14_KEYS) {
    state[key] = Math.min(1, counts[key] / maxCount);
  }

  return state as EmotionState14D;
}

/**
 * Core trajectory builder — private, shared by all public wrappers.
 * @param waypoints — emotion waypoints to interpolate
 * @param totalParagraphs — number of paragraphs to generate
 * @param table — canonical emotion table
 * @param C — persistence ceiling
 * @param positionMapper — maps local position [0,1] to global position
 */
function buildTrajectoryFromWaypoints(
  waypoints: readonly { readonly position: number; readonly emotion: string; readonly intensity: number }[],
  totalParagraphs: number,
  table: CanonicalEmotionTable,
  C: number,
  positionMapper: (localPos: number) => number,
): readonly PrescribedState[] {
  if (waypoints.length === 0 || totalParagraphs === 0) return [];

  const states: PrescribedState[] = [];

  for (let i = 0; i < totalParagraphs; i++) {
    const localPosition = totalParagraphs > 1 ? i / (totalParagraphs - 1) : 0;
    const globalPosition = positionMapper(localPosition);

    let prevWP = waypoints[0];
    let nextWP = waypoints[waypoints.length - 1];
    for (let w = 0; w < waypoints.length - 1; w++) {
      if (waypoints[w].position <= globalPosition && waypoints[w + 1].position >= globalPosition) {
        prevWP = waypoints[w];
        nextWP = waypoints[w + 1];
        break;
      }
    }

    const range = nextWP.position - prevWP.position;
    const t = range > 0 ? (globalPosition - prevWP.position) / range : 0;
    const intensity = prevWP.intensity + t * (nextWP.intensity - prevWP.intensity);

    const emotionName = t < 0.5 ? prevWP.emotion : nextWP.emotion;
    const emotion14 = EMOTION_14_KEYS.includes(emotionName as Emotion14)
      ? (emotionName as Emotion14)
      : 'anticipation';

    const target_14d = singleEmotionState(emotion14, Math.min(1, intensity));
    const target_omega = toOmegaState(target_14d, table, C);

    states.push({
      paragraph_index: i,
      target_14d,
      target_omega,
      source: `waypoint_interpolation[${prevWP.position.toFixed(3)}-${nextWP.position.toFixed(3)}]`,
    });
  }

  return states;
}

/** Build prescribed trajectory from IntentPack emotion targets + GenesisPlan */
export function buildPrescribedTrajectory(
  intent: IntentPack,
  _plan: GenesisPlan,
  totalParagraphs: number,
  table: CanonicalEmotionTable,
  C: number,
): readonly PrescribedState[] {
  const waypoints = intent.emotion.waypoints;
  return buildTrajectoryFromWaypoints(
    waypoints,
    totalParagraphs,
    table,
    C,
    (localPos) => localPos, // identity — global trajectory
  );
}

/** Build prescribed trajectory for a specific scene range.
 *  Used by sovereign-engine to get scene-scoped trajectory WITH XYZ. */
export function buildScenePrescribedTrajectory(
  waypoints: readonly { readonly position: number; readonly emotion: string; readonly intensity: number }[],
  sceneStartPct: number,
  sceneEndPct: number,
  totalParagraphs: number,
  table: CanonicalEmotionTable,
  C: number,
): readonly PrescribedState[] {
  // Filter waypoints in scene range (or use full set)
  const sceneWaypoints = waypoints.filter(
    (wp) => wp.position >= sceneStartPct && wp.position <= sceneEndPct,
  );

  // Fallback: if no waypoints in range, use nearest
  const effectiveWaypoints = sceneWaypoints.length >= 2
    ? sceneWaypoints
    : waypoints;

  return buildTrajectoryFromWaypoints(
    effectiveWaypoints,
    totalParagraphs,
    table,
    C,
    (localPos) => sceneStartPct + localPos * (sceneEndPct - sceneStartPct), // lerp
  );
}

/** Build actual trajectory from styled paragraphs */
export function buildActualTrajectory(
  paragraphs: readonly StyledParagraph[],
  table: CanonicalEmotionTable,
  C: number,
): readonly ParagraphEmotionState[] {
  return paragraphs.map((p, index) => {
    const state_14d = analyzeEmotionFromText(p.text);
    const omega_state = toOmegaState(state_14d, table, C);
    return {
      paragraph_index: index,
      paragraph_hash: sha256(p.text),
      state_14d,
      omega_state,
      dominant_emotion: dominantEmotion(state_14d),
      valence: computeValence(state_14d),
      arousal: computeArousal(state_14d),
    };
  });
}

/** Compute deviations between prescribed and actual trajectories */
export function computeDeviations(
  prescribed: readonly PrescribedState[],
  actual: readonly ParagraphEmotionState[],
  config: F5Config,
): TrajectoryAnalysis {
  const tauCos = resolveF5ConfigValue(config.TAU_COSINE_DEVIATION);
  const tauEuc = resolveF5ConfigValue(config.TAU_EUCLIDEAN_DEVIATION);
  const tauVad = resolveF5ConfigValue(config.TAU_VAD_DEVIATION);

  const deviations: TrajectoryDeviation[] = [];
  let totalCos = 0;
  let totalEuc = 0;
  let maxDevIdx = 0;
  let maxDevVal = 0;

  const count = Math.min(prescribed.length, actual.length);

  for (let i = 0; i < count; i++) {
    const p = prescribed[i];
    const a = actual[i];

    const cosDist = 1 - cosineSimilarity14D(p.target_14d, a.state_14d);
    const eucDist = euclideanDistance14D(p.target_14d, a.state_14d);
    const vDist = vadDistance(p.target_omega, a.omega_state);

    const compliant = cosDist <= tauCos && eucDist <= tauEuc && vDist <= tauVad;

    const totalDev = cosDist + eucDist + vDist;
    if (totalDev > maxDevVal) {
      maxDevVal = totalDev;
      maxDevIdx = i;
    }

    totalCos += cosDist;
    totalEuc += eucDist;

    deviations.push({
      paragraph_index: i,
      cosine_distance: cosDist,
      euclidean_distance: eucDist,
      vad_distance: vDist,
      delta_X: a.omega_state.X - p.target_omega.X,
      delta_Y: a.omega_state.Y - p.target_omega.Y,
      delta_Z: a.omega_state.Z - p.target_omega.Z,
      compliant,
    });
  }

  const compliantCount = deviations.filter((d) => d.compliant).length;

  const hashInput = {
    paragraph_count: actual.length,
    prescribed_count: prescribed.length,
    avg_cosine: count > 0 ? totalCos / count : 0,
    compliant_ratio: count > 0 ? compliantCount / count : 1,
  };

  return {
    paragraph_states: actual,
    prescribed_states: prescribed,
    deviations,
    avg_cosine_distance: count > 0 ? totalCos / count : 0,
    avg_euclidean_distance: count > 0 ? totalEuc / count : 0,
    max_deviation_index: maxDevIdx,
    compliant_ratio: count > 0 ? compliantCount / count : 1,
    trajectory_hash: sha256(canonicalize(hashInput)),
  };
}
