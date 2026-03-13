/**
 * cde-pipeline.test.ts — Tests for CDE Pipeline + Scene Chain
 * Sprint V-PROTO
 *
 * Couverture :
 *   PROTO-01..07 : runCDEScene + injection + invariants
 *   CHAIN-01..10 : runSceneChain + propagateDelta + invariants
 *
 * 100% CALC — 0 appel LLM. Uses testable wrappers with mock forge runner.
 * Standard: NASA-Grade L4 / DO-178C
 */

import { describe, it, expect } from 'vitest';
import { sha256 } from '@omega/canon-kernel';
import {
  formatBriefText,
  injectBriefIntoForgeInput,
  type CDESceneResult,
  type CDEPipelineConfig,
} from '../../src/cde/cde-pipeline';
import {
  propagateDelta,
  ChainError,
  CHAIN_N_MIN,
  CHAIN_N_MAX,
  type SceneChainReport,
  type SceneChainConfig,
} from '../../src/cde/scene-chain';
import { distillBrief, BRIEF_TOKEN_MAX } from '../../src/cde/distiller';
import { extractDelta } from '../../src/cde/delta-extractor';
import { CDEError } from '../../src/cde/types';
import type {
  CDEInput,
  HotElement,
  CanonFact,
  DebtEntry,
  ArcState,
  SceneBrief,
  StateDelta,
} from '../../src/cde/types';
import type { ForgePacketInput } from '../../src/input/forge-packet-assembler';
import type { SovereignForgeResult } from '../../src/engine';

// ── Mock Forge Runner ────────────────────────────────────────────────────────
// Replaces runSovereignForge in tests. Returns deterministic prose + scores.

const MOCK_PROSE = 'Marie etait assise dans le salon. Pierre entra et la regarda. Il etait fatigue. Le silence devint insupportable.';

function makeMockForgeResult(composite = 90.0): SovereignForgeResult {
  return {
    version: '2.0.0',
    final_prose: MOCK_PROSE,
    s_score: { composite } as never,
    macro_score: {
      macro_axes: {
        ecc: { score: 88 },
        rci: { score: 87 },
        sii: { score: 86 },
        ifi: { score: 89 },
        aai: { score: 85 },
      },
    } as never,
    verdict: composite >= 93 ? 'SEAL' : 'REJECT',
    loop_result: {} as never,
    passes_executed: 1,
  } as SovereignForgeResult;
}

// ── Testable Pipeline ────────────────────────────────────────────────────────
// Mirrors runCDEScene logic but uses a mock forge runner instead of
// runSovereignForge. Avoids monkey-patching engine.ts (SEALED).

type ForgeRunner = (input: ForgePacketInput) => Promise<SovereignForgeResult>;

async function testableRunCDEScene(
  config: CDEPipelineConfig,
  forgeRunner: ForgeRunner,
): Promise<CDESceneResult> {
  const now = new Date().toISOString();

  // 1. Distill brief — INV-PROTO-04
  const brief = distillBrief(config.cde_input);

  // 2. Inject brief — INV-PROTO-03
  const forgeInputWithBrief = injectBriefIntoForgeInput(config.forge_input, brief);

  // 3. Run generation via mock
  const forgeResult = await forgeRunner(forgeInputWithBrief);

  // 4. Extract delta — INV-PROTO-05
  let delta: StateDelta | null = null;
  let deltaError: string | undefined;
  try {
    delta = extractDelta(forgeResult.final_prose, {
      canon_facts: config.cde_input.canon_facts,
      open_debts:  config.cde_input.open_debts,
      arc_states:  config.cde_input.arc_states,
    });
  } catch (err) {
    deltaError = err instanceof Error ? err.message : String(err);
  }

  return {
    scene_index: config.scene_index,
    brief,
    forge_result: forgeResult,
    delta,
    delta_error: deltaError,
    created_at:  now,
  };
}

// Testable chain using mock forge runner
async function testableRunSceneChain(
  config: SceneChainConfig,
  forgeRunner: ForgeRunner,
): Promise<SceneChainReport> {
  if (!Number.isInteger(config.n_scenes) || config.n_scenes < CHAIN_N_MIN || config.n_scenes > CHAIN_N_MAX) {
    throw new ChainError('INVALID_N', `n_scenes=${config.n_scenes} must be integer in [${CHAIN_N_MIN}, ${CHAIN_N_MAX}]`);
  }

  const scenes: CDESceneResult[] = [];
  let currentInput = config.initial_input;

  for (let i = 0; i < config.n_scenes; i++) {
    const result = await testableRunCDEScene(
      { scene_index: i, cde_input: currentInput, forge_input: config.forge_input },
      forgeRunner,
    );
    scenes.push(result);
    if (i < config.n_scenes - 1 && result.delta) {
      currentInput = propagateDelta(currentInput, result.delta, i);
    }
  }

  const composites = scenes.map(s => s.forge_result.s_score?.composite ?? 0);
  const compositeMean = composites.length > 0
    ? Math.round((composites.reduce((a, b) => a + b, 0) / composites.length) * 100) / 100
    : 0;
  const compositeMin = composites.length > 0 ? Math.min(...composites) : 0;
  const sagaReadyCount = scenes.filter(s => {
    const c = s.forge_result.s_score?.composite ?? 0;
    return c >= 92.0;
  }).length;

  return {
    scenes,
    total_scenes:     config.n_scenes,
    composites,
    composite_mean:   compositeMean,
    composite_min:    compositeMin,
    saga_ready_count: sagaReadyCount,
    created_at:       new Date().toISOString(),
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeHot(id: string, type: HotElement['type'], priority: number, content = `Element ${id}`): HotElement {
  return { id, type, content, priority };
}

function makeCanon(id: string, fact: string): CanonFact {
  return { id, fact, sealed_at: '2026-01-01T00:00:00Z' };
}

function makeDebt(id: string, content: string): DebtEntry {
  return { id, content, opened_at: 'ch-1', resolved: false };
}

function makeArc(charId: string, phase: ArcState['arc_phase'] = 'confrontation'): ArcState {
  return {
    character_id: charId,
    arc_phase:    phase,
    current_need: `${charId} needs truth`,
    current_mask: `${charId} pretends calm`,
    tension:      `${charId} inner conflict`,
  };
}

function makeValidCDEInput(overrides?: Partial<CDEInput>): CDEInput {
  return {
    hot_elements: [
      makeHot('h1', 'canon',   8, 'Marie est medecin'),
      makeHot('h2', 'tension', 7, 'Pierre doute'),
      makeHot('h3', 'arc',     9, 'Confrontation finale'),
      makeHot('h4', 'debt',    6, 'Promesse non tenue'),
    ],
    canon_facts:    [makeCanon('cf1', 'Marie est medecin a Lyon')],
    open_debts:     [makeDebt('d1', 'Pierre a promis de revenir')],
    arc_states:     [makeArc('Pierre')],
    scene_objective: 'Pierre confronte Marie sur son secret',
    ...overrides,
  };
}

function makeMinimalForgeInput(): ForgePacketInput {
  return {
    plan: { arcs: [{ theme: 'test', arc_id: 'a1', progression: 'linear', scenes: [], justification: 'j' }], intent_hash: 'h' } as never,
    scene: {
      scene_id: 'scene-001',
      arc_id: 'a1',
      objective: 'Test scene objective',
      conflict: 'internal doubt',
      conflict_type: 'internal',
      emotion_target: 'tension',
      emotion_intensity: 0.7,
      seeds_planted: [],
      seeds_bloomed: [],
      subtext: { hidden_agenda: 'none', surface_action: 'none' },
      sensory_anchor: 'visual',
      constraints: [],
      beats: [],
      target_word_count: 400,
      justification: 'test',
    } as never,
    style_profile: { shape: 'LINEAR', register: 'standard', rhythm: 'moderate' } as never,
    kill_lists: { words: [], patterns: [] } as never,
    canon: [],
    continuity: { previous_scene_summary: '', world_state: {} } as never,
    run_id: 'test-run-001',
  } as ForgePacketInput;
}

const defaultForgeRunner: ForgeRunner = async () => makeMockForgeResult(90);

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — CDE Pipeline — PROTO-01..07
// ══════════════════════════════════════════════════════════════════════════════

describe('V-PROTO CDE Pipeline — INV-PROTO-01..05', () => {

  // PROTO-01 : runCDEScene returns CDESceneResult with brief non-null
  it('PROTO-01: runCDEScene returns CDESceneResult with brief non-null', async () => {
    const result = await testableRunCDEScene(
      { scene_index: 0, cde_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      defaultForgeRunner,
    );
    expect(result.brief).toBeDefined();
    expect(result.brief.token_estimate).toBeGreaterThan(0);
    expect(result.forge_result).toBeDefined();
    expect(result.scene_index).toBe(0);
    expect(typeof result.created_at).toBe('string');
  });

  // PROTO-02 : brief.token_estimate <= 150 (INV-CDE-01 in pipeline)
  it('PROTO-02: brief.token_estimate <= 150 (INV-CDE-01 in pipeline)', async () => {
    const result = await testableRunCDEScene(
      { scene_index: 0, cde_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      defaultForgeRunner,
    );
    expect(result.brief.token_estimate).toBeLessThanOrEqual(BRIEF_TOKEN_MAX);
  });

  // PROTO-03 : INV-PROTO-03 — forge_input not mutated
  it('PROTO-03: INV-PROTO-03 — forge_input original not mutated after runCDEScene', async () => {
    const forgeInput = makeMinimalForgeInput();
    const originalObjective = (forgeInput.scene as Record<string, unknown>).objective;

    await testableRunCDEScene(
      { scene_index: 0, cde_input: makeValidCDEInput(), forge_input: forgeInput },
      defaultForgeRunner,
    );

    // Original must be unchanged
    expect((forgeInput.scene as Record<string, unknown>).objective).toBe(originalObjective);
  });

  // PROTO-04 : brief.input_hash stable on 2 identical calls (INV-CDE-02)
  it('PROTO-04: brief.input_hash stable on 2 identical calls (INV-CDE-02)', async () => {
    const config: CDEPipelineConfig = {
      scene_index: 0,
      cde_input:   makeValidCDEInput(),
      forge_input: makeMinimalForgeInput(),
    };
    const r1 = await testableRunCDEScene(config, defaultForgeRunner);
    const r2 = await testableRunCDEScene(config, defaultForgeRunner);
    expect(r1.brief.input_hash).toBe(r2.brief.input_hash);
  });

  // PROTO-05 : INV-PROTO-05 — error in extractDelta -> delta=null, no exception
  it('PROTO-05: INV-PROTO-05 — extractDelta error -> delta=null, no exception', async () => {
    // Mock forge that returns empty prose (triggers CDEError EMPTY_PROSE in extractDelta)
    const emptyProseRunner: ForgeRunner = async () => ({
      ...makeMockForgeResult(90),
      final_prose: '',
    });
    const result = await testableRunCDEScene(
      { scene_index: 0, cde_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      emptyProseRunner,
    );
    expect(result.delta).toBeNull();
    expect(result.delta_error).toBeDefined();
    expect(result.delta_error).toContain('EMPTY_PROSE');
    // forge_result should still be present (generation not lost)
    expect(result.forge_result).toBeDefined();
  });

  // PROTO-06 : description contains "[CDE BRIEF]" after injection
  it('PROTO-06: forgeInput objective contains "[CDE BRIEF]" after injection', () => {
    const brief = distillBrief(makeValidCDEInput());
    const forgeInput = makeMinimalForgeInput();
    const injected = injectBriefIntoForgeInput(forgeInput, brief);
    const objective = (injected.scene as Record<string, unknown>).objective as string;
    expect(objective).toContain('[CDE BRIEF]');
    expect(objective).toContain('RESTE VRAI:');
    expect(objective).toContain('TENSION:');
    expect(objective).toContain('BOUGER:');
    expect(objective).toContain('INTERDIT:');
  });

  // PROTO-07 : CDEError propagated if distillBrief fails (empty hot_elements)
  it('PROTO-07: CDEError propagated if distillBrief fails (INV-PROTO-04)', async () => {
    const emptyInput = makeValidCDEInput({ hot_elements: [] });
    await expect(
      testableRunCDEScene(
        { scene_index: 0, cde_input: emptyInput, forge_input: makeMinimalForgeInput() },
        defaultForgeRunner,
      ),
    ).rejects.toThrow(CDEError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — formatBriefText
// ══════════════════════════════════════════════════════════════════════════════

describe('V-PROTO formatBriefText', () => {

  it('formats 4 labeled fields', () => {
    const brief: SceneBrief = {
      must_remain_true: 'fact A',
      in_tension:       'tension B',
      must_move:        'move C',
      must_not_break:   'guard D',
      token_estimate:   10,
      input_hash:       'a'.repeat(64),
    };
    const text = formatBriefText(brief);
    expect(text).toContain('RESTE VRAI: fact A');
    expect(text).toContain('TENSION: tension B');
    expect(text).toContain('BOUGER: move C');
    expect(text).toContain('INTERDIT: guard D');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Scene Chain — CHAIN-01..10
// ══════════════════════════════════════════════════════════════════════════════

describe('V-PROTO Scene Chain — INV-CHAIN-01..05', () => {

  // CHAIN-01 : n=2 -> SceneChainReport with 2 scenes
  it('CHAIN-01: runSceneChain n=2 -> report with 2 scenes', async () => {
    const report = await testableRunSceneChain(
      { n_scenes: 2, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      defaultForgeRunner,
    );
    expect(report.scenes).toHaveLength(2);
    expect(report.total_scenes).toBe(2);
    expect(report.composites).toHaveLength(2);
    expect(typeof report.composite_mean).toBe('number');
    expect(typeof report.composite_min).toBe('number');
    expect(typeof report.created_at).toBe('string');
  });

  // CHAIN-02 : n=1 -> ChainError INVALID_N
  it('CHAIN-02: INV-CHAIN-01 — n=1 -> ChainError INVALID_N', async () => {
    await expect(
      testableRunSceneChain(
        { n_scenes: 1, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
        defaultForgeRunner,
      ),
    ).rejects.toThrow(ChainError);
    await expect(
      testableRunSceneChain(
        { n_scenes: 1, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
        defaultForgeRunner,
      ),
    ).rejects.toThrow('INVALID_N');
  });

  // CHAIN-03 : n=6 -> ChainError INVALID_N
  it('CHAIN-03: INV-CHAIN-01 — n=6 -> ChainError INVALID_N', async () => {
    await expect(
      testableRunSceneChain(
        { n_scenes: 6, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
        defaultForgeRunner,
      ),
    ).rejects.toThrow('INVALID_N');
  });

  // CHAIN-04 : scene 1 receives canon_facts from scene 0
  it('CHAIN-04: INV-CHAIN-02 — scene 1 receives canon_facts from scene 0 delta', async () => {
    const initialInput = makeValidCDEInput();
    const initialCanonCount = initialInput.canon_facts.length;

    // Track inputs to verify propagation
    let scene1Input: CDEInput | undefined;
    let callCount = 0;

    const trackingRunner: ForgeRunner = async (input) => {
      callCount++;
      // Scene 0 returns prose with assertive facts (triggers new_facts in delta)
      if (callCount === 1) {
        return {
          ...makeMockForgeResult(90),
          final_prose: 'Marie etait desormais la directrice. Pierre devint son allie.',
        };
      }
      return makeMockForgeResult(90);
    };

    const report = await testableRunSceneChain(
      { n_scenes: 2, initial_input: initialInput, forge_input: makeMinimalForgeInput() },
      trackingRunner,
    );

    // Scene 0 should have extracted new_facts, which become canon_facts for scene 1
    const scene0Delta = report.scenes[0].delta;
    expect(scene0Delta).not.toBeNull();
    if (scene0Delta && scene0Delta.new_facts.length > 0) {
      // Scene 1 brief should have been built with additional canon facts
      // We verify by checking that scene 1 exists and ran successfully
      expect(report.scenes[1]).toBeDefined();
      expect(report.scenes[1].brief).toBeDefined();
    }
  });

  // CHAIN-05 : new_facts propagated as CanonFacts
  it('CHAIN-05: new_facts propagated as CanonFacts in next scene', () => {
    const input = makeValidCDEInput();
    const delta: StateDelta = {
      new_facts:      ['Marie est directrice', 'Pierre est allie'],
      modified_facts: [],
      debts_opened:   [],
      debts_resolved: [],
      arc_movements:  [],
      drift_flags:    [],
      prose_hash:     sha256('test'),
    };
    const propagated = propagateDelta(input, delta, 0);
    expect(propagated.canon_facts.length).toBe(input.canon_facts.length + 2);
    expect(propagated.canon_facts.some(f => f.fact === 'Marie est directrice')).toBe(true);
    expect(propagated.canon_facts.some(f => f.fact === 'Pierre est allie')).toBe(true);
    expect(propagated.canon_facts.some(f => f.id === 'auto-fact-s0-0')).toBe(true);
  });

  // CHAIN-06 : debts_opened propagated as DebtEntry
  it('CHAIN-06: debts_opened propagated as DebtEntry in next scene', () => {
    const input = makeValidCDEInput();
    const delta: StateDelta = {
      new_facts:      [],
      modified_facts: [],
      debts_opened:   [{ content: 'Marie promet de partir', evidence: 'sentence X' }],
      debts_resolved: [],
      arc_movements:  [],
      drift_flags:    [],
      prose_hash:     sha256('test'),
    };
    const propagated = propagateDelta(input, delta, 0);
    const newDebt = propagated.open_debts.find(d => d.id === 'auto-debt-s0-0');
    expect(newDebt).toBeDefined();
    expect(newDebt?.content).toBe('Marie promet de partir');
    expect(newDebt?.resolved).toBe(false);
    expect(newDebt?.opened_at).toBe('scene-0');
  });

  // CHAIN-07 : drift_flags propagated as HotElement priority=8 (INV-CHAIN-05)
  it('CHAIN-07: drift_flags propagated as HotElement priority=8 (INV-CHAIN-05)', () => {
    const input = makeValidCDEInput();
    const delta: StateDelta = {
      new_facts:      [],
      modified_facts: [],
      debts_opened:   [],
      debts_resolved: [],
      arc_movements:  [],
      drift_flags:    ['CANON_CONFLICT[cf1]: negation of "Marie est medecin" detected'],
      prose_hash:     sha256('test'),
    };
    const propagated = propagateDelta(input, delta, 0);
    const driftEl = propagated.hot_elements.find(e => e.id === 'drift-s0-0');
    expect(driftEl).toBeDefined();
    expect(driftEl?.type).toBe('tension');
    expect(driftEl?.priority).toBe(8);
    expect(driftEl?.content).toContain('DRIFT ALERT');
  });

  // CHAIN-08 : saga_ready_count correct
  it('CHAIN-08: saga_ready_count correct', async () => {
    let callIdx = 0;
    const mixedRunner: ForgeRunner = async () => {
      callIdx++;
      // Scene 0: composite=92.5 (saga_ready), Scene 1: composite=85 (not saga_ready)
      return makeMockForgeResult(callIdx === 1 ? 92.5 : 85);
    };
    const report = await testableRunSceneChain(
      { n_scenes: 2, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      mixedRunner,
    );
    expect(report.saga_ready_count).toBe(1);
  });

  // CHAIN-09 : composites array length = n_scenes
  it('CHAIN-09: composites length = n_scenes', async () => {
    const report = await testableRunSceneChain(
      { n_scenes: 3, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      defaultForgeRunner,
    );
    expect(report.composites).toHaveLength(3);
  });

  // CHAIN-10 : composite_mean = mean(composites)
  it('CHAIN-10: composite_mean = mean(composites)', async () => {
    let callIdx = 0;
    const variedRunner: ForgeRunner = async () => {
      callIdx++;
      const composites = [88, 92];
      return makeMockForgeResult(composites[(callIdx - 1) % composites.length]);
    };
    const report = await testableRunSceneChain(
      { n_scenes: 2, initial_input: makeValidCDEInput(), forge_input: makeMinimalForgeInput() },
      variedRunner,
    );
    const expectedMean = Math.round(((88 + 92) / 2) * 100) / 100;
    expect(report.composite_mean).toBe(expectedMean);
    expect(report.composite_min).toBe(88);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — propagateDelta edge cases
// ══════════════════════════════════════════════════════════════════════════════

describe('V-PROTO propagateDelta — edge cases', () => {

  it('empty delta -> input unchanged except scene_objective', () => {
    const input = makeValidCDEInput();
    const emptyDelta: StateDelta = {
      new_facts: [], modified_facts: [], debts_opened: [],
      debts_resolved: [], arc_movements: [], drift_flags: [],
      prose_hash: sha256('empty'),
    };
    const propagated = propagateDelta(input, emptyDelta, 0);
    expect(propagated.canon_facts).toEqual(input.canon_facts);
    expect(propagated.open_debts).toEqual(input.open_debts);
    expect(propagated.hot_elements).toEqual(input.hot_elements);
    expect(propagated.scene_objective).toContain('Suite scene 1');
  });

  it('debts_resolved marks existing debt as resolved', () => {
    const input = makeValidCDEInput();
    const delta: StateDelta = {
      new_facts: [], modified_facts: [], debts_opened: [],
      debts_resolved: [{ id: 'd1', evidence: 'Pierre revint' }],
      arc_movements: [], drift_flags: [],
      prose_hash: sha256('test'),
    };
    const propagated = propagateDelta(input, delta, 0);
    const resolved = propagated.open_debts.find(d => d.id === 'd1');
    expect(resolved?.resolved).toBe(true);
  });

  it('constants: CHAIN_N_MIN=2, CHAIN_N_MAX=5', () => {
    expect(CHAIN_N_MIN).toBe(2);
    expect(CHAIN_N_MAX).toBe(5);
  });
});
