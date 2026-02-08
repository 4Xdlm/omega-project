/**
 * OMEGA Creation Pipeline — Unified Crossref Gate
 * Phase C.4 — C4-INV-06: Cross-reference integrity
 */

import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

function extractNames(text: string): Set<string> {
  const names = new Set<string>();
  // Match capitalized words that look like proper nouns
  const matches = text.match(/\b[A-Z][a-z]{2,}\b/g);
  if (matches) {
    for (const m of matches) {
      // Skip common sentence starters
      if (!['The', 'This', 'That', 'When', 'Where', 'What', 'How', 'With', 'From', 'Into', 'After', 'Before', 'While', 'Each', 'Every', 'Some', 'But', 'And', 'For', 'His', 'Her', 'Its'].includes(m)) {
        names.add(m.toLowerCase());
      }
    }
  }
  return names;
}

export function runUnifiedCrossrefGate(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  input: IntentPack,
  config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];
  const maxOrphans = config.CROSSREF_MAX_ORPHANS.value as number;

  // Build reference set from plan + canon
  const knownRefs = new Set<string>();
  for (const entry of input.canon.entries) {
    const words = entry.statement.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (w.length > 3) knownRefs.add(w);
    }
  }
  for (const arc of plan.arcs) {
    knownRefs.add(arc.theme.toLowerCase());
    for (const w of arc.justification.toLowerCase().split(/\s+/)) {
      if (w.length > 3) knownRefs.add(w);
    }
    for (const scene of arc.scenes) {
      for (const w of scene.objective.toLowerCase().split(/\s+/)) {
        if (w.length > 3) knownRefs.add(w);
      }
      for (const beat of scene.beats) {
        for (const w of beat.action.toLowerCase().split(/\s+/)) {
          if (w.length > 3) knownRefs.add(w);
        }
      }
    }
  }
  // Add plan seeds
  for (const seed of plan.seed_registry) {
    for (const w of seed.description.toLowerCase().split(/\s+/)) {
      if (w.length > 3) knownRefs.add(w);
    }
  }
  // Add intent
  knownRefs.add(input.intent.title.toLowerCase());
  for (const theme of input.intent.themes) {
    knownRefs.add(theme.toLowerCase());
  }
  for (const w of input.intent.premise.toLowerCase().split(/\s+/)) {
    if (w.length > 3) knownRefs.add(w);
  }
  for (const w of input.intent.message.toLowerCase().split(/\s+/)) {
    if (w.length > 3) knownRefs.add(w);
  }

  // Extract names from final text
  const textNames = new Set<string>();
  for (const para of styleOutput.paragraphs) {
    const names = extractNames(para.text);
    for (const n of names) textNames.add(n);
  }

  // Check for orphaned names
  let orphanCount = 0;
  for (const name of textNames) {
    if (!knownRefs.has(name)) {
      // Check partial match
      let found = false;
      for (const ref of knownRefs) {
        if (ref.includes(name) || name.includes(ref)) {
          found = true;
          break;
        }
      }
      if (!found) {
        orphanCount++;
        if (orphanCount <= 5) {
          violations.push({
            gate_id: 'U_CROSSREF',
            invariant: 'C4-INV-06',
            location: 'text',
            message: `Orphaned name: "${name}" not found in plan or canon`,
            severity: 'ERROR',
            source_phase: 'C4',
          });
        }
      }
    }
  }

  // The gate passes as long as orphan count is within tolerance
  const passed = orphanCount <= maxOrphans;

  return {
    gate_id: 'U_CROSSREF',
    verdict: passed ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      known_refs: knownRefs.size,
      text_names: textNames.size,
      orphan_count: orphanCount,
    },
    timestamp_deterministic: timestamp,
  };
}
