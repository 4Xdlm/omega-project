/**
 * OMEGA Scribe Engine — Repair Loop
 * Phase P.3 — Auto-repair HARD FAIL scenes (1 cycle max, fail-closed)
 *
 * Strategy:
 *   1. Read ProsePack, identify HARD violations
 *   2. For each FAIL scene: rebuild prompt with explicit length enforcement
 *   3. Regen scene via provider (1 attempt only)
 *   4. Re-validate. If still FAIL → keep original + document NCR
 *   5. Rebuild ProsePack with repaired scenes
 *
 * Invariants:
 *   - Max 1 regen per scene (no infinite loop)
 *   - Non-FAIL scenes are NEVER touched
 *   - Continuity preserved (adjacent scene context in prompt)
 *   - Full evidence trail (original + repair attempt + outcome)
 */

import { sha256 } from '@omega/canon-kernel';
import type { ScribeProvider, ScribeContext } from '../providers/types.js';
import type { ProsePack, ProsePackScene, ProseViolation, ProseConstraintConfig } from '../prosepack/types.js';
import type { GenesisPlan, Scene } from '../types.js';
import { SCRIBE_SYSTEM_PROMPT } from '../providers/master-prompt.js';
import { analyzeSceneProse } from '../prosepack/normalize.js';

// ─── Types ───────────────────────────────────────────────────────

export interface RepairResult {
  readonly repaired: boolean;
  readonly original_scene: ProsePackScene;
  readonly repaired_scene: ProsePackScene | null;
  readonly attempt_made: boolean;
  readonly repair_reason: string;
  readonly new_word_count: number | null;
  readonly still_failing: boolean;
}

export interface RepairReport {
  readonly total_scenes: number;
  readonly scenes_needing_repair: number;
  readonly scenes_repaired: number;
  readonly scenes_still_failing: number;
  readonly repairs: readonly RepairResult[];
  readonly timestamp: string;
}

// ─── Scene Finder ────────────────────────────────────────────────

function findPlanScene(plan: GenesisPlan, sceneId: string): { scene: Scene; arcTheme: string } | null {
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      if (scene.scene_id === sceneId) {
        return { scene, arcTheme: arc.theme };
      }
    }
  }
  return null;
}

// ─── Repair Prompt Builder ───────────────────────────────────────

function buildRepairPrompt(
  failScene: ProsePackScene,
  plan: GenesisPlan,
  config: ProseConstraintConfig,
  prevSceneText: string,
  nextSceneText: string,
  violations: readonly ProseViolation[],
): string {
  const found = findPlanScene(plan, failScene.scene_id);
  if (!found) throw new Error(`Scene ${failScene.scene_id} not found in plan`);

  const { scene, arcTheme } = found;
  const lines: string[] = [];

  lines.push(`═══ REPAIR ORDER — MANDATORY COMPLIANCE ═══`);
  lines.push('');
  lines.push(`You are rewriting scene ${failScene.scene_id} because it FAILED quality checks.`);
  lines.push(`This is a REPAIR pass. You MUST fix the violations listed below.`);
  lines.push('');

  // Violations to fix
  lines.push(`═══ VIOLATIONS TO FIX ═══`);
  for (const v of violations) {
    lines.push(`[${v.severity}] ${v.rule}: ${v.message}`);
  }
  lines.push('');

  // Word count enforcement (the main issue)
  const minWords = Math.floor(scene.target_word_count * (1 - config.word_count_tolerance));
  const maxWords = Math.ceil(scene.target_word_count * (1 + config.word_count_tolerance));
  lines.push(`═══ WORD COUNT — NON-NEGOTIABLE ═══`);
  lines.push(`Target: ${scene.target_word_count} words`);
  lines.push(`Acceptable range: ${minWords} to ${maxWords} words`);
  lines.push(`Previous attempt produced: ${failScene.word_count} words (INSUFFICIENT)`);
  lines.push(`You MUST write at least ${minWords} words. Count carefully.`);
  lines.push(`Expand descriptions, deepen interiority, add sensory layers, extend dialogue.`);
  lines.push(`Do NOT pad with filler. Every word must earn its place.`);
  lines.push('');

  // Scene context
  lines.push(`═══ SCENE CONTEXT ═══`);
  lines.push(`Arc: ${arcTheme}`);
  lines.push(`Objective: ${scene.objective}`);
  lines.push(`Conflict: ${scene.conflict} (${scene.conflict_type})`);
  lines.push(`Emotion: ${scene.emotion_target} at intensity ${scene.emotion_intensity}`);
  lines.push(`Sensory anchor: ${scene.sensory_anchor}`);
  lines.push('');

  // Style
  lines.push(`═══ STYLE CONSTRAINTS ═══`);
  lines.push(`POV: ${config.pov} | Tense: ${config.tense}`);
  if (config.banned_words.length > 0) {
    lines.push(`Banned words (zero tolerance): ${config.banned_words.join(', ')}`);
  }
  lines.push('');

  // Continuity — previous scene ending
  if (prevSceneText) {
    const lastSentences = prevSceneText.split(/[.!?]+/).filter(s => s.trim().length > 0).slice(-3);
    lines.push(`═══ CONTINUITY — PREVIOUS SCENE ENDED WITH ═══`);
    lines.push(lastSentences.join('. ').trim() + '.');
    lines.push('');
  }

  // Continuity — next scene beginning
  if (nextSceneText) {
    const firstSentences = nextSceneText.split(/[.!?]+/).filter(s => s.trim().length > 0).slice(0, 2);
    lines.push(`═══ CONTINUITY — NEXT SCENE BEGINS WITH ═══`);
    lines.push(firstSentences.join('. ').trim() + '.');
    lines.push('');
  }

  // Beats from plan
  lines.push(`═══ BEATS TO RENDER ═══`);
  for (let i = 0; i < scene.beats.length; i++) {
    const b = scene.beats[i];
    const pivot = b.pivot ? ' ⚡PIVOT' : '';
    const tension = b.tension_delta === 1 ? ' ↑' : b.tension_delta === -1 ? ' ↓' : '';
    lines.push(`${i + 1}. ${b.action}${pivot}${tension}`);
  }
  lines.push('');

  lines.push(`Write the COMPLETE scene now. Minimum ${minWords} words. Pure prose, no headers.`);

  return lines.join('\n');
}

// ─── Validation ──────────────────────────────────────────────────

function validateRepairedScene(
  newText: string,
  targetWordCount: number,
  config: ProseConstraintConfig,
): { pass: boolean; wordCount: number; violations: ProseViolation[] } {
  const words = newText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const minWords = Math.floor(targetWordCount * (1 - config.word_count_tolerance));
  const maxWords = Math.ceil(targetWordCount * (1 + config.word_count_tolerance));

  const violations: ProseViolation[] = [];

  if (wordCount < minWords || wordCount > maxWords) {
    violations.push({
      scene_id: 'repair',
      rule: 'word_count_range',
      severity: 'HARD',
      message: `Repaired word count ${wordCount} outside [${minWords}, ${maxWords}]`,
      value: wordCount,
      threshold: `${minWords}-${maxWords}`,
    });
  }

  // Banned words
  const lower = newText.toLowerCase();
  const bannedHits = config.banned_words.filter(w => lower.includes(w.toLowerCase()));
  if (bannedHits.length > 0) {
    violations.push({
      scene_id: 'repair',
      rule: 'banned_words',
      severity: 'HARD',
      message: `Banned words in repair: ${bannedHits.join(', ')}`,
      value: bannedHits.length,
      threshold: 0,
    });
  }

  const hardViolations = violations.filter(v => v.severity === 'HARD');
  return { pass: hardViolations.length === 0, wordCount, violations };
}

// ─── Main Repair Loop ────────────────────────────────────────────

export function repairProsePack(
  prosePack: ProsePack,
  plan: GenesisPlan,
  provider: ScribeProvider,
  seed: string,
): { repairedPack: ProsePack; report: RepairReport } {
  const config = prosePack.constraints;
  const repairs: RepairResult[] = [];
  const repairedScenes: ProsePackScene[] = [];

  // Identify scenes needing repair (HARD violations only)
  const failSceneIds = new Set<string>();
  for (const scene of prosePack.scenes) {
    const hardViolations = scene.violations.filter(v => v.severity === 'HARD');
    if (hardViolations.length > 0) {
      failSceneIds.add(scene.scene_id);
    }
  }

  console.log(`[repair] ${failSceneIds.size} scenes need repair out of ${prosePack.scenes.length}`);

  for (let i = 0; i < prosePack.scenes.length; i++) {
    const scene = prosePack.scenes[i];

    if (!failSceneIds.has(scene.scene_id)) {
      // Scene is clean — keep as-is
      repairedScenes.push(scene);
      continue;
    }

    const hardViolations = scene.violations.filter(v => v.severity === 'HARD');
    console.log(`[repair] Repairing ${scene.scene_id} (${hardViolations.length} HARD violations)...`);

    // Get adjacent scene text for continuity
    const prevScene = i > 0 ? prosePack.scenes[i - 1] : null;
    const nextScene = i < prosePack.scenes.length - 1 ? prosePack.scenes[i + 1] : null;
    const prevText = prevScene ? prevScene.paragraphs.join('\n\n') : '';
    const nextText = nextScene ? nextScene.paragraphs.join('\n\n') : '';

    // Build repair prompt
    const prompt = buildRepairPrompt(scene, plan, config, prevText, nextText, hardViolations);

    // Call provider (1 attempt)
    try {
      const response = provider.generateSceneProse(prompt, {
        sceneId: `${scene.scene_id}-repair`,
        arcId: scene.arc_id,
        skeletonHash: prosePack.meta.skeleton_hash,
        seed: seed + '-repair',
      });

      // Validate repair
      const found = findPlanScene(plan, scene.scene_id);
      const targetWC = found?.scene.target_word_count ?? scene.target_word_count;
      const validation = validateRepairedScene(response.prose, targetWC, config);

      if (validation.pass) {
        // Repair successful — build new scene with full re-analysis
        // INV-REPAIR-OBS-01: recompute all features + violations on repaired text
        const newParagraphs = response.prose.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        const fullText = newParagraphs.join('\n\n');
        const analysis = analyzeSceneProse(scene.scene_id, fullText, targetWC, config);

        const repairedScene: ProsePackScene = {
          ...scene,
          paragraphs: newParagraphs,
          word_count: analysis.word_count,
          sentence_count: analysis.sentence_count,
          pov_detected: analysis.pov_detected as any,
          tense_detected: analysis.tense_detected as any,
          sensory_anchor_count: analysis.sensory_anchor_count,
          dialogue_ratio: analysis.dialogue_ratio,
          banned_word_hits: analysis.banned_word_hits,
          cliche_hits: analysis.cliche_hits,
          violations: analysis.violations, // recomputed, not wiped
        };

        repairedScenes.push(repairedScene);
        repairs.push({
          repaired: true,
          original_scene: scene,
          repaired_scene: repairedScene,
          attempt_made: true,
          repair_reason: hardViolations.map(v => v.rule).join(', '),
          new_word_count: validation.wordCount,
          still_failing: false,
        });

        console.log(`[repair] ✅ ${scene.scene_id}: ${scene.word_count} → ${validation.wordCount} words`);
      } else {
        // Repair failed — keep original, document NCR
        repairedScenes.push(scene);
        repairs.push({
          repaired: false,
          original_scene: scene,
          repaired_scene: null,
          attempt_made: true,
          repair_reason: hardViolations.map(v => v.rule).join(', '),
          new_word_count: validation.wordCount,
          still_failing: true,
        });

        console.log(`[repair] ❌ ${scene.scene_id}: repair produced ${validation.wordCount} words, still failing`);
      }
    } catch (err: any) {
      // Provider error — keep original
      repairedScenes.push(scene);
      repairs.push({
        repaired: false,
        original_scene: scene,
        repaired_scene: null,
        attempt_made: true,
        repair_reason: `provider error: ${err.message}`,
        new_word_count: null,
        still_failing: true,
      });

      console.log(`[repair] ❌ ${scene.scene_id}: provider error — ${err.message}`);
    }
  }

  // Rebuild ProsePack with repaired scenes
  const totalWords = repairedScenes.reduce((s, sc) => s + sc.word_count, 0);
  const totalSentences = repairedScenes.reduce((s, sc) => s + sc.sentence_count, 0);
  const totalParagraphs = repairedScenes.reduce((s, sc) => s + sc.paragraphs.length, 0);

  const allViolations = repairedScenes.flatMap(s => s.violations);
  const hardViolations = allViolations.filter(v => v.severity === 'HARD');
  const softViolations = allViolations.filter(v => v.severity === 'SOFT');

  const repairedPack: ProsePack = {
    ...prosePack,
    scenes: repairedScenes,
    total_words: totalWords,
    total_sentences: totalSentences,
    total_paragraphs: totalParagraphs,
    score: {
      schema_ok: true,
      constraint_satisfaction: repairedScenes.length > 0
        ? Math.max(0, 1 - hardViolations.length / (repairedScenes.length * 4))
        : 0,
      hard_pass: hardViolations.length === 0,
      soft_pass: softViolations.length === 0,
      total_violations: allViolations.length,
      hard_violations: hardViolations.length,
      soft_violations: softViolations.length,
    },
  };

  const report: RepairReport = {
    total_scenes: prosePack.scenes.length,
    scenes_needing_repair: failSceneIds.size,
    scenes_repaired: repairs.filter(r => r.repaired).length,
    scenes_still_failing: repairs.filter(r => r.still_failing).length,
    repairs,
    timestamp: new Date().toISOString(),
  };

  return { repairedPack, report };
}
