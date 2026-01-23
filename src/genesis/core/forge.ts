// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Main Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════
// Orchestre le pipeline complet: Validation -> Translation -> Loop -> Output
// Avec fail-fast, budgets, et Pareto selection
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  TruthBundle,
  GenesisConfig,
  ForgeResult,
  Draft,
  ParetoCandidate,
  SentinelResult,
} from './types';

import { validateTruthBundle } from './validator';
import { generateTrajectoryContract, generatePrismConstraints } from './translator';
import { applyPrismWithConstraints } from './prism';
import { evaluateSentinel, evaluateFastGate, filterParetoFrontier } from './sentinel';
import { createDefaultConstraints, mutateDraftConstraints } from './mutator';
import { generateDrafts } from '../engines/drafter';
import {
  createProofContext,
  logIteration,
  logTiming,
  logKill,
  recordDrafterSeed,
  recordMutatorSeed,
  buildProofPack,
} from '../proofs/proof_builder';

/**
 * Execute le pipeline GENESIS FORGE complet
 */
export async function runForge(
  bundle: TruthBundle,
  config: GenesisConfig
): Promise<ForgeResult> {
  const startTime = Date.now();

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-GATE: Validation TruthBundle
  // ═══════════════════════════════════════════════════════════════════════════
  const validation = validateTruthBundle(bundle);
  if (!validation.valid) {
    throw new Error(`Invalid TruthBundle: ${validation.errors.join(', ')}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSLATION: TruthBundle -> Contract + Constraints
  // ═══════════════════════════════════════════════════════════════════════════
  const contract = generateTrajectoryContract(bundle, config);
  const prismConstraints = generatePrismConstraints(contract, bundle);

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE: Proof context + Writing constraints
  // ═══════════════════════════════════════════════════════════════════════════
  const proofCtx = createProofContext(bundle, contract, config);
  let writingConstraints = createDefaultConstraints(42); // Seed initial

  // Statistics
  let totalIterations = 0;
  let totalDrafts = 0;
  let fastGateKills = 0;
  let sentinelKills = 0;
  let sentinelPass = 0;

  // Pareto frontier candidates
  const allPassing: Array<{ draft: Draft; sentinelResult: SentinelResult }> = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  let iteration = 0;

  while (iteration < config.loop.MAX_ITERATIONS) {
    iteration++;
    totalIterations++;
    const iterStartTime = Date.now();

    // Budget check
    if (Date.now() - startTime > config.budgets.BUDGET_MS_TOTAL_FORGE) {
      throw new Error(`Total forge budget exceeded: ${config.budgets.BUDGET_MS_TOTAL_FORGE}ms`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DRAFTER: Generate N drafts
    // ─────────────────────────────────────────────────────────────────────────
    const drafterStart = Date.now();
    const drafts = await generateDrafts(
      contract,
      prismConstraints,
      writingConstraints,
      config,
      iteration
    );
    logTiming(proofCtx, 'drafter', 'generateDrafts', Date.now() - drafterStart);

    totalDrafts += drafts.length;

    // Record seeds
    for (const draft of drafts) {
      recordDrafterSeed(proofCtx, draft.seed);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FAST GATE: Quick elimination (J3 + J5)
    // ─────────────────────────────────────────────────────────────────────────
    const fastGateStart = Date.now();
    const survivors: Draft[] = [];

    for (const draft of drafts) {
      const fastResult = evaluateFastGate(draft, config);

      if (!fastResult.pass) {
        fastGateKills++;
        logKill(proofCtx, draft.id, 'FAST_GATE', `Failed ${fastResult.failedJudge}`, fastResult.failedJudge);
      } else {
        survivors.push(draft);
      }
    }
    logTiming(proofCtx, 'fastGate', 'evaluate', Date.now() - fastGateStart);

    // ─────────────────────────────────────────────────────────────────────────
    // PRISM: Apply creative injection (if configured)
    // ─────────────────────────────────────────────────────────────────────────
    const prismProcessed: Draft[] = [];
    for (const draft of survivors) {
      const prismResult = applyPrismWithConstraints(draft, prismConstraints, draft.seed);
      prismProcessed.push(prismResult.draft);

      if (prismResult.rollbackOccurred) {
        logTiming(proofCtx, 'prism', 'rollback', 0);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SENTINEL: Full evaluation (J1-J7 + P1-P2)
    // ─────────────────────────────────────────────────────────────────────────
    const sentinelStart = Date.now();
    let iterSentinelPass = 0;
    let iterSentinelFail = 0;

    for (const draft of prismProcessed) {
      const sentinelResult = evaluateSentinel(draft, contract, config);

      if (sentinelResult.verdict === 'PASS') {
        sentinelPass++;
        iterSentinelPass++;
        allPassing.push({ draft, sentinelResult });
      } else {
        sentinelKills++;
        iterSentinelFail++;
        logKill(
          proofCtx,
          draft.id,
          'SENTINEL',
          `Failed judges: ${sentinelResult.failedJudges.join(', ')}`,
          sentinelResult.failedJudges[0]
        );
      }
    }
    logTiming(proofCtx, 'sentinel', 'evaluate', Date.now() - sentinelStart);

    // ─────────────────────────────────────────────────────────────────────────
    // LOG ITERATION
    // ─────────────────────────────────────────────────────────────────────────
    logIteration(proofCtx, {
      iteration,
      draftsGenerated: drafts.length,
      fastGateKills: drafts.length - survivors.length,
      sentinelPass: iterSentinelPass,
      sentinelFail: iterSentinelFail,
      mutationApplied: false,
      durationMs: Date.now() - iterStartTime,
    });

    // ─────────────────────────────────────────────────────────────────────────
    // EARLY EXIT: Si on a assez de candidats
    // ─────────────────────────────────────────────────────────────────────────
    if (allPassing.length >= 10) {
      // Assez de candidats pour selection Pareto
      break;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MUTATION: Ajuster contraintes si aucun survivor
    // ─────────────────────────────────────────────────────────────────────────
    if (iterSentinelPass === 0 && prismProcessed.length > 0) {
      // Prendre le dernier draft failed pour les metriques
      const lastDraft = prismProcessed[prismProcessed.length - 1];
      const lastResult = evaluateSentinel(lastDraft, contract, config);

      writingConstraints = mutateDraftConstraints(
        lastResult.failedJudges,
        writingConstraints,
        lastResult,
        config
      );
      recordMutatorSeed(proofCtx, writingConstraints.seed);

      // Update iteration log
      const lastLog = proofCtx.iterationLog[proofCtx.iterationLog.length - 1];
      if (lastLog) {
        lastLog.mutationApplied = true;
      }
    }

    // Iteration budget check
    if (Date.now() - iterStartTime > config.budgets.BUDGET_MS_TOTAL_ITER) {
      // Iteration took too long, continue but log warning
      logTiming(proofCtx, 'iteration', 'budget_exceeded', Date.now() - iterStartTime);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTION: Pareto frontier
  // ═══════════════════════════════════════════════════════════════════════════
  if (allPassing.length === 0) {
    throw new Error(`No valid candidate after ${iteration} iterations`);
  }

  const paretoFrontier = filterParetoFrontier(allPassing);

  // Select best from frontier (highest combined Pareto score)
  const bestCandidate = selectBestFromPareto(paretoFrontier);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD PROOF PACK
  // ═══════════════════════════════════════════════════════════════════════════
  const paretoCandidates: ParetoCandidate[] = paretoFrontier.map(p => ({
    draftId: p.draft.id,
    text: p.draft.text,
    scores: {
      impactDensity: p.sentinelResult.paretoScores.p1_impactDensity,
      styleSignature: p.sentinelResult.paretoScores.p2_styleSignature,
    },
    sentinelResult: p.sentinelResult,
  }));

  const proofPack = buildProofPack(proofCtx, bestCandidate.draft.text, paretoCandidates);

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN RESULT
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    text: bestCandidate.draft.text,
    stats: {
      totalIterations,
      totalDrafts,
      fastGateKills,
      sentinelKills,
      sentinelPass,
    },
    finalScores: bestCandidate.sentinelResult,
    proofPack,
  };
}

/**
 * Selectionne le meilleur candidat de la frontiere Pareto
 */
function selectBestFromPareto(
  frontier: Array<{ draft: Draft; sentinelResult: SentinelResult }>
): { draft: Draft; sentinelResult: SentinelResult } {
  if (frontier.length === 0) {
    throw new Error('Empty Pareto frontier');
  }

  if (frontier.length === 1) {
    return frontier[0];
  }

  // Score combine: moyenne geometrique des scores Pareto
  let best = frontier[0];
  let bestScore = combinedParetoScore(best.sentinelResult);

  for (let i = 1; i < frontier.length; i++) {
    const score = combinedParetoScore(frontier[i].sentinelResult);
    if (score > bestScore) {
      best = frontier[i];
      bestScore = score;
    }
  }

  return best;
}

/**
 * Calcule un score combine pour tri final
 */
function combinedParetoScore(result: SentinelResult): number {
  const p1 = result.paretoScores.p1_impactDensity;
  const p2 = result.paretoScores.p2_styleSignature;

  // Moyenne geometrique pour favoriser l'equilibre
  return Math.sqrt(p1 * p2);
}

export default { runForge };
