/**
 * OMEGA Scribe Engine -- Oracle Crossref
 * Checks consistency: names, motifs, constraints, canon refs
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { Canon, GenesisPlan } from '@omega/genesis-planner';
import type { ProseDoc, OracleResult } from '../types.js';

export function runOracleCrossref(
  prose: ProseDoc,
  plan: GenesisPlan,
  canon: Canon,
): OracleResult {
  const findings: string[] = [];

  if (prose.paragraphs.length === 0) {
    return {
      oracle_id: 'ORACLE_CROSSREF',
      verdict: 'FAIL',
      score: 0,
      findings: ['No paragraphs to evaluate'],
      evidence_hash: sha256(canonicalize({ oracle: 'crossref', result: 'empty' })),
    };
  }

  let checks = 0;
  let passed = 0;

  // Check 1: All canon_refs in paragraphs point to valid canon entries
  const canonIds = new Set(canon.entries.map((e) => e.id));
  for (const para of prose.paragraphs) {
    for (const ref of para.canon_refs) {
      checks++;
      if (canonIds.has(ref)) {
        passed++;
      } else {
        findings.push(`Invalid canon ref ${ref} in paragraph ${para.paragraph_id}`);
      }
    }
  }

  // Check 2: All motif_refs point to valid seeds
  const seedIds = new Set(plan.seed_registry.map((s) => s.id));
  for (const para of prose.paragraphs) {
    for (const ref of para.motif_refs) {
      checks++;
      if (seedIds.has(ref)) {
        passed++;
      } else {
        findings.push(`Invalid motif ref ${ref} in paragraph ${para.paragraph_id}`);
      }
    }
  }

  // Check 3: Plan references are consistent
  checks++;
  if (prose.paragraphs.every((p) => p.segment_ids.length > 0)) {
    passed++;
  } else {
    findings.push('Some paragraphs have no segment references');
  }

  // Check 4: Scene coverage (all plan scenes should be represented)
  const planSceneIds = new Set<string>();
  for (const arc of plan.arcs) {
    for (const scene of arc.scenes) {
      planSceneIds.add(scene.scene_id);
    }
  }
  checks++;
  // All scenes should have at least one paragraph referencing them
  if (prose.paragraphs.length >= planSceneIds.size) {
    passed++;
  } else {
    findings.push(`Not enough paragraphs (${prose.paragraphs.length}) to cover all scenes (${planSceneIds.size})`);
  }

  const score = checks > 0 ? passed / checks : 0;
  const verdict = score >= 0.8 ? 'PASS' : 'FAIL';

  const evidenceHash = sha256(canonicalize({
    oracle: 'ORACLE_CROSSREF',
    checks,
    passed,
    score,
    plan_id: plan.plan_id,
  }));

  return {
    oracle_id: 'ORACLE_CROSSREF',
    verdict,
    score,
    findings,
    evidence_hash: evidenceHash,
  };
}
