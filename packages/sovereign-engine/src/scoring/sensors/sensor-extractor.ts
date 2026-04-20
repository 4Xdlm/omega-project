/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENSOR EXTRACTOR V2 — Shadow-Only Experimental Module
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CALC-only sensory feature extraction. No LLM, no network, no NLP libraries.
 * Pure lexical matching with distance-weighted anchor validation,
 * collision detection, bigram support, and exclusion filtering.
 *
 * 4 sensors × triplet (density, variance, burst_ratio):
 *   1. coverage_5s        — breadth of sensory modalities engaged
 *   2. sensor_density      — intensity of anchored sensory events
 *   3. body_binding        — proportion of sensory events tied to body/reaction
 *   4. concreteness_anchor — material specificity of sensory anchors
 *
 * V2 changes vs V1:
 *   - Config injection via SensorConfig (no magic numbers)
 *   - Distance-weighted anchor scoring: score = weight / (1 + λ * d) * dirPenalty
 *   - Tie-break: highest score → closest → leftmost
 *   - Collision detection for markers and anchors (first-wins, logged)
 *   - Bigram matching for multi-word sensory expressions
 *   - Dead metaphor audit trail
 *   - assertSensorResults invariant check before return
 *   - p90 percentile in window metrics
 *   - Optional full audit mode
 *
 * Architecture:
 *   tokenize → dead metaphor removal → detect markers (unigram+bigram)
 *   → check exclusions → find anchors (distance-weighted)
 *   → compute events → window analysis → triplet computation
 *   → assert invariants → return
 *
 * ZERO import from dispatcher, coefficients, pipeline, or text-features.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  SensoryModality,
  AnchorLayer,
  RarityTier,
  MarkerInfo,
  AnchorInfo,
  AnchorCandidate,
  RawDetectionV2,
  SensoryEvent,
  SensorTriplet,
  SensorResults,
  SensorAudit,
  SensorExtractionOptions,
  CollisionEntry,
  CollisionAudit,
  DeadMetaphorHit,
  WindowMetricsV2,
} from './sensor-types.js';

import { assertSensorResults } from './sensor-types.js';

import type { SensorConfig } from './sensor-config.js';
import {
  DEFAULT_SENSOR_CONFIG,
  CONCRETENESS_WEIGHTS,
  BODY_LAYERS,
} from './sensor-config.js';

import { SENSORY_MARKERS_FR, RARITY_WEIGHTS as RARITY_FR } from './dictionaries/sensory-markers-fr.js';
import { SENSORY_MARKERS_EN, RARITY_WEIGHTS as RARITY_EN } from './dictionaries/sensory-markers-en.js';
import { ANCHOR_LEXICON_FR, ANCHOR_WEIGHTS as AW_FR } from './dictionaries/anchor-lexicon-fr.js';
import { ANCHOR_LEXICON_EN, ANCHOR_WEIGHTS as AW_EN } from './dictionaries/anchor-lexicon-en.js';
import {
  EXCLUSION_CONTEXT_FR,
  EXCLUSION_CONTEXT_EN,
  DEAD_METAPHORS_FR,
  DEAD_METAPHORS_EN,
} from './dictionaries/exclusion-patterns.js';

// ──────────────────────────────────────────────────────────────────────────────
// INDEX TYPES (internal)
// ──────────────────────────────────────────────────────────────────────────────

/** Marker index: word → array of MarkerInfo (supports collision tracking). */
type MarkerIndex = Map<string, MarkerInfo[]>;

/** Anchor index: word → array of AnchorInfo (supports collision tracking). */
type AnchorIndex = Map<string, AnchorInfo[]>;

/** Exclusion index: sensory word → set of context words that invalidate it. */
type ExclusionIndex = Map<string, Set<string>>;

// ──────────────────────────────────────────────────────────────────────────────
// INDEX BUILDING (one-time, cached per lang)
// ──────────────────────────────────────────────────────────────────────────────

function buildMarkerIndex(
  markers: typeof SENSORY_MARKERS_FR | typeof SENSORY_MARKERS_EN,
  weights: typeof RARITY_FR,
): { index: MarkerIndex; collisions: CollisionEntry[] } {
  const idx: MarkerIndex = new Map();
  const collisions: CollisionEntry[] = [];
  const modalities: SensoryModality[] = ['visual', 'auditory', 'kinesthetic', 'olfactory', 'gustatory'];
  const tiers: RarityTier[] = ['common', 'rich', 'rare'];

  for (const mod of modalities) {
    const modData = markers[mod];
    for (const tier of tiers) {
      const words = modData[tier] as readonly string[];
      for (const w of words) {
        const info: MarkerInfo = { modality: mod, tier, weight: weights[tier] };
        const existing = idx.get(w);
        if (existing) {
          existing.push(info);
        } else {
          idx.set(w, [info]);
        }
      }
    }
  }

  // Detect collisions: words with >1 entry
  for (const [word, infos] of idx) {
    if (infos.length > 1) {
      collisions.push({
        word,
        categories: infos.map(i => ({
          source: 'marker' as const,
          category: `${i.modality}/${i.tier}`,
          weight: i.weight,
        })),
        resolvedTo: `${infos[0].modality}/${infos[0].tier}`,
      });
    }
  }

  return { index: idx, collisions };
}

function buildAnchorIndex(
  lexicon: typeof ANCHOR_LEXICON_FR | typeof ANCHOR_LEXICON_EN,
  weights: typeof AW_FR,
): { index: AnchorIndex; collisions: CollisionEntry[] } {
  const idx: AnchorIndex = new Map();
  const collisions: CollisionEntry[] = [];

  for (const [layerKey, words] of Object.entries(lexicon)) {
    const layer = layerKey as AnchorLayer;
    const w = (weights as Record<string, number>)[layer] ?? 1.0;
    for (const word of words as readonly string[]) {
      const info: AnchorInfo = { layer, weight: w };
      const existing = idx.get(word);
      if (existing) {
        existing.push(info);
      } else {
        idx.set(word, [info]);
      }
    }
  }

  // Detect collisions
  for (const [word, infos] of idx) {
    if (infos.length > 1) {
      collisions.push({
        word,
        categories: infos.map(i => ({
          source: 'anchor' as const,
          category: i.layer,
          weight: i.weight,
        })),
        resolvedTo: infos[0].layer,
      });
    }
  }

  return { index: idx, collisions };
}

function buildExclusionIndex(ctx: Record<string, readonly string[]>): ExclusionIndex {
  const idx: ExclusionIndex = new Map();
  for (const [word, contexts] of Object.entries(ctx)) {
    idx.set(word, new Set(contexts));
  }
  return idx;
}

// ── Cache per language ──

interface LangIndices {
  markers: MarkerIndex;
  anchors: AnchorIndex;
  exclusions: ExclusionIndex;
  deadMetaphors: readonly string[];
  collisionAudit: CollisionAudit;
}

let _cachesFR: LangIndices | null = null;
let _cachesEN: LangIndices | null = null;

function getIndices(lang: 'fr' | 'en'): LangIndices {
  if (lang === 'fr') {
    if (!_cachesFR) {
      const m = buildMarkerIndex(SENSORY_MARKERS_FR, RARITY_FR);
      const a = buildAnchorIndex(ANCHOR_LEXICON_FR, AW_FR);
      _cachesFR = {
        markers: m.index,
        anchors: a.index,
        exclusions: buildExclusionIndex(EXCLUSION_CONTEXT_FR),
        deadMetaphors: DEAD_METAPHORS_FR,
        collisionAudit: {
          markerCollisions: m.collisions,
          anchorCollisions: a.collisions,
          totalCollisions: m.collisions.length + a.collisions.length,
        },
      };
    }
    return _cachesFR;
  }

  if (!_cachesEN) {
    const m = buildMarkerIndex(SENSORY_MARKERS_EN, RARITY_EN);
    const a = buildAnchorIndex(ANCHOR_LEXICON_EN, AW_EN);
    _cachesEN = {
      markers: m.index,
      anchors: a.index,
      exclusions: buildExclusionIndex(EXCLUSION_CONTEXT_EN),
      deadMetaphors: DEAD_METAPHORS_EN,
      collisionAudit: {
        markerCollisions: m.collisions,
        anchorCollisions: a.collisions,
        totalCollisions: m.collisions.length + a.collisions.length,
      },
    };
  }
  return _cachesEN;
}

// ──────────────────────────────────────────────────────────────────────────────
// TOKENIZER (simple, CALC-only)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Tokenize text into lowercase words. Strips punctuation, preserves accents.
 * Normalizes smart quotes/apostrophes to ASCII.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Normalize ALL smart apostrophe variants to ASCII
    .replace(/[\u2018\u2019\u201A\u201B\u02BC\u02BB]/g, "'")
    // Normalize smart double quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // Normalize en-dash/em-dash to space
    .replace(/[\u2013\u2014]/g, ' ')
    // Keep letters, digits, spaces, hyphens, apostrophes
    .replace(/[^a-zA-Z\u00C0-\u00FF\u0100-\u024F0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// DEAD METAPHOR REMOVAL (with audit trail)
// ──────────────────────────────────────────────────────────────────────────────

function removeDeadMetaphors(
  text: string,
  deadMetaphors: readonly string[],
  collectHits: boolean,
): { cleaned: string; hits: DeadMetaphorHit[] } {
  let cleaned = text.toLowerCase();
  const hits: DeadMetaphorHit[] = [];

  for (const dm of deadMetaphors) {
    const escaped = dm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    let match: RegExpExecArray | null;

    if (collectHits) {
      // Use a fresh regex per metaphor to reset lastIndex
      const reSearch = new RegExp(escaped, 'gi');
      while ((match = reSearch.exec(cleaned)) !== null) {
        const approxTokens = dm.split(/\s+/).length;
        hits.push({
          phrase: dm,
          position: match.index,
          tokensRemoved: approxTokens,
        });
      }
    }

    cleaned = cleaned.replace(re, (m) => ' '.repeat(m.length));
  }

  return { cleaned, hits };
}

// ──────────────────────────────────────────────────────────────────────────────
// EVENT DETECTION V2
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute distance-weighted anchor score.
 * Formula: score = weight / (1 + λ * distance) * directionPenalty
 *
 * Where:
 *   - weight: anchor category weight (1.0 to 1.6)
 *   - λ: distance decay factor (config.ANCHOR_DISTANCE_LAMBDA)
 *   - distance: absolute token distance between marker and anchor
 *   - directionPenalty: forward or backward penalty from config
 */
function computeAnchorScore(
  weight: number,
  distance: number,
  direction: 'backward' | 'forward',
  config: SensorConfig,
): number {
  const dirPenalty = direction === 'forward'
    ? config.ANCHOR_FORWARD_PENALTY
    : config.ANCHOR_BACKWARD_PENALTY;
  return (weight / (1 + config.ANCHOR_DISTANCE_LAMBDA * distance)) * dirPenalty;
}

/**
 * Detect all sensory events in a token stream with V2 features:
 *   - Bigram matching (longest match wins)
 *   - Distance-weighted anchor scoring
 *   - Full anchor candidate list
 *   - Exclusion reason tracking
 */
function detectEventsV2(
  tokens: string[],
  markers: MarkerIndex,
  anchors: AnchorIndex,
  exclusions: ExclusionIndex,
  config: SensorConfig,
): RawDetectionV2[] {
  const detections: RawDetectionV2[] = [];
  const consumed = new Set<number>(); // token positions consumed by bigrams

  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;

    // ── BIGRAM CHECK (longest match wins) ──
    let matchedMarkerInfo: MarkerInfo[] | undefined;
    let matchedToken: string;
    let matchedLength = 1;

    if (i + 1 < tokens.length) {
      const bigram = tokens[i] + ' ' + tokens[i + 1];
      const bigramInfo = markers.get(bigram);
      if (bigramInfo) {
        matchedMarkerInfo = bigramInfo;
        matchedToken = bigram;
        matchedLength = 2;
        consumed.add(i);
        consumed.add(i + 1);
      }
    }

    // ── UNIGRAM CHECK (if no bigram match) ──
    if (!matchedMarkerInfo) {
      const unigramInfo = markers.get(tokens[i]);
      if (!unigramInfo) continue;
      matchedMarkerInfo = unigramInfo;
      matchedToken = tokens[i];
      matchedLength = 1;
    }

    // Resolve collision: use first entry (deterministic)
    const info = matchedMarkerInfo[0];

    // ── EXCLUSION CHECK ──
    const exclusionSet = exclusions.get(matchedToken!);
    let excluded = false;
    let exclusionReason: string | null = null;

    if (exclusionSet) {
      const start = Math.max(0, i - config.EXCLUSION_WINDOW);
      const end = Math.min(tokens.length - 1, i + config.EXCLUSION_WINDOW);
      for (let j = start; j <= end; j++) {
        if (j === i) continue;
        if (j === i + 1 && matchedLength === 2) continue; // skip second token of bigram
        if (exclusionSet.has(tokens[j])) {
          excluded = true;
          exclusionReason = tokens[j];
          break;
        }
      }
    }

    // ── ANCHOR SEARCH (distance-weighted) ──
    const anchorCandidates: AnchorCandidate[] = [];
    const aStart = Math.max(0, i - config.ANCHOR_WINDOW);
    const aEnd = Math.min(tokens.length - 1, i + config.ANCHOR_WINDOW);

    for (let j = aStart; j <= aEnd; j++) {
      if (j === i) continue;
      if (j === i + 1 && matchedLength === 2) continue; // skip second token of bigram
      const aInfos = anchors.get(tokens[j]);
      if (!aInfos) continue;

      // Use first entry for collision resolution (deterministic)
      const aInfo = aInfos[0];
      const distance = Math.abs(j - i);
      const direction: 'backward' | 'forward' = j < i ? 'backward' : 'forward';
      const score = computeAnchorScore(aInfo.weight, distance, direction, config);

      anchorCandidates.push({
        word: tokens[j],
        layer: aInfo.layer,
        weight: aInfo.weight,
        distance,
        direction,
        score,
      });
    }

    // Sort candidates: highest score → closest → leftmost (stable)
    anchorCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return 0; // preserve insertion order (leftmost first)
    });

    const bestAnchor = anchorCandidates.length > 0 ? anchorCandidates[0] : null;

    detections.push({
      position: i,
      marker: matchedToken!,
      markerInfo: info,
      excluded,
      exclusionReason,
      anchorCandidates,
      bestAnchor,
    });
  }

  return detections;
}

// ──────────────────────────────────────────────────────────────────────────────
// WINDOW ANALYSIS V2
// ──────────────────────────────────────────────────────────────────────────────

function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const frac = rank - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

function computeWindowMetricsV2(
  events: SensoryEvent[],
  totalTokens: number,
  valueExtractor: (windowEvents: SensoryEvent[], windowSize: number) => number,
  config: SensorConfig,
): WindowMetricsV2 {
  if (totalTokens < config.WINDOW_SIZE) {
    // Text too short for windowing: single window
    const val = valueExtractor(events, totalTokens);
    return { values: [val], mean: val, stdev: 0, max: val, p90: val, burst_ratio: 1.0 };
  }

  const values: number[] = [];
  for (let start = 0; start + config.WINDOW_SIZE <= totalTokens; start += config.WINDOW_STEP) {
    const end = start + config.WINDOW_SIZE;
    const windowEvents = events.filter(e => e.position >= start && e.position < end);
    values.push(valueExtractor(windowEvents, config.WINDOW_SIZE));
  }

  if (values.length === 0) {
    return { values: [], mean: 0, stdev: 0, max: 0, p90: 0, burst_ratio: 1.0 };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdev = Math.sqrt(variance);
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const p90 = computePercentile(sorted, 90);
  const burst_ratio = mean > 0 ? max / mean : 1.0;

  return { values, mean, stdev, max, p90, burst_ratio };
}

function makeTriplet(wm: WindowMetricsV2): SensorTriplet {
  return {
    density: round4(wm.mean),
    variance: round4(wm.stdev),
    burst_ratio: round4(wm.burst_ratio),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXTRACTOR V2
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Extract all 4 P1 sensory features from a text passage.
 *
 * @param text - Raw prose (UTF-8)
 * @param lang - 'fr' or 'en'
 * @param config - Optional sensor config override (default: DEFAULT_SENSOR_CONFIG)
 * @param options - Optional extraction options (audit mode)
 * @returns SensorResults with 4 triplets + diagnostics + optional audit
 */
export function extractSensoryFeatures(
  text: string,
  lang: 'fr' | 'en',
  config: SensorConfig = DEFAULT_SENSOR_CONFIG,
  options: SensorExtractionOptions = {},
): SensorResults {
  const { markers, anchors, exclusions, deadMetaphors, collisionAudit } = getIndices(lang);
  const auditMode = options.audit === true;

  // ── Step 1: Remove dead metaphors ──
  const { cleaned: cleanedText, hits: deadMetaphorHits } = removeDeadMetaphors(
    text, deadMetaphors, auditMode,
  );

  // ── Step 2: Tokenize ──
  const tokens = tokenize(cleanedText);
  const totalTokens = tokens.length;

  if (totalTokens < config.MIN_TOKENS) {
    return emptyResults(totalTokens);
  }

  // ── Step 3: Detect all sensory markers (V2: bigram + distance-weighted) ──
  const rawDetections = detectEventsV2(tokens, markers, anchors, exclusions, config);

  // ── Step 4: Classify events ──
  const rawEvents = rawDetections.length;
  const validEvents: SensoryEvent[] = [];
  let excludedCount = 0;
  let noAnchorCount = 0;

  for (const det of rawDetections) {
    if (det.excluded) {
      excludedCount++;
      continue;
    }
    if (!det.bestAnchor) {
      noAnchorCount++;
      continue;
    }

    const ba = det.bestAnchor;
    validEvents.push({
      position: det.position,
      marker: det.marker,
      modality: det.markerInfo.modality,
      rarity: det.markerInfo.tier,
      rarity_weight: det.markerInfo.weight,
      anchor: ba.word,
      anchor_layer: ba.layer,
      anchor_weight: ba.weight,
      anchor_distance: ba.distance,
      anchor_score: round4(ba.score),
      event_score: round4(det.markerInfo.weight * ba.score),
    });
  }

  // ── SENSOR 1: coverage_5s ──
  const coverageWindow = computeWindowMetricsV2(validEvents, totalTokens,
    (wEvents, _wSize) => {
      const modCounts: Record<string, number> = {};
      for (const e of wEvents) {
        modCounts[e.modality] = (modCounts[e.modality] || 0) + 1;
      }
      let activeModalities = 0;
      for (const key of Object.keys(modCounts)) {
        if (modCounts[key] >= config.MIN_EVENTS_PER_MODALITY) activeModalities++;
      }
      return activeModalities / 5;
    },
    config,
  );

  // ── SENSOR 2: sensor_density ──
  const densityWindow = computeWindowMetricsV2(validEvents, totalTokens,
    (wEvents, wSize) => {
      const totalScore = wEvents.reduce((s, e) => s + e.event_score, 0);
      return (totalScore / wSize) * config.DENSITY_SCALE;
    },
    config,
  );

  // ── SENSOR 3: body_binding ──
  const bodyLayerSet = new Set<string>(BODY_LAYERS);
  const bindingWindow = computeWindowMetricsV2(validEvents, totalTokens,
    (wEvents, _wSize) => {
      if (wEvents.length === 0) return 0;
      const bodyEvents = wEvents.filter(e => bodyLayerSet.has(e.anchor_layer));
      return bodyEvents.length / wEvents.length;
    },
    config,
  );

  // ── SENSOR 4: concreteness_anchor ──
  const concretenessWindow = computeWindowMetricsV2(validEvents, totalTokens,
    (wEvents, _wSize) => {
      if (wEvents.length === 0) return 0;
      const totalConcreteness = wEvents.reduce(
        (s, e) => s + (CONCRETENESS_WEIGHTS[e.anchor_layer] ?? 1.0), 0,
      );
      return totalConcreteness / wEvents.length;
    },
    config,
  );

  // ── DIAGNOSTICS ──
  const modalityCounts: Record<SensoryModality, number> = {
    visual: 0, auditory: 0, kinesthetic: 0, olfactory: 0, gustatory: 0,
  };
  let bindingPassive = 0;
  let bindingReactive = 0;
  let bindingInteractive = 0;
  let concMaterial = 0;
  let concObject = 0;
  let concMicro = 0;

  for (const e of validEvents) {
    modalityCounts[e.modality]++;
    if (e.anchor_layer === 'c2_body' || e.anchor_layer === 'c2_organ') bindingPassive++;
    if (e.anchor_layer === 'c3_reaction') bindingReactive++;
    if (e.anchor_layer === 'c3_interaction') bindingInteractive++;
    if (e.anchor_layer === 'c1_material') concMaterial++;
    if (e.anchor_layer === 'c1_object') concObject++;
    if (e.anchor_layer === 'c1_micro_detail') concMicro++;
  }

  const ve = validEvents.length || 1; // avoid division by zero

  // ── Build audit if requested ──
  const audit: SensorAudit | undefined = auditMode
    ? {
        deadMetaphorHits,
        deadMetaphorCount: deadMetaphorHits.length,
        rawDetections,
        collisions: collisionAudit,
        excludedCount,
        noAnchorCount,
        validEvents,
      }
    : undefined;

  // ── Assemble result ──
  const result: SensorResults = {
    token_count: totalTokens,
    valid_events: validEvents.length,
    raw_events: rawEvents,

    coverage_5s: makeTriplet(coverageWindow),
    sensor_density: makeTriplet(densityWindow),
    body_binding: makeTriplet(bindingWindow),
    concreteness_anchor: makeTriplet(concretenessWindow),

    diag: {
      anchor_ratio: round4(validEvents.length / (rawEvents || 1)),
      modality_counts: modalityCounts,
      density_raw: round4((rawEvents / totalTokens) * config.DENSITY_SCALE),
      binding_passive: round4(bindingPassive / ve),
      binding_reactive: round4(bindingReactive / ve),
      binding_interactive: round4(bindingInteractive / ve),
      concreteness_by_level: {
        material: round4(concMaterial / ve),
        object: round4(concObject / ve),
        micro_detail: round4(concMicro / ve),
      },
    },

    audit,
  };

  // ── INVARIANT CHECK — throws if violated ──
  assertSensorResults(result);

  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// EMPTY RESULTS (short text fallback)
// ──────────────────────────────────────────────────────────────────────────────

function emptyResults(tokenCount: number): SensorResults {
  const emptyTriplet: SensorTriplet = { density: 0, variance: 0, burst_ratio: 1.0 };
  return {
    token_count: tokenCount,
    valid_events: 0,
    raw_events: 0,
    coverage_5s: emptyTriplet,
    sensor_density: emptyTriplet,
    body_binding: emptyTriplet,
    concreteness_anchor: emptyTriplet,
    diag: {
      anchor_ratio: 0,
      modality_counts: { visual: 0, auditory: 0, kinesthetic: 0, olfactory: 0, gustatory: 0 },
      density_raw: 0,
      binding_passive: 0,
      binding_reactive: 0,
      binding_interactive: 0,
      concreteness_by_level: { material: 0, object: 0, micro_detail: 0 },
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CACHE RESET (for testing only)
// ──────────────────────────────────────────────────────────────────────────────

/** Reset cached indices. Use in tests to force re-indexing. */
export function __resetCacheForTest(): void {
  _cachesFR = null;
  _cachesEN = null;
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPORTS for test and audit
// ──────────────────────────────────────────────────────────────────────────────

/** Exposed for testing: tokenize a text. */
export function __tokenizeForTest(text: string): string[] {
  return tokenize(text);
}

/** Exposed for testing: get raw detection count without anchor filtering. */
export function __rawDetectionCountForTest(
  text: string,
  lang: 'fr' | 'en',
  config: SensorConfig = DEFAULT_SENSOR_CONFIG,
): number {
  const { markers, anchors, exclusions, deadMetaphors } = getIndices(lang);
  const { cleaned } = removeDeadMetaphors(text, deadMetaphors, false);
  const tokens = tokenize(cleaned);
  return detectEventsV2(tokens, markers, anchors, exclusions, config).length;
}

/** Exposed for testing: get collision audit for a language. */
export function __getCollisionAuditForTest(lang: 'fr' | 'en'): CollisionAudit {
  return getIndices(lang).collisionAudit;
}

/** Exposed for testing: compute anchor score. */
export function __computeAnchorScoreForTest(
  weight: number,
  distance: number,
  direction: 'backward' | 'forward',
  config: SensorConfig = DEFAULT_SENSOR_CONFIG,
): number {
  return computeAnchorScore(weight, distance, direction, config);
}
