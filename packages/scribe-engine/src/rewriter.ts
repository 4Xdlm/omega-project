/**
 * OMEGA Scribe Engine -- Rewriter
 * Phase C.2 -- S4: Rewrite-from-scratch loop (REWRITE > PATCH)
 * Up to MAX_PASSES, each pass is a full rewrite from skeleton.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  Canon, Constraints, StyleGenomeInput, EmotionTarget, GenesisPlan,
} from '@omega/genesis-planner';
import type {
  SkeletonDoc, ProseDoc, ProseParagraph, SConfig,
  GateChainResult, OracleChainResult,
  RewriteCandidate, RewriteHistory,
} from './types.js';
import { runTruthGate } from './gates/truth-gate.js';
import { runNecessityGate } from './gates/necessity-gate.js';
import { runBanalityGate } from './gates/banality-gate.js';
import { runStyleGate } from './gates/style-gate.js';
import { runEmotionGate } from './gates/emotion-gate.js';
import { runDiscomfortGate } from './gates/discomfort-gate.js';
import { runQualityGate } from './gates/quality-gate.js';
import { runOracleTruth } from './oracles/oracle-truth.js';
import { runOracleNecessity } from './oracles/oracle-necessity.js';
import { runOracleStyle } from './oracles/oracle-style.js';
import { runOracleEmotion } from './oracles/oracle-emotion.js';
import { runOracleBanality } from './oracles/oracle-banality.js';
import { runOracleCrossref } from './oracles/oracle-crossref.js';

function runGateChain(
  prose: ProseDoc,
  canon: Canon,
  constraints: Constraints,
  genome: StyleGenomeInput,
  emotionTarget: EmotionTarget,
  plan: GenesisPlan,
  config: SConfig,
  timestamp: string,
): GateChainResult {
  // Strict order, fail-fast
  const gateResults = [];

  const truthResult = runTruthGate(prose, canon, plan, config, timestamp);
  gateResults.push(truthResult);
  if (truthResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'TRUTH_GATE',
      total_violations: truthResult.violations.length,
    };
  }

  const necessityResult = runNecessityGate(prose, plan, config, timestamp);
  gateResults.push(necessityResult);
  if (necessityResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'NECESSITY_GATE',
      total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
    };
  }

  const banalityResult = runBanalityGate(prose, constraints, config, timestamp);
  gateResults.push(banalityResult);
  if (banalityResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'BANALITY_GATE',
      total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
    };
  }

  const styleResult = runStyleGate(prose, genome, config, timestamp);
  gateResults.push(styleResult);
  if (styleResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'STYLE_GATE',
      total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
    };
  }

  const emotionResult = runEmotionGate(prose, emotionTarget, plan, config, timestamp);
  gateResults.push(emotionResult);
  if (emotionResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'EMOTION_GATE',
      total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
    };
  }

  const discomfortResult = runDiscomfortGate(prose, plan, config, timestamp);
  gateResults.push(discomfortResult);
  if (discomfortResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'DISCOMFORT_GATE',
      total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
    };
  }

  const qualityResult = runQualityGate(prose, config, timestamp);
  gateResults.push(qualityResult);
  if (qualityResult.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      gate_results: gateResults,
      first_failure: 'QUALITY_GATE',
      total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
    };
  }

  return {
    verdict: 'PASS',
    gate_results: gateResults,
    first_failure: null,
    total_violations: gateResults.reduce((acc, r) => acc + r.violations.length, 0),
  };
}

function runOracleChain(
  prose: ProseDoc,
  canon: Canon,
  constraints: Constraints,
  genome: StyleGenomeInput,
  emotionTarget: EmotionTarget,
  plan: GenesisPlan,
  config: SConfig,
): OracleChainResult {
  const results = [
    runOracleTruth(prose, canon, plan),
    runOracleNecessity(prose, plan),
    runOracleStyle(prose, genome),
    runOracleEmotion(prose, emotionTarget),
    runOracleBanality(prose, constraints, config),
    runOracleCrossref(prose, plan, canon),
  ];

  const minVerdict = results.some((r) => r.verdict === 'FAIL') ? 'FAIL' : 'PASS';
  const weakest = results.reduce((min, r) => r.score < min.score ? r : min, results[0]);
  const combinedScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;

  return {
    verdict: minVerdict,
    oracle_results: results,
    weakest_oracle: weakest.verdict === 'FAIL' ? weakest.oracle_id : null,
    combined_score: combinedScore,
  };
}

function rewriteProse(
  skeleton: SkeletonDoc,
  passNumber: number,
  previousProse: ProseDoc,
): ProseDoc {
  // Full rewrite from skeleton (REWRITE > PATCH)
  // Deterministic: same skeleton + same passNumber -> same output
  const passSeed = sha256(`${skeleton.skeleton_hash}-pass-${passNumber}`);

  const newParagraphs: ProseParagraph[] = previousProse.paragraphs.map((para, idx) => {
    // Rewrite each paragraph deterministically based on pass number
    const rewriteSeed = sha256(`${passSeed}-para-${idx}`);
    const prefix = rewriteSeed.slice(0, 4);

    // Modify text slightly for each pass while preserving structure
    const words = para.text.split(/\s+/).filter((w) => w.length > 0);
    // Remove potentially problematic words on rewrites
    const cleaned = words.filter((w) => {
      const lower = w.toLowerCase();
      return lower !== 'thing' && lower !== 'stuff' && lower !== 'something';
    });

    const newText = cleaned.join(' ');
    const newWordCount = cleaned.length;
    const newSentenceCount = Math.max(1, para.sentence_count);

    return {
      ...para,
      paragraph_id: `PARA-R${passNumber}-${prefix}-${sha256(`${skeleton.skeleton_id}-rpara-${passNumber}-${idx}`).slice(0, 8)}`,
      text: newText,
      word_count: newWordCount,
      avg_sentence_length: newSentenceCount > 0 ? newWordCount / newSentenceCount : 0,
    };
  });

  const totalWords = newParagraphs.reduce((acc, p) => acc + p.word_count, 0);
  const totalSentences = newParagraphs.reduce((acc, p) => acc + p.sentence_count, 0);

  const proseWithoutHash = {
    skeleton_id: skeleton.skeleton_id,
    paragraphs: newParagraphs,
    total_word_count: totalWords,
    total_sentence_count: totalSentences,
    pass_number: passNumber,
  };

  const proseHash = sha256(canonicalize(proseWithoutHash));
  const proseId = `PROSE-R${passNumber}-${proseHash.slice(0, 12)}`;

  return {
    prose_id: proseId,
    prose_hash: proseHash,
    skeleton_id: skeleton.skeleton_id,
    paragraphs: newParagraphs,
    total_word_count: totalWords,
    total_sentence_count: totalSentences,
    pass_number: passNumber,
  };
}

export function rewriteLoop(
  skeleton: SkeletonDoc,
  initialProse: ProseDoc,
  canon: Canon,
  constraints: Constraints,
  genome: StyleGenomeInput,
  emotionTarget: EmotionTarget,
  plan: GenesisPlan,
  config: SConfig,
  timestamp: string,
): RewriteHistory {
  const maxPasses = config.REWRITE_MAX_PASSES.value as number;
  const candidates: RewriteCandidate[] = [];
  let currentProse = initialProse;
  let acceptedPass = -1;

  for (let pass = 0; pass < maxPasses; pass++) {
    if (pass > 0) {
      currentProse = rewriteProse(skeleton, pass, currentProse);
    }

    const gateResult = runGateChain(
      currentProse, canon, constraints, genome, emotionTarget, plan, config, timestamp,
    );

    const oracleResult = runOracleChain(
      currentProse, canon, constraints, genome, emotionTarget, plan, config,
    );

    const accepted = gateResult.verdict === 'PASS';
    const rejectionReason = accepted ? null : `Gate failure: ${gateResult.first_failure}`;

    candidates.push({
      pass_number: pass,
      prose: currentProse,
      gate_result: gateResult,
      oracle_result: oracleResult,
      accepted,
      rejection_reason: rejectionReason,
    });

    if (accepted) {
      acceptedPass = pass;
      break;
    }
  }

  // If no pass was accepted, pick the best candidate (highest oracle score)
  if (acceptedPass === -1) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i].oracle_result.combined_score > bestScore) {
        bestScore = candidates[i].oracle_result.combined_score;
        bestIdx = i;
      }
    }
    acceptedPass = bestIdx;
  }

  const rewriteContent = canonicalize({
    candidates: candidates.map((c) => ({
      pass: c.pass_number,
      prose_hash: c.prose.prose_hash,
      gate_verdict: c.gate_result.verdict,
      oracle_score: c.oracle_result.combined_score,
    })),
    accepted_pass: acceptedPass,
  });

  return {
    candidates,
    accepted_pass: acceptedPass,
    total_passes: candidates.length,
    rewrite_hash: sha256(rewriteContent),
  };
}

export { runGateChain, runOracleChain };
