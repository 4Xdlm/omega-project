/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — PHANTOM RUNNER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phantom/phantom-runner.ts
 * Sprint: 14.2
 * Invariant: ART-PHANTOM-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Traverses prose sentence by sentence, maintains PhantomState,
 * produces PhantomTrace with danger zones.
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type PhantomState,
  type PhantomConfig,
  DEFAULT_PHANTOM_CONFIG,
  createPhantomState,
  advancePhantom,
} from './phantom-state.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DangerZone {
  readonly start: number;
  readonly end: number;
  readonly type: 'low_attention' | 'high_fatigue' | 'cognitive_overload';
}

export interface PhantomTrace {
  readonly states: readonly PhantomState[];
  readonly attention_min: number;
  readonly attention_min_index: number;
  readonly fatigue_max: number;
  readonly fatigue_max_index: number;
  readonly cognitive_peaks: readonly number[];
  readonly breath_points: readonly number[];
  readonly danger_zones: readonly DangerZone[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE SPLITTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Split prose into sentences.
 * Handles: . ! ? … and line breaks for dialogue.
 * Deterministic.
 */
function splitSentences(prose: string): readonly string[] {
  // Split on sentence-ending punctuation, keeping non-empty results
  const raw = prose
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // If no splits found (e.g. no punctuation), split on line breaks
  if (raw.length <= 1 && prose.includes('\n')) {
    return prose
      .split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return raw;
}

/** Count words in a sentence */
function countWords(sentence: string): number {
  return sentence.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run phantom reader through prose, sentence by sentence.
 * Produces a complete trace with danger zone detection.
 *
 * Danger zones:
 * - low_attention: 5+ consecutive sentences with attention < 0.3
 * - high_fatigue: fatigue > 0.7 for 3+ sentences without short sentence (breath)
 * - cognitive_overload: cognitive_load > 0.8
 *
 * @param prose - Text to analyze
 * @param config - PhantomConfig (defaults to DEFAULT_PHANTOM_CONFIG)
 * @returns PhantomTrace
 */
export function runPhantom(
  prose: string,
  config?: PhantomConfig,
): PhantomTrace {
  const cfg = config ?? DEFAULT_PHANTOM_CONFIG;
  const sentences = splitSentences(prose);

  const states: PhantomState[] = [];
  let currentState = createPhantomState(cfg);

  // Track metrics
  let attention_min = cfg.initial_attention;
  let attention_min_index = 0;
  let fatigue_max = 0;
  let fatigue_max_index = 0;
  const cognitive_peaks: number[] = [];
  const breath_points: number[] = [];

  // Traverse
  for (let i = 0; i < sentences.length; i++) {
    currentState = advancePhantom(currentState, sentences[i], cfg);
    states.push(currentState);

    // Track attention min
    if (currentState.attention < attention_min) {
      attention_min = currentState.attention;
      attention_min_index = i;
    }

    // Track fatigue max
    if (currentState.fatigue > fatigue_max) {
      fatigue_max = currentState.fatigue;
      fatigue_max_index = i;
    }

    // Track cognitive peaks
    if (currentState.cognitive_load > 0.7) {
      cognitive_peaks.push(i);
    }

    // Track breath points (short sentences)
    if (countWords(sentences[i]) < 8) {
      breath_points.push(i);
    }
  }

  // Detect danger zones
  const danger_zones = detectDangerZones(states, breath_points);

  return {
    states,
    attention_min,
    attention_min_index,
    fatigue_max,
    fatigue_max_index,
    cognitive_peaks,
    breath_points,
    danger_zones,
  };
}

/**
 * Detect danger zones in phantom trace.
 *
 * 1. low_attention: 5+ consecutive sentences with attention < 0.3
 * 2. high_fatigue: fatigue > 0.7 for 3+ sentences without breath point
 * 3. cognitive_overload: cognitive_load > 0.8
 */
function detectDangerZones(
  states: readonly PhantomState[],
  breath_points: readonly number[],
): readonly DangerZone[] {
  const zones: DangerZone[] = [];
  const breathSet = new Set(breath_points);

  // 1. Low attention zones (5+ consecutive with attention < 0.3)
  let lowAttStart = -1;
  let lowAttCount = 0;

  for (let i = 0; i < states.length; i++) {
    if (states[i].attention < 0.3) {
      if (lowAttStart === -1) lowAttStart = i;
      lowAttCount++;
    } else {
      if (lowAttCount >= 5) {
        zones.push({
          start: lowAttStart,
          end: i - 1,
          type: 'low_attention',
        });
      }
      lowAttStart = -1;
      lowAttCount = 0;
    }
  }
  // Check trailing zone
  if (lowAttCount >= 5) {
    zones.push({
      start: lowAttStart,
      end: states.length - 1,
      type: 'low_attention',
    });
  }

  // 2. High fatigue zones (fatigue > 0.7 for 3+ sentences without breath)
  let highFatStart = -1;
  let highFatCount = 0;
  let hasBreathInZone = false;

  for (let i = 0; i < states.length; i++) {
    if (states[i].fatigue > 0.7) {
      if (highFatStart === -1) highFatStart = i;
      highFatCount++;
      if (breathSet.has(i)) hasBreathInZone = true;
    } else {
      if (highFatCount >= 3 && !hasBreathInZone) {
        zones.push({
          start: highFatStart,
          end: i - 1,
          type: 'high_fatigue',
        });
      }
      highFatStart = -1;
      highFatCount = 0;
      hasBreathInZone = false;
    }
  }
  // Check trailing zone
  if (highFatCount >= 3 && !hasBreathInZone) {
    zones.push({
      start: highFatStart,
      end: states.length - 1,
      type: 'high_fatigue',
    });
  }

  // 3. Cognitive overload zones (cognitive_load > 0.8)
  let cogStart = -1;

  for (let i = 0; i < states.length; i++) {
    if (states[i].cognitive_load > 0.8) {
      if (cogStart === -1) cogStart = i;
    } else {
      if (cogStart !== -1) {
        zones.push({
          start: cogStart,
          end: i - 1,
          type: 'cognitive_overload',
        });
        cogStart = -1;
      }
    }
  }
  if (cogStart !== -1) {
    zones.push({
      start: cogStart,
      end: states.length - 1,
      type: 'cognitive_overload',
    });
  }

  return zones;
}
