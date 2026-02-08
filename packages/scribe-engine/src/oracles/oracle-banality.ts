/**
 * OMEGA Scribe Engine -- Oracle Banality
 * Scores text for absence of cliches, IA-speak, banned words
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Constraints } from '@omega/genesis-planner';
import type { ProseDoc, OracleResult, SConfig } from '../types.js';

export function runOracleBanality(
  prose: ProseDoc,
  constraints: Constraints,
  config: SConfig,
): OracleResult {
  const findings: string[] = [];

  if (prose.paragraphs.length === 0) {
    return {
      oracle_id: 'ORACLE_BANALITY',
      verdict: 'PASS',
      score: 1.0,
      findings: ['No paragraphs to check'],
      evidence_hash: sha256(canonicalize({ oracle: 'banality', result: 'empty' })),
    };
  }

  const iaPatterns = config.IA_SPEAK_PATTERNS.value as readonly string[];
  const clichePatterns = config.CLICHE_REGISTRY.value as readonly string[];
  const bannedWords = constraints.banned_words;
  const forbiddenCliches = constraints.forbidden_cliches;

  const allCliches = [...clichePatterns];
  for (const fc of forbiddenCliches) {
    if (!allCliches.some((c) => c.toLowerCase() === fc.toLowerCase())) {
      allCliches.push(fc);
    }
  }

  let totalBanalities = 0;

  for (const para of prose.paragraphs) {
    const lower = para.text.toLowerCase();

    for (const pattern of iaPatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        totalBanalities++;
        findings.push(`IA-speak in ${para.paragraph_id}: "${pattern}"`);
      }
    }

    for (const cliche of allCliches) {
      if (lower.includes(cliche.toLowerCase())) {
        totalBanalities++;
        findings.push(`Cliche in ${para.paragraph_id}: "${cliche}"`);
      }
    }

    for (const word of bannedWords) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(para.text)) {
        totalBanalities++;
        findings.push(`Banned word in ${para.paragraph_id}: "${word}"`);
      }
    }
  }

  const score = totalBanalities === 0 ? 1.0 : Math.max(0, 1 - totalBanalities * 0.2);
  const verdict = totalBanalities === 0 ? 'PASS' : 'FAIL';

  const evidenceHash = sha256(canonicalize({
    oracle: 'ORACLE_BANALITY',
    banalities: totalBanalities,
    score,
  }));

  return {
    oracle_id: 'ORACLE_BANALITY',
    verdict,
    score,
    findings,
    evidence_hash: evidenceHash,
  };
}
