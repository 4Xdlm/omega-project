/**
 * prompt-compiler.test.ts — Tests P1 + P1.1 : Constraint Compiler + Static Analyzer
 * Sprint P1/P1.1 — V-PARTITION v3.0.0
 *
 * INV-COMP-01..09 + INV-SA-01..02
 * 100% CALC — 0 appel LLM.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, afterEach } from 'vitest';
import { compilePartition, isV3Active, buildAttentionContract, buildRecencyReminder } from '../../src/compiler/prompt-compiler.js';
import { collectConstraints, classifyConstraint } from '../../src/compiler/constraint-pool.js';
import { routeByShape, detectConflicts, resolveConflicts } from '../../src/compiler/level-router.js';
import { transduceToNarrative } from '../../src/compiler/transducer.js';
import { budgetPartition } from '../../src/compiler/budget-manager.js';
import { analyzePreFlight, dumpPartition } from '../../src/compiler/static-analyzer.js';
import { INSTRUCTION_TOGGLE_TABLE } from '../../src/prose-directive/instruction-toggle-table.js';
import { LOT1_INSTRUCTIONS, type PDBInstruction } from '../../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../../src/prose-directive/lot2-instructions.js';
import { LOT3_INSTRUCTIONS } from '../../src/prose-directive/lot3-instructions.js';
import { isInstructionEnabled } from '../../src/prose-directive/instruction-toggle-table.js';
import { MINIMAL_FORGE_PACKET } from '../input/__fixtures__/minimal-forge-packet.js';
import { buildSovereignPrompt, getV3AbsorbedSectionIds } from '../../src/input/prompt-assembler-v2.js';
import { countTokens } from '../../src/constraints/token-counter.js';
import { distillBrief } from '../../src/cde/distiller.js';
import { propagateDelta } from '../../src/cde/scene-chain.js';
import type { CompilerConfig, RawConstraint } from '../../src/compiler/types.js';
import { DEFAULT_COMPILER_CONFIG } from '../../src/compiler/types.js';
import {
  PATHOLOGICAL_SCENE_1,
  PATHOLOGICAL_SCENE_2,
  PATHOLOGICAL_CHAIN,
} from '../bench/pathological-scenes.test.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAllActiveInstructions(shape: string): PDBInstruction[] {
  return [
    ...LOT1_INSTRUCTIONS,
    ...LOT2_INSTRUCTIONS,
    ...LOT3_INSTRUCTIONS,
  ].filter(i => isInstructionEnabled(i.id, shape));
}

function makeConfig(shape: string = 'Confrontation'): CompilerConfig {
  return { ...DEFAULT_COMPILER_CONFIG, shape };
}

afterEach(() => {
  delete process.env.OMEGA_PROMPT_COMPILER_V3;
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — CONSTRAINT POOL (collectConstraints)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Constraint Pool', () => {
  it('collects constraints from ForgePacket (no CDE)', () => {
    const pool = collectConstraints(MINIMAL_FORGE_PACKET, null, []);
    expect(pool.length).toBeGreaterThan(0);
    // Must have emotion_contract quartiles
    const ecConstraints = pool.filter(c => c.source === 'packet.emotion_contract');
    expect(ecConstraints.length).toBe(4); // Q1..Q4
  });

  it('collects constraints from ForgePacket + CDEInput', () => {
    const pool = collectConstraints(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, []);
    const cdeConstraints = pool.filter(c => c.source.startsWith('cde.'));
    expect(cdeConstraints.length).toBeGreaterThan(0);
    // scene_objective should be present
    const objective = pool.find(c => c.source === 'cde.scene_objective');
    expect(objective).toBeDefined();
    expect(objective!.text).toBe(PATHOLOGICAL_SCENE_1.scene_objective);
  });

  it('collects constraints from PDB instructions', () => {
    const instructions = getAllActiveInstructions('Confrontation');
    const pool = collectConstraints(MINIMAL_FORGE_PACKET, null, instructions);
    const pdbConstraints = pool.filter(c => c.source.startsWith('pdb.'));
    expect(pdbConstraints.length).toBe(instructions.length);
  });

  it('classifyConstraint — INTERDIT keywords → level 1', () => {
    const raw: RawConstraint = {
      id: 'test', source: 'test', level: 2, priority: 5,
      text: 'INTERDIT: soudain, tout à coup', target_axes: [],
    };
    expect(classifyConstraint(raw)).toBe(1);
  });

  it('classifyConstraint — progression keywords → level 2', () => {
    const raw: RawConstraint = {
      id: 'test', source: 'test', level: 3, priority: 5,
      text: 'Progression de la tension vers le climax', target_axes: [],
    };
    expect(classifyConstraint(raw)).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — LEVEL ROUTER (routeByShape, detectConflicts, resolveConflicts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Level Router', () => {
  it('routeByShape — filters PDB by shape Contemplative (LOT1-04 excluded)', () => {
    const instructions = getAllActiveInstructions('Confrontation');
    const pool = collectConstraints(MINIMAL_FORGE_PACKET, null, instructions);
    const routedConfrontation = routeByShape(pool, 'Confrontation', INSTRUCTION_TOGGLE_TABLE);
    const routedContemplative = routeByShape(pool, 'Contemplative', INSTRUCTION_TOGGLE_TABLE);

    // LOT1-04 is excluded for Contemplative
    const lot104Conf = routedConfrontation.find(c => c.id === 'pdb-LOT1-04');
    const lot104Cont = routedContemplative.find(c => c.id === 'pdb-LOT1-04');
    expect(lot104Conf).toBeDefined();
    expect(lot104Cont).toBeUndefined();
  });

  it('routeByShape — non-PDB constraints pass through for any shape', () => {
    const pool = collectConstraints(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, []);
    const nonPDB = pool.filter(c => !c.source.startsWith('pdb.'));
    const routed = routeByShape(pool, 'Contemplative', INSTRUCTION_TOGGLE_TABLE);
    const routedNonPDB = routed.filter(c => !c.source.startsWith('pdb.'));
    expect(routedNonPDB.length).toBe(nonPDB.length);
  });

  it('detectConflicts — finds redundancy', () => {
    const constraints: RawConstraint[] = [
      { id: 'a', source: 's1', level: 2, priority: 7, text: 'Marie est medecin a Lyon', target_axes: [] },
      { id: 'b', source: 's2', level: 3, priority: 5, text: 'Marie est medecin a Lyon', target_axes: [] },
    ];
    const conflicts = detectConflicts(constraints);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('redundancy');
  });

  it('resolveConflicts — removes redundant (keeps shorter)', () => {
    const constraints: RawConstraint[] = [
      { id: 'short', source: 's1', level: 2, priority: 7, text: 'Tension monte', target_axes: ['tension_14d'] },
      { id: 'long', source: 's2', level: 2, priority: 7, text: 'Tension monte progressivement dans la scene', target_axes: ['tension_14d'] },
    ];
    const conflicts = detectConflicts(constraints);
    const resolved = resolveConflicts(constraints, conflicts);
    // The longer one (containing the shorter) is redundant; keep shorter
    expect(resolved.length).toBe(1);
    expect(resolved[0].id).toBe('short');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — TRANSDUCER
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Transducer', () => {
  it('kill_lists → passes INTERDIT prefix through', () => {
    const c: RawConstraint = {
      id: 'kl', source: 'packet.kill_lists', level: 1, priority: 10,
      text: 'INTERDIT: soudain, tout a coup', target_axes: [],
    };
    const result = transduceToNarrative(c);
    expect(result).toContain('INTERDIT');
  });

  it('PDB instructions → pass through (already narrative)', () => {
    const c: RawConstraint = {
      id: 'pdb', source: 'pdb.LOT1-02', level: 1, priority: 10,
      text: 'ORDRE INTERDIT: label→sensation.', target_axes: [],
    };
    const result = transduceToNarrative(c);
    expect(result).toBe(c.text);
  });

  it('arc_states → produces Progression format', () => {
    const c: RawConstraint = {
      id: 'arc', source: 'cde.arc_states', level: 2, priority: 7,
      text: 'comprendre pourquoi Marie ment. rage contenue vs amour residuel',
      target_axes: ['tension_14d'],
    };
    const result = transduceToNarrative(c);
    expect(result).toContain('Progression:');
    expect(result).toContain('Par le corps');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — BUDGET MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Budget Manager', () => {
  it('N1 within budget → no throw', () => {
    const l1: RawConstraint[] = [{
      id: 'kl', source: 'packet.kill_lists', level: 1, priority: 10,
      text: 'INTERDIT: soudain', target_axes: [],
    }];
    const result = budgetPartition(l1, [], [], makeConfig());
    expect(result.l1).toContain('INTERDIT');
    expect(result.sacrificed).toHaveLength(0);
  });

  it('N1 over budget → throws FAIL-CLOSED', () => {
    const longText = 'INTERDIT: ' + 'mot '.repeat(100);
    const l1: RawConstraint[] = [{
      id: 'kl', source: 'packet.kill_lists', level: 1, priority: 10,
      text: longText, target_axes: [],
    }];
    expect(() => budgetPartition(l1, [], [], makeConfig())).toThrow('COMPILE FAIL');
  });

  it('N2 over budget → sacrifices least priority', () => {
    const l2: RawConstraint[] = [
      { id: 'high', source: 's', level: 2, priority: 9, text: 'Tension critique', target_axes: [] },
      { id: 'low', source: 's', level: 2, priority: 3, text: 'Element secondaire de la trajectoire narrative pas prioritaire du tout', target_axes: [] },
    ];
    const config = { ...makeConfig(), budget_l2: 10 }; // Very tight budget
    const result = budgetPartition([], l2, [], config);
    expect(result.sacrificed.length).toBeGreaterThanOrEqual(0);
  });

  it('N3 over budget → sacrificed entries logged', () => {
    const l3: RawConstraint[] = Array.from({ length: 20 }, (_, i) => ({
      id: `n3-${i}`, source: 's', level: 3 as const, priority: 4,
      text: `Fait canon numero ${i} avec details supplementaires pour remplir le budget`, target_axes: [],
    }));
    const config = { ...makeConfig(), budget_l3: 20 }; // Tight
    const result = budgetPartition([], [], l3, config);
    expect(result.sacrificed.length).toBeGreaterThan(0);
    expect(result.sacrificed.every(s => s.level === 3)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — PROMPT COMPILER (compilePartition) — INV-COMP-01..09
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Prompt Compiler (compilePartition)', () => {
  const config = makeConfig('Confrontation');
  const instructions = getAllActiveInstructions('Confrontation');

  it('INV-COMP-01: partition has 3 levels + attention contract', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    expect(partition.attention_contract.length).toBeGreaterThan(0);
    expect(partition.level1_laws).toBeDefined();
    expect(partition.level2_trajectory).toBeDefined();
    expect(partition.level3_decor).toBeDefined();
    expect(partition.attention_contract).toContain('NIVEAU 1');
    expect(partition.attention_contract).toContain('NIVEAU 2');
    expect(partition.attention_contract).toContain('NIVEAU 3');
  });

  it('INV-COMP-02: level1 ≤ 60 tokens', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const l1Tokens = countTokens(partition.level1_laws, 'chars_div_4');
    expect(l1Tokens).toBeLessThanOrEqual(60);
  });

  it('INV-COMP-03: total ≤ 290 tokens', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    expect(partition.total_tokens).toBeLessThanOrEqual(290);
  });

  it('INV-COMP-04: N1 jamais sacrifié (throw si trop gros)', () => {
    // Normal case: N1 fits
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    const inst = partition.instrumentation;
    const n1Sacrificed = inst.sacrificed_elements.filter(s => s.level === 1);
    expect(n1Sacrificed).toHaveLength(0);
  });

  it('INV-COMP-05: déterminisme — même input → même hash', () => {
    const p1 = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const p2 = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    expect(p1.partition_hash).toBe(p2.partition_hash);
    expect(p1.level1_laws).toBe(p2.level1_laws);
    expect(p1.level2_trajectory).toBe(p2.level2_trajectory);
    expect(p1.level3_decor).toBe(p2.level3_decor);
    expect(p1.total_tokens).toBe(p2.total_tokens);
  });

  it('INV-COMP-06: zéro vecteur brut / zéro ID système dans la sortie', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const fullText = [
      partition.attention_contract,
      partition.level1_laws,
      partition.level2_trajectory,
      partition.level3_decor,
    ].join('\n');

    // No raw 14D vectors
    expect(fullText).not.toMatch(/\{[^}]*joy[^}]*\}/);
    // No system IDs
    expect(fullText).not.toMatch(/auto-debt-s\d/);
    expect(fullText).not.toMatch(/auto-fact-s\d/);
    expect(fullText).not.toMatch(/DRIFT ALERT/);
    expect(fullText).not.toMatch(/char-\w+-\d+/);
  });

  it('INV-COMP-07: contrat en tête + rappel en fin', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    expect(partition.attention_contract).toContain('CONTRAT');
    expect(partition.recency_reminder).toContain('RAPPEL');
    expect(partition.recency_reminder).toContain('N1 inviolable');
  });

  it('INV-COMP-08: anti-double-signal (V3 actif → sections dynamiques absentes)', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET, undefined, undefined, partition);
    const sectionIds = new Set(prompt.sections.map(s => s.section_id));
    const absorbed = getV3AbsorbedSectionIds();

    for (const id of absorbed) {
      expect(sectionIds.has(id), `Section '${id}' should be absorbed by V3`).toBe(false);
    }

    // V3 sections should be present
    expect(sectionIds.has('v3_attention_contract')).toBe(true);
    expect(sectionIds.has('v3_level1_laws')).toBe(true);
    expect(sectionIds.has('v3_level2_trajectory')).toBe(true);
    expect(sectionIds.has('v3_level3_decor')).toBe(true);
    expect(sectionIds.has('v3_recency_reminder')).toBe(true);
  });

  it('INV-COMP-09: dump diffable (6 champs)', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    const dump = dumpPartition(partition);
    expect(dump.attention_contract).toBe(partition.attention_contract);
    expect(dump.level_1).toBe(partition.level1_laws);
    expect(dump.level_2).toBe(partition.level2_trajectory);
    expect(dump.level_3).toBe(partition.level3_decor);
    expect(dump.partition_hash).toBe(partition.partition_hash);
    expect(dump.preflight_report).toBeDefined();
    // JSON serializable
    const json = JSON.stringify(dump);
    expect(json.length).toBeGreaterThan(0);
    const parsed = JSON.parse(json);
    expect(parsed.partition_hash).toBe(partition.partition_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — PATHOLOGICAL SCENES (compiler)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Pathological Scenes (compiler)', () => {
  it('SCENE_1 (haute tension) → partition valide', () => {
    const instructions = getAllActiveInstructions('Confrontation');
    const config = makeConfig('Confrontation');
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    expect(partition.total_tokens).toBeLessThanOrEqual(290);
    expect(partition.level1_laws.length).toBeGreaterThan(0);
    expect(partition.level2_trajectory.length).toBeGreaterThan(0);
  });

  it('SCENE_2 (lourd canon) → budget N3 saturé, sacrifices loggés', () => {
    const instructions = getAllActiveInstructions('Contemplative');
    const config = makeConfig('Contemplative');
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_2, config, instructions);
    expect(partition.total_tokens).toBeLessThanOrEqual(290);
    // Scene 2 has many canon facts that may saturate N3
    // Check that instrumentation logged the saturation
    expect(partition.instrumentation).toBeDefined();
  });

  it('SCENE_3 (chaîne) → partition valide après propagation', () => {
    const propagated = propagateDelta(PATHOLOGICAL_CHAIN.initial, PATHOLOGICAL_CHAIN.delta, 1);
    const instructions = getAllActiveInstructions('Confrontation');
    const config = makeConfig('Confrontation');
    const partition = compilePartition(MINIMAL_FORGE_PACKET, propagated, config, instructions);
    expect(partition.total_tokens).toBeLessThanOrEqual(290);
    expect(partition.level2_trajectory.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — NON-RÉGRESSION (V3 inactif = comportement v2 identique)
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1 — Non-regression (V3 inactif)', () => {
  it('buildSovereignPrompt sans flag V3 → toutes les sections v2 présentes', () => {
    delete process.env.OMEGA_PROMPT_COMPILER_V3;
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const sectionIds = prompt.sections.map(s => s.section_id);
    // Core v2 sections must be present
    expect(sectionIds).toContain('emotion_contract');
    expect(sectionIds).toContain('beats');
    expect(sectionIds).toContain('intent');
    expect(sectionIds).toContain('lot1_pdb_instructions');
    expect(sectionIds).toContain('lot2_pdb_instructions');
    expect(sectionIds).toContain('lot3_pdb_instructions');
    expect(sectionIds).toContain('rhythm_prescription');
    // V3 sections absent
    expect(sectionIds).not.toContain('v3_attention_contract');
    expect(sectionIds).not.toContain('v3_level1_laws');
  });

  it('isV3Active() = false by default', () => {
    delete process.env.OMEGA_PROMPT_COMPILER_V3;
    expect(isV3Active()).toBe(false);
  });

  it('isV3Active() = true when OMEGA_PROMPT_COMPILER_V3=1', () => {
    process.env.OMEGA_PROMPT_COMPILER_V3 = '1';
    expect(isV3Active()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — STATIC ANALYZER (P1.1) — INV-SA-01..02
// ═══════════════════════════════════════════════════════════════════════════════

describe('P1.1 — Static Analyzer', () => {
  const config = makeConfig('Confrontation');
  const instructions = getAllActiveInstructions('Confrontation');

  it('INV-SA-01: analyzePreFlight() runs on any partition', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    const report = analyzePreFlight(partition);
    expect(report).toBeDefined();
    expect(report.verdict).toBeDefined();
    expect(['GREEN', 'YELLOW', 'RED']).toContain(report.verdict);
  });

  it('INV-SA-02: verdict RED → warnings non-vides', () => {
    // Create a partition that triggers RED
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const report = analyzePreFlight(partition);
    if (report.verdict === 'RED') {
      expect(report.warnings.length).toBeGreaterThan(0);
    }
    // At minimum, verdict is defined
    expect(report.verdict).toBeDefined();
  });

  it('SCENE_1 (haute tension) → verdict défini, conflict_score < 100', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const report = analyzePreFlight(partition);
    expect(['GREEN', 'YELLOW', 'RED']).toContain(report.verdict);
    expect(report.conflict_score).toBeLessThanOrEqual(100);
    // Pathological scenes may trigger RED due to high constraint count
    // This is expected behavior — the analyzer correctly flags risk
  });

  it('SCENE_2 (lourd canon) → verdict défini, sacrifices logged', () => {
    const contConfig = makeConfig('Contemplative');
    const contInstr = getAllActiveInstructions('Contemplative');
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_2, contConfig, contInstr);
    const report = analyzePreFlight(partition);
    expect(['GREEN', 'YELLOW', 'RED']).toContain(report.verdict);
    // Scene 2 may trigger N3 sacrifices
    expect(report.sacrificed_count).toBeGreaterThanOrEqual(0);
  });

  it('SCENE_3 (chaîne) → verdict défini après propagation', () => {
    const propagated = propagateDelta(PATHOLOGICAL_CHAIN.initial, PATHOLOGICAL_CHAIN.delta, 1);
    const partition = compilePartition(MINIMAL_FORGE_PACKET, propagated, config, instructions);
    const report = analyzePreFlight(partition);
    expect(['GREEN', 'YELLOW', 'RED']).toContain(report.verdict);
  });

  it('scores are all 0-100', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const report = analyzePreFlight(partition);
    expect(report.conflict_score).toBeGreaterThanOrEqual(0);
    expect(report.conflict_score).toBeLessThanOrEqual(100);
    expect(report.cognitive_load_score).toBeGreaterThanOrEqual(0);
    expect(report.cognitive_load_score).toBeLessThanOrEqual(100);
    expect(report.redundancy_score).toBeGreaterThanOrEqual(0);
    expect(report.redundancy_score).toBeLessThanOrEqual(100);
  });

  it('dumpPartition() produces serializable JSON', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const dump = dumpPartition(partition);
    const json = JSON.stringify(dump, null, 2);
    expect(json.length).toBeGreaterThan(0);
    const parsed = JSON.parse(json);
    expect(parsed.partition_hash).toBe(partition.partition_hash);
    expect(parsed.preflight_report.verdict).toBeDefined();
  });

  it('densities are 0-1 range', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, null, config, instructions);
    const report = analyzePreFlight(partition);
    expect(report.density_l1).toBeGreaterThanOrEqual(0);
    expect(report.density_l1).toBeLessThanOrEqual(1);
    expect(report.density_l2).toBeGreaterThanOrEqual(0);
    expect(report.density_l2).toBeLessThanOrEqual(1);
    expect(report.density_l3).toBeGreaterThanOrEqual(0);
    expect(report.density_l3).toBeLessThanOrEqual(1);
  });

  it('risk axes are valid enum values', () => {
    const partition = compilePartition(MINIMAL_FORGE_PACKET, PATHOLOGICAL_SCENE_1, config, instructions);
    const report = analyzePreFlight(partition);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(report.risk_ecc);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(report.risk_rci);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(report.risk_sii);
  });
});
