/**
 * OMEGA Plugin Gateway — Router / Orchestrator v1.0
 *
 * INV-PNP-01: Single Gateway — all invocations through router.
 * INV-PNP-08: No side-channel — plugins never talk to each other.
 * INV-PNP-10: Fail-closed — stops on failure when policy requires.
 */

import type {
  PluginRequest,
  PluginResponse,
  PipelinePolicy,
  PipelineResponse,
  PipelineStepResult,
  PluginManifest,
} from './types.js';
import { GatewayEventKind } from './types.js';
import type { PluginRegistry } from './registry.js';
import type { ManifestValidator } from './validator.js';
import type { GatewayLedger } from './ledger.js';
import { executeInline } from './sandbox.js';

export type PluginHandler = (req: PluginRequest) => PluginResponse | Promise<PluginResponse>;

export class GatewayRouter {
  private readonly handlers: Map<string, PluginHandler> = new Map();

  constructor(
    private readonly registry: PluginRegistry,
    private readonly validator: ManifestValidator,
    private readonly ledger: GatewayLedger,
  ) {}

  /** Register a handler function for a plugin (test/inline mode) */
  setHandler(pluginId: string, handler: PluginHandler): void {
    this.handlers.set(pluginId, handler);
  }

  /** Invoke a single plugin. OMEGA → Gateway → Plugin → Gateway → OMEGA */
  async invoke(pluginId: string, request: PluginRequest, timestamp: string): Promise<PluginResponse> {
    // 1. Check plugin exists and is enabled
    if (!this.registry.has(pluginId)) {
      return this.reject(pluginId, request, 'Plugin not found', timestamp);
    }
    if (!this.registry.isEnabled(pluginId)) {
      return this.reject(pluginId, request, 'Plugin not enabled', timestamp);
    }

    const entry = this.registry.get(pluginId);
    const manifest = entry.manifest;

    // 2. Validate request
    const reqIssues = this.validator.validateRequest(request);
    if (reqIssues.some(i => i.severity === 'error')) {
      return this.reject(pluginId, request, `Invalid request: ${reqIssues.map(i => i.message).join('; ')}`, timestamp);
    }

    // 3. Check determinism policy
    if (request.policy.deterministic_only && manifest.determinism.mode !== 'deterministic') {
      return this.reject(pluginId, request, 'Deterministic-only policy but plugin is probabilistic', timestamp);
    }

    // 4. Log INVOKE event
    this.ledger.append({
      run_id: request.run_id,
      kind: GatewayEventKind.INVOKE,
      plugin_id: pluginId,
      request_id: request.request_id,
      input_hash: '',
      output_hash: '',
      meta: { action: 'invoke' },
      timestamp,
    });

    // 5. Execute in sandbox
    const handler = this.handlers.get(pluginId);
    if (!handler) {
      return this.reject(pluginId, request, 'No handler registered for plugin', timestamp);
    }

    const response = await executeInline(manifest, request, handler, {
      timeoutMs: request.policy.timeout_ms,
      maxMemoryMb: 128,
    });

    // 6. Validate response
    const respIssues = this.validator.validateResponse(response);
    if (respIssues.some(i => i.severity === 'error')) {
      this.ledger.append({
        run_id: request.run_id,
        kind: GatewayEventKind.REJECT,
        plugin_id: pluginId,
        request_id: request.request_id,
        input_hash: response.evidence_hashes.input_hash,
        output_hash: '',
        meta: { reason: 'invalid_response', errors: respIssues.map(i => i.message).join('; ') },
        timestamp,
      });
      return { ...response, status: 'rejected', notes: 'Response validation failed' };
    }

    // 7. Log RESULT or ERROR event
    const eventKind = response.status === 'ok' ? GatewayEventKind.RESULT :
                      response.status === 'error' ? GatewayEventKind.ERROR :
                      response.status === 'timeout' ? GatewayEventKind.ERROR :
                      GatewayEventKind.REJECT;

    this.ledger.append({
      run_id: request.run_id,
      kind: eventKind,
      plugin_id: pluginId,
      request_id: request.request_id,
      input_hash: response.evidence_hashes.input_hash,
      output_hash: response.evidence_hashes.output_hash,
      meta: { status: response.status, duration_ms: String(response.duration_ms) },
      timestamp,
    });

    return response;
  }

  /** Execute a pipeline of plugins according to policy */
  async invokePipeline(policy: PipelinePolicy, request: PluginRequest, timestamp: string): Promise<PipelineResponse> {
    const startMs = performance.now();
    const steps: PipelineStepResult[] = [];

    if (policy.strategy === 'sequential') {
      for (let i = 0; i < policy.plugin_ids.length; i++) {
        const pluginId = policy.plugin_ids[i]!;
        const response = await this.invoke(pluginId, request, timestamp);

        steps.push({ plugin_id: pluginId, response, step_index: i });

        if (policy.stop_on_failure && response.status !== 'ok') {
          return {
            run_id: request.run_id,
            strategy: policy.strategy,
            steps,
            overall_status: response.status,
            total_duration_ms: Math.round(performance.now() - startMs),
          };
        }
      }
    } else {
      // fan_out: execute all in parallel
      const promises = policy.plugin_ids.map((pluginId, i) =>
        this.invoke(pluginId, request, timestamp).then(response => ({
          plugin_id: pluginId,
          response,
          step_index: i,
        }))
      );

      const results = await Promise.all(promises);
      steps.push(...results);
    }

    const hasFailure = steps.some(s => s.response.status !== 'ok');
    const overall = hasFailure ? 'error' : 'ok';

    return {
      run_id: request.run_id,
      strategy: policy.strategy,
      steps,
      overall_status: overall as 'ok' | 'error',
      total_duration_ms: Math.round(performance.now() - startMs),
    };
  }

  private reject(pluginId: string, request: PluginRequest, reason: string, timestamp: string): PluginResponse {
    this.ledger.append({
      run_id: request.run_id,
      kind: GatewayEventKind.REJECT,
      plugin_id: pluginId,
      request_id: request.request_id,
      input_hash: '',
      output_hash: '',
      meta: { reason },
      timestamp,
    });

    return {
      request_id: request.request_id,
      plugin_id: pluginId,
      status: 'rejected',
      result: null,
      evidence_hashes: { input_hash: '', output_hash: '' },
      duration_ms: 0,
      notes: reason,
    };
  }
}
