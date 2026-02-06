/**
 * OMEGA Plugin Gateway — Sandbox v1.0
 *
 * INV-PNP-05: Isolation — zero ambient authority.
 * INV-PNP-08: No side-channel — communication only via structured messages.
 * INV-PNP-10: Fail-closed — timeout/crash/invalid → reject.
 *
 * Mode B only: plugins execute in Worker threads with strict protocol.
 */

import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import stableStringify from 'fast-json-stable-stringify';
import type { PluginRequest, PluginResponse, PluginManifest } from './types.js';

/** Message sent TO worker */
export interface SandboxRequest {
  readonly type: 'invoke';
  readonly request: PluginRequest;
}

/** Message received FROM worker */
export interface SandboxResponse {
  readonly type: 'result';
  readonly response: PluginResponse;
}

export interface SandboxOptions {
  readonly timeoutMs: number;
  readonly maxMemoryMb: number;
}

const DEFAULT_OPTIONS: SandboxOptions = {
  timeoutMs: 10000,
  maxMemoryMb: 128,
};

function hashData(data: unknown): string {
  return createHash('sha256').update(stableStringify(data)).digest('hex');
}

/**
 * Execute a plugin in an isolated Worker thread.
 *
 * The worker file must export a function matching the plugin entrypoint.
 * Communication is strictly request→response via postMessage.
 */
export async function executeSandboxed(
  manifest: PluginManifest,
  request: PluginRequest,
  workerPath: string,
  options: SandboxOptions = DEFAULT_OPTIONS,
): Promise<PluginResponse> {
  const inputHash = hashData(request.payload);
  const startMs = performance.now();

  return new Promise<PluginResponse>((resolve) => {
    let settled = false;

    const settle = (response: PluginResponse): void => {
      if (settled) return;
      settled = true;
      resolve(response);
    };

    const makeReject = (status: 'error' | 'timeout', notes: string): PluginResponse => ({
      request_id: request.request_id,
      plugin_id: manifest.plugin_id,
      status,
      result: null,
      evidence_hashes: { input_hash: inputHash, output_hash: '' },
      duration_ms: Math.round(performance.now() - startMs),
      notes,
    });

    // Timeout guard (INV-PNP-10: fail-closed)
    const effectiveTimeout = Math.min(options.timeoutMs, manifest.limits.max_ms);
    const timer = setTimeout(() => {
      settle(makeReject('timeout', `Sandbox timeout after ${effectiveTimeout}ms`));
      try { worker.terminate(); } catch { /* best effort */ }
    }, effectiveTimeout);

    let worker: Worker;
    try {
      worker = new Worker(workerPath, {
        workerData: {
          request,
          pluginId: manifest.plugin_id,
          exportName: manifest.entrypoint.export,
        },
        resourceLimits: {
          maxOldGenerationSizeMb: options.maxMemoryMb,
          maxYoungGenerationSizeMb: Math.max(16, Math.floor(options.maxMemoryMb / 4)),
        },
        // INV-PNP-05: No env passthrough
        env: {},
      });
    } catch (err) {
      clearTimeout(timer);
      settle(makeReject('error', `Worker creation failed: ${String(err)}`));
      return;
    }

    worker.on('message', (msg: unknown) => {
      clearTimeout(timer);

      if (!isSandboxResponse(msg)) {
        settle(makeReject('error', 'Invalid response format from worker'));
        try { worker.terminate(); } catch { /* best effort */ }
        return;
      }

      const outputHash = msg.response.result ? hashData(msg.response.result) : '';
      const duration = Math.round(performance.now() - startMs);

      settle({
        ...msg.response,
        request_id: request.request_id,
        plugin_id: manifest.plugin_id,
        evidence_hashes: { input_hash: inputHash, output_hash: outputHash },
        duration_ms: duration,
      });

      try { worker.terminate(); } catch { /* best effort */ }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      settle(makeReject('error', `Worker error: ${err.message}`));
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (!settled) {
        settle(makeReject('error', `Worker exited with code ${code}`));
      }
    });

    // Send request to worker
    const sandboxReq: SandboxRequest = { type: 'invoke', request };
    worker.postMessage(sandboxReq);
  });
}

function isSandboxResponse(msg: unknown): msg is SandboxResponse {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;
  return obj['type'] === 'result' && typeof obj['response'] === 'object' && obj['response'] !== null;
}

/**
 * Inline sandbox for testing — executes handler function directly
 * but with same protocol constraints. No Worker thread.
 *
 * Use ONLY in tests. Production MUST use executeSandboxed.
 */
export async function executeInline(
  manifest: PluginManifest,
  request: PluginRequest,
  handler: (req: PluginRequest) => PluginResponse | Promise<PluginResponse>,
  options: SandboxOptions = DEFAULT_OPTIONS,
): Promise<PluginResponse> {
  const inputHash = hashData(request.payload);
  const startMs = performance.now();

  const makeReject = (status: 'error' | 'timeout', notes: string): PluginResponse => ({
    request_id: request.request_id,
    plugin_id: manifest.plugin_id,
    status,
    result: null,
    evidence_hashes: { input_hash: inputHash, output_hash: '' },
    duration_ms: Math.round(performance.now() - startMs),
    notes,
  });

  const effectiveTimeout = Math.min(options.timeoutMs, manifest.limits.max_ms);

  try {
    const result = await Promise.race([
      Promise.resolve(handler(request)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), effectiveTimeout)
      ),
    ]);

    const outputHash = result.result ? hashData(result.result) : '';
    const duration = Math.round(performance.now() - startMs);

    return {
      ...result,
      request_id: request.request_id,
      plugin_id: manifest.plugin_id,
      evidence_hashes: { input_hash: inputHash, output_hash: outputHash },
      duration_ms: duration,
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'TIMEOUT') {
      return makeReject('timeout', `Inline timeout after ${effectiveTimeout}ms`);
    }
    return makeReject('error', `Handler error: ${String(err)}`);
  }
}
