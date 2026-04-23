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
  SpawnProof,
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
// BRIQUE A — SPAWN PLATFORM-AWARE (Δ v1.2 §8.1 D2bis)
// BRIQUE B — HEALTH PROBE EXPONENTIEL (Δ v1.2 §8.2)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Détecte la plateforme (normalisation SpawnProof.platform).
 */
function getPlatform(): SpawnProof['platform'] {
  const p = process.platform;
  if (p === 'win32' || p === 'linux' || p === 'darwin') return p;
  return 'other';
}

/**
 * Brique A+B combinées : spawn enfant détaché `ollama serve` + probe /api/tags
 * en backoff exponentiel (500 → 1000 → 2000 → 4000 → 8000 → 16000 ms).
 *
 * Invariants §8.1 D2bis :
 *   - Pas d'appel direct `child_process.spawn` ici : tout via `deps.spawnFn`.
 *   - Si `deps.spawnFn === undefined` → verdict 'spawn_failed' avec message
 *     explicite (le caller doit alors faire fallback service restart).
 *   - Toujours `detached: true` + `stdio: 'ignore'` + `windowsHide: true`.
 *     Sur POSIX `detached:true` appelle `setsid()` (nouveau session leader,
 *     équivalent `nohup setsid`). Sur Windows `windowsHide:true` + `detached:true`
 *     assure la survie post-exit du parent OMEGA.
 *   - `child.unref()` invoqué si méthode présente → parent peut exit sans
 *     attendre le daemon.
 *
 * Invariants §8.2 D3 probe :
 *   - Budget total capé par `HEALTH_PROBE_TOTAL_MS=32_000` ms.
 *   - Sleep AVANT chaque probe (laisse Ollama cold-load démarrer).
 *   - Per-attempt timeout fetch capé à 5000 ms (API normalement < 100 ms on
 *     success). Suffisant pour cold-load measured max=2760 ms (§0.1).
 *   - Exit anticipé dès premier probe PASS (ts_ready_ms capturé).
 *   - Exit budget_exceeded si `elapsed + delay > HEALTH_PROBE_TOTAL_MS` avant
 *     la prochaine attente.
 *
 * Retourne un SpawnProof intégral (evidence structurée consommée par l'agrégat
 * ResetProof dans `execute()`).
 */
/**
 * Exporté pour tests unitaires Brique A+B (Étape 7 NCR_DEDALE_RESET_HEALTH).
 * Couverture isolée sans passer par execute() + setup snapshot complet.
 * Discipline DO-178C Level A : chaque unité critique doit être testable seule.
 */
export async function spawnAndProbe(
  deps: Pick<DedaleDependencies,
    'spawnFn' | 'fetchFn' | 'sleep' | 'clockMonotonic' | 'logger'>,
): Promise<SpawnProof> {
  const cmd = 'ollama';
  const args: readonly string[] = ['serve'] as const;
  const platform = getPlatform();
  const tStart = deps.clockMonotonic();

  // Garde spawnFn absent (Pick optional → runtime check obligatoire).
  if (deps.spawnFn === undefined) {
    deps.logger.warn('[dedale.reset] spawnFn not injected, spawn skipped');
    return {
      cmd, args, platform,
      pid: null, detached: false, unref_called: false,
      ts_spawn_ms: 0, ts_ready_ms: null,
      probe_attempts: [],
      verdict: 'spawn_failed',
      error_message: 'spawnFn not injected (DedaleDependencies.spawnFn undefined)',
    };
  }

  // 1. SPAWN détaché
  let pid: number | null = null;
  let unref_called = false;
  let spawnError: string | null = null;

  try {
    const child = deps.spawnFn(cmd, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    pid = (typeof child.pid === 'number' && Number.isFinite(child.pid)) ? child.pid : null;
    if (typeof child.unref === 'function') {
      child.unref();
      unref_called = true;
    }
  } catch (err) {
    spawnError = err instanceof Error ? err.message : String(err);
  }

  const ts_spawn_ms = deps.clockMonotonic() - tStart;

  if (pid === null) {
    const msg = spawnError ?? 'spawn returned no PID';
    deps.logger.warn('[dedale.reset] spawn failed', {
      cmd, args, platform, error: msg, ts_spawn_ms,
    });
    return {
      cmd, args, platform,
      pid: null, detached: true, unref_called,
      ts_spawn_ms, ts_ready_ms: null,
      probe_attempts: [],
      verdict: 'spawn_failed',
      error_message: msg,
    };
  }

  deps.logger.info('[dedale.reset] spawn ok', { pid, ts_spawn_ms, platform });

  // 2. PROBE backoff exponentiel
  const delays: readonly number[] = [
    DEDALE_BUDGETS.HEALTH_PROBE_INITIAL_MS,       // 500
    DEDALE_BUDGETS.HEALTH_PROBE_INITIAL_MS * 2,   // 1000
    DEDALE_BUDGETS.HEALTH_PROBE_INITIAL_MS * 4,   // 2000
    DEDALE_BUDGETS.HEALTH_PROBE_INITIAL_MS * 8,   // 4000
    DEDALE_BUDGETS.HEALTH_PROBE_INITIAL_MS * 16,  // 8000
    DEDALE_BUDGETS.HEALTH_PROBE_MAX_MS,           // 16000
  ];
  const budget_total = DEDALE_BUDGETS.HEALTH_PROBE_TOTAL_MS;
  const per_attempt_max = 5_000;

  const probeLoopStart = deps.clockMonotonic();
  const probe_attempts: Array<{
    attempt_index: number;
    delay_ms: number;
    elapsed_ms: number;
    status: 'ok' | 'timeout' | 'error';
    http_code: number | null;
  }> = [];

  let ts_ready_ms: number | null = null;
  let verdict: SpawnProof['verdict'] = 'probe_timeout';
  let error_message: string | null = null;

  for (let i = 0; i < delays.length; i++) {
    const delay = delays[i]!;
    const elapsed_total = deps.clockMonotonic() - probeLoopStart;
    if (elapsed_total + delay > budget_total) {
      verdict = 'probe_total_exceeded';
      error_message =
        `budget ${budget_total}ms exhausted before attempt ${i + 1} ` +
        `(elapsed=${Math.round(elapsed_total)}, next_delay=${delay})`;
      break;
    }

    await deps.sleep(delay);

    const attemptStart = deps.clockMonotonic();
    const remaining = budget_total - (attemptStart - probeLoopStart);
    const attempt_timeout = Math.max(100, Math.min(per_attempt_max, remaining));

    let status: 'ok' | 'timeout' | 'error' = 'error';
    let http_code: number | null = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), attempt_timeout);
      try {
        const res = await deps.fetchFn(OLLAMA_HEALTH_URL, { signal: controller.signal });
        http_code = typeof res.status === 'number' ? res.status : null;
        status = res.ok ? 'ok' : 'error';
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      const errStr = err instanceof Error ? err.message : String(err);
      status = errStr.toLowerCase().includes('abort') ? 'timeout' : 'error';
    }

    const elapsed_ms = deps.clockMonotonic() - attemptStart;
    probe_attempts.push({
      attempt_index: i + 1,  // 1-based per spec §8.2
      delay_ms: delay,
      elapsed_ms,
      status,
      http_code,
    });

    if (status === 'ok') {
      ts_ready_ms = deps.clockMonotonic() - tStart;
      verdict = 'success';
      error_message = null;
      deps.logger.info('[dedale.reset] probe success', {
        attempt_index: i + 1, ts_ready_ms, http_code,
      });
      break;
    }
  }

  if (verdict === 'probe_timeout' && error_message === null) {
    error_message =
      probe_attempts.length === 0
        ? 'no probe attempts executed (budget too tight)'
        : `probe failed after ${probe_attempts.length} attempts`;
  }

  return {
    cmd, args, platform,
    pid, detached: true, unref_called,
    ts_spawn_ms, ts_ready_ms,
    probe_attempts,
    verdict,
    error_message,
  };
}

/**
 * Agrège un SpawnProof (potentiellement null) vers les 4 champs flat de
 * ResetProof (§3.4 Δ v1.2). Zéro-impact si SpawnProof est null (path legacy
 * ou fallback).
 */
function aggregateSpawnHealthFields(sp: SpawnProof | null): {
  spawn_used: boolean;
  spawn_success: boolean;
  health_probe_attempts: number;
  health_probe_total_ms: number;
} {
  if (sp === null) {
    return {
      spawn_used: false,
      spawn_success: false,
      health_probe_attempts: 0,
      health_probe_total_ms: 0,
    };
  }
  const total = sp.probe_attempts.reduce(
    (acc, a) => acc + a.delay_ms + a.elapsed_ms,
    0,
  );
  return {
    spawn_used: true,
    spawn_success: sp.verdict === 'success',
    health_probe_attempts: sp.probe_attempts.length,
    health_probe_total_ms: Math.round(total),
  };
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
 *
 * Δ v1.2 §8.1 D2bis : `spawnFn` ajouté à la signature Pick comme OPTIONNEL.
 * - Présent → exécute Brique A (spawn détaché) + Brique B (probe exponentiel).
 * - Absent  → path legacy v0.55 (healthCheckOllama 1-shot), rétro-compat 11
 *   fichiers consommateurs existants (tests + factories non mutés).
 */
export function createResetSession(
  deps: Pick<DedaleDependencies,
    'execCmd' | 'fetchFn' | 'sleep' | 'clock' | 'clockMonotonic' | 'logger'
    | 'spawnFn'>
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

      // 4. Respawn path (Δ v1.2 §8.1 D2bis + §8.2 D3) :
      //    - Si disparition OK ET spawnFn injecté → Brique A (spawn détaché)
      //      + Brique B (probe exponentiel). Succès probe → skip fallback.
      //    - Si disparition OK mais spawnFn absent → path legacy v0.55
      //      (healthCheckOllama 1-shot). Rétro-compat tests existants.
      //    - Si disparition KO OU spawn/probe KO → fallback service restart
      //      + healthCheckOllama 1-shot.
      let fallback_used = false;
      let spawnProof: SpawnProof | null = null;
      let healthLegacy: { ok: boolean; latency_ms: number } | null = null;

      if (gone && deps.spawnFn !== undefined) {
        // 4a. Brique A + B : spawn détaché + probe exponentiel
        spawnProof = await spawnAndProbe(deps);
        logger.info('[dedale.reset] spawnAndProbe done', {
          verdict: spawnProof.verdict,
          pid: spawnProof.pid,
          ts_ready_ms: spawnProof.ts_ready_ms,
          attempts: spawnProof.probe_attempts.length,
        });
        if (spawnProof.verdict !== 'success') {
          logger.warn('[dedale.reset] spawn/probe failed, triggering fallback', {
            verdict: spawnProof.verdict,
            error: spawnProof.error_message,
          });
          fallback_used = await fallbackRestartService(deps);
          if (!fallback_used) {
            const agg = aggregateSpawnHealthFields(spawnProof);
            return {
              outcome: 'failed',
              proof: null,
              elapsed_ms: deps.clockMonotonic() - tStart,
              error:
                `spawn verdict=${spawnProof.verdict} ` +
                `(msg=${spawnProof.error_message ?? 'n/a'}) ` +
                `+ fallback failed; attempts=${agg.health_probe_attempts}`,
            };
          }
          await deps.sleep(2000);
          healthLegacy = await healthCheckOllama(deps);
        }
      } else if (!gone) {
        // 4b. Disparition échouée → fallback obligatoire
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
        await deps.sleep(2000);
        healthLegacy = await healthCheckOllama(deps);
      } else {
        // 4c. Path legacy v0.55 (spawnFn non injecté) → healthCheckOllama 1-shot
        logger.warn('[dedale.reset] spawnFn absent, legacy health check path');
        healthLegacy = await healthCheckOllama(deps);
      }

      // Détermination booléenne de l'état "Ollama répond"
      const spawnOk = spawnProof !== null && spawnProof.verdict === 'success';
      const legacyOk = healthLegacy !== null && healthLegacy.ok;
      const ollamaReady = spawnOk || legacyOk;

      // Agrégat SpawnProof → 4 champs flat ResetProof
      const agg = aggregateSpawnHealthFields(spawnProof);

      // Latence health_check_ms (legacy field, préservée pour compat télémétrie) :
      //   - spawnProof success → ts_ready_ms (durée totale spawn+probe)
      //   - healthLegacy       → latency_ms
      //   - Échec total        → -1 (sentinelle legacy)
      const health_check_ms =
        spawnOk && spawnProof?.ts_ready_ms !== null && spawnProof?.ts_ready_ms !== undefined
          ? Math.round(spawnProof.ts_ready_ms)
          : legacyOk && healthLegacy !== null
            ? Math.round(healthLegacy.latency_ms)
            : -1;

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
            spawn_used: agg.spawn_used,
            spawn_success: agg.spawn_success,
            health_probe_attempts: agg.health_probe_attempts,
            health_probe_total_ms: agg.health_probe_total_ms,
          },
          elapsed_ms: deps.clockMonotonic() - tStart,
          error: 'proof invalid (same PID + same start_time)',
        };
      }

      if (!ollamaReady) {
        return {
          outcome: 'failed',
          proof: {
            before,
            after,
            kill_order: [...OLLAMA_RUNNER_NAMES, ...OLLAMA_DAEMON_NAMES],
            fallback_used,
            health_check_ms,
            spawn_used: agg.spawn_used,
            spawn_success: agg.spawn_success,
            health_probe_attempts: agg.health_probe_attempts,
            health_probe_total_ms: agg.health_probe_total_ms,
          },
          elapsed_ms: deps.clockMonotonic() - tStart,
          error: spawnProof !== null
            ? `spawn verdict=${spawnProof.verdict}, fallback_used=${fallback_used}, legacy=${legacyOk}`
            : 'health check failed',
        };
      }

      const proof: ResetProof = {
        before,
        after,
        kill_order: [...OLLAMA_RUNNER_NAMES, ...OLLAMA_DAEMON_NAMES],
        fallback_used,
        health_check_ms,
        spawn_used: agg.spawn_used,
        spawn_success: agg.spawn_success,
        health_probe_attempts: agg.health_probe_attempts,
        health_probe_total_ms: agg.health_probe_total_ms,
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
