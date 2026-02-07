/**
 * OMEGA Plugin SDK — Adapter Base v1.0
 * DR-2: Pure core. L5: Fail-closed. L9: Evidence. L10: Non-actuation.
 */

import { computeEvidenceHashes } from './evidence.js';
import type { PluginRequest, PluginResponse, PluginPayload } from './types.js';

export abstract class AdapterBase {
  abstract readonly pluginId: string;
  abstract validateInput(payload: PluginPayload): string | null;
  abstract compute(payload: PluginPayload): PluginPayload | Promise<PluginPayload>;

  async handleRequest(request: PluginRequest): Promise<PluginResponse> {
    const startMs = performance.now();

    const validationError = this.validateInput(request.payload);
    if (validationError !== null) {
      return {
        request_id: request.request_id,
        plugin_id: this.pluginId,
        status: 'rejected',
        result: null,
        evidence_hashes: computeEvidenceHashes(request.payload, null),
        duration_ms: Math.round(performance.now() - startMs),
        notes: `Validation failed: ${validationError}`,
      };
    }

    try {
      const output = await this.compute(request.payload);
      return {
        request_id: request.request_id,
        plugin_id: this.pluginId,
        status: 'ok',
        result: output,
        evidence_hashes: computeEvidenceHashes(request.payload, output),
        duration_ms: Math.round(performance.now() - startMs),
        notes: '',
      };
    } catch (err) {
      return {
        request_id: request.request_id,
        plugin_id: this.pluginId,
        status: 'error',
        result: null,
        evidence_hashes: computeEvidenceHashes(request.payload, null),
        duration_ms: Math.round(performance.now() - startMs),
        notes: `Compute error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
