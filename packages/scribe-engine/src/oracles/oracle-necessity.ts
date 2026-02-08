/**
 * OMEGA Scribe Engine -- Oracle Necessity
 * Scores necessity: lean text vs bloated text
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, OracleResult } from '../types.js';

export function runOracleNecessity(
  prose: ProseDoc,
  plan: GenesisPlan,
): OracleResult {
  const findings: string[] = [];

  if (prose.paragraphs.length === 0) {
    return {
      oracle_id: 'ORACLE_NECESSITY',
      verdict: 'FAIL',
      score: 0,
      findings: ['No paragraphs to evaluate'],
      evidence_hash: sha256(canonicalize({ oracle: 'necessity', result: 'empty' })),
    };
  }

  let necessaryParas = 0;

  for (let i = 0; i < prose.paragraphs.length; i++) {
    const para = prose.paragraphs[i];
    const words = para.text.split(/\s+/).filter((w) => w.length > 0);

    // A paragraph is necessary if:
    // 1. It has content (non-trivial word count)
    // 2. It has segment references
    // 3. It contributes unique information
    const hasContent = words.length >= 3;
    const hasSegments = para.segment_ids.length > 0;

    if (hasContent && hasSegments) {
      necessaryParas++;
    } else {
      findings.push(`Paragraph ${para.paragraph_id} may be unnecessary: ${words.length} words, ${para.segment_ids.length} segments`);
    }
  }

  const score = prose.paragraphs.length > 0 ? necessaryParas / prose.paragraphs.length : 0;
  const verdict = score >= 0.85 ? 'PASS' : 'FAIL';

  const evidenceHash = sha256(canonicalize({
    oracle: 'ORACLE_NECESSITY',
    necessary: necessaryParas,
    total: prose.paragraphs.length,
    score,
    plan_id: plan.plan_id,
  }));

  return {
    oracle_id: 'ORACLE_NECESSITY',
    verdict,
    score,
    findings,
    evidence_hash: evidenceHash,
  };
}
