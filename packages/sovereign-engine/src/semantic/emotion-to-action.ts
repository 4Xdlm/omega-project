/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — EMOTION TO ACTION MAPPING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/emotion-to-action.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.4)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-05
 *
 * Maps semantic emotion analysis results to concrete physical actions.
 * Supports "show don't tell" principle in narrative writing.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SemanticEmotionResult, ActionMapping } from './types.js';

/**
 * 14 Plutchik emotion keys for iteration.
 */
const EMOTION_14_KEYS: ReadonlyArray<keyof SemanticEmotionResult> = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

/**
 * Maps 14 Plutchik emotions to concrete physical actions in French.
 * Each emotion has 5+ action descriptors following "show don't tell" principle.
 *
 * @remarks
 * Actions focus on observable behavior, not internal states.
 * Ordered roughly by frequency/typicality.
 */
export const EMOTION_ACTION_MAP: Record<keyof SemanticEmotionResult, readonly string[]> = {
  joy: [
    'posture ouverte',
    'mouvements amples',
    'voix claire',
    'sourire franc',
    'regard pétillant',
    'gestes expansifs',
  ],
  trust: [
    'épaules relâchées',
    'contact visuel soutenu',
    'ton calme',
    'distance réduite',
    'partage d\'espace',
    'respiration régulière',
  ],
  fear: [
    'regard fuyant',
    'mains moites',
    'respiration courte',
    'recul instinctif',
    'voix tremblante',
    'muscles tendus',
  ],
  surprise: [
    'sourcils levés',
    'bouche entrouverte',
    'pause soudaine',
    'regard élargi',
    'geste suspendu',
    'inspiration brusque',
  ],
  sadness: [
    'épaules affaissées',
    'regard au sol',
    'voix monotone',
    'mouvements lents',
    'posture repliée',
    'soupirs fréquents',
  ],
  disgust: [
    'nez plissé',
    'recul du buste',
    'lèvres pincées',
    'détournement du regard',
    'ton sec',
    'distance maximisée',
  ],
  anger: [
    'mâchoire crispée',
    'poings serrés',
    'voix tendue',
    'regard fixe',
    'rougeur du visage',
    'mouvements brusques',
  ],
  anticipation: [
    'corps penché en avant',
    'regard scrutateur',
    'respiration accélérée',
    'doigts tambourinant',
    'piétinement léger',
    'attention soutenue',
  ],
  love: [
    'sourire doux',
    'regard prolongé',
    'proximité recherchée',
    'voix chaleureuse',
    'gestes tendres',
    'toucher délicat',
  ],
  submission: [
    'tête baissée',
    'regard évitant',
    'voix feutrée',
    'posture reculée',
    'gestes minimaux',
    'acquiescement silencieux',
  ],
  awe: [
    'bouche entrouverte',
    'regard levé',
    'immobilité contemplative',
    'respiration suspendue',
    'silence respectueux',
    'distance maintenue',
  ],
  disapproval: [
    'froncement de sourcils',
    'secouement de tête',
    'bras croisés',
    'regard désapprobateur',
    'ton réprobateur',
    'distance accrue',
  ],
  remorse: [
    'regard fuyant',
    'épaules voûtées',
    'voix basse',
    'gestes d\'excuse',
    'tête baissée',
    'mains jointes',
  ],
  contempt: [
    'sourire en coin',
    'regard de haut',
    'nez levé',
    'ton méprisant',
    'distance marquée',
    'geste de dédain',
  ],
};

/**
 * Maps semantic emotion results to concrete physical actions.
 * Returns top emotions with their associated actions, sorted by intensity.
 *
 * ART-SEM-05: Emotion-to-action mapping for "show don't tell" guidance.
 *
 * @param result - Semantic emotion analysis result (14D)
 * @param max_actions - Maximum number of action mappings to return (default: 3)
 * @returns Array of action mappings, sorted by emotion intensity (descending)
 *
 * @remarks
 * Algorithm:
 * 1. Sort emotions by intensity (descending)
 * 2. Take top N emotions (where N = max_actions)
 * 3. Map each to its action descriptors
 * 4. Return ActionMapping array
 *
 * @example
 * ```typescript
 * const result = { joy: 0.6, sadness: 0.4, fear: 0.1, ... };
 * const actions = mapEmotionToActions(result, 2);
 * // Returns: [
 * //   { emotion: 'joy', intensity: 0.6, actions: ['posture ouverte', ...] },
 * //   { emotion: 'sadness', intensity: 0.4, actions: ['épaules affaissées', ...] }
 * // ]
 * ```
 */
export function mapEmotionToActions(
  result: SemanticEmotionResult,
  max_actions: number = 3,
): ActionMapping[] {
  // Step 1: Create array of [emotion, intensity] pairs
  const emotionPairs: Array<{ emotion: keyof SemanticEmotionResult; intensity: number }> = [];

  for (const emotion of EMOTION_14_KEYS) {
    emotionPairs.push({ emotion, intensity: result[emotion] });
  }

  // Step 2: Sort by intensity descending
  emotionPairs.sort((a, b) => b.intensity - a.intensity);

  // Step 3: Take top N emotions
  const topEmotions = emotionPairs.slice(0, max_actions);

  // Step 4: Map to ActionMapping
  const mappings: ActionMapping[] = topEmotions.map(({ emotion, intensity }) => ({
    emotion,
    intensity,
    actions: EMOTION_ACTION_MAP[emotion],
  }));

  return mappings;
}
