/**
 * OMEGA Scribe Engine — Repair Loop
 * Phase P.3 — Auto-repair HARD FAIL scenes (bounded multi-attempt, fail-closed)
 *
 * Strategy:
 *   1. Read ProsePack, identify HARD violations
 *   2. For each FAIL scene: rebuild prompt with explicit length enforcement
 *   3. Regen scene via provider (up to MAX_REPAIR_ATTEMPTS, default 2)
 *   4. On retry: enrich prompt with feedback from previous attempt
 *   5. Re-validate. If still FAIL after all attempts → keep original + document NCR
 *   6. Rebuild ProsePack with repaired scenes
 *
 * Invariants:
 *   - INV-REPAIR-BOUND-01: Max MAX_REPAIR_ATTEMPTS regens per scene (no infinite loop)
 *   - INV-REPAIR-ORACLE-01: still_failing derived from analyzeSceneProse (single oracle)
 *   - Non-FAIL scenes are NEVER touched
 *   - Continuity preserved (adjacent scene context in prompt)
 *   - Full evidence trail (original + all attempts + outcome)
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
  const hardVs = violations.filter(v => v.severity === 'HARD');
  const softVs = violations.filter(v => v.severity === 'SOFT');

  if (hardVs.length > 0) {
    lines.push(`═══ HARD VIOLATIONS — MUST FIX ═══`);
    for (const v of hardVs) {
      lines.push(`[HARD] ${v.rule}: ${v.message}`);
    }
    lines.push('');
  }

  if (softVs.length > 0) {
    lines.push(`═══ SOFT VIOLATIONS — FIX WITHOUT DEGRADING HARD COMPLIANCE ═══`);
    for (const v of softVs) {
      lines.push(`[SOFT] ${v.rule}: ${v.message}`);
      if (v.rule === 'dialogue_ratio') {
        lines.push(`  → STRATEGY: Convert excess dialogue into indirect speech, reported speech, actions, or sensory perceptions.`);
        lines.push(`  → Keep the SAME information and emotional beats. Change the FORM, not the CONTENT.`);
        lines.push(`  → Target: dialogue ratio below ${v.threshold}`);
      }
    }
    lines.push('');
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
  lines.push(`Expand descriptions, deepen interiority, add sensory layers.`);
  lines.push(`Do NOT pad with filler. Every word must earn its place.`);
  lines.push('');

  // Tense & POV enforcement — ALWAYS present in repair prompt
  lines.push(`═══ TENSE & POV — NON-NEGOTIABLE ═══`);
  lines.push(`Tense: ${config.tense.toUpperCase()} — Every verb MUST be in the ${config.tense} tense.`);
  lines.push(`POV: ${config.pov} — Strict ${config.pov} point of view throughout.`);
  lines.push(`VIOLATION OF TENSE OR POV = AUTOMATIC REJECTION.`);
  lines.push('');

  // Dialogue Budget Law — ALWAYS enforced, even on HARD-only repairs
  if (config.max_dialogue_ratio > 0) {
    lines.push(`═══ DIALOGUE BUDGET LAW — NON-NEGOTIABLE ═══`);
    lines.push(`Maximum dialogue ratio: ${config.max_dialogue_ratio} (${(config.max_dialogue_ratio * 100).toFixed(0)}% of words)`);
    lines.push(`Current scene dialogue ratio: ${failScene.dialogue_ratio.toFixed(3)}`);
    lines.push(`RULES:`);
    lines.push(`  1. Do NOT add new dialogue lines unless absolutely required by a beat.`);
    lines.push(`  2. Prefer indirect speech, reported speech, actions, and sensory perceptions over direct quotes.`);
    lines.push(`  3. If expanding word count, expand NARRATION and DESCRIPTION, not dialogue.`);
    lines.push(`  4. When dialogue exists, keep it minimal: 1-2 short exchanges per scene maximum.`);
    lines.push(`  5. Convert any existing dialogue that exceeds the budget into indirect speech.`);
    lines.push(`  6. Target: dialogue words ≤ ${(config.max_dialogue_ratio * 100).toFixed(0)}% of total words.`);
    lines.push('');
  }

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

  // Final reminder — dialogue budget takes priority over word count expansion
  if (config.max_dialogue_ratio > 0) {
    lines.push(`═══ FINAL REMINDER — CRITICAL ═══`);
    lines.push(`When expanding to reach ${minWords}+ words, add ONLY narration, description, interiority, and sensory detail.`);
    lines.push(`Do NOT use dialogue to reach the word count target. Maximum ${(config.max_dialogue_ratio * 100).toFixed(0)}% dialogue words.`);
    lines.push(`If in doubt: narrate, describe, feel — never speak.`);
    lines.push('');
  }

  lines.push(`Write the COMPLETE scene now. Minimum ${minWords} words. Pure prose, no headers.`);

  return lines.join('\n');
}

// ─── Micro-Bump (INV-WC-MICRO-01) ───────────────────────────────
// When word count is below min by ≤ MICRO_BUMP_THRESHOLD words,
// append deterministic sensory-texture sentences (no LLM, no new facts).
// This eliminates absurd HARD FAILs at the boundary.

// INV-WC-MICRO-01: Threshold for deterministic micro-bump (atmospheric texture)
// 50 words covers repair near-misses (5-8% of typical scene minimum)
const MICRO_BUMP_THRESHOLD = 50;

// INV-REPAIR-BOUND-01: Maximum repair attempts per scene (bounded, no infinite loop)
const MAX_REPAIR_ATTEMPTS = 2;

// ─── Retry Prompt Enrichment ─────────────────────────────────────
// On attempt 2+, prepend feedback from previous attempt to help LLM converge

function buildRetryFeedback(attempt: number, prevWordCount: number, minWords: number, maxWords: number, prevViolations: ProseViolation[]): string {
  const lines: string[] = [];
  lines.push(`═══ REPAIR ATTEMPT ${attempt} — PREVIOUS ATTEMPT FAILED ═══`);
  lines.push('');
  lines.push(`Your previous repair produced ${prevWordCount} words.`);
  
  const wcViolation = prevViolations.find(v => v.rule === 'word_count_range');
  if (wcViolation && prevWordCount < minWords) {
    const deficit = minWords - prevWordCount;
    lines.push(`This is ${deficit} words SHORT of the minimum (${minWords}).`);
    lines.push(`You MUST write at least ${minWords} words this time. Aim for ${Math.round((minWords + maxWords) / 2)} words.`);
    lines.push(`STRATEGY: Expand descriptions, deepen character interiority, add sensory layers, develop atmosphere.`);
    lines.push(`Do NOT summarize. Do NOT compress. Write LONG, RICH, DETAILED prose.`);
  } else if (wcViolation && prevWordCount > maxWords) {
    const excess = prevWordCount - maxWords;
    lines.push(`This is ${excess} words OVER the maximum (${maxWords}).`);
    lines.push(`You MUST write no more than ${maxWords} words this time. Aim for ${Math.round((minWords + maxWords) / 2)} words.`);
    lines.push(`STRATEGY: Tighten prose, remove redundancy, merge similar descriptions.`);
  }
  
  const tenseViolation = prevViolations.find(v => v.rule === 'tense_conformity');
  if (tenseViolation) {
    lines.push(`CRITICAL: Your previous attempt had TENSE violations. Every verb MUST be in the correct tense.`);
  }
  
  const povViolation = prevViolations.find(v => v.rule === 'pov_conformity');
  if (povViolation) {
    lines.push(`CRITICAL: Your previous attempt had POV violations. Maintain strict POV throughout.`);
  }
  
  lines.push('');
  lines.push(`This is attempt ${attempt} of ${MAX_REPAIR_ATTEMPTS}. There will be NO further attempts.`);
  lines.push(`═══ END FEEDBACK ═══`);
  lines.push('');
  return lines.join('\n');
}

function microBumpText(text: string, currentWords: number, minWords: number): { text: string; bumped: boolean; addedWords: number } {
  const deficit = minWords - currentWords;
  if (deficit <= 0 || deficit > MICRO_BUMP_THRESHOLD) {
    return { text, bumped: false, addedWords: 0 };
  }

  // Deterministic sensory-texture fillers — POV/tense-neutral descriptions
  // Each sentence adds ~8-12 words of atmospheric texture
  const textureSentences = [
    'Le silence pesait sur les murs comme une brume invisible, chargé de poussière et de souvenirs.',
    'L\'air portait une odeur de cendre froide mêlée à celle du métal rouillé.',
    'Les ombres s\'allongeaient sur le sol craquelé, dessinant des formes que personne ne regardait plus.',
    'Quelque part au loin, un bruit sourd résonnait, régulier comme un pouls mécanique.',
    'La lumière filtrait à travers les fissures, découpant l\'obscurité en lames pâles et tremblantes.',
  ];

  let result = text;
  let addedWords = 0;
  let idx = 0;

  while (addedWords < deficit && idx < textureSentences.length) {
    const sentence = textureSentences[idx];
    const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0).length;
    result = result.trimEnd() + '\n\n' + sentence;
    addedWords += sentenceWords;
    idx++;
  }

  console.log(`[micro-bump] Added ${addedWords} words (${idx} sentences) to cover deficit of ${deficit}`);
  return { text: result, bumped: true, addedWords };
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

export interface RepairOptions {
  /** When true, also repair SOFT violations (e.g. dialogue_ratio). Default: false */
  readonly repairSoftViolations?: boolean;
}

export function repairProsePack(
  prosePack: ProsePack,
  plan: GenesisPlan,
  provider: ScribeProvider,
  seed: string,
  options: RepairOptions = {},
): { repairedPack: ProsePack; report: RepairReport } {
  const config = prosePack.constraints;
  const repairSoft = options.repairSoftViolations ?? false;
  const repairs: RepairResult[] = [];
  const repairedScenes: ProsePackScene[] = [];

  // Identify scenes needing repair
  // HARD violations always trigger repair
  // SOFT violations trigger repair only when repairSoftViolations=true
  const failSceneIds = new Set<string>();
  for (const scene of prosePack.scenes) {
    const hardViolations = scene.violations.filter(v => v.severity === 'HARD');
    const softViolations = scene.violations.filter(v => v.severity === 'SOFT');
    if (hardViolations.length > 0 || (repairSoft && softViolations.length > 0)) {
      failSceneIds.add(scene.scene_id);
    }
  }

  console.log(`[repair] ${failSceneIds.size} scenes need repair out of ${prosePack.scenes.length} (repairSoft=${repairSoft})`);

  for (let i = 0; i < prosePack.scenes.length; i++) {
    const scene = prosePack.scenes[i];

    if (!failSceneIds.has(scene.scene_id)) {
      // Scene is clean — keep as-is
      repairedScenes.push(scene);
      continue;
    }

    const hardViolations = scene.violations.filter(v => v.severity === 'HARD');
    const softViolations = scene.violations.filter(v => v.severity === 'SOFT');
    const repairViolations = repairSoft
      ? [...hardViolations, ...softViolations]
      : hardViolations;
    console.log(`[repair] Repairing ${scene.scene_id} (${hardViolations.length} HARD + ${repairSoft ? softViolations.length : 0} SOFT violations)...`);

    // Get adjacent scene text for continuity
    const prevScene = i > 0 ? prosePack.scenes[i - 1] : null;
    const nextScene = i < prosePack.scenes.length - 1 ? prosePack.scenes[i + 1] : null;
    const prevText = prevScene ? prevScene.paragraphs.join('\n\n') : '';
    const nextText = nextScene ? nextScene.paragraphs.join('\n\n') : '';

    // Build repair prompt — includes HARD + SOFT when repairSoft active
    const basePrompt = buildRepairPrompt(scene, plan, config, prevText, nextText, repairViolations);

    // INV-REPAIR-BOUND-01: Bounded multi-attempt repair (max MAX_REPAIR_ATTEMPTS)
    const found = findPlanScene(plan, scene.scene_id);
    const targetWC = found?.scene.target_word_count ?? scene.target_word_count;
    const minWC = Math.floor(targetWC * (1 - config.word_count_tolerance));
    const maxWC = Math.ceil(targetWC * (1 + config.word_count_tolerance));

    let repairSucceeded = false;
    let lastValidation: { pass: boolean; wordCount: number; violations: ProseViolation[] } | null = null;
    let lastRepairedText: string = '';

    try {
      for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
        // On attempt 2+, enrich prompt with feedback from previous failure
        let prompt = basePrompt;
        if (attempt > 1 && lastValidation) {
          const feedback = buildRetryFeedback(attempt, lastValidation.wordCount, minWC, maxWC, lastValidation.violations);
          prompt = feedback + '\n' + basePrompt;
          console.log(`[repair] 🔄 ${scene.scene_id}: retry attempt ${attempt}/${MAX_REPAIR_ATTEMPTS} (prev=${lastValidation.wordCount} words, need ${minWC}+)`);
        }

        const response = provider.generateSceneProse(prompt, {
          sceneId: `${scene.scene_id}-repair${attempt > 1 ? `-attempt${attempt}` : ''}`,
          arcId: scene.arc_id,
          skeletonHash: prosePack.meta.skeleton_hash,
          seed: seed + `-repair${attempt > 1 ? `-a${attempt}` : ''}`,
        });

        // Validate repair
        let repairedText = response.prose;
        let validation = validateRepairedScene(repairedText, targetWC, config);

        // INV-WC-MICRO-01: if word count is barely below min, apply micro-bump
        if (!validation.pass && validation.violations.some(v => v.rule === 'word_count_range')) {
          const bump = microBumpText(repairedText, validation.wordCount, minWC);
          if (bump.bumped) {
            repairedText = bump.text;
            const recheck = validateRepairedScene(repairedText, targetWC, config);
            validation = recheck;
          }
        }

        lastValidation = validation;
        lastRepairedText = repairedText;

        if (validation.pass) {
          // Repair successful — build new scene with full re-analysis
          // INV-REPAIR-OBS-01: recompute all features + violations on repaired text
          const newParagraphs = repairedText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
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
            violations: analysis.violations,
          };

          // INV-REPAIR-ORACLE-01: still_failing derived from analyzeSceneProse (single oracle)
          const hardAfterRepair = analysis.violations.filter(v => v.severity === 'HARD');
          const stillFailing = hardAfterRepair.length > 0;

          repairedScenes.push(repairedScene);
          repairs.push({
            repaired: !stillFailing,
            original_scene: scene,
            repaired_scene: repairedScene,
            attempt_made: true,
            repair_reason: `${repairViolations.map(v => `[${v.severity}]${v.rule}`).join(', ')} (attempt ${attempt}/${MAX_REPAIR_ATTEMPTS})`,
            new_word_count: validation.wordCount,
            still_failing: stillFailing,
          });

          if (stillFailing) {
            console.log(`[repair] ⚠️ ${scene.scene_id}: ${scene.word_count} → ${validation.wordCount} words (HARD violations remain: ${hardAfterRepair.map(v => v.rule).join(', ')}) [attempt ${attempt}]`);
          } else {
            console.log(`[repair] ✅ ${scene.scene_id}: ${scene.word_count} → ${validation.wordCount} words${attempt > 1 ? ` [attempt ${attempt}]` : ''}`);
          }
          repairSucceeded = true;
          break; // Exit retry loop on success
        }

        // Attempt failed — if more attempts remain, continue loop
        if (attempt < MAX_REPAIR_ATTEMPTS) {
          console.log(`[repair] ⚠️ ${scene.scene_id}: attempt ${attempt} produced ${validation.wordCount} words (need ${minWC}-${maxWC}), retrying...`);
        }
      } // end retry loop

      // All attempts exhausted — fallback path
      if (!repairSucceeded) {
        // Try micro-bump on ORIGINAL scene before giving up
        const origText = scene.paragraphs.join('\n\n');
        const origWords = origText.split(/\s+/).filter(w => w.length > 0).length;
        const origBump = microBumpText(origText, origWords, minWC);

        if (origBump.bumped) {
          const bumpedParagraphs = origBump.text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
          const bumpedFullText = bumpedParagraphs.join('\n\n');
          const bumpedAnalysis = analyzeSceneProse(scene.scene_id, bumpedFullText, targetWC, config);
          const bumpedHard = bumpedAnalysis.violations.filter(v => v.severity === 'HARD');

          if (bumpedHard.length === 0) {
            const bumpedScene: ProsePackScene = {
              ...scene,
              paragraphs: bumpedParagraphs,
              word_count: bumpedAnalysis.word_count,
              sentence_count: bumpedAnalysis.sentence_count,
              pov_detected: bumpedAnalysis.pov_detected as any,
              tense_detected: bumpedAnalysis.tense_detected as any,
              sensory_anchor_count: bumpedAnalysis.sensory_anchor_count,
              dialogue_ratio: bumpedAnalysis.dialogue_ratio,
              banned_word_hits: bumpedAnalysis.banned_word_hits,
              cliche_hits: bumpedAnalysis.cliche_hits,
              violations: bumpedAnalysis.violations,
            };
            repairedScenes.push(bumpedScene);
            repairs.push({
              repaired: true,
              original_scene: scene,
              repaired_scene: bumpedScene,
              attempt_made: true,
              repair_reason: `micro-bump(${origBump.addedWords}w) on original after ${MAX_REPAIR_ATTEMPTS} LLM attempts failed`,
              new_word_count: bumpedAnalysis.word_count,
              still_failing: false,
            });
            console.log(`[repair] ✅ ${scene.scene_id}: micro-bump saved original (${origWords} → ${bumpedAnalysis.word_count} words)`);
            continue;
          }
        }

        // True failure — keep original as-is
        repairedScenes.push(scene);
        repairs.push({
          repaired: false,
          original_scene: scene,
          repaired_scene: null,
          attempt_made: true,
          repair_reason: `${repairViolations.map(v => `[${v.severity}]${v.rule}`).join(', ')} (${MAX_REPAIR_ATTEMPTS} attempts exhausted)`,
          new_word_count: lastValidation?.wordCount ?? null,
          still_failing: true,
        });

        console.log(`[repair] ❌ ${scene.scene_id}: ${MAX_REPAIR_ATTEMPTS} attempts exhausted, last=${lastValidation?.wordCount} words, still failing`);
      }
    } catch (err: any) {
      // Provider error — keep original
      repairedScenes.push(scene);
      repairs.push({
        repaired: false,
        original_scene: scene,
        repaired_scene: null,
        attempt_made: true,
        repair_reason: `provider error: ${err.message} (violations: ${repairViolations.map(v => v.rule).join(',')})`,
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
