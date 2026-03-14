/**
 * scene-chain.ts — Moteur de chainage multi-scenes
 * Sprint V-PROTO
 *
 * Execute N scenes en sequence :
 *   - Scene 0 : CDEInput fourni par l'appelant
 *   - Scene 1+ : CDEInput mis a jour depuis StateDelta de la scene precedente
 *
 * Invariants :
 *   INV-CHAIN-01 : N in [2, 5] — hors bornes -> ChainError INVALID_N
 *   INV-CHAIN-02 : Chaque scene i recoit le delta de la scene i-1
 *   INV-CHAIN-03 : SceneChainReport produit a chaque appel (tracabilite)
 *   INV-CHAIN-04 : Zero fait contradictoire propage (INV-CDE-03 respecte)
 *   INV-CHAIN-05 : drift_flags propages comme HotElements priority=8
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import type { SovereignProvider } from '../types.js';
import type { ForgePacketInput } from '../input/forge-packet-assembler.js';
import type { CDEInput, HotElement, CanonFact, DebtEntry, StateDelta } from './types.js';
import { runCDEScene, type CDESceneResult } from './cde-pipeline.js';
import { SAGA_READY_COMPOSITE_MIN, SAGA_READY_SSI_MIN } from '../core/thresholds.js';
import { computeMinAxis } from '../utils/math-utils.js';

// ── Constants ────────────────────────────────────────────────────────────────

export const CHAIN_N_MIN = 2;
export const CHAIN_N_MAX = 5;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SceneChainConfig {
  readonly n_scenes:      number;           // [2, 5]
  readonly initial_input: CDEInput;         // CDEInput scene 0
  readonly forge_input:   ForgePacketInput;  // meme ForgePacketInput pour toutes les scenes
}

export interface SceneChainReport {
  readonly scenes:            CDESceneResult[];  // resultats de chaque scene
  readonly total_scenes:      number;
  readonly composites:        number[];          // composite par scene
  readonly composite_mean:    number;            // moyenne
  readonly composite_min:     number;            // minimum (point faible)
  readonly saga_ready_count:  number;            // scenes avec composite>=92 + min_axis>=85
  readonly created_at:        string;
}

export class ChainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = 'ChainError';
  }
}

// ── Delta propagation ────────────────────────────────────────────────────────

/**
 * Propagate a StateDelta into the next scene's CDEInput.
 *
 * INV-CHAIN-02 : each scene i receives delta from scene i-1
 * INV-CHAIN-04 : drift_flags from delta are NOT propagated as canon facts
 * INV-CHAIN-05 : drift_flags propagated as HotElement type='tension' priority=8
 */
export function propagateDelta(
  previousInput: CDEInput,
  delta: StateDelta,
  sceneIndex: number,
): CDEInput {
  // new_facts -> CanonFact[]
  const newCanonFacts: CanonFact[] = delta.new_facts.map((fact, i) => ({
    id:        `auto-fact-s${sceneIndex}-${i}`,
    fact,
    sealed_at: new Date().toISOString(),
  }));

  // debts_opened -> DebtEntry[]
  const newDebts: DebtEntry[] = delta.debts_opened.map((d, i) => ({
    id:        `auto-debt-s${sceneIndex}-${i}`,
    content:   d.content,
    opened_at: `scene-${sceneIndex}`,
    resolved:  false,
  }));

  // debts_resolved -> mark existing debts resolved
  const resolvedIds = new Set(delta.debts_resolved.map(d => d.id));
  const updatedDebts = previousInput.open_debts.map(d =>
    resolvedIds.has(d.id) ? { ...d, resolved: true } : d,
  );

  // drift_flags -> HotElement priority=8 (INV-CHAIN-05)
  const driftElements: HotElement[] = delta.drift_flags.map((flag, i) => ({
    id:       `drift-s${sceneIndex}-${i}`,
    type:     'tension' as const,
    content:  `DRIFT ALERT: ${flag}`,
    priority: 8,
  }));

  return {
    ...previousInput,
    canon_facts:    [...previousInput.canon_facts, ...newCanonFacts],
    open_debts:     [...updatedDebts, ...newDebts],
    hot_elements:   [...previousInput.hot_elements, ...driftElements],
    scene_objective: `Suite scene ${sceneIndex + 1}: ${previousInput.scene_objective}`,
  };
}

// ── Saga ready check ─────────────────────────────────────────────────────────

function isSceneSagaReady(result: CDESceneResult): boolean {
  const composite = result.forge_result.s_score?.composite ?? 0;
  const minAxis = computeMinAxis(result.forge_result.macro_score?.macro_axes);
  return composite >= SAGA_READY_COMPOSITE_MIN && minAxis >= SAGA_READY_SSI_MIN;
}

// ── Main function ────────────────────────────────────────────────────────────

/**
 * runSceneChain() — Execute N scenes in sequence with CDE propagation.
 *
 * @throws ChainError INVALID_N if n_scenes not in [2, 5]
 */
export async function runSceneChain(
  config: SceneChainConfig,
  provider: SovereignProvider,
): Promise<SceneChainReport> {
  // INV-CHAIN-01
  if (!Number.isInteger(config.n_scenes) || config.n_scenes < CHAIN_N_MIN || config.n_scenes > CHAIN_N_MAX) {
    throw new ChainError('INVALID_N', `n_scenes=${config.n_scenes} must be integer in [${CHAIN_N_MIN}, ${CHAIN_N_MAX}]`);
  }

  const scenes: CDESceneResult[] = [];
  let currentInput = config.initial_input;

  for (let i = 0; i < config.n_scenes; i++) {
    console.log(`\n[CHAIN] === Scene ${i}/${config.n_scenes} ===`);

    const result = await runCDEScene(
      {
        scene_index: i,
        cde_input:   currentInput,
        forge_input: config.forge_input,
      },
      provider,
    );

    scenes.push(result);

    // INV-CHAIN-02 : propagate delta for next scene
    if (i < config.n_scenes - 1 && result.delta) {
      currentInput = propagateDelta(currentInput, result.delta, i);
    }
  }

  // ── Build report — INV-CHAIN-03 ────────────────────────────────────────────
  const composites = scenes.map(s => s.forge_result.s_score?.composite ?? 0);
  const compositeMean = composites.length > 0
    ? Math.round((composites.reduce((a, b) => a + b, 0) / composites.length) * 100) / 100
    : 0;
  const compositeMin = composites.length > 0
    ? Math.min(...composites)
    : 0;

  return {
    scenes,
    total_scenes:      config.n_scenes,
    composites,
    composite_mean:    compositeMean,
    composite_min:     compositeMin,
    saga_ready_count:  scenes.filter(isSceneSagaReady).length,
    created_at:        new Date().toISOString(),
  };
}
