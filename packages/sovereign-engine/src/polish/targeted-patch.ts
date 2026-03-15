/**
 * polish/targeted-patch.ts — Sprint P5 : Targeted Patch
 * V-PARTITION v3.0.0
 *
 * Surgical pass on the weakest axis after V3 scoring.
 * Takes scored V3 prose, identifies weakest of ECC/RCI/SII,
 * generates a focused patch, validates via damage gate.
 *
 * Invariants:
 *   INV-TP-01 : Only targets ECC, RCI, SII (IFI/AAI excluded)
 *   INV-TP-02 : word_change_pct > max_word_change_pct → ROLLBACK
 *   INV-TP-03 : Damage gate REJECT → ROLLBACK
 *   INV-TP-04 : target_delta <= 0 → ROLLBACK (no improvement)
 *   INV-TP-05 : Flag OMEGA_TARGETED_PATCH=1 activates in engine.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import type { MacroSScore } from '../oracle/s-score.js';
import type { MacroAxesScores } from '../oracle/macro-axes.js';
import { evaluateDamage, type DamageGateResult } from '../validation/damage-gate.js';
import { judgeAestheticV3 } from '../oracle/aesthetic-oracle.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';
import type { PhysicsAuditResult } from '../oracle/physics-audit.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type PatchTarget = 'ECC' | 'RCI' | 'SII';

export interface PatchConfig {
  readonly max_word_change_pct: number;
  readonly damage_threshold_per_axis: number;
  readonly force_target?: PatchTarget;
}

export const DEFAULT_PATCH_CONFIG: PatchConfig = {
  max_word_change_pct: 15,
  damage_threshold_per_axis: 2.0,
};

export interface PatchResult {
  readonly original_prose: string;
  readonly patched_prose: string;
  readonly target_axis: PatchTarget;
  readonly target_score_before: number;
  readonly target_score_after: number;
  readonly target_delta: number;
  readonly composite_before: number;
  readonly composite_after: number;
  readonly composite_delta: number;
  readonly damage_gate: DamageGateResult;
  readonly accepted: boolean;
  readonly word_change_pct: number;
  readonly rollback_reason?: string;
}

// ── Flag ─────────────────────────────────────────────────────────────────────

export function isTargetedPatchActive(): boolean {
  return process.env.OMEGA_TARGETED_PATCH === '1';
}

// ── Step 1: Identify weakest axis ───────────────────────────────────────────

/**
 * INV-TP-01: Only considers ECC, RCI, SII.
 */
export function identifyWeakestAxis(
  macroAxes: MacroAxesScores,
  forceTarget?: PatchTarget,
): PatchTarget {
  if (forceTarget) return forceTarget;

  const candidates: { axis: PatchTarget; score: number }[] = [
    { axis: 'ECC', score: macroAxes.ecc.score },
    { axis: 'RCI', score: macroAxes.rci.score },
    { axis: 'SII', score: macroAxes.sii.score },
  ];

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].axis;
}

// ── Step 2: Build patch prompt ──────────────────────────────────────────────

export function buildPatchPrompt(target: PatchTarget, prose: string): string {
  const header = `Tu reçois un texte littéraire. Ce texte est FINAL`;

  const interdictions = `INTERDICTIONS ABSOLUES :
- NE CHANGE AUCUN fait, événement, geste, dialogue, pensée, émotion.
- NE SUPPRIME et NE RAJOUTE aucune information narrative.
- NE RESTRUCTURE PAS la progression dramatique.
- NE MODIFIE PAS plus de 15% des mots du texte.`;

  let mission: string;

  switch (target) {
    case 'RCI':
      mission = `${header} sur le plan narratif.

${interdictions}

TA MISSION UNIQUE : améliorer le rythme et la musicalité.
- Varie les longueurs de phrases (alterner courtes et longues).
- Insère des syncopes (phrases de 3-5 mots) entre les phrases longues.
- Casse les séquences monotones (3+ phrases de longueur similaire).
- Améliore la cadence des ouvertures de phrases (éviter les répétitions).
- Préserve le registre et le ton existants.

Si le texte est déjà bien rythmé, renvoie-le IDENTIQUE.`;
      break;

    case 'ECC':
      mission = `${header} sur le plan structurel.

${interdictions}

TA MISSION UNIQUE : intensifier la cohérence émotionnelle.
- Renforce la PROGRESSION émotionnelle entre les quartiles.
- Montre les émotions par le CORPS (gestes, postures, sensations).
- Remplace les labels émotionnels ("il était triste") par des manifestations physiques ("ses épaules s'affaissèrent").
- Assure que la trajectoire émotionnelle Q1→Q4 est fluide et croissante.

Si le texte est déjà émotionnellement cohérent, renvoie-le IDENTIQUE.`;
      break;

    case 'SII':
      mission = `${header} narrativement et rythmiquement.

${interdictions}

TA MISSION UNIQUE : enrichir la densité sensorielle et la nécessité.
- Remplace les formulations vagues par des détails concrets et sensoriels.
- Chaque phrase doit être NÉCESSAIRE — supprime les mots superflus.
- Renforce l'ancrage corporel (toucher, odorat, proprioception).
- Rends les métaphores plus originales (évite les clichés corporels).

Si le texte est déjà dense et nécessaire, renvoie-le IDENTIQUE.`;
      break;
  }

  return `${mission}

TEXTE À AMÉLIORER :
${prose}`;
}

// ── Step 4: Word change calculation ─────────────────────────────────────────

/**
 * Calculate percentage of words changed between original and patched text.
 * Uses word-set overlap as a fast approximation.
 */
export function calculateWordChangePct(original: string, patched: string): number {
  const origWords = original.split(/\s+/).filter(w => w.length > 0);
  const patchWords = patched.split(/\s+/).filter(w => w.length > 0);

  if (origWords.length === 0) return patchWords.length > 0 ? 100 : 0;

  // Build frequency map of original words
  const origFreq = new Map<string, number>();
  for (const w of origWords) {
    origFreq.set(w, (origFreq.get(w) ?? 0) + 1);
  }

  // Count patched words that are "consumed" from original
  const remainFreq = new Map(origFreq);
  let matched = 0;
  for (const w of patchWords) {
    const count = remainFreq.get(w) ?? 0;
    if (count > 0) {
      remainFreq.set(w, count - 1);
      matched++;
    }
  }

  // Changed words = words not matched
  const totalWords = Math.max(origWords.length, patchWords.length);
  const changed = totalWords - matched;
  return Math.round((changed / totalWords) * 1000) / 10; // 1 decimal
}

// ── Helper: extract axis score ──────────────────────────────────────────────

function getAxisScore(macroAxes: MacroAxesScores, target: PatchTarget): number {
  switch (target) {
    case 'ECC': return macroAxes.ecc.score;
    case 'RCI': return macroAxes.rci.score;
    case 'SII': return macroAxes.sii.score;
  }
}

// ── Main: runTargetedPatch ──────────────────────────────────────────────────

/**
 * runTargetedPatch() — Surgical pass on weakest axis.
 *
 * Steps:
 *   1. Identify weakest axis (ECC/RCI/SII)
 *   2. Build focused patch prompt
 *   3. Call LLM
 *   4. Validate word change %
 *   5. Score patched prose with judgeAestheticV3
 *   6. Damage gate check
 *   7. Verify improvement on target axis
 *   8. Accept or rollback
 */
export async function runTargetedPatch(
  packet: ForgePacket,
  prose: string,
  macroScore: MacroSScore,
  provider: SovereignProvider,
  config?: Partial<PatchConfig>,
  symbolMap?: SymbolMap | null,
  physicsAudit?: PhysicsAuditResult,
): Promise<PatchResult> {
  const cfg: PatchConfig = { ...DEFAULT_PATCH_CONFIG, ...config };
  const macroAxes = macroScore.macro_axes;

  // 1. Identify target
  const target = identifyWeakestAxis(macroAxes, cfg.force_target);
  const targetScoreBefore = getAxisScore(macroAxes, target);

  console.log(`[TARGETED-PATCH] Target: ${target} (score=${targetScoreBefore.toFixed(1)})`);

  // 2. Build prompt
  const patchPrompt = buildPatchPrompt(target, prose);

  // 3. Call LLM
  const patchedProse = await provider.generateDraft(patchPrompt, 'default', packet.seeds.llm_seed);

  // 4. Word change check (INV-TP-02)
  const wordChangePct = calculateWordChangePct(prose, patchedProse);
  console.log(`[TARGETED-PATCH] Word change: ${wordChangePct.toFixed(1)}%`);

  if (wordChangePct > cfg.max_word_change_pct) {
    console.warn(`[TARGETED-PATCH] ROLLBACK: word_change_pct ${wordChangePct.toFixed(1)}% > ${cfg.max_word_change_pct}%`);
    return makeRollback(prose, patchedProse, target, targetScoreBefore, macroScore,
      wordChangePct, `word_change_pct ${wordChangePct.toFixed(1)}% > max ${cfg.max_word_change_pct}%`);
  }

  // If text is identical, no need to re-score — delta is 0
  if (wordChangePct === 0) {
    console.warn(`[TARGETED-PATCH] ROLLBACK: text unchanged (0% change)`);
    return makeRollback(prose, patchedProse, target, targetScoreBefore, macroScore,
      0, 'no improvement on target axis');
  }

  // 5. Score patched prose
  const patchedMacroScore = await judgeAestheticV3(packet, patchedProse, provider, symbolMap ?? null, physicsAudit);
  const patchedMacroAxes = patchedMacroScore.macro_axes;

  // 6. Damage gate (INV-TP-03)
  const damageResult = evaluateDamage(macroAxes, patchedMacroAxes, { mode: 'REJECT' });

  if (damageResult.verdict === 'REJECT') {
    console.warn(`[TARGETED-PATCH] ROLLBACK: damage gate REJECT — ${damageResult.warnings.join('; ')}`);
    return {
      original_prose: prose,
      patched_prose: patchedProse,
      target_axis: target,
      target_score_before: targetScoreBefore,
      target_score_after: getAxisScore(patchedMacroAxes, target),
      target_delta: getAxisScore(patchedMacroAxes, target) - targetScoreBefore,
      composite_before: macroScore.composite,
      composite_after: patchedMacroScore.composite,
      composite_delta: patchedMacroScore.composite - macroScore.composite,
      damage_gate: damageResult,
      accepted: false,
      word_change_pct: wordChangePct,
      rollback_reason: `damage gate: ${damageResult.warnings.join('; ')}`,
    };
  }

  // 7. Verify improvement (INV-TP-04)
  const targetScoreAfter = getAxisScore(patchedMacroAxes, target);
  const targetDelta = targetScoreAfter - targetScoreBefore;

  if (targetDelta <= 0) {
    console.warn(`[TARGETED-PATCH] ROLLBACK: no improvement on ${target} (delta=${targetDelta.toFixed(1)})`);
    return {
      original_prose: prose,
      patched_prose: patchedProse,
      target_axis: target,
      target_score_before: targetScoreBefore,
      target_score_after: targetScoreAfter,
      target_delta: targetDelta,
      composite_before: macroScore.composite,
      composite_after: patchedMacroScore.composite,
      composite_delta: patchedMacroScore.composite - macroScore.composite,
      damage_gate: damageResult,
      accepted: false,
      word_change_pct: wordChangePct,
      rollback_reason: 'no improvement on target axis',
    };
  }

  // 8. Accept
  console.log(`[TARGETED-PATCH] ACCEPTED: ${target} ${targetScoreBefore.toFixed(1)} → ${targetScoreAfter.toFixed(1)} (+${targetDelta.toFixed(1)})`);
  return {
    original_prose: prose,
    patched_prose: patchedProse,
    target_axis: target,
    target_score_before: targetScoreBefore,
    target_score_after: targetScoreAfter,
    target_delta: targetDelta,
    composite_before: macroScore.composite,
    composite_after: patchedMacroScore.composite,
    composite_delta: patchedMacroScore.composite - macroScore.composite,
    damage_gate: damageResult,
    accepted: true,
    word_change_pct: wordChangePct,
  };
}

// ── Rollback helper ─────────────────────────────────────────────────────────

function makeRollback(
  prose: string, patchedProse: string, target: PatchTarget,
  targetScoreBefore: number, macroScore: MacroSScore,
  wordChangePct: number, reason: string,
): PatchResult {
  const passDamage: DamageGateResult = {
    damages: [], any_exceeded: false, max_drop: 0, verdict: 'PASS', warnings: [],
  };
  return {
    original_prose: prose,
    patched_prose: patchedProse,
    target_axis: target,
    target_score_before: targetScoreBefore,
    target_score_after: targetScoreBefore, // no scoring done
    target_delta: 0,
    composite_before: macroScore.composite,
    composite_after: macroScore.composite,
    composite_delta: 0,
    damage_gate: passDamage,
    accepted: false,
    word_change_pct: wordChangePct,
    rollback_reason: reason,
  };
}
