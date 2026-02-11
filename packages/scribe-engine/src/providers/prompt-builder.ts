/**
 * OMEGA Scribe Engine — Prompt Builder
 * Phase P.2-SCRIBE — Builds scene-level prompts for LLM prose generation
 * Deterministic: same inputs → same prompt
 */

import type { SkeletonDoc, Segment } from '../types.js';
import type { GenesisPlan, Scene, Constraints, StyleGenomeInput, EmotionTarget } from '@omega/genesis-planner';

export interface ScenePromptContext {
  readonly sceneId: string;
  readonly arcId: string;
  readonly arcTheme: string;
  readonly sceneObjective: string;
  readonly sceneConflict: string;
  readonly conflictType: string;
  readonly emotionTarget: string;
  readonly emotionIntensity: number;
  readonly sensoryAnchor: string;
  readonly targetWordCount: number;
  readonly segments: readonly Segment[];
  readonly constraints: Constraints;
  readonly genome: StyleGenomeInput;
  readonly emotion: EmotionTarget;
  readonly previousSceneSummary: string;
  readonly isFirstScene: boolean;
  readonly isLastScene: boolean;
}

/**
 * Extract scene prompt context from skeleton + plan
 */
export function buildSceneContext(
  sceneId: string,
  skeleton: SkeletonDoc,
  plan: GenesisPlan,
  constraints: Constraints,
  genome: StyleGenomeInput,
  emotion: EmotionTarget,
  previousSceneSummary: string,
  sceneIndex: number,
  totalScenes: number,
): ScenePromptContext {
  // Find scene in plan
  let scene: Scene | null = null;
  let arcTheme = '';
  for (const arc of plan.arcs) {
    for (const s of arc.scenes) {
      if (s.scene_id === sceneId) {
        scene = s;
        arcTheme = arc.theme;
        break;
      }
    }
    if (scene) break;
  }

  if (!scene) {
    throw new Error(`Scene ${sceneId} not found in plan`);
  }

  // Get segments for this scene
  const segments = skeleton.segments.filter(seg => seg.source_scene_id === sceneId);

  return {
    sceneId,
    arcId: scene.arc_id,
    arcTheme,
    sceneObjective: scene.objective,
    sceneConflict: scene.conflict,
    conflictType: scene.conflict_type,
    emotionTarget: scene.emotion_target,
    emotionIntensity: scene.emotion_intensity,
    sensoryAnchor: scene.sensory_anchor,
    targetWordCount: scene.target_word_count,
    segments,
    constraints,
    genome,
    emotion,
    previousSceneSummary,
    isFirstScene: sceneIndex === 0,
    isLastScene: sceneIndex === totalScenes - 1,
  };
}

/**
 * Build the LLM prompt for a single scene
 */
export function buildScenePrompt(ctx: ScenePromptContext): string {
  const lines: string[] = [];

  // Header
  lines.push(`=== SCENE: ${ctx.sceneId} ===`);
  lines.push(`Arc theme: ${ctx.arcTheme}`);
  lines.push(`Objective: ${ctx.sceneObjective}`);
  lines.push(`Conflict: ${ctx.sceneConflict} (${ctx.conflictType})`);
  lines.push(`Emotion: ${ctx.emotionTarget} at intensity ${ctx.emotionIntensity}`);
  lines.push(`Target word count: ${ctx.targetWordCount}`);
  lines.push('');

  // Sensory anchor
  lines.push(`=== SENSORY ANCHOR (must appear naturally) ===`);
  lines.push(ctx.sensoryAnchor);
  lines.push('');

  // Continuity
  if (!ctx.isFirstScene && ctx.previousSceneSummary) {
    lines.push(`=== CONTINUITY (previous scene ended with) ===`);
    lines.push(ctx.previousSceneSummary);
    lines.push('');
  }

  // Beats (from segments)
  lines.push(`=== BEATS TO RENDER (${ctx.segments.length} segments) ===`);
  for (const seg of ctx.segments) {
    const pivotMark = seg.is_pivot ? ' [PIVOT]' : '';
    const tensionMark = seg.tension_delta === 1 ? ' ↑tension' : seg.tension_delta === -1 ? ' ↓tension' : '';
    lines.push(`- [${seg.type.toUpperCase()}]${pivotMark}${tensionMark}: ${seg.content}`);
    if (seg.subtext_slot && seg.subtext_slot !== '__none__') {
      lines.push(`  Subtext: ${seg.subtext_slot}`);
    }
  }
  lines.push('');

  // Style genome
  lines.push(`=== STYLE PARAMETERS ===`);
  lines.push(`POV: ${ctx.constraints.pov}`);
  lines.push(`Tense: ${ctx.constraints.tense}`);
  lines.push(`Avg sentence length: ${ctx.genome.target_avg_sentence_length} words`);
  lines.push(`Burstiness: ${ctx.genome.target_burstiness} (0=uniform, 1=varied)`);
  lines.push(`Lexical richness: ${ctx.genome.target_lexical_richness}`);
  lines.push(`Description density: ${ctx.genome.target_description_density}`);
  lines.push(`Dialogue ratio: ${ctx.genome.target_dialogue_ratio}`);
  if (ctx.genome.signature_traits.length > 0) {
    lines.push(`Signature traits: ${ctx.genome.signature_traits.join(', ')}`);
  }
  lines.push('');

  // Constraints
  if (ctx.constraints.banned_words.length > 0) {
    lines.push(`=== BANNED WORDS (never use) ===`);
    lines.push(ctx.constraints.banned_words.join(', '));
    lines.push('');
  }
  if (ctx.constraints.forbidden_cliches && ctx.constraints.forbidden_cliches.length > 0) {
    lines.push(`=== BANNED CLICHÉS ===`);
    lines.push(ctx.constraints.forbidden_cliches.join(', '));
    lines.push('');
  }

  // Position marker
  if (ctx.isFirstScene) {
    lines.push(`=== POSITION: OPENING SCENE — set the tone ===`);
  } else if (ctx.isLastScene) {
    lines.push(`=== POSITION: FINAL SCENE — resolve and close ===`);
  }

  lines.push('');
  lines.push('Write the prose for this scene now. Return ONLY the prose text.');

  return lines.join('\n');
}
