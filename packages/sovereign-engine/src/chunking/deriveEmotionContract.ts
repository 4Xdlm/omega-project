/**
 * OMEGA V2.3-A P0 — deriveEmotionContractFromSegment (ANALYSE PURE, ISOLÉE)
 *
 * Traduit un segment de prose source en `EmotionContract` candidat, pour le futur
 * mode RÉÉCRITURE/EXPANSION (couplage chunking→génération, ADR_V2_3 Option B).
 *
 * CONTRAT D'ISOLEMENT (Tribunal 3/3 GO_CODE 2026-05-29) :
 *   - Analyse CALC PURE : zéro LLM, zéro Ollama, zéro réseau, zéro état global.
 *   - Déterministe : même segment normalisé → même candidate → même segment_hash.
 *   - Ne MODIFIE pas EmotionContract (src/types.ts), ne touche PAS generation/ ni
 *     adaptive-chunker, n'importe RIEN de generation/ (archetype non produit ici —
 *     dérivé downstream par detectArchetype). Cloison stricte vs scoring V3.4.
 *   - Emotion14 : `target_14d` = GARAGE/DORMANT (NCR_EMOTION14_CANON_DRIFT 2026-05-05,
 *     Codex v1.3.1 §294). NON peuplé → `{}` neutre structurel. FORBID-CANON-GARAGE-001
 *     respecté (aucun refactor du canon dormant, aucune résurrection).
 *
 * Réutilise les extracteurs CALC existants (chunking/detector/features.ts) :
 *   featureIntensity (arousal), extractSentiment (valence), determineDominantEmotion,
 *   featureDistance (rupture / change-point). Distinction cardinale Codex §281 :
 *   « émotion keyword morte » ≠ « émotion débranchée » → la physique de l'émotion
 *   (intensité/valence/dominance déduites du rythme/lexique) reste légitime.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A — Sprint V2.3-A P0 2026-05-29
 */

import { createHash } from 'node:crypto';
import type {
  EmotionContract,
  EmotionQuartile,
  TensionTargets,
  EmotionTerminal,
  EmotionRupture,
  ValenceArc,
} from '../types.js';
import {
  extractFeatures,
  featureIntensity,
  extractSentiment,
  determineDominantEmotion,
  featureDistance,
} from './detector/features.js';
import { splitSentences } from './detector/sentences.js';

// ============================================================
// Constantes nommées (anti magic-numbers — correction Tribunal #1)
// ============================================================
export const MIN_SEGMENT_WORDS = 50;
export const MAX_DEFAULT_FIELD_RATIO = 0.30;
export const MIN_AROUSAL_CURVE_RANK_CORRELATION = 0.8;
export const SILENCE_INTENSITY_PERCENTILE = 0.25;
export const RUPTURE_DISTANCE_THRESHOLD = 0.3; // = EmotionalArcDetector default intensity_threshold
export const AROUSAL_SCALE = 2; // = EmotionalArcDetector : min(1, featureIntensity * 2)
export const FLAT_CURVE_EPSILON = 0.05; // amplitude quartile arousal sous laquelle la courbe est "plate"
export const VALENCE_ARC_EPSILON = 0.05;

// ============================================================
// Warning codes stables (correction Tribunal #2 — pas de string libre en logique)
// ============================================================
export type WarningCode =
  | 'SHORT_SEGMENT'
  | 'FLAT_CURVE_FALLBACK'
  | 'LANG_FALLBACK_FR'
  | 'EMOTION14_RUNTIME_DORMANT'
  | 'NARRATIVE_INSTRUCTION_TEMPLATED'
  | 'LOW_CONFIDENCE';

export type FieldProvenance = 'DERIVED' | 'DEFAULT' | 'LOW_CONFIDENCE';

export interface EmotionContractCandidate {
  readonly contract: EmotionContract;
  readonly confidence: number; // [0,1]
  readonly field_provenance: Readonly<Record<string, FieldProvenance>>;
  readonly evidence: Readonly<Record<string, number | string>>;
  readonly warning_codes: readonly WarningCode[];
  readonly warnings: readonly string[]; // messages humains (dérivés des codes, optionnels)
  readonly segment_hash: string; // SHA256 du segment normalisé → déterminisme
}

export interface DeriveOptions {
  readonly lang?: 'fr' | 'en';
}

/** EmotionContract.curve_quartiles est un tuple FIXE de 4 (Q1-Q4). Non configurable. */
const QUARTILE_BINS = 4;

// ============================================================
// Helpers purs
// ============================================================
function normalizeSegment(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function arousalOf(text: string): number {
  return Math.min(1, featureIntensity(extractFeatures(text)) * AROUSAL_SCALE);
}
function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(Math.floor(q * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx]!;
}
function argExtreme(xs: readonly number[], kind: 'max' | 'min'): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) {
    if (kind === 'max' ? xs[i]! > xs[best]! : xs[i]! < xs[best]!) best = i;
  }
  return best;
}
function posPct(index: number, n: number): number {
  return n <= 1 ? 0 : Math.round((index / (n - 1)) * 1000) / 10;
}
/** Découpe N indices en `bins` groupes contigus quasi-égaux (≥1 chacun si possible). */
function binIndices(n: number, bins: number): number[][] {
  const groups: number[][] = Array.from({ length: bins }, () => []);
  if (n === 0) return groups;
  for (let i = 0; i < n; i++) {
    const b = Math.min(bins - 1, Math.floor((i / n) * bins));
    groups[b]!.push(i);
  }
  // bins vides (n < bins) : refléter le dernier index connu pour éviter un quartile vide
  let lastNonEmpty = 0;
  for (let b = 0; b < bins; b++) {
    if (groups[b]!.length === 0) groups[b]!.push(Math.min(lastNonEmpty, n - 1));
    else lastNonEmpty = groups[b]![groups[b]!.length - 1]!;
  }
  return groups;
}

// ============================================================
// Dérivation principale
// ============================================================
export function deriveEmotionContractFromSegment(
  segment: string,
  opts: DeriveOptions = {}
): EmotionContractCandidate {
  const normalized = normalizeSegment(segment);
  const segment_hash = createHash('sha256').update(normalized).digest('hex');
  const words = normalized.length === 0 ? [] : normalized.split(' ');
  const wordCount = words.length;

  const warningCodes = new Set<WarningCode>();
  const provenance: Record<string, FieldProvenance> = {};

  // Langue : non utilisée pour la dérivation lexicale FR par défaut ; fallback documenté.
  if (opts.lang === undefined || opts.lang === 'fr') {
    if (opts.lang === undefined) warningCodes.add('LANG_FALLBACK_FR');
  }

  // target_14d dormant (Emotion14 GARAGE/DORMANT) — jamais peuplé.
  warningCodes.add('EMOTION14_RUNTIME_DORMANT');
  warningCodes.add('NARRATIVE_INSTRUCTION_TEMPLATED');

  const short = wordCount < MIN_SEGMENT_WORDS;
  if (short) warningCodes.add('SHORT_SEGMENT');

  // Courbe par phrase
  const sentences = splitSentences(normalized);
  const sents = sentences.length > 0 ? sentences : [normalized || ' '];
  const arousalCurve = sents.map((s) => arousalOf(s));
  const valenceCurve = sents.map((s) => clamp(extractSentiment(s), -1, 1));
  const n = sents.length;

  // Quartiles
  const groups = binIndices(n, QUARTILE_BINS);
  const quartileLabels = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
  const quartileArousal: number[] = [];
  const quartileValence: number[] = [];
  const q4arr: EmotionQuartile[] = groups.map((idxs, qi): EmotionQuartile => {
    const text = idxs.map((i) => sents[i]!).join(' ');
    const f = extractFeatures(text);
    const arousal = Math.min(1, featureIntensity(f) * AROUSAL_SCALE);
    const valence = clamp(f.sentiment, -1, 1);
    const dominant = determineDominantEmotion(f);
    quartileArousal.push(arousal);
    quartileValence.push(valence);
    return {
      quartile: quartileLabels[Math.min(qi, 3)]!,
      target_14d: {}, // GARAGE/DORMANT — non peuplé (FORBID-CANON-GARAGE-001)
      valence,
      arousal,
      dominant,
      narrative_instruction: `[CALC] dominant=${dominant}, arousal=${arousal.toFixed(2)} (gabarit déterministe — texte libre non dérivé)`,
    };
  });
  const curve_quartiles: EmotionContract['curve_quartiles'] = [
    q4arr[0]!,
    q4arr[1]!,
    q4arr[2]!,
    q4arr[3]!,
  ];

  provenance['curve_quartiles.arousal'] = 'DERIVED';
  provenance['curve_quartiles.valence'] = 'DERIVED';
  provenance['curve_quartiles.dominant'] = 'DERIVED';
  provenance['curve_quartiles.target_14d'] = 'DEFAULT';
  provenance['curve_quartiles.narrative_instruction'] = 'DEFAULT';

  // intensity_range
  const intensity_range = {
    min: arousalCurve.length ? Math.min(...arousalCurve) : 0,
    max: arousalCurve.length ? Math.max(...arousalCurve) : 0,
  };
  provenance['intensity_range'] = 'DERIVED';

  // tension.slope_target (mono-ton → 'arc' neutre + FLAT_CURVE_FALLBACK, jamais faux 'ascending')
  const qaMin = Math.min(...quartileArousal);
  const qaMax = Math.max(...quartileArousal);
  let slope_target: TensionTargets['slope_target'];
  if (qaMax - qaMin < FLAT_CURVE_EPSILON) {
    slope_target = 'arc';
    warningCodes.add('FLAT_CURVE_FALLBACK');
  } else {
    const q1 = quartileArousal[0]!;
    const q4 = quartileArousal[quartileArousal.length - 1]!;
    const peakIdx = argExtreme(quartileArousal, 'max');
    const troughIdx = argExtreme(quartileArousal, 'min');
    const interiorPeak = peakIdx > 0 && peakIdx < quartileArousal.length - 1;
    const interiorTrough = troughIdx > 0 && troughIdx < quartileArousal.length - 1;
    if (interiorPeak && qaMax - Math.max(q1, q4) >= FLAT_CURVE_EPSILON) slope_target = 'arc';
    else if (interiorTrough && Math.min(q1, q4) - qaMin >= FLAT_CURVE_EPSILON)
      slope_target = 'reverse_arc';
    else if (q4 > q1) slope_target = 'ascending';
    else slope_target = 'descending';
  }

  const picIdx = argExtreme(arousalCurve, 'max');
  const failleIdx = argExtreme(arousalCurve, 'min');
  // silence_zones : spans contigus sous le percentile bas d'arousal
  const sortedArousal = [...arousalCurve].sort((a, b) => a - b);
  const silenceThreshold = quantile(sortedArousal, SILENCE_INTENSITY_PERCENTILE);
  const silence_zones: { start_pct: number; end_pct: number }[] = [];
  let runStart = -1;
  for (let i = 0; i < n; i++) {
    const low = arousalCurve[i]! <= silenceThreshold;
    if (low && runStart < 0) runStart = i;
    if ((!low || i === n - 1) && runStart >= 0) {
      const end = low ? i : i - 1;
      silence_zones.push({ start_pct: posPct(runStart, n), end_pct: posPct(end, n) });
      runStart = -1;
    }
  }
  const tension: TensionTargets = {
    slope_target,
    pic_position_pct: posPct(picIdx, n),
    faille_position_pct: posPct(failleIdx, n),
    silence_zones,
  };
  provenance['tension.slope_target'] = 'DERIVED';
  provenance['tension.pic_position_pct'] = 'DERIVED';
  provenance['tension.faille_position_pct'] = 'DERIVED';
  provenance['tension.silence_zones'] = 'DERIVED';

  // rupture : plus grande distance feature entre phrases consécutives
  let maxDist = 0;
  let ruptureIdx = 0;
  for (let i = 1; i < n; i++) {
    const d = featureDistance(extractFeatures(sents[i - 1]!), extractFeatures(sents[i]!));
    if (d > maxDist) {
      maxDist = d;
      ruptureIdx = i;
    }
  }
  const ruptureExists = maxDist >= RUPTURE_DISTANCE_THRESHOLD && n >= 2;
  const rupture: EmotionRupture = {
    exists: ruptureExists,
    position_pct: posPct(ruptureIdx, n),
    before_dominant: determineDominantEmotion(extractFeatures(sents[Math.max(0, ruptureIdx - 1)]!)),
    after_dominant: determineDominantEmotion(extractFeatures(sents[ruptureIdx]!)),
    delta_valence:
      clamp(extractSentiment(sents[ruptureIdx]!), -1, 1) -
      clamp(extractSentiment(sents[Math.max(0, ruptureIdx - 1)]!), -1, 1),
  };
  provenance['rupture'] = 'DERIVED';

  // valence_arc
  const vStart = quartileValence[0]!;
  const vEnd = quartileValence[quartileValence.length - 1]!;
  let signChanges = 0;
  for (let i = 1; i < quartileValence.length; i++) {
    if (Math.sign(quartileValence[i]!) !== Math.sign(quartileValence[i - 1]!)) signChanges++;
  }
  let direction: ValenceArc['direction'];
  if (signChanges >= 2) direction = 'oscillating';
  else if (vEnd - vStart > VALENCE_ARC_EPSILON) direction = 'brightening';
  else if (vStart - vEnd > VALENCE_ARC_EPSILON) direction = 'darkening';
  else direction = 'stable';
  const valence_arc: ValenceArc = { start: vStart, end: vEnd, direction };
  provenance['valence_arc'] = 'DERIVED';

  // terminal_state (dernière phrase)
  const lastText = sents[n - 1]!;
  const lastF = extractFeatures(lastText);
  const terminalDominant = determineDominantEmotion(lastF);
  const terminal_state: EmotionTerminal = {
    target_14d: {}, // GARAGE/DORMANT
    valence: clamp(lastF.sentiment, -1, 1),
    arousal: Math.min(1, featureIntensity(lastF) * AROUSAL_SCALE),
    dominant: terminalDominant,
    reader_state: `[CALC] état terminal ${terminalDominant} (gabarit déterministe — texte libre non dérivé)`,
  };
  provenance['terminal_state.valence'] = 'DERIVED';
  provenance['terminal_state.arousal'] = 'DERIVED';
  provenance['terminal_state.dominant'] = 'DERIVED';
  provenance['terminal_state.target_14d'] = 'DEFAULT';
  provenance['terminal_state.reader_state'] = 'DEFAULT';

  const contract: EmotionContract = {
    curve_quartiles,
    intensity_range,
    tension,
    terminal_state,
    rupture,
    valence_arc,
  };

  // Confiance = 1 - ratio de champs DEFAULT ; pénalité segment court.
  const provKeys = Object.keys(provenance);
  const defaultCount = provKeys.filter((k) => provenance[k] === 'DEFAULT').length;
  const defaultRatio = provKeys.length ? defaultCount / provKeys.length : 1;
  let confidence = Math.round((1 - defaultRatio) * 100) / 100;
  if (short) confidence = Math.min(confidence, 0.4);
  if (defaultRatio > MAX_DEFAULT_FIELD_RATIO || confidence < 0.5) warningCodes.add('LOW_CONFIDENCE');

  const codeMessages: Record<WarningCode, string> = {
    SHORT_SEGMENT: `segment court (${wordCount} mots < ${MIN_SEGMENT_WORDS})`,
    FLAT_CURVE_FALLBACK: "courbe d'arousal plate → slope_target='arc' neutre (pas de faux 'ascending')",
    LANG_FALLBACK_FR: 'langue non spécifiée → lexique FR par défaut',
    EMOTION14_RUNTIME_DORMANT: 'target_14d non peuplé (Emotion14 GARAGE/DORMANT, FORBID-CANON-GARAGE-001)',
    NARRATIVE_INSTRUCTION_TEMPLATED: 'narrative_instruction/reader_state = gabarit déterministe (texte libre non dérivé)',
    LOW_CONFIDENCE: `confiance basse (${confidence}, ratio default ${defaultRatio.toFixed(2)})`,
  };
  const warning_codes = [...warningCodes].sort();
  const warnings = warning_codes.map((c) => codeMessages[c]);

  const evidence: Record<string, number | string> = {
    word_count: wordCount,
    sentence_count: n,
    arousal_min: intensity_range.min,
    arousal_max: intensity_range.max,
    arousal_mean: Math.round(mean(arousalCurve) * 1000) / 1000,
    valence_mean: Math.round(mean(valenceCurve) * 1000) / 1000,
    rupture_max_distance: Math.round(maxDist * 1000) / 1000,
    silence_threshold: Math.round(silenceThreshold * 1000) / 1000,
    default_ratio: Math.round(defaultRatio * 1000) / 1000,
  };

  return { contract, confidence, field_provenance: provenance, evidence, warning_codes, warnings, segment_hash };
}
