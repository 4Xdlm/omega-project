/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — RESET SESSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/dedale/reset-session.ts
 * Version:  0.55.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Upstream: DEDALE_v0.55_SYNTHESE_3IA_ET_SPEC_AMENDED.md §D.2 (B2)
 *
 * Séquence reset session Ollama durcie (6 étapes) :
 *   1. Snapshot avant : {pid_serve, pid_runner, start_time} (Win32_Process / ps)
 *   2. Kill ordonné : ollama_llama_server (runner) → ollama serve (daemon)
 *   3. Wait jusqu'à disparition snapshot (timeout KILL_TIMEOUT_MS)
 *   4. Fallback si échec : service restart Windows / systemctl / pkill -9
 *   5. Snapshot après : doit différer strictement (PID ou absence)
 *   6. Health check curl /api/tags (timeout HEALTH_CHECK_TIMEOUT_MS)
 *
 * Invariants :
 *   - Zéro import direct de child_process, fs, Date, crypto (tout via deps)
 *   - Windows-first : PowerShell Get-CimInstance Win32_Process
 *   - Fallback Linux/macOS via deps.execCmd('bash' ...) — smoke seulement v0.55
 *   - MAX_SESSION_RESETS_PER_RUN=1 enforcé par orchestrator.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DedaleDependencies,
  ProcessSnapshot,
  ResetProof,
  ResetResult,
  ExecResult,
} from './types.js';
import { DEDALE_BUDGETS } from './types.js';

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

/** Noms des processes cibles (ordre de kill = runner puis daemon). */
export const OLLAMA_RUNNER_NAMES = ['ollama_llama_server', 'ollama-runner'] as const;
export const OLLAMA_DAEMON_NAMES = ['ollama serve', 'ollama app.exe', 'ollama.exe'] as const;

/** Endpoint de santé Ollama (invariant API). */
export const OLLAMA_HEALTH_URL = 'http://127.0.0.1:11434/api/tags';

// ──────────────────────────────────────────────────────────────────────────────
// PLATFORM DETECTION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Détecte la plateforme (Windows vs POSIX). Windows first (CLAUDE.md D-11).
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

// ──────────────────────────────────────────────────────────────────────────────
// PROCESS ENUMERATION (NB1 CI-10)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Enumère les processes Ollama via Get-CimInstance (Windows) ou ps (POSIX).
 * Retourne la première correspondance pour chaque catégorie (serve, runner).
 *
 * NOTE : la granularité "runner" peut échouer sur certaines versions Ollama
 * où le runner vit dans le process serve (mode monolithique). Dans ce cas
 * `runner.pid === null` — comportement prévu, pas une erreur.
 */
export async function enumerateOllamaProcesses(
  deps: Pick<DedaleDependencies, 'execCmd' | 'logger'>
): Promise<{ serve: ProcessSnapshot; runner: ProcessSnapshot }> {
  if (isWindows()) {
    return enumerateWindowsProcesses(deps);
  }
  return enumeratePosixProcesses(deps);
}

async function enumerateWindowsProcesses(
  deps: Pick<DedaleDependencies, 'execCmd' | 'logger'>
): Promise<{ serve: ProcessSnapshot; runner: ProcessSnapshot }> {
  // Get-CimInstance Win32_Process — snapshot atomique (CI-10)
  // Colonnes : ProcessId, Name, CommandLine, CreationDate
  const script =
    `Get-CimInstance Win32_Process | ` +
    `Where-Object { $_.Name -like '*ollama*' } | ` +
    `Select-Object ProcessId,Name,CommandLine,CreationDate | ` +
    `ConvertTo-Json -Depth 2 -Compress`;

  const result = await deps.execCmd('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-Command', script,
  ]);

  return parseWindowsProcessList(result, deps.logger);
}

function parseWindowsProcessList(
  result: ExecResult,
  logger: DedaleDependencies['logger']
): { serve: ProcessSnapshot; runner: ProcessSnapshot } {
  const emptyServe: ProcessSnapshot = { pid: null, start_time_iso: null, name: 'ollama serve' };
  const emptyRunner: ProcessSnapshot = { pid: null, start_time_iso: null, name: OLLAMA_RUNNER_NAMES[0] };

  if (result.exit_code !== 0) {
    logger.warn('[dedale.reset] Win32_Process enumeration failed', {
      exit_code: result.exit_code,
      stderr_tail: result.stderr.slice(-200),
    });
    return { serve: emptyServe, runner: emptyRunner };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout.trim() || '[]');
  } catch (err) {
    logger.warn('[dedale.reset] Win32_Process JSON parse failed', {
      err: String(err),
      stdout_head: result.stdout.slice(0, 200),
    });
    return { serve: emptyServe, runner: emptyRunner };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  let serve = emptyServe;
  let runner = emptyRunner;

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const rec = raw as Record<string, unknown>;
    const pidRaw = rec['ProcessId'];
    const pid = typeof pidRaw === 'number' ? pidRaw : null;
    const name = typeof rec['Name'] === 'string' ? rec['Name'] : '';
    const cmdline = typeof rec['CommandLine'] === 'string' ? rec['CommandLine'] : '';
    const creationRaw = rec['CreationDate'];
    const startIso = normalizeCimDate(creationRaw);
    const haystack = `${name} ${cmdline}`.toLowerCase();

    if (pid === null) continue;

    // Runner : "ollama_llama_server" ou "ollama-runner" dans le nom/cmdline
    if (runner.pid === null &&
        OLLAMA_RUNNER_NAMES.some(n => haystack.includes(n.toLowerCase()))) {
      runner = { pid, start_time_iso: startIso, name: name || OLLAMA_RUNNER_NAMES[0] };
      continue;
    }
    // Daemon : "ollama serve" dans cmdline ou "ollama app.exe"/"ollama.exe" en name
    if (serve.pid === null &&
        (cmdline.toLowerCase().includes('ollama serve') ||
         OLLAMA_DAEMON_NAMES.some(n => haystack.includes(n.toLowerCase())))) {
      serve = { pid, start_time_iso: startIso, name: name || 'ollama serve' };
    }
  }

  return { serve, runner };
}

function normalizeCimDate(raw: unknown): string | null {
  // CIM CreationDate peut arriver en string ISO, ou objet { DateTime: '...' }
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const dt = (raw as Record<string, unknown>)['DateTime'];
    if (typeof dt === 'string') return dt;
  }
  return null;
}

async function enumeratePosixProcesses(
  deps: Pick<DedaleDependencies, 'execCmd' | 'logger'>
): Promise<{ serve: ProcessSnapshot; runner: ProcessSnapshot }> {
  // ps -o pid,lstart,comm,args -e
  const result = await deps.execCmd('ps', ['-o', 'pid=,lstart=,args=', '-e']);
  const emptyServe: ProcessSnapshot = { pid: null, start_time_iso: null, name: 'ollama serve' };
  const emptyRunner: ProcessSnapshot = { pid: null, start_time_iso: null, name: OLLAMA_RUNNER_NAMES[0] };

  if (result.exit_code !== 0) {
    deps.logger.warn('[dedale.reset] ps enumeration failed', {
      exit_code: result.exit_code,
    });
    return { serve: emptyServe, runner: emptyRunner };
  }

  let serve = emptyServe;
  let runner = emptyRunner;
  const lines = result.stdout.split(/\r?\n/).filter(l => l.trim().length > 0);
  for (const line of lines) {
    // Format : "  PID  Mon Apr 22 00:30:00 2026  <cmd>"
    const match = /^\s*(\d+)\s+(\S.{23}\S)\s+(.+)$/.exec(line);
    if (!match) continue;
    const pid = parseInt(match[1] ?? '0', 10);
    const lstart = match[2] ?? '';
    const cmd = (match[3] ?? '').toLowerCase();
    if (!pid) continue;

    if (runner.pid === null &&
        OLLAMA_RUNNER_NAMES.some(n => cmd.includes(n.toLowerCase()))) {
      runner = { pid, start_time_iso: lstart, name: OLLAMA_RUNNER_NAMES[0] };
      continue;
    }
    if (serve.pid === null && cmd.includes('ollama serve')) {
      serve = { pid, start_time_iso: lstart, name: 'ollama serve' };
    }
  }

  return { serve, runner };
}

// ──────────────────────────────────────────────────────────────────────────────
// KILL ORDONNÉ
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Tue le runner d'abord (évite spawn d'un nouveau runner par le daemon actif),
 * puis le daemon. Retourne exit_code=0 si au moins un kill a été émis.
 * Idempotent : "no-op" si process absent.
 */
export async function killOllamaOrdered(
  deps: Pick<DedaleDependencies, 'execCmd' | 'logger'>,
  snapshot: { serve: ProcessSnapshot; runner: ProcessSnapshot }
): Promise<{ killed_runner: boolean; killed_serve: boolean; errors: string[] }> {
  const errors: string[] = [];
  let killed_runner = false;
  let killed_serve = false;

  if (snapshot.runner.pid !== null) {
    const r = await killPid(deps, snapshot.runner.pid);
    if (r.exit_code === 0) killed_runner = true;
    else errors.push(`runner kill exit=${r.exit_code} ${r.stderr.slice(-80)}`);
  }
  if (snapshot.serve.pid !== null) {
    const s = await killPid(deps, snapshot.serve.pid);
    if (s.exit_code === 0) killed_serve = true;
    else errors.push(`serve kill exit=${s.exit_code} ${s.stderr.slice(-80)}`);
  }

  return { killed_runner, killed_serve, errors };
}

async function killPid(
  deps: Pick<DedaleDependencies, 'execCmd'>,
  pid: number
): Promise<ExecResult> {
  if (isWindows()) {
    return deps.execCmd('taskkill', ['/F', '/PID', String(pid)]);
  }
  return deps.execCmd('kill', ['-9', String(pid)]);
}

// ──────────────────────────────────────────────────────────────────────────────
// WAIT DISPARITION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Attend que les PIDs snapshot (serve et runner) disparaissent.
 * Timeout dur DEDALE_BUDGETS.KILL_TIMEOUT_MS. Poll interval 200ms.
 */
export async function waitForSnapshotDisappearance(
  deps: Pick<DedaleDependencies, 'execCmd' | 'sleep' | 'clockMonotonic' | 'logger'>,
  snapshot: { serve: ProcessSnapshot; runner: ProcessSnapshot },
  timeoutMs: number = DEDALE_BUDGETS.KILL_TIMEOUT_MS,
): Promise<boolean> {
  const start = deps.clockMonotonic();
  const targetPids = new Set<number>();
  if (snapshot.serve.pid !== null) targetPids.add(snapshot.serve.pid);
  if (snapshot.runner.pid !== null) targetPids.add(snapshot.runner.pid);
  if (targetPids.size === 0) return true;

  while (deps.clockMonotonic() - start < timeoutMs) {
    const current = await enumerateOllamaProcesses(deps);
    const stillAlive = new Set<number>();
    if (current.serve.pid !== null && targetPids.has(current.serve.pid)) stillAlive.add(current.serve.pid);
    if (current.runner.pid !== null && targetPids.has(current.runner.pid)) stillAlive.add(current.runner.pid);
    if (stillAlive.size === 0) return true;
    await deps.sleep(200);
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// FALLBACK : SERVICE RESTART
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fallback ultime si kill ordonné + wait échouent.
 * Windows : Restart-Service ollama (si installé comme service Windows).
 * POSIX   : systemctl restart ollama (si systemd).
 * Retourne true si la commande a réussi.
 */
export async function fallbackRestartService(
  deps: Pick<DedaleDependencies, 'execCmd' | 'logger'>
): Promise<boolean> {
  if (isWindows()) {
    const r = await deps.execCmd('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `try { Restart-Service -Name 'ollama' -Force -ErrorAction Stop; 'OK' } catch { Write-Error $_.Exception.Message; exit 1 }`,
    ]);
    if (r.exit_code === 0) return true;
    deps.logger.warn('[dedale.reset] Restart-Service ollama failed', { stderr_tail: r.stderr.slice(-120) });
    return false;
  }
  const r = await deps.execCmd('systemctl', ['restart', 'ollama']);
  if (r.exit_code === 0) return true;
  deps.logger.warn('[dedale.reset] systemctl restart ollama failed', { stderr_tail: r.stderr.slice(-120) });
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie que Ollama répond sur /api/tags. Retourne latence si OK, sinon null.
 * Utilise AbortSignal.timeout pour cap dur (CI-3 protection contre pend).
 */
export async function healthCheckOllama(
  deps: Pick<DedaleDependencies, 'fetchFn' | 'clockMonotonic' | 'logger'>,
  timeoutMs: number = DEDALE_BUDGETS.HEALTH_CHECK_TIMEOUT_MS,
): Promise<{ ok: boolean; latency_ms: number }> {
  const start = deps.clockMonotonic();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await deps.fetchFn(OLLAMA_HEALTH_URL, { signal: controller.signal });
      const latency = deps.clockMonotonic() - start;
      if (!res.ok) {
        deps.logger.warn('[dedale.reset] health check non-200', { status: res.status });
        return { ok: false, latency_ms: latency };
      }
      return { ok: true, latency_ms: latency };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const latency = deps.clockMonotonic() - start;
    deps.logger.warn('[dedale.reset] health check threw', { err: String(err), latency_ms: latency });
    return { ok: false, latency_ms: latency };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// RESET SESSION — SÉQUENCE COMPLÈTE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie que le snapshot after prouve un reset réel.
 * Règle : pour chaque PID non-null dans before, soit le PID a disparu (after=null),
 * soit il a changé, soit start_time_iso diffère.
 */
export function proofIsValid(before: ProcessSnapshot, after: ProcessSnapshot): boolean {
  if (before.pid === null) return true;  // rien à prouver si absence avant
  if (after.pid === null) return true;    // disparu = reset valide
  if (after.pid !== before.pid) return true;  // nouveau PID = reset valide
  if (after.start_time_iso !== before.start_time_iso) return true;  // même PID mais start différent
  return false;  // même PID, même start → PAS un reset
}

export interface ResetSession {
  /**
   * Exécute la séquence reset complète. Retourne preuve + outcome.
   * N'applique pas le budget MAX_SESSION_RESETS_PER_RUN — c'est l'orchestrator.
   */
  execute(): Promise<ResetResult>;
}

/**
 * Factory reset session. Consomme DI complet (execCmd, fetchFn, sleep, clock, logger).
 */
export function createResetSession(
  deps: Pick<DedaleDependencies,
    'execCmd' | 'fetchFn' | 'sleep' | 'clock' | 'clockMonotonic' | 'logger'>
): ResetSession {
  return {
    async execute(): Promise<ResetResult> {
      const tStart = deps.clockMonotonic();
      const logger = deps.logger;

      // 1. Snapshot avant
      const before = await enumerateOllamaProcesses(deps);
      logger.info('[dedale.reset] snapshot before', {
        serve_pid: before.serve.pid,
        runner_pid: before.runner.pid,
      });

      // 2. Kill ordonné
      const killRes = await killOllamaOrdered(deps, before);
      logger.info('[dedale.reset] kill result', killRes);

      // 3. Wait disparition
      const gone = await waitForSnapshotDisappearance(deps, before);

      // 4. Fallback si disparition échoue
      let fallback_used = false;
      if (!gone) {
        logger.warn('[dedale.reset] disappearance timeout, triggering fallback');
        fallback_used = await fallbackRestartService(deps);
        if (!fallback_used) {
          return {
            outcome: 'failed',
            proof: null,
            elapsed_ms: deps.clockMonotonic() - tStart,
            error: 'kill timeout + fallback failed',
          };
        }
        // Laisse au service le temps de redémarrer
        await deps.sleep(2000);
      }

      // 5. Snapshot après
      const after = await enumerateOllamaProcesses(deps);
      logger.info('[dedale.reset] snapshot after', {
        serve_pid: after.serve.pid,
        runner_pid: after.runner.pid,
      });

      const serveProofOk = proofIsValid(before.serve, after.serve);
      const runnerProofOk = proofIsValid(before.runner, after.runner);
      if (!serveProofOk || !runnerProofOk) {
        return {
          outcome: 'failed',
          proof: {
            before,
            after,
            kill_order: [...OLLAMA_RUNNER_NAMES, ...OLLAMA_DAEMON_NAMES],
            fallback_used,
            health_check_ms: -1,
          },
          elapsed_ms: deps.clockMonotonic() - tStart,
          error: 'proof invalid (same PID + same start_time)',
        };
      }

      // 6. Health check
      const health = await healthCheckOllama(deps);
      if (!health.ok) {
        return {
          outcome: 'failed',
          proof: {
            before,
            after,
            kill_order: [...OLLAMA_RUNNER_NAMES, ...OLLAMA_DAEMON_NAMES],
            fallback_used,
            health_check_ms: health.latency_ms,
          },
          elapsed_ms: deps.clockMonotonic() - tStart,
          error: 'health check failed',
        };
      }

      const proof: ResetProof = {
        before,
        after,
        kill_order: [...OLLAMA_RUNNER_NAMES, ...OLLAMA_DAEMON_NAMES],
        fallback_used,
        health_check_ms: health.latency_ms,
      };

      return {
        outcome: 'success',
        proof,
        elapsed_ms: deps.clockMonotonic() - tStart,
        error: null,
      };
    },
  };
}
