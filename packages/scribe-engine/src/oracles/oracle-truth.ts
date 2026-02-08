/**
 * OMEGA Scribe Engine -- Oracle Truth
 * Scores truth support: canon + plan references
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Canon, GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, OracleResult } from '../types.js';

export function runOracleTruth(
  prose: ProseDoc,
  canon: Canon,
  plan: GenesisPlan,
): OracleResult {
  const findings: string[] = [];
  const canonIds = new Set(canon.entries.map((e) => e.id));

  let supportedParas = 0;
  let totalParas = prose.paragraphs.length;

  if (totalParas === 0) {
    return {
      oracle_id: 'ORACLE_TRUTH',
      verdict: 'FAIL',
      score: 0,
      findings: ['No paragraphs to evaluate'],
      evidence_hash: sha256(canonicalize({ oracle: 'truth', result: 'empty' })),
    };
  }

  for (const para of prose.paragraphs) {
    const hasCanonRefs = para.canon_refs.some((ref) => canonIds.has(ref));
    const hasSegments = para.segment_ids.length > 0;

    if (hasCanonRefs || hasSegments) {
      supportedParas++;
    } else {
      findings.push(`Paragraph ${para.paragraph_id} lacks truth support`);
    }
  }

  const score = totalParas > 0 ? supportedParas / totalParas : 0;
  const verdict = score >= 0.95 ? 'PASS' : 'FAIL';

  const evidenceHash = sha256(canonicalize({
    oracle: 'ORACLE_TRUTH',
    supported: supportedParas,
    total: totalParas,
    score,
    plan_id: plan.plan_id,
  }));

  return {
    oracle_id: 'ORACLE_TRUTH',
    verdict,
    score,
    findings,
    evidence_hash: evidenceHash,
  };
}
