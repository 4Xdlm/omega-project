/**
 * OMEGA Genesis Planner — Prompt Builder
 * Sprint S-HARDEN H2-PROMPT — Structured prompts with exact output schemas.
 * Raises D1 Structure and D3 Constraints compliance for LLM mode.
 */

import type { Intent, Canon, Constraints, EmotionTarget, Arc, Scene, GConfig } from '../types.js';

// ─── Output Schemas (JSON Schema fragments for LLM instruction) ─────────────

const ARC_SCHEMA = `[
  {
    "arc_id": "ARC-001",
    "theme": "string — main theme of this arc",
    "progression": "string — narrative progression description",
    "scenes": [],
    "justification": "string — why this arc serves the intent"
  }
]`;

const SCENE_SCHEMA = `[
  {
    "scene_id": "SCN-{arc_id}-001",
    "arc_id": "string — must match parent arc_id",
    "objective": "string — what this scene accomplishes",
    "conflict": "string — the central conflict of this scene",
    "conflict_type": "internal | external | relational | societal | existential",
    "emotion_target": "string — target emotion for this scene",
    "emotion_intensity": 0.0 to 1.0,
    "seeds_planted": [],
    "seeds_bloomed": [],
    "subtext": {
      "character_thinks": "string",
      "reader_knows": "string",
      "tension_type": "string",
      "implied_emotion": "string"
    },
    "sensory_anchor": "string — a concrete sensory detail anchoring this scene",
    "constraints": [],
    "beats": [],
    "target_word_count": number,
    "justification": "string — why this scene is necessary"
  }
]`;

const BEAT_SCHEMA = `[
  {
    "beat_id": "BEAT-{scene_id}-001",
    "action": "string — what happens in this beat",
    "intention": "string — narrative purpose",
    "pivot": true | false,
    "tension_delta": -1 | 0 | 1,
    "information_revealed": ["string"],
    "information_withheld": ["string"]
  }
]`;

// ─── Prompt Builders ────────────────────────────────────────────────────────

export function buildArcPrompt(
  intent: Intent,
  canon: Canon,
  constraints: Constraints,
): string {
  const totalScenes = constraints.max_scenes;
  const minScenes = constraints.min_scenes;

  return `You are generating narrative arc structures for a story.

## INTENT
- Title: ${intent.title}
- Premise: ${intent.premise}
- Themes: ${intent.themes.join(', ')}
- Core emotion: ${intent.core_emotion}
- Target word count: ~${intent.target_word_count ?? 'unspecified'} words

## CANON ENTRIES (must be respected)
${canon.entries.map((e, i) => `${i + 1}. [${e.id}] (${e.category}) ${e.statement}${e.immutable ? ' [IMMUTABLE]' : ''}`).join('\n')}

## CONSTRAINTS
- POV: ${constraints.pov}
- Tense: ${constraints.tense}
- Scene count: ${minScenes}–${totalScenes} scenes TOTAL across ALL arcs
- Banned topics: ${constraints.banned_topics.join(', ') || 'none'}
- Forbidden cliches: ${constraints.forbidden_cliches.join(', ') || 'none'}

## RULES
1. Return a JSON array of Arc objects. Nothing else.
2. Each arc MUST have arc_id starting with "ARC-" followed by a 3-digit number (e.g. ARC-001).
3. The "scenes" field MUST be an empty array [] — scenes are generated separately.
4. The TOTAL number of scenes across all arcs (planned, not yet generated) must be between ${minScenes} and ${totalScenes}.
5. Every canon entry MUST be referenced or integrated into at least one arc's theme or justification.
6. Arc themes must align with the intent's themes and core emotion.

## OUTPUT SCHEMA
${ARC_SCHEMA}

Return ONLY the JSON array. No markdown fences. No commentary.`;
}

export function buildScenePrompt(
  arc: Arc,
  arcIndex: number,
  totalArcs: number,
  canon: Canon,
  constraints: Constraints,
  emotionTarget: EmotionTarget,
): string {
  const maxScenesPerArc = Math.ceil(constraints.max_scenes / totalArcs);
  const minScenesPerArc = Math.max(1, Math.floor(constraints.min_scenes / totalArcs));

  return `You are generating scenes for a specific narrative arc.

## ARC CONTEXT
- Arc ID: ${arc.arc_id}
- Theme: ${arc.theme}
- Progression: ${arc.progression}
- Arc ${arcIndex + 1} of ${totalArcs}

## EMOTION TARGET
- Arc emotion: ${emotionTarget.arc_emotion}
- Waypoints: ${emotionTarget.waypoints.map(w => `${w.emotion}@${w.intensity}(pos=${w.position})`).join(' → ')}
- Climax position: ${emotionTarget.climax_position}
- Resolution emotion: ${emotionTarget.resolution_emotion}

## CANON ENTRIES
${canon.entries.map((e, i) => `${i + 1}. [${e.id}] (${e.category}) ${e.statement}${e.immutable ? ' [IMMUTABLE]' : ''}`).join('\n')}

## CONSTRAINTS
- POV: ${constraints.pov}
- Tense: ${constraints.tense}
- Scenes for this arc: ${minScenesPerArc}–${maxScenesPerArc}
- Min sensory anchors per scene: ${constraints.min_sensory_anchors_per_scene}
- Banned words: ${constraints.banned_words.join(', ') || 'none'}
- Forbidden cliches: ${constraints.forbidden_cliches.join(', ') || 'none'}

## RULES
1. Return a JSON array of Scene objects. Nothing else.
2. Each scene MUST have scene_id = "SCN-{arc_id}-NNN" (e.g. SCN-ARC-001-001).
3. Each scene MUST have arc_id = "${arc.arc_id}".
4. emotion_intensity must be a number between 0.0 and 1.0.
5. conflict_type must be one of: internal, external, relational, societal, existential.
6. sensory_anchor must be a concrete sensory detail (sight, sound, smell, touch, taste).
7. target_word_count must be a positive integer.
8. seeds_planted, seeds_bloomed, beats, constraints: use empty arrays [].
9. subtext must have all 4 fields: character_thinks, reader_knows, tension_type, implied_emotion.

## OUTPUT SCHEMA
${SCENE_SCHEMA}

Return ONLY the JSON array. No markdown fences. No commentary.`;
}

export function buildBeatPrompt(
  scene: Scene,
  sceneIndex: number,
  config: GConfig,
): string {
  const minBeats = config.MIN_BEATS_PER_SCENE.value;
  const maxBeats = config.MAX_BEATS_PER_SCENE.value;

  return `You are generating narrative beats for a specific scene.

## SCENE CONTEXT
- Scene ID: ${scene.scene_id}
- Arc ID: ${scene.arc_id}
- Objective: ${scene.objective}
- Conflict: ${scene.conflict}
- Conflict type: ${scene.conflict_type}
- Emotion target: ${scene.emotion_target} (intensity: ${scene.emotion_intensity})
- Target word count: ${scene.target_word_count}
- Scene index: ${sceneIndex}

## RULES
1. Return a JSON array of Beat objects. Nothing else.
2. Each beat MUST have beat_id = "BEAT-${scene.scene_id}-NNN" (e.g. BEAT-SCN-ARC-001-001-001).
3. Generate between ${minBeats} and ${maxBeats} beats.
4. At least one beat must have pivot = true (a turning point).
5. tension_delta must be exactly -1, 0, or 1 (integer, not float).
6. information_revealed and information_withheld must be arrays of strings.

## OUTPUT SCHEMA
${BEAT_SCHEMA}

Return ONLY the JSON array. No markdown fences. No commentary.`;
}

// ─── Repair Loop ─────────────────────────────────────────────────────────────

/**
 * Attempt to parse JSON from LLM response, with one repair attempt.
 * If parsing fails, returns null.
 */
export function parseWithRepair(raw: string): unknown | null {
  // Attempt 1: direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // continue to repair
  }

  // Repair: strip markdown fences if present
  const fenced = raw.trim().match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // continue
    }
  }

  // Repair: find first [ or { and last ] or }
  const firstBracket = raw.indexOf('[');
  const firstBrace = raw.indexOf('{');
  const start = firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)
    ? firstBracket : firstBrace;
  if (start >= 0) {
    const closer = raw[start] === '[' ? ']' : '}';
    const end = raw.lastIndexOf(closer);
    if (end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        // exhausted repairs
      }
    }
  }

  return null;
}
