/**
 * OMEGA GENESIS v2 — DIFFUSION RUNNER
 * Worst-2 Scheduler: intercepte les rejets paradox/axis_floor
 * et applique des patches chirurgicaux au lieu d'un REJECT sec.
 *
 * INV-DIFF-01: max MAX_DIFFUSION_STEPS iterations
 * INV-DIFF-02: no-regress gate (composite ne peut pas baisser)
 * INV-DIFF-03: PARADOX_CLEANUP déclenché si INV-PARADOX-01/02/03
 */

import type { ForgePacket } from '../../types.js';
import type { SScoreV2 } from '../s-oracle-v2.js';
import type { TranscendentPlanJSON } from './transcendent-planner.js';
import type { LLMJudge } from '../llm-judge.js';
import { getPatchInstruction } from './patch-dsl.js';
import type { PatchKind } from './patch-dsl.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

// ── CONFIG ──────────────────────────────────────────────────────────────────

const MAX_DIFFUSION_STEPS = parseInt(process.env['DIFFUSION_MAX_STEPS'] ?? '3', 10);
const DIFFUSION_COMPOSITE_THRESHOLD = parseFloat(process.env['DIFFUSION_COMPOSITE_THRESHOLD'] ?? '75');
const DIFFUSION_NO_REGRESS_EPSILON = parseFloat(process.env['DIFFUSION_NO_REGRESS_EPSILON'] ?? '0.5');

export { DIFFUSION_COMPOSITE_THRESHOLD };

// ── TYPES ───────────────────────────────────────────────────────────────────

export interface DiffusionStepResult {
  readonly step: number;
  readonly patch_kind: string;
  readonly prose_before_hash: string;
  readonly prose_after_hash: string;
  readonly composite_before: number;
  readonly composite_after: number;
  readonly rolled_back: boolean;
}

export interface DiffusionRunnerResult {
  readonly final_prose: string;
  readonly steps: readonly DiffusionStepResult[];
  readonly paradox_cleaned: boolean;
  readonly nb_steps: number;
  readonly composite_initial: number;
  readonly composite_final: number;
  readonly diffusion_triggered: boolean;
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * runDiffusionCleanup:
 * Appelé quand scoreV2Async retourne rejection_reason contenant 'paradox_gate'
 * ET composite_without_gate > DIFFUSION_COMPOSITE_THRESHOLD.
 *
 * Tente de corriger la prose chirurgicalement (max MAX_DIFFUSION_STEPS).
 * Retourne la meilleure prose obtenue + metadata.
 */
export async function runDiffusionCleanup(params: {
  prose: string;
  packet: ForgePacket;
  plan: TranscendentPlanJSON;
  initialScore: SScoreV2;
  judge: LLMJudge;
  seed: string;
  scoreAsync: (prose: string, seed: string) => Promise<SScoreV2>;
}): Promise<DiffusionRunnerResult> {
  const { prose, plan, initialScore, judge, scoreAsync } = params;

  const steps: DiffusionStepResult[] = [];
  let currentProse = prose;
  let currentComposite = initialScore.composite_without_gate ?? initialScore.composite;
  let paradoxCleaned = false;
  let lastScore = initialScore;

  for (let step = 1; step <= MAX_DIFFUSION_STEPS; step++) {
    // Identify what to patch
    const patchKind = determinePatchKind(lastScore);
    if (!patchKind) break; // Nothing more to fix

    // Build targeted rewrite prompt
    const cleanupPrompt = buildCleanupPrompt(currentProse, patchKind, plan, lastScore);
    const compositeBeforeStep = currentComposite;

    // LLM call — surgical rewrite only
    const patchedProse = await callCleanupLLM(judge, cleanupPrompt, params.seed + `_diff_${step}`);

    // Re-score
    const newScore = await scoreAsync(patchedProse, params.seed + `_diff_${step}_score`);
    const newComposite = newScore.composite_without_gate ?? newScore.composite;

    // INV-DIFF-02: No-regress gate
    const rolledBack = newComposite < currentComposite - DIFFUSION_NO_REGRESS_EPSILON;

    steps.push({
      step,
      patch_kind: patchKind,
      prose_before_hash: sha256(canonicalize({ prose: currentProse })),
      prose_after_hash: sha256(canonicalize({ prose: patchedProse })),
      composite_before: compositeBeforeStep,
      composite_after: newComposite,
      rolled_back: rolledBack,
    });

    if (rolledBack) {
      // Keep currentProse — do not accept regression
      break;
    }

    currentProse = patchedProse;
    currentComposite = newComposite;
    lastScore = newScore;

    if (patchKind === 'PARADOX_CLEANUP' && !newScore.rejection_reason?.includes('paradox')) {
      paradoxCleaned = true;
    }

    // If paradox cleared and composite > threshold → stop
    if (!newScore.rejection_reason?.includes('paradox') && newComposite >= DIFFUSION_COMPOSITE_THRESHOLD) {
      break;
    }
  }

  return {
    final_prose: currentProse,
    steps,
    paradox_cleaned: paradoxCleaned,
    nb_steps: steps.length,
    composite_initial: initialScore.composite_without_gate ?? initialScore.composite,
    composite_final: currentComposite,
    diffusion_triggered: true,
  };
}

// ── INTERNAL ─────────────────────────────────────────────────────────────────

function determinePatchKind(score: SScoreV2): PatchKind | null {
  // Priority: paradox first, then worst axis
  if (score.rejection_reason?.includes('paradox_gate')) {
    return 'PARADOX_CLEANUP';
  }
  if (score.rejection_reason?.includes('axis_floor_violation')) {
    const axisName = score.rejection_reason.replace('axis_floor_violation: ', '');
    const AXIS_TO_PATCH_MAP: Record<string, PatchKind> = {
      signature: 'SIGNATURE_ANCHOR',
      densite_sensorielle: 'SENSORY_DENSITY',
      tension_14d: 'TENSION_RATCHET',
      necessite_m8: 'NECESSITY_COMPRESS',
      rythme_musical: 'RHYTHM_BREAK',
      interiorite: 'INTERIOR_SURFACE',
      anti_cliche: 'ANTICLICHE_SUBVERT',
    };
    return AXIS_TO_PATCH_MAP[axisName] ?? 'KEEP_CANON';
  }
  return null;
}

function buildCleanupPrompt(
  prose: string,
  patchKind: PatchKind,
  plan: TranscendentPlanJSON,
  score: SScoreV2,
): string {
  const instruction = getPatchInstruction(patchKind);

  if (patchKind === 'PARADOX_CLEANUP') {
    return [
      'Tu es un auteur littéraire. Ta prose ci-dessous est excellente, mais elle contient des mots à éviter.',
      '',
      `MOTS À REMPLACER (uniquement ces mots et leurs formes dérivées): ${plan.forbidden_lexicon.join(', ')}`,
      `LEMMES À ÉVITER: ${plan.forbidden_lemmes.join(', ')}`,
      '',
      'INSTRUCTION: Remplace UNIQUEMENT les phrases contenant ces mots par des formulations alternatives.',
      "Ne touche à rien d'autre. Conserve absolument le rythme, la structure, l'originalité du reste.",
      '',
      '═══ PROSE À CORRIGER ═══',
      prose,
      '═══ FIN PROSE ═══',
      '',
      'Écris la version corrigée directement, sans commentaire.',
    ].join('\n');
  }

  return [
    `Ta prose a un axe faible: ${score.rejection_reason ?? 'inconnu'}.`,
    `Instruction de correction: ${instruction}`,
    '',
    '═══ PROSE À AMÉLIORER ═══',
    prose,
    '═══ FIN PROSE ═══',
    '',
    'Applique la correction chirurgicalement. Écris la version améliorée directement.',
  ].join('\n');
}

async function callCleanupLLM(
  judge: LLMJudge,
  prompt: string,
  seed: string,
): Promise<string> {
  return judge.generateText(prompt, 2000, seed);
}
