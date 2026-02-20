// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — SENTINEL (Judge Aggregation)
// ═══════════════════════════════════════════════════════════════════════════════
// Agregation AND(J1..J7) + scores Pareto (P1, P2)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Draft,
  EmotionTrajectoryContract,
  GenesisConfig,
  SentinelResult,
  JudgeScore,
} from './types';

// Import all judges
import evaluateEmotionBinding from '../judges/j1_emotion_binding';
import evaluateCoherence from '../judges/j2_coherence';
import evaluateSterility from '../judges/j3_sterility';
import evaluateUniqueness from '../judges/j4_uniqueness';
import evaluateDensity from '../judges/j5_density';
import evaluateResonance from '../judges/j6_resonance';
import evaluateAntiGaming from '../judges/j7_anti_gaming';
import evaluateImpactDensity from '../judges/p1_impact_density';
import evaluateStyleSignature from '../judges/p2_style_signature';

/**
 * Evalue un draft avec tous les juges (Sentinel)
 */
export function evaluateSentinel(
  draft: Draft,
  contract: EmotionTrajectoryContract,
  config: GenesisConfig
): SentinelResult {
  // Evaluer tous les juges bloquants
  const j1 = evaluateEmotionBinding(draft, contract, config);
  const j2 = evaluateCoherence(draft, config);
  const j3 = evaluateSterility(draft, config);
  const j4 = evaluateUniqueness(draft, config);
  const j5 = evaluateDensity(draft, config);
  const j6 = evaluateResonance(draft, contract, config);
  const j7 = evaluateAntiGaming(draft, config);

  // Evaluer les scores Pareto (non-bloquants)
  const p1 = evaluateImpactDensity(draft, config);
  const p2 = evaluateStyleSignature(draft, config);

  // Collecter les juges qui ont echoue
  const failedJudges: string[] = [];
  const judgeResults: [string, JudgeScore][] = [
    ['j1_emotionBinding', j1],
    ['j2_coherence', j2],
    ['j3_sterility', j3],
    ['j4_uniqueness', j4],
    ['j5_density', j5],
    ['j6_resonance', j6],
    ['j7_antiGaming', j7],
  ];

  for (const [name, score] of judgeResults) {
    if (score.verdict === 'FAIL') {
      failedJudges.push(name);
    }
  }

  // Verdict global: tous les juges doivent passer
  const allPass = failedJudges.length === 0;

  return {
    verdict: allPass ? 'PASS' : 'FAIL',
    scores: {
      j1_emotionBinding: j1,
      j2_coherence: j2,
      j3_sterility: j3,
      j4_uniqueness: j4,
      j5_density: j5,
      j6_resonance: j6,
      j7_antiGaming: j7,
    },
    paretoScores: {
      p1_impactDensity: p1,
      p2_styleSignature: p2,
    },
    failedJudges,
  };
}

/**
 * Evalue uniquement les juges rapides (pour Fast Gate)
 */
export function evaluateFastGate(
  draft: Draft,
  config: GenesisConfig
): { pass: boolean; failedJudge?: string } {
  // J3 Sterility (cliches) - rapide
  const j3 = evaluateSterility(draft, config);
  if (j3.verdict === 'FAIL') {
    return { pass: false, failedJudge: 'j3_sterility' };
  }

  // J5 Density quick check - rapide
  const j5 = evaluateDensity(draft, config);
  if (j5.verdict === 'FAIL') {
    return { pass: false, failedJudge: 'j5_density' };
  }

  return { pass: true };
}

/**
 * Compare deux resultats Sentinel pour tri Pareto
 * Retourne true si a domine b (meilleur sur au moins un critere, pas pire sur les autres)
 */
export function paretoDominates(a: SentinelResult, b: SentinelResult): boolean {
  // Si a n'a pas PASS, il ne peut pas dominer
  if (a.verdict !== 'PASS') return false;

  // Si b n'a pas PASS mais a oui, a domine
  if (b.verdict !== 'PASS') return true;

  // Comparer les scores Pareto
  const p1Better = a.paretoScores.p1_impactDensity >= b.paretoScores.p1_impactDensity;
  const p2Better = a.paretoScores.p2_styleSignature >= b.paretoScores.p2_styleSignature;
  const p1StrictlyBetter = a.paretoScores.p1_impactDensity > b.paretoScores.p1_impactDensity;
  const p2StrictlyBetter = a.paretoScores.p2_styleSignature > b.paretoScores.p2_styleSignature;

  // a domine b si a est au moins aussi bon sur tous les criteres et strictement meilleur sur au moins un
  return p1Better && p2Better && (p1StrictlyBetter || p2StrictlyBetter);
}

/**
 * Filtre les candidats pour garder seulement la frontiere Pareto
 */
export function filterParetoFrontier<T extends { sentinelResult: SentinelResult }>(
  candidates: T[]
): T[] {
  // Garder seulement les candidats PASS
  const passing = candidates.filter(c => c.sentinelResult.verdict === 'PASS');
  if (passing.length === 0) return [];

  // Filtrer pour la frontiere Pareto
  const frontier: T[] = [];

  for (const candidate of passing) {
    // Verifier si un candidat de la frontiere domine celui-ci
    let dominated = false;
    for (const frontierCandidate of frontier) {
      if (paretoDominates(frontierCandidate.sentinelResult, candidate.sentinelResult)) {
        dominated = true;
        break;
      }
    }

    if (!dominated) {
      // Retirer les candidats de la frontiere domines par celui-ci
      const newFrontier = frontier.filter(
        fc => !paretoDominates(candidate.sentinelResult, fc.sentinelResult)
      );
      newFrontier.push(candidate);
      frontier.length = 0;
      frontier.push(...newFrontier);
    }
  }

  return frontier;
}

export default {
  evaluateSentinel,
  evaluateFastGate,
  paretoDominates,
  filterParetoFrontier,
};
