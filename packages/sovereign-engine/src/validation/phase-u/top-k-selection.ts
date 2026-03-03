/**
 * top-k-selection.ts
 * U-W4 — Top-K Selection Engine
 *
 * Pipeline Editor Engine (Phase U) :
 *   1. Génère K variantes via runSovereignForge × K seeds distincts
 *   2. Filtre : garde uniquement les variantes SEAL (verdict S-Oracle)
 *   3. Si 0 survivants → TopKError ZERO_SURVIVORS (fail-closed)
 *   4. Évalue les survivants via GreatnessJudge (4 axes pondérés)
 *   5. Retourne top-1 + KSelectionReport complet
 *
 * Invariants :
 *   INV-TK-01 : K ∈ [2, 32] — hors bornes → TopKError
 *   INV-TK-02 : seeds distincts — collisions interdites
 *   INV-TK-03 : au moins 1 survivant SEAL — sinon ZERO_SURVIVORS
 *   INV-TK-04 : KSelectionReport produit pour chaque run (traçabilité totale)
 *   INV-TK-05 : top-1 = argmax(composite Greatness) parmi survivants SEAL
 *   INV-TK-06 : fail-closed — erreur sur variante individuelle = REJECTED (non bloquant)
 *               erreur sur GreatnessJudge = TopKError JUDGE_FAILED (bloquant)
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { sha256 } from '@omega/canon-kernel';
import type { SovereignProvider } from '../../types.js';
import type { ForgePacketInput } from '../../input/forge-packet-assembler.js';
import { runSovereignForge, type SovereignForgeResult } from '../../engine.js';
import {
  GreatnessJudge,
  type GreatnessResult,
  type SelectionTrace,
} from './greatness-judge.js';
import type { JudgeCache } from '../judge-cache.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TopKConfig {
  readonly k:          number;   // [2, 32] — nombre de variantes à générer
  readonly modelId:    string;   // pour GreatnessJudge
  readonly apiKey:     string;   // pour GreatnessJudge
}

export interface VariantRecord {
  readonly seed:           string;
  readonly variant_index:  number;   // 0-based
  readonly forge_result:   SovereignForgeResult;
  readonly prose_sha256:   string;
  readonly survived_seal:  boolean;
  readonly greatness?:     GreatnessResult;  // présent si survived_seal=true
  readonly rejection_reason?: string;        // présent si survived_seal=false ou erreur
}

/** Rapport complet d'un run Top-K — INV-TK-04 */
export interface KSelectionReport {
  readonly run_id:          string;           // SHA256(seed_base + k)
  readonly k_requested:     number;
  readonly k_generated:     number;           // effectivement générés (peut < k si erreur provider)
  readonly k_survived_seal: number;           // variantes SEAL
  readonly k_evaluated:     number;           // variantes scorées par GreatnessJudge
  readonly variants:        VariantRecord[];
  readonly top1:            VariantRecord;    // meilleure variante
  readonly top1_composite:  number;           // [0, 100]
  readonly gain_vs_first:   number;           // composite top1 - composite variante[0]
  readonly created_at:      string;           // ISO 8601
}

export class TopKError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`${code}: ${message}`);
    this.name = 'TopKError';
  }
}

// ── Constantes ───────────────────────────────────────────────────────────────

export const TOP_K_MIN = 2;
export const TOP_K_MAX = 32;

// ── Utilitaire : génération de seeds distincts ───────────────────────────────

/**
 * Génère K seeds déterministes distincts à partir d'une seed de base.
 * seed_i = SHA256(baseSeed + ':' + i)
 * INV-TK-02 : unicité garantie par construction SHA256.
 */
export function generateDistinctSeeds(baseSeed: string, k: number): string[] {
  const seeds = new Set<string>();
  for (let i = 0; i < k; i++) {
    seeds.add(sha256(`${baseSeed}:${i}`));
  }
  if (seeds.size !== k) {
    // Collision SHA256 : impossible en pratique, mais fail-closed
    throw new TopKError('SEED_COLLISION', `Expected ${k} distinct seeds, got ${seeds.size}`);
  }
  return Array.from(seeds);
}

// ── Top-K Selection Engine ───────────────────────────────────────────────────

export class TopKSelectionEngine {
  private readonly judge: GreatnessJudge;

  constructor(config: TopKConfig, cache: JudgeCache) {
    this.judge = new GreatnessJudge(config.modelId, config.apiKey, cache);
  }

  /** Injecte un GreatnessJudge custom (pour tests) */
  static withJudge(judge: GreatnessJudge): TopKSelectionEngine {
    const inst = Object.create(TopKSelectionEngine.prototype) as TopKSelectionEngine;
    (inst as unknown as { judge: GreatnessJudge }).judge = judge;
    return inst;
  }

  /**
   * Lance le pipeline Top-K complet.
   * INV-TK-01 : k ∈ [2, 32]
   * INV-TK-03 : au moins 1 survivant SEAL
   * INV-TK-05 : top-1 = argmax composite
   */
  async run(
    input: ForgePacketInput,
    provider: SovereignProvider,
    k: number,
    baseSeed: string,
  ): Promise<KSelectionReport> {
    // INV-TK-01
    if (!Number.isInteger(k) || k < TOP_K_MIN || k > TOP_K_MAX) {
      throw new TopKError('INVALID_K', `k=${k} must be integer in [${TOP_K_MIN}, ${TOP_K_MAX}]`);
    }

    // INV-TK-02 — seeds distincts
    const seeds = generateDistinctSeeds(baseSeed, k);
    const runId = sha256(`${baseSeed}:${k}`);

    // ── Étape 1 : Génération K variantes ─────────────────────────────────────
    const variants: VariantRecord[] = [];

    for (let i = 0; i < k; i++) {
      const seed = seeds[i];
      // Injecter le seed dans l'input (override seeds.generation)
      const seededInput = injectSeed(input, seed);

      let forgeResult: SovereignForgeResult;
      try {
        forgeResult = await runSovereignForge(seededInput, provider);
      } catch (err) {
        // INV-TK-06 : erreur provider individuelle = REJECTED, non bloquant
        const detail = err instanceof Error ? err.message : String(err);
        variants.push({
          seed,
          variant_index:   i,
          forge_result:    null as unknown as SovereignForgeResult,
          prose_sha256:    '',
          survived_seal:   false,
          rejection_reason: `FORGE_ERROR: ${detail}`,
        });
        continue;
      }

      const prose     = forgeResult.final_prose;
      const proseSha  = sha256(prose);
      const survived  = forgeResult.verdict === 'SEAL';

      variants.push({
        seed,
        variant_index:    i,
        forge_result:     forgeResult,
        prose_sha256:     proseSha,
        survived_seal:    survived,
        rejection_reason: survived ? undefined : `S_ORACLE_REJECT: score=${forgeResult.s_score?.composite ?? 'n/a'}`,
      });
    }

    const kGenerated = variants.filter(v => v.forge_result !== null).length;
    const survivors  = variants.filter(v => v.survived_seal);

    // INV-TK-03
    if (survivors.length === 0) {
      throw new TopKError(
        'ZERO_SURVIVORS',
        `0/${kGenerated} variants passed S-Oracle SEAL gate`,
      );
    }

    // ── Étape 2 : Évaluation Greatness sur survivants ─────────────────────────
    const evaluated: VariantRecord[] = [];

    for (const v of variants) {
      if (!v.survived_seal) {
        evaluated.push(v);
        continue;
      }
      let greatness: GreatnessResult;
      try {
        greatness = await this.judge.evaluate(v.forge_result.final_prose, v.prose_sha256);
      } catch (err) {
        // INV-TK-06 : erreur GreatnessJudge = bloquant (propagé)
        const detail = err instanceof Error ? err.message : String(err);
        throw new TopKError('JUDGE_FAILED', `Variant ${v.variant_index}: ${detail}`, err);
      }
      evaluated.push({ ...v, greatness });
    }

    // ── Étape 3 : Sélection top-1 (argmax composite) ─────────────────────────
    const scoredSurvivors = evaluated.filter(v => v.survived_seal && v.greatness);
    scoredSurvivors.sort((a, b) => (b.greatness!.composite) - (a.greatness!.composite));
    const top1 = scoredSurvivors[0];

    // gain vs première variante générée (index 0, si disponible)
    const first = evaluated.find(v => v.variant_index === 0 && v.survived_seal && v.greatness);
    const gainVsFirst = first
      ? Math.round((top1.greatness!.composite - first.greatness!.composite) * 100) / 100
      : 0;

    const report: KSelectionReport = {
      run_id:          runId,
      k_requested:     k,
      k_generated:     kGenerated,
      k_survived_seal: survivors.length,
      k_evaluated:     scoredSurvivors.length,
      variants:        evaluated,
      top1,
      top1_composite:  top1.greatness!.composite,
      gain_vs_first:   gainVsFirst,
      created_at:      new Date().toISOString(),
    };

    return report;
  }
}

// ── Helper : injection de seed ────────────────────────────────────────────────

/**
 * Retourne une copie de ForgePacketInput avec le seed de génération remplacé.
 * Le type ForgePacketInput est structurally typed → on utilise spread + override.
 */
function injectSeed(input: ForgePacketInput, seed: string): ForgePacketInput {
  return {
    ...input,
    seeds: {
      ...((input as Record<string, unknown>).seeds as object ?? {}),
      generation: seed,
    },
  } as ForgePacketInput;
}
