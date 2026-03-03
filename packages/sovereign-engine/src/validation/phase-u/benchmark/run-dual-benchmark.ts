/**
 * run-dual-benchmark.ts
 * U-BENCHMARK — 30 one-shot vs 30 top-K (Option A: seeds identiques)
 *
 * Livrables obligatoires :
 *   ValidationPack_phase-u_real_<date>_<head>/
 *     config.json      — provider, model, K, PROMPT_VERSION, head
 *     runs.jsonl       — 1 ligne par run (mode, seed, inputHash, outputHash, metrics, verdict)
 *     summary.json     — rates, medians, deltas, effect size
 *     SHA256SUMS.txt   — hash de tous les fichiers du pack
 *
 * INV-DB-01..05 enforces.
 * MERGE BLOQUE sans ValidationPack + PhaseUExitValidator verdict=PASS.
 *
 * TODO prochaine session : implementer execute()
 */

export const BENCHMARK_K = 8; // K=4 si budget serre, K=16 si illimite
export const BENCHMARK_RUNS = 30;
export const BENCHMARK_BASE_SEEDS: string[] = []; // TODO: generer 30 seeds determistes
