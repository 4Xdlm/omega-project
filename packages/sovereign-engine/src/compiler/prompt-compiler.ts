/**
 * compiler/prompt-compiler.ts — Compilateur principal v3.0.0
 * Sprint P1 — V-PARTITION
 *
 * Pipeline :
 *   1. collectConstraints() — rassembler toutes les contraintes
 *   2. routeByShape() — filtrer par shape
 *   3. detectConflicts() — détecter les conflits
 *   4. resolveConflicts() — résoudre les conflits
 *   5. Séparer par niveau
 *   6. Transduire (dans budgetPartition)
 *   7. budgetPartition() — budgétiser + sacrifier
 *   8. buildAttentionContract() — contrat fixe
 *   9. Assembler CompiledPartition
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { ForgePacket } from '../types.js';
import type { CDEInput } from '../cde/types.js';
import type { PDBInstruction } from '../prose-directive/lot1-instructions.js';
import { INSTRUCTION_TOGGLE_TABLE } from '../prose-directive/instruction-toggle-table.js';
import { countTokens } from '../constraints/token-counter.js';
import type {
  CompiledPartition,
  CompilerConfig,
  InstrumentationReport,
  RawConstraint,
} from './types.js';
import { collectConstraints } from './constraint-pool.js';
import { routeByShape, detectConflicts, resolveConflicts } from './level-router.js';
import { budgetPartition } from './budget-manager.js';

// ── V3 Flag ──────────────────────────────────────────────────────────────────

export function isV3Active(): boolean {
  return process.env.OMEGA_PROMPT_COMPILER_V3 === '1';
}

// ── Attention Contract ───────────────────────────────────────────────────────

export function buildAttentionContract(): string {
  return `CONTRAT D'EXÉCUTION — 3 NIVEAUX

NIVEAU 1 (LOIS) : INVIOLABLE. Violation = REJET.
NIVEAU 2 (TRAJECTOIRE) : OBLIGATOIRE. Compressible.
NIVEAU 3 (DÉCOR) : SOUHAITABLE. Sacrifiable pour N1/N2.

Conflit → N1 bat N2 bat N3. Toujours.`;
}

export function buildRecencyReminder(): string {
  return `RAPPEL : N1 inviolable. Sacrifie N3, jamais N1.`;
}

// ── Main Compiler ────────────────────────────────────────────────────────────

/**
 * compilePartition() — Compile toutes les contraintes en partition 3 niveaux.
 *
 * @throws Error si N1 dépasse son budget (FAIL-CLOSED)
 */
export function compilePartition(
  packet: ForgePacket,
  cdeInput: CDEInput | null,
  config: CompilerConfig,
  activeInstructions: PDBInstruction[],
): CompiledPartition {
  const tokenizerId = config.tokenizer_id;

  // 1. Collecte
  const pool = collectConstraints(packet, cdeInput, activeInstructions);

  // 2. Routage shape
  const routed = routeByShape(pool, config.shape, INSTRUCTION_TOGGLE_TABLE);

  // 3. Détection conflits
  const conflicts = detectConflicts(routed);

  // 4. Résolution conflits
  const resolved = resolveConflicts(routed, conflicts);

  // 5. Séparer par niveau
  const l1: RawConstraint[] = [];
  const l2: RawConstraint[] = [];
  const l3: RawConstraint[] = [];

  for (const c of resolved) {
    switch (c.level) {
      case 1: l1.push(c); break;
      case 2: l2.push(c); break;
      case 3: l3.push(c); break;
    }
  }

  // 6+7. Transduire + budgétiser
  const budget = budgetPartition(l1, l2, l3, config);

  // 8. Contrat d'attention
  const contract = buildAttentionContract();
  const reminder = buildRecencyReminder();

  // 9. Tokens
  const contractTokens = countTokens(contract, tokenizerId);
  const l1Tokens = countTokens(budget.l1, tokenizerId);
  const l2Tokens = countTokens(budget.l2, tokenizerId);
  const l3Tokens = countTokens(budget.l3, tokenizerId);
  const totalTokens = contractTokens + l1Tokens + l2Tokens + l3Tokens;

  // Conflict scores
  let conflictScore = 0;
  let redundancyCount = 0;
  for (const c of conflicts) {
    switch (c.type) {
      case 'contradiction':         conflictScore += 20; break;
      case 'attention_competition': conflictScore += 10; break;
      case 'redundancy':            conflictScore += 5; redundancyCount++; break;
    }
  }
  conflictScore = Math.min(100, conflictScore);
  const redundancyScore = pool.length > 0
    ? Math.min(100, Math.round(redundancyCount / pool.length * 100))
    : 0;

  // Cognitive load
  const budgetTotal = config.budget_l1 + config.budget_l2 + config.budget_l3 + config.budget_contract;
  let cognitiveLoad = Math.round(totalTokens / budgetTotal * 50)
    + conflicts.length * 5
    + budget.sacrificed.length * 3;
  cognitiveLoad = Math.min(100, Math.max(0, cognitiveLoad));

  // Shape routing info
  const shapeRouting = routed
    .filter(c => c.source.startsWith('pdb.'))
    .map(c => c.id);

  const warnings: string[] = [];
  if (conflictScore > 50) warnings.push(`HIGH conflict_score=${conflictScore}`);
  if (cognitiveLoad > 70) warnings.push(`HIGH cognitive_load=${cognitiveLoad}`);
  if (budget.sacrificed.some(s => s.level <= 2)) warnings.push('N2 elements sacrificed');

  const instrumentation: InstrumentationReport = {
    tokens_by_level: {
      l1: l1Tokens,
      l2: l2Tokens,
      l3: l3Tokens,
      contract: contractTokens,
    },
    conflicts_detected: conflicts,
    cognitive_load: cognitiveLoad,
    sacrificed_elements: budget.sacrificed,
    shape_routing: shapeRouting,
    warnings,
    conflict_score: conflictScore,
    redundancy_score: redundancyScore,
  };

  // Hash
  const partitionHash = sha256(canonicalize({
    contract,
    l1: budget.l1,
    l2: budget.l2,
    l3: budget.l3,
    reminder,
  }));

  return {
    attention_contract: contract,
    level1_laws: budget.l1,
    level2_trajectory: budget.l2,
    level3_decor: budget.l3,
    total_tokens: totalTokens,
    partition_hash: partitionHash,
    instrumentation,
    recency_reminder: reminder,
  };
}
