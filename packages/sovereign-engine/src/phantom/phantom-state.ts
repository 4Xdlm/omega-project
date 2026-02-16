/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — PHANTOM STATE MODEL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phantom/phantom-state.ts
 * Sprint: 14.1
 * Invariant: ART-PHANTOM-01
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Models a virtual reader's cognitive state: attention, cognitive_load, fatigue.
 * 100% CALC — deterministic, no LLM, no random.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhantomState {
  readonly attention: number;        // 0-1 (1 = très attentif)
  readonly cognitive_load: number;   // 0-1 (1 = surchargé)
  readonly fatigue: number;          // 0-1 (1 = épuisé)
  readonly sentence_index: number;   // position actuelle
}

export interface PhantomConfig {
  readonly initial_attention: number;
  readonly attention_decay_rate: number;
  readonly attention_boost_events: number;
  readonly cognitive_load_per_word: number;
  readonly cognitive_load_decay: number;
  readonly fatigue_rate: number;
  readonly fatigue_breath_recovery: number;
}

export const DEFAULT_PHANTOM_CONFIG: PhantomConfig = {
  initial_attention: 0.9,
  attention_decay_rate: 0.02,
  attention_boost_events: 0.15,
  cognitive_load_per_word: 0.001,
  cognitive_load_decay: 0.05,
  fatigue_rate: 0.01,
  fatigue_breath_recovery: 0.08,
};

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE EVENT DETECTION (CALC — heuristic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 40+ French action verbs indicating narrative events.
 * Covers movement, violence, speech, perception, sudden change.
 */
const ACTION_VERBS_FR: readonly string[] = [
  'courut', 'couru', 'courir', 'court',
  'frappa', 'frappé', 'frappe',
  'cria', 'crié', 'crie',
  'saisit', 'saisi', 'saisie',
  'tomba', 'tombé', 'tombe',
  'bondit', 'bondi',
  'hurla', 'hurlé', 'hurle',
  'attrapa', 'attrapé', 'attrape',
  'lança', 'lancé', 'lance',
  'poussa', 'poussé', 'pousse',
  'tira', 'tiré', 'tire',
  'brisa', 'brisé', 'brise',
  'éclata', 'éclaté', 'éclate',
  'surgit', 'surgi',
  'plongea', 'plongé', 'plonge',
  'arracha', 'arraché', 'arrache',
  'gifla', 'giflé', 'gifle',
  'renversa', 'renversé', 'renverse',
  'percuta', 'percuté', 'percute',
  'détala', 'détalé', 'détale',
  'dégaina', 'dégainé', 'dégaine',
  'trancha', 'tranché', 'tranche',
  'empoigna', 'empoigné', 'empoigne',
  'jaillit', 'jailli',
  'explosa', 'explosé', 'explose',
  'déchira', 'déchiré', 'déchire',
  'assena', 'assené', 'assène',
  'claqua', 'claqué', 'claque',
  'rugit', 'rugi',
  's\'effondra', 'effondré', 'effondre',
];

/**
 * Detect if a sentence contains a narrative event (action verb).
 * Deterministic: pure string matching, no LLM.
 */
export function isNarrativeEvent(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  const words = lower.split(/\s+/);
  return words.some(word => {
    const cleaned = word.replace(/[^a-zàâäéèêëïîôùûüÿçœæ'-]/g, '');
    return ACTION_VERBS_FR.some(verb => cleaned === verb || cleaned.startsWith(verb));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/** Clamp value to [0, 1] */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Count words in a sentence */
function countWords(sentence: string): number {
  return sentence.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/** Detect if sentence is dialogue (starts with dash/guillemet or contains quotes) */
function isDialogue(sentence: string): boolean {
  const trimmed = sentence.trim();
  return (
    trimmed.startsWith('—') ||
    trimmed.startsWith('–') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('«') ||
    trimmed.includes('»') ||
    /^"/.test(trimmed)
  );
}

/** Create initial phantom state */
export function createPhantomState(config?: PhantomConfig): PhantomState {
  const c = config ?? DEFAULT_PHANTOM_CONFIG;
  return {
    attention: c.initial_attention,
    cognitive_load: 0,
    fatigue: 0,
    sentence_index: 0,
  };
}

/**
 * Advance phantom state by one sentence.
 * 100% deterministic CALC.
 *
 * Algorithm:
 * 1. attention -= decay_rate
 * 2. If short sentence (< 8 words) or dialogue → attention += boost × 0.5
 * 3. If narrative event → attention += boost
 * 4. cognitive_load += words × load_per_word - cognitive_load_decay
 * 5. fatigue += fatigue_rate
 * 6. If short sentence (< 8 words) → fatigue -= breath_recovery
 * 7. Clamp all ∈ [0, 1]
 */
export function advancePhantom(
  state: PhantomState,
  sentence: string,
  config: PhantomConfig,
): PhantomState {
  const wordCount = countWords(sentence);
  const isShort = wordCount < 8;
  const dialogue = isDialogue(sentence);
  const narrativeEvent = isNarrativeEvent(sentence);

  // 1. Attention decay
  let attention = state.attention - config.attention_decay_rate;

  // 2. Short/dialogue boost
  if (isShort || dialogue) {
    attention += config.attention_boost_events * 0.5;
  }

  // 3. Narrative event boost
  if (narrativeEvent) {
    attention += config.attention_boost_events;
  }

  // 4. Cognitive load
  let cognitive_load =
    state.cognitive_load +
    wordCount * config.cognitive_load_per_word -
    config.cognitive_load_decay;

  // 5. Fatigue increase
  let fatigue = state.fatigue + config.fatigue_rate;

  // 6. Breath recovery on short sentences
  if (isShort) {
    fatigue -= config.fatigue_breath_recovery;
  }

  // 7. Clamp all
  return {
    attention: clamp01(attention),
    cognitive_load: clamp01(cognitive_load),
    fatigue: clamp01(fatigue),
    sentence_index: state.sentence_index + 1,
  };
}
