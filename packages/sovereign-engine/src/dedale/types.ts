/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/dedale/types.ts
 * Version:  0.55.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Upstream: DEDALE_v0.55_SYNTHESE_3IA_ET_SPEC_AMENDED.md (2026-04-22)
 * Design:   DEDALE_LOOP_DETECT_REGEN_DESIGN_v0.5_RESET_FIRST.md §3-§7
 *
 * Contrats TypeScript de Dédale. Dédale = rempart OMEGA-side minimal qui
 *   1) détecte une boucle par oracle multi-critère (C1 + C2 + C4)
 *   2) déclenche immédiatement un reset session Ollama (pas 2 hard_fails)
 *   3) ré-exécute exactement une fois le chunk avec le MÊME seed
 *   4) produit un verdict binaire reset_effective / reset_non_effective
 *
 * C3 (hash_repeat) est RETIRÉ du noyau v0.55 (blocante unanime 3/3 IA,
 * flow même-seed post-reset rend C3 orphelin). Réservé v0.6 multi-seed.
 *
 * PASS_THRESHOLDS sont GELÉS (invariant §C.5 pré-engagé, non modifiable
 * post-hoc — règle kill-switch OMEGA).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────────────────────────────────────
// FEATURE FLAG
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Mode d'opération de Dédale.
 *
 * - 'off'    : Dédale désactivé, aucun calcul, aucun impact runtime
 * - 'shadow' : Dédale s'exécute et logue, mais n'arbitre jamais (télémétrie seule)
 * - 'on'     : Dédale arbitre (V2-B-LOOP uniquement, K2-LOOP intact)
 *
 * Source: env var OMEGA_DEDALE_MODE. Default: 'off'.
 */
export type DedaleMode = 'off' | 'shadow' | 'on';

// ──────────────────────────────────────────────────────────────────────────────
// ORACLE — VERDICTS BINAIRES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verdict de l'oracle Dédale sur un chunk généré.
 *
 * - 'no_loop'   : aucun critère C1/C2/C4 déclenché → chunk OK
 * - 'hard_fail' : ≥1 critère déclenché → boucle détectée, déclencher reset
 *
 * OR logique entre critères (plus sensible que AND, voir design §3).
 */
export type OracleVerdict = 'no_loop' | 'hard_fail';

/**
 * Raison détaillée du hard_fail (pour télémétrie + audit).
 * Une seule raison dominante par verdict (première règle déclenchée).
 *
 * ADR-005 r2 (composite rule, 2026-04-22) :
 *   - 'c1_trigram_ratio'    : C1 > c1_high_threshold (seuil haut, ex. 0.20)
 *   - 'c1_c4_composite'     : C1 > c1_threshold (seuil bas, ex. 0.15) AND C4 < c4_threshold
 *   - 'c4_fingerprint_distance' : réservé historique — NE DÉCLENCHE PLUS seul (C4 alone
 *                                  n'est plus un trigger dans r2 ; conservé pour
 *                                  compat télémétrie legacy ré-analysée)
 *   - 'c2_repetition_score' : réservé historique — DEPRECATED r2, C2 est info-tag,
 *                              ne déclenche plus hard_fail (conservé pour compat)
 */
export type HardFailReason =
  | 'c1_trigram_ratio'        // C1 > c1_high_threshold (seuil haut)
  | 'c1_c4_composite'         // ADR-005 r2 : C1 > c1_threshold AND C4 < c4_threshold
  | 'c2_repetition_score'     // DEPRECATED r2 — legacy (C2 est info-tag désormais)
  | 'c4_fingerprint_distance'; // DEPRECATED r2 — legacy (C4 seul ne déclenche plus)

/**
 * Résultat complet d'un appel oracle.
 * Si verdict === 'no_loop' alors reason === undefined.
 *
 * ADR-005 r2 additions :
 *   - thresholds_used.c1_high_threshold  : seuil C1 haut (déclenche seul)
 *   - metrics.c2_info_elevated           : tag info C2 > seuil (ne déclenche pas)
 */
export interface OracleResult {
  readonly verdict: OracleVerdict;
  readonly reason: HardFailReason | undefined;
  readonly metrics: {
    readonly c1_trigram_ratio: number;
    readonly c2_repetition_score: number;
    readonly c4_unique_ratio: number;
    /** ADR-005 r2 : C2 > c2_threshold — info-tag uniquement, ne déclenche pas hard_fail. */
    readonly c2_info_elevated: boolean;
  };
  readonly thresholds_used: {
    readonly c1_threshold: number;       // seuil bas (composite)
    readonly c1_high_threshold: number;  // ADR-005 r2 : seuil haut (déclenche seul)
    readonly c2_threshold: number;       // seuil info-tag (ne déclenche plus)
    readonly c4_threshold: number;       // seuil composite
  };
  readonly evaluated_at_ms: number;  // timestamp monotonic (via deps.clock)
}

// ──────────────────────────────────────────────────────────────────────────────
// RESET SESSION — PREUVE CAUSALE (B2)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot PID d'un process Ollama (avant ou après kill).
 * Le StartTime est critique — distinguer "même PID" de "même process".
 */
export interface ProcessSnapshot {
  readonly pid: number | null;       // null si process absent
  readonly start_time_iso: string | null;  // ISO 8601, null si absent
  readonly name: string;             // "ollama_llama_server" | "ollama serve" | ...
}

/**
 * Preuve que le reset session a réellement eu lieu.
 * before.pid DOIT différer strictement de after.pid (ou after.pid === null
 * avant health check, puis re-populated après).
 */
export interface ResetProof {
  readonly before: {
    readonly serve: ProcessSnapshot;
    readonly runner: ProcessSnapshot;
  };
  readonly after: {
    readonly serve: ProcessSnapshot;
    readonly runner: ProcessSnapshot;
  };
  readonly kill_order: readonly string[];  // ex: ["ollama_llama_server", "ollama serve"]
  readonly fallback_used: boolean;  // true si service restart utilisé
  readonly health_check_ms: number;  // latence curl /api/tags post-reset
}

/**
 * Résultat d'un reset session.
 */
export type ResetOutcome = 'success' | 'failed';

export interface ResetResult {
  readonly outcome: ResetOutcome;
  readonly proof: ResetProof | null;   // null si outcome === 'failed' avant snapshot after
  readonly elapsed_ms: number;
  readonly error: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR — VERDICT FINAL (4 ÉTATS)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verdict final Dédale par chunk (utilisé par critère §C.5).
 *
 * - 'no_loop'             : aucun hard_fail observé, pipeline standard
 * - 'reset_effective'     : hard_fail détecté, reset exécuté, re-run PASS
 * - 'reset_non_effective' : hard_fail détecté, reset exécuté, re-run FAIL (même loop)
 * - 'reset_failed'        : hard_fail détecté, reset lui-même a échoué (infra)
 *
 * Invariant : budget MAX_SESSION_RESETS_PER_RUN=1 → au plus un reset par run.
 */
export type DedaleVerdict =
  | 'no_loop'
  | 'reset_effective'
  | 'reset_non_effective'
  | 'reset_failed';

// ──────────────────────────────────────────────────────────────────────────────
// TÉLÉMÉTRIE — SCHÉMA v1 (NB1 + NB5 + B2)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Chemin d'intégration où Dédale a été déclenché sur ce chunk.
 *
 * - 'v2b'  : déclenché via V2-B-LOOP (chunked-generator.ts:575-644)
 * - 'k2'   : déclenché via K2-LOOP (753-823) — non couvert v0.55, réservé v0.6
 * - 'both' : déclenché sur les deux (impossible v0.55, réservé)
 * - null   : aucun trigger Dédale sur ce chunk
 */
export type DedaleTriggerPath = 'v2b' | 'k2' | 'both' | null;

/**
 * Entrée télémétrie JSON par chunk Dédale.
 * Sérialisée via atomicWrite (tmp + rename) pour crash safety (CI-6).
 */
export interface DedaleChunkTelemetry {
  readonly schema_version: '1';
  readonly run_id: string;             // uuid (deps.uuid)
  readonly chunk_index: number;
  readonly seed_used: number;
  readonly mode: DedaleMode;
  readonly trigger_path: DedaleTriggerPath;
  readonly oracle_attempt_1: OracleResult;
  readonly oracle_attempt_2: OracleResult | null;  // null si pas de re-run
  readonly reset: ResetResult | null;  // null si pas de reset
  readonly verdict: DedaleVerdict;
  readonly ts_start_iso: string;
  readonly ts_end_iso: string;
  readonly elapsed_ms_total: number;
}

/**
 * Agrégat run-level pour critère §C.5.
 * Persisté en fin de run dans un fichier JSON dédié.
 */
export interface DedaleRunTelemetry {
  readonly schema_version: '1';
  readonly run_id: string;
  readonly mode: DedaleMode;
  readonly chunks_total: number;
  readonly counts: {
    readonly no_loop: number;
    readonly reset_effective: number;
    readonly reset_non_effective: number;
    readonly reset_failed: number;
  };
  readonly distribution_trigger_path: {
    readonly v2b: number;
    readonly k2: number;
    readonly both: number;
    readonly none: number;
  };
  readonly ratio_effective: number | null;  // null si denominator === 0
  readonly ts_run_start_iso: string;
  readonly ts_run_end_iso: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// CRITÈRE PASS/FAIL §C.5 — DEUX NIVEAUX (B4)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Seuils pré-engagés pour critère §C.5.
 * GELÉS — non modifiables post-hoc (règle kill-switch OMEGA).
 *
 * - ratio_min     : reset_effective / (effective + non_effective)
 * - n_exploratory : minimum de hard_fails pour verdict exploratoire
 * - n_robust      : minimum de hard_fails pour verdict robuste
 * - ratio_fail    : seuil bas en-dessous duquel v0.55 est rejeté
 */
export const PASS_THRESHOLDS = {
  /** Ratio minimum pour PASS (exploratoire ET robuste). */
  ratio_min: 0.50,
  /** Nombre minimum de hard_fails pour PASS exploratoire. */
  n_exploratory: 5,
  /** Nombre minimum de hard_fails pour PASS robuste. */
  n_robust: 15,
  /** Ratio en-dessous duquel v0.55 est rejeté (avec n >= 10). */
  ratio_fail: 0.30,
  /** Nombre minimum de hard_fails pour juger FAIL. */
  n_fail_min: 10,
} as const;

/**
 * Verdict §C.5 calculé à partir d'un DedaleRunTelemetry.
 *
 * - 'pass_exploratory' : ratio ≥ 0.50 sur n ≥ 5 hard_fails
 * - 'pass_robust'      : ratio ≥ 0.50 sur n ≥ 15 hard_fails
 * - 'fail'             : ratio < 0.30 sur n ≥ 10 hard_fails
 * - 'inconclusive'     : 0.30 ≤ ratio < 0.50 sur n ≥ 10, ou n < 5
 */
export type C5Verdict = 'pass_exploratory' | 'pass_robust' | 'fail' | 'inconclusive';

// ──────────────────────────────────────────────────────────────────────────────
// BUDGET — CAPS DURS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Budgets maximaux Dédale. Gelés en v0.55.
 */
export const DEDALE_BUDGETS = {
  /** Nombre maximum de resets session par run. Invariant : exactement 1. */
  MAX_SESSION_RESETS_PER_RUN: 1,
  /** Timeout du kill des processes Ollama (en ms). */
  KILL_TIMEOUT_MS: 10_000,
  /** Timeout health check /api/tags post-reset (en ms). */
  HEALTH_CHECK_TIMEOUT_MS: 15_000,
  /** Timeout total d'un reset (kill + wait + health) (en ms). */
  RESET_BUDGET_MS: 45_000,
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// EXEC CMD — RÉSULTAT GÉNÉRIQUE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Résultat d'une exécution de commande (PowerShell / bash / service manager).
 */
export interface ExecResult {
  readonly exit_code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly elapsed_ms: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// INFO GPU (OPTIONNEL, POUR DIAG NB1)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot GPU via nvidia-smi (optionnel — undefined sur CPU-only runners).
 */
export interface GpuInfo {
  readonly memory_used_mb: number;
  readonly memory_total_mb: number;
  readonly utilization_pct: number;
  readonly process_count: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// LOGGER — INTERFACE MINIMALE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Logger minimal Dédale (niveau info/warn/error). Zéro dépendance externe.
 */
export interface DedaleLogger {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
}

// ──────────────────────────────────────────────────────────────────────────────
// DI FACTORY — INTERFACE CANONIQUE (B3 — ChatGPT blocante)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dépendances injectables pour toute instance Dédale.
 * Invariant testabilité : zéro import direct de Date, crypto, fs, child_process
 * dans les modules métier — tout passe par cette interface.
 *
 * Utilisation en prod :
 *   const deps = buildDefaultDependencies();  // voir index.ts
 *   const oracle = createOracle(deps);
 *
 * Utilisation en test :
 *   const deps = buildMockDependencies({ clock: () => 1000 });
 *   const oracle = createOracle(deps);
 */
export interface DedaleDependencies {
  /** Exécution de commande OS (PowerShell Windows / bash Linux). */
  readonly execCmd: (cmd: string, args: readonly string[]) => Promise<ExecResult>;
  /** Client HTTP (pour health check Ollama /api/tags). */
  readonly fetchFn: typeof fetch;
  /** Sleep asynchrone (pour wait post-kill). */
  readonly sleep: (ms: number) => Promise<void>;
  /** Clock wall (Date.now() injectable pour tests). */
  readonly clock: () => number;
  /** Clock monotonic (performance.now() ou équivalent) pour durées précises. */
  readonly clockMonotonic: () => number;
  /** UUID v4 (crypto.randomUUID() injectable). */
  readonly uuid: () => string;
  /** nvidia-smi snapshot, undefined sur runners CPU-only. */
  readonly nvidiaSmi: (() => Promise<GpuInfo>) | undefined;
  /** Écriture atomique (tmp + rename + optional fsync). */
  readonly atomicWrite: (path: string, content: string) => Promise<void>;
  /** Logger structuré. */
  readonly logger: DedaleLogger;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG PUBLIQUE DEDALE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Configuration publique de Dédale (résolue depuis env + defaults).
 */
export interface DedaleConfig {
  readonly mode: DedaleMode;
  readonly telemetry_dir: string;  // chemin absolu dossier JSON telemetry
  /** Seuils oracle résolus (alignés sur chunked-generator.ts pour C1, prose-fingerprint.ts pour C2). */
  readonly oracle_thresholds: {
    readonly c1_threshold: number;       // seuil bas (composite ADR-005 r2)
    readonly c1_high_threshold: number;  // ADR-005 r2 : seuil haut (déclenche seul)
    readonly c2_threshold: number;       // info-tag uniquement (ne déclenche plus)
    readonly c4_threshold: number;       // seuil composite
  };
}
