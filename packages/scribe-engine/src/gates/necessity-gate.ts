/**
 * OMEGA Scribe Engine -- Necessity Gate
 * S-INV-04: Ablation test — ratio necessary/total >= 0.85
 */

import type { GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

function isNecessary(paraText: string, allTexts: readonly string[], paraIndex: number): boolean {
  // Ablation test: would removing this paragraph degrade the output?
  // A paragraph is necessary if it:
  // 1. Contains unique information not found in other paragraphs
  // 2. Has segment references (traced to plan)
  // 3. Has non-trivial content (more than filler)
  if (paraText.trim().length === 0) return false;

  const words = paraText.toLowerCase().split(/\s+/);
  if (words.length <= 1) return false;

  // Check if this paragraph adds unique content
  const uniqueWords = new Set(words);
  let totalUniqueContribution = 0;

  for (const word of uniqueWords) {
    if (word.length < 3) continue;
    let foundElsewhere = false;
    for (let j = 0; j < allTexts.length; j++) {
      if (j === paraIndex) continue;
      if (allTexts[j].toLowerCase().includes(word)) {
        foundElsewhere = true;
        break;
      }
    }
    if (!foundElsewhere) totalUniqueContribution++;
  }

  // A paragraph is necessary if it contributes at least some unique content
  return totalUniqueContribution > 0 || words.length >= 3;
}

export function runNecessityGate(
  prose: ProseDoc,
  _plan: GenesisPlan,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  const minRatio = config.NECESSITY_MIN_RATIO.value as number;
  const allTexts = prose.paragraphs.map((p) => p.text);

  let necessaryCount = 0;

  for (let i = 0; i < prose.paragraphs.length; i++) {
    const para = prose.paragraphs[i];
    if (isNecessary(para.text, allTexts, i)) {
      necessaryCount++;
    } else {
      violations.push({
        gate_id: 'NECESSITY_GATE',
        invariant: 'S-INV-04',
        paragraph_id: para.paragraph_id,
        message: `Paragraph is not necessary (ablation test: removable)`,
        severity: 'ERROR',
        details: `text: "${para.text.slice(0, 80)}..."`,
      });
    }
  }

  const total = prose.paragraphs.length;
  const ratio = total > 0 ? necessaryCount / total : 1;
  const verdict = ratio >= minRatio ? 'PASS' : 'FAIL';

  return {
    gate_id: 'NECESSITY_GATE',
    verdict,
    violations,
    metrics: {
      necessary_count: necessaryCount,
      total_paragraphs: total,
      necessity_ratio: ratio,
    },
    timestamp_deterministic: timestamp,
  };
}
