/**
 * top-k-selection.ts
 * U-W4 — Top-K Selection Engine
 *
 * Pipeline (Phase U) :
 *   1. Genere K variantes via runSovereignForge x K seeds distincts
 *   2. Candidacy gate (relaxe) : composite >= CANDIDATE_FLOOR_COMPOSITE (85)
 *   3. Si 0 candidats -> TopKError ZERO_CANDIDATES (fail-closed)
 *   4. Evalue les candidats via GreatnessJudge (4 axes ponderes)
 *   5. Retourne top-1 (argmax greatness) + KSelectionReport complet
 *
 * Architecture a deux seuils (U-ROSETTE-02) :
 *   - CANDIDATE_FLOOR_COMPOSITE = 85  : sas d'entree Top-K (relaxe)
 *   - SEAL final = composite >= 93    : certification finale (inchange)
 *   => "Candidate survives" != "Candidate is SEAL"
 *   => Le seuil SEAL n'est PAS abaisse. Il est dissocie du seuil de survie.
 *
 * Invariants :
 *   INV-TK-01 : K in [2, 32] — hors bornes -> TopKError INVALID_K
 *   INV-TK-02 : seeds distincts — collisions interdites
 *   INV-TK-03 : au moins 1 candidat (composite >= 85) — sinon ZERO_CANDIDATES
 *   INV-TK-04 : KSelectionReport produit pour chaque run (tracabilite totale)
 *   INV-TK-05 : top-1 = argmax(composite Greatness) parmi candidats
 *   INV-TK-06 : fail-closed — erreur provider individuelle = REJECTED (non bloquant)
 *               erreur GreatnessJudge sur variante i = non-bloquant (log + skip, greatness absent)
 *               erreur GreatnessJudge sur TOUTES les variantes = TopKError JUDGE_FAILED (bloquant)
 *   INV-TK-CANDIDATE-01 : CANDIDATE_FLOOR_COMPOSITE < SEAL_THRESHOLD (85 < 93)
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TopKConfig {
  readonly k:       number;  // [2, 32] — nombre de variantes a generer
  readonly modelId: string;  // pour GreatnessJudge
  readonly apiKey:  string;  // pour GreatnessJudge
}

export interface VariantRecord {
  readonly seed:             string;
  readonly variant_index:    number;           // 0-based
  readonly forge_result:     SovereignForgeResult;
  readonly prose_sha256:     string;
  readonly survived_seal:    boolean;          // SEAL final : composite >= 93 + all floors (INCHANGE)
  readonly is_candidate:     boolean;          // Candidacy gate : composite >= CANDIDATE_FLOOR_COMPOSITE (85)
  readonly greatness?:       GreatnessResult;  // present si is_candidate=true
  readonly rejection_reason?: string;          // present si is_candidate=false ou erreur forge
}

/** Rapport complet d'un run Top-K — INV-TK-04 */
export interface KSelectionReport {
  readonly run_id:          string;   // SHA256(seed_base + k)
  readonly k_requested:     number;
  readonly k_generated:     number;   // effectivement generes (peut < k si erreur provider)
  readonly k_survived_seal: number;   // variantes SEAL strict (composite >= 93)
  readonly k_candidates:    number;   // variantes passant candidacy gate (>= 85)
  readonly k_evaluated:     number;   // variantes scorees par GreatnessJudge
  readonly k_judge_failed:  number;   // variantes ou le judge a echoue (non-bloquant si k_evaluated > 0)
  readonly variants:        VariantRecord[];
  readonly top1:            VariantRecord;  // meilleure variante (argmax greatness)
  readonly top1_composite:  number;         // [0, 100]
  readonly gain_vs_first:   number;         // composite top1 - composite variante[0]
  readonly created_at:      string;         // ISO 8601
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

// ── Constantes ────────────────────────────────────────────────────────────────

export const TOP_K_MIN = 2;
export const TOP_K_MAX = 32;

/**
 * Seuil de candidature Top-K.
 * DISTINCT du seuil SEAL final (93).
 * INV-TK-CANDIDATE-01 : CANDIDATE_FLOOR_COMPOSITE (85) < SEAL_THRESHOLD (93)
 *
 * Formule : x_best = argmax_{x in K, composite(x) >= 85} composite(x)
 * Reference : Gemini + ChatGPT audit 2026-03-07
 */
export const CANDIDATE_FLOOR_COMPOSITE = 85;

/**
 * INV-TK-SII-01 : SII Floor Penalty — U-ROSETTE-15 D2
 *
 * Un variant champion avec SII < 82 est in-sauvable par le Polish Engine (+3 pts max).
 * Pour éviter que le GreatnessJudge couronne un variant ECC-élevé mais SII-dégradé,
 * on applique une pénalité sur le score effectif de tri.
 *
 * Score effectif = greatness.composite - max(0, (SII_FLOOR_PENALTY_THRESHOLD - sii) × factor)
 * Où factor = SII_FLOOR_PENALTY_FACTOR / 10
 *
 * Exemple : sii=70, composite=80 → effectif = 80 - (82-70)×0.5 = 80 - 6.0 = 74.0
 * Exemple : sii=82, composite=80 → effectif = 80 (aucune pénalité)
 *
 * IMPORTANT : La pénalité ne modifie PAS le verdict final (SEAL/REJECT).
 * Elle ne modifie QUE le critère de TRI pour la sélection top-1.
 * Si tous les variants ont SII<82, le top-1 reste le meilleur variant disponible.
 *
 * INV-TK-CANDIDATE-01 reste inchangé (CANDIDATE_FLOOR_COMPOSITE = 85 < SEAL = 93).
 */
export const SII_FLOOR_PENALTY_THRESHOLD = 82;
export const SII_FLOOR_PENALTY_FACTOR    = 5.0;  // pénalité par point sous le seuil (÷10)

// ── Utilitaire : generation de seeds distincts ────────────────────────────────

/**
 * Genere K seeds deterministes distincts a partir d'une seed de base.
 * seed_i = SHA256(baseSeed + ':' + i)
 * INV-TK-02 : unicite garantie par construction SHA256.
 */
export function generateDistinctSeeds(baseSeed: string, k: number): string[] {
  const seeds = new Set<string>();
  for (let i = 0; i < k; i++) {
    seeds.add(sha256(`${baseSeed}:${i}`));
  }
  if (seeds.size !== k) {
    throw new TopKError('SEED_COLLISION', `Expected ${k} distinct seeds, got ${seeds.size}`);
  }
  return Array.from(seeds);
}

// ── Top-K Selection Engine ────────────────────────────────────────────────────

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
   *
   * Etape 1 : Generation K variantes (seeds distincts)
   * Etape 2 : Candidacy gate (composite >= CANDIDATE_FLOOR_COMPOSITE)
   * Etape 3 : GreatnessJudge sur tous les candidats
   * Etape 4 : top-1 = argmax(greatness.composite) parmi candidats
   *
   * INV-TK-01 : k in [2, 32]
   * INV-TK-03 : au moins 1 candidat — sinon ZERO_CANDIDATES
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

    // ── Etape 1 : Generation K variantes ────────────────────────────────────
    const variants: VariantRecord[] = [];

    for (let i = 0; i < k; i++) {
      const seed        = seeds[i];
      const seededInput = injectSeed(input, seed);

      let forgeResult: SovereignForgeResult;
      try {
        forgeResult = await runSovereignForge(seededInput, provider);
      } catch (err) {
        // INV-TK-06 : erreur provider individuelle = REJECTED, non bloquant
        const detail = err instanceof Error ? err.message : String(err);
        variants.push({
          seed,
          variant_index:    i,
          forge_result:     null as unknown as SovereignForgeResult,
          prose_sha256:     '',
          survived_seal:    false,
          is_candidate:     false,
          rejection_reason: `FORGE_ERROR: ${detail}`,
        });
        continue;
      }

      const prose        = forgeResult.final_prose;
      const proseSha     = sha256(prose);
      const survived     = forgeResult.verdict === 'SEAL';
      const sComposite   = forgeResult.s_score?.composite ?? 0;
      const is_candidate = sComposite >= CANDIDATE_FLOOR_COMPOSITE;

      variants.push({
        seed,
        variant_index:    i,
        forge_result:     forgeResult,
        prose_sha256:     proseSha,
        survived_seal:    survived,
        is_candidate,
        rejection_reason: is_candidate
          ? undefined
          : `BELOW_CANDIDATE_FLOOR: composite=${sComposite.toFixed(1)}<${CANDIDATE_FLOOR_COMPOSITE}`,
      });
    }

    const kGenerated = variants.filter(v => v.forge_result !== null).length;
    const survivors  = variants.filter(v => v.survived_seal);   // strict SEAL gate (inchange)
    const candidates = variants.filter(v => v.is_candidate);    // candidacy gate (relaxe)

    // INV-TK-03 (U-ROSETTE-02) : au moins 1 candidat (composite >= CANDIDATE_FLOOR_COMPOSITE)
    // Le seuil SEAL final (93) reste inchange — top1.survived_seal l'indique.
    if (candidates.length === 0) {
      throw new TopKError(
        'ZERO_CANDIDATES',
        `0/${kGenerated} variants reached candidacy floor (composite >= ${CANDIDATE_FLOOR_COMPOSITE})`,
      );
    }

    // ── Etape 2 : Evaluation Greatness sur les CANDIDATS ────────────────────
    const evaluated: VariantRecord[] = [];

    for (const v of variants) {
      if (!v.is_candidate) {
        // Variant sous le seuil candidature : pas de GreatnessJudge, passe tel quel
        evaluated.push(v);
        continue;
      }
      let greatness: GreatnessResult | undefined;
      try {
        greatness = await this.judge.evaluate(v.forge_result.final_prose, v.prose_sha256);
      } catch (err) {
        // INV-TK-06 (patch U-ROSETTE-03) : erreur GreatnessJudge sur variante i = non-bloquant
        // Fail-closed preserve : si 0 candidats evalues apres la boucle -> throw JUDGE_FAILED
        const detail = err instanceof Error ? err.message : String(err);
        console.warn(`[TopK] JUDGE_WARN variant ${v.variant_index}: ${detail}`);
        evaluated.push({ ...v, rejection_reason: `JUDGE_FAILED: ${detail}` });
        continue;
      }
      evaluated.push({ ...v, greatness });
    }

    // ── Etape 3 : Selection top-1 parmi candidats (argmax greatness.composite) ─
    const scoredCandidates = evaluated.filter(v => v.is_candidate && v.greatness);
    const kJudgeFailed = candidates.length - scoredCandidates.length;

    // INV-TK-06 : fail-closed — si 0 candidats evalues par le judge -> JUDGE_FAILED bloquant
    if (scoredCandidates.length === 0) {
      throw new TopKError(
        'JUDGE_FAILED',
        `All ${candidates.length} candidate(s) failed GreatnessJudge evaluation`,
      );
    }

    // INV-TK-SII-01 : tri avec pénalité SII — U-ROSETTE-15 D2
    // Le score effectif pénalise les variants avec SII < SII_FLOOR_PENALTY_THRESHOLD.
    // Cela empêche le top-K de couronner un variant ECC-élevé mais SII-dégradé (in-sauvable par Polish).
    const effectiveScore = (v: VariantRecord): number => {
      const sii = (v.forge_result?.macro_score?.macro_axes?.sii?.score as number | undefined) ?? 100;
      const penalty = Math.max(0, (SII_FLOOR_PENALTY_THRESHOLD - sii) * (SII_FLOOR_PENALTY_FACTOR / 10));
      return v.greatness!.composite - penalty;
    };
    scoredCandidates.sort((a, b) => effectiveScore(b) - effectiveScore(a));
    const top1 = scoredCandidates[0];

    // gain vs premiere variante generee (index 0, si candidat)
    const first = evaluated.find(v => v.variant_index === 0 && v.is_candidate && v.greatness);
    const gainVsFirst = first
      ? Math.round((top1.greatness!.composite - first.greatness!.composite) * 100) / 100
      : 0;

    const report: KSelectionReport = {
      run_id:          runId,
      k_requested:     k,
      k_generated:     kGenerated,
      k_survived_seal: survivors.length,
      k_candidates:    candidates.length,
      k_evaluated:     scoredCandidates.length,
      k_judge_failed:  kJudgeFailed,
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
 * Retourne une copie de ForgePacketInput avec le seed de generation remplace.
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
