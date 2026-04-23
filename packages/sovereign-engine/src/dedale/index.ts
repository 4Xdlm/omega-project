/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — PUBLIC API + DI DEFAULT FACTORY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/dedale/index.ts
 * Version:  0.55.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Upstream: DEDALE_v0.55_SYNTHESE_3IA_ET_SPEC_AMENDED.md §D (toutes briques)
 *
 * Surface publique Dédale.
 *   - Ré-exporte tous les contrats (types, oracle, reset-session, telemetry, orchestrator)
 *   - Expose resolveDedaleConfig() pour lire OMEGA_DEDALE_MODE + dir télémétrie
 *   - Expose buildDefaultDependencies() qui construit les DI de production
 *     (exec = PowerShell/bash selon plateforme, fetch = global, atomicWrite =
 *     tmp + rename, uuid = crypto.randomUUID)
 *   - Expose createDedale() qui câble oracle + reset + telemetry + orchestrator
 *
 * Invariant : ce fichier est le SEUL autorisé à importer Node built-ins
 *   (fs/promises, crypto, child_process). Tous les modules métier passent par DI.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rename, writeFile, unlink } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import type {
  DedaleConfig,
  DedaleDependencies,
  DedaleLogger,
  DedaleMode,
  ExecResult,
} from './types.js';
import { resolveDefaultOracleThresholds, createOracle } from './oracle.js';
import { createResetSession } from './reset-session.js';
import { createTelemetry } from './telemetry.js';
import { createOrchestrator, createOrchestratorState } from './orchestrator.js';
import type { Oracle } from './oracle.js';
import type { ResetSession } from './reset-session.js';
import type { Telemetry } from './telemetry.js';
import type { Orchestrator, OrchestratorState } from './orchestrator.js';

// ──────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS (surface publique)
// ──────────────────────────────────────────────────────────────────────────────

export * from './types.js';
export {
  computeTrigramRatio,
  computeRepetitionScore,
  computeUniqueRatio,
  resolveDefaultOracleThresholds,
  createOracle,
} from './oracle.js';
export type { Oracle } from './oracle.js';
export {
  isWindows,
  OLLAMA_RUNNER_NAMES,
  OLLAMA_DAEMON_NAMES,
  OLLAMA_HEALTH_URL,
  createResetSession,
} from './reset-session.js';
export type { ResetSession } from './reset-session.js';
export {
  toIso,
  joinPath,
  createTelemetry,
  aggregateRun,
  computeC5Verdict,
} from './telemetry.js';
export type { Telemetry, RunContext } from './telemetry.js';
export {
  createOrchestrator,
  createOrchestratorState,
} from './orchestrator.js';
export type {
  Orchestrator,
  OrchestratorState,
  ChunkFn,
  DedaleChunkResult,
  RunChunkParams,
} from './orchestrator.js';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG RESOLVER — LIT ENV VAR OMEGA_DEDALE_MODE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Valeurs acceptées pour OMEGA_DEDALE_MODE.
 * Toute autre valeur → 'off' (fail-safe NASA-Grade).
 */
function parseMode(raw: string | undefined): DedaleMode {
  if (raw === 'shadow') return 'shadow';
  if (raw === 'on') return 'on';
  return 'off';
}

/**
 * Résout la config Dédale depuis l'environnement.
 * Appelé au boot du pipeline (chunked-generator.ts) pour décider d'activer
 * Dédale sur V2-B-LOOP.
 */
export function resolveDedaleConfig(
  env: NodeJS.ProcessEnv = process.env
): DedaleConfig {
  const mode = parseMode(env.OMEGA_DEDALE_MODE);
  const telemetry_dir =
    env.OMEGA_DEDALE_TELEMETRY_DIR ?? './outputs/dedale_telemetry';
  return {
    mode,
    telemetry_dir,
    oracle_thresholds: resolveDefaultOracleThresholds(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// DEFAULT DEPENDENCIES — PRODUCTION WIRING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Exécute une commande OS via child_process.spawn.
 * Windows : cmd = 'powershell.exe', args = [...]
 * POSIX   : cmd = '/bin/bash' ou 'bash', args = ['-c', ...]
 *
 * NOTE v0.55 : stdin fermé immédiatement (pas d'input interactif).
 */
async function defaultExecCmd(
  cmd: string,
  args: readonly string[]
): Promise<ExecResult> {
  const tStart = performance.now();
  return new Promise<ExecResult>((resolve) => {
    const child = spawn(cmd, [...args], {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      resolve({
        exit_code: -1,
        stdout,
        stderr: stderr + `\n[spawn error] ${err.message}`,
        elapsed_ms: performance.now() - tStart,
      });
    });

    child.on('close', (code) => {
      resolve({
        exit_code: code ?? -1,
        stdout,
        stderr,
        elapsed_ms: performance.now() - tStart,
      });
    });
  });
}

/**
 * Sleep asynchrone via setTimeout injecté.
 */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Écriture atomique : tmp file + rename (crash safe sur Win + POSIX).
 * En cas d'échec du write, on cleanup le tmp si possible.
 */
async function defaultAtomicWrite(path: string, content: string): Promise<void> {
  const tmpPath = `${path}.tmp.${process.pid}.${Date.now()}`;
  try {
    await writeFile(tmpPath, content, { encoding: 'utf8' });
    await rename(tmpPath, path);
  } catch (err) {
    // Best-effort cleanup du tmp (pas critique si ça échoue)
    try {
      await unlink(tmpPath);
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Logger par défaut — console.* avec préfixe structuré.
 * En test, on peut substituer par un mock silencieux.
 */
export const defaultLogger: DedaleLogger = {
  info(msg, context): void {
    if (context !== undefined) {
      console.log(msg, context);
    } else {
      console.log(msg);
    }
  },
  warn(msg, context): void {
    if (context !== undefined) {
      console.warn(msg, context);
    } else {
      console.warn(msg);
    }
  },
  error(msg, context): void {
    if (context !== undefined) {
      console.error(msg, context);
    } else {
      console.error(msg);
    }
  },
};

/**
 * Construit les dépendances de production (fetch global, Date.now, etc.).
 * À appeler une fois au boot du pipeline.
 */
export function buildDefaultDependencies(
  overrides?: Partial<DedaleDependencies>
): DedaleDependencies {
  const base: DedaleDependencies = {
    execCmd: defaultExecCmd,
    fetchFn: globalThis.fetch.bind(globalThis),
    sleep: defaultSleep,
    clock: () => Date.now(),
    clockMonotonic: () => performance.now(),
    uuid: () => randomUUID(),
    nvidiaSmi: undefined,  // non câblé v0.55 (optionnel diag)
    atomicWrite: defaultAtomicWrite,
    logger: defaultLogger,
    // Δ v1.2 §8.1 D2bis (NCR_DEDALE_RESET_HEALTH) — spawn natif pour respawn Ollama
    // post-kill. Signature Node `spawn(cmd, args, opts)` ↔ DedaleDependencies.spawnFn.
    spawnFn: spawn,
  };
  if (overrides === undefined) return base;
  return {
    ...base,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// DEDALE INSTANCE — FAÇADE CÂBLÉE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Instance Dédale complète (câblée).
 */
export interface Dedale {
  readonly oracle: Oracle;
  readonly resetSession: ResetSession;
  readonly telemetry: Telemetry;
  readonly orchestrator: Orchestrator;
  readonly config: DedaleConfig;
  readonly state: OrchestratorState;
}

/**
 * Construit une instance Dédale à partir d'une config + deps.
 * Usage prod :
 *   const deps = buildDefaultDependencies();
 *   const config = resolveDedaleConfig();
 *   const dedale = createDedale(config, deps);
 *
 * Usage test :
 *   const deps = buildDefaultDependencies({ clock: () => 1000 });
 *   const config: DedaleConfig = { mode: 'on', ... };
 *   const dedale = createDedale(config, deps);
 */
export function createDedale(
  config: DedaleConfig,
  deps: DedaleDependencies
): Dedale {
  const oracle = createOracle(deps);
  const resetSession = createResetSession(deps);
  const telemetry = createTelemetry(deps);
  const orchestrator = createOrchestrator(oracle, resetSession, telemetry, deps);
  const state = createOrchestratorState();
  return { oracle, resetSession, telemetry, orchestrator, config, state };
}
