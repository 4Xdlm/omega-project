/**
 * OMEGA Plugin Gateway — Ledger v1.0
 *
 * INV-PNP-07: Traceability — append-only + hash-chain.
 * INV-PNP-02: Non-actuating — data-only, no side effects.
 * INV-PNP-03: Determinism — canonical JSON, sorted keys.
 */

import { createHash, randomUUID } from 'node:crypto';
import stableStringify from 'fast-json-stable-stringify';
import type {
  GatewayEvent,
  GatewayEventKind,
  ProofBundle,
  ValidationReport,
} from './types.js';

function hashCanonical(event: Omit<GatewayEvent, 'event_hash'>): string {
  return createHash('sha256').update(stableStringify(event)).digest('hex');
}

export class GatewayLedger {
  private readonly events: GatewayEvent[] = [];
  private headHash: string = '';

  append(params: {
    run_id: string;
    kind: GatewayEventKind;
    plugin_id: string;
    request_id: string;
    input_hash: string;
    output_hash: string;
    meta: Record<string, string>;
    timestamp: string;
  }): GatewayEvent {
    const partial: Omit<GatewayEvent, 'event_hash'> = {
      event_id: randomUUID(),
      run_id: params.run_id,
      ts: params.timestamp,
      kind: params.kind,
      plugin_id: params.plugin_id,
      request_id: params.request_id,
      input_hash: params.input_hash,
      output_hash: params.output_hash,
      prev_hash: this.headHash,
      meta: params.meta,
    };

    const event_hash = hashCanonical(partial);
    const event: GatewayEvent = { ...partial, event_hash };

    this.events.push(event);
    this.headHash = event_hash;

    return event;
  }

  getEvents(): readonly GatewayEvent[] {
    return [...this.events];
  }

  getHead(): string {
    return this.headHash;
  }

  count(): number {
    return this.events.length;
  }

  /** Verify entire hash-chain integrity. Returns true if valid. */
  verifyChain(): { valid: boolean; broken_at: number | null } {
    let prevHash = '';
    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i]!;

      // Check prev_hash links
      if (event.prev_hash !== prevHash) {
        return { valid: false, broken_at: i };
      }

      // Recompute event_hash
      const { event_hash, ...rest } = event;
      const computed = hashCanonical(rest);
      if (computed !== event_hash) {
        return { valid: false, broken_at: i };
      }

      prevHash = event_hash;
    }
    return { valid: true, broken_at: null };
  }

  /** Export as NDJSON lines (append-only format) */
  toNDJSON(): string {
    return this.events.map(e => stableStringify(e)).join('\n');
  }

  /** Export proof bundle for a specific run_id */
  exportProof(
    runId: string,
    manifests: readonly { plugin_id: string; manifest_hash: string }[],
    reports: readonly ValidationReport[],
  ): ProofBundle {
    const runEvents = this.events.filter(e => e.run_id === runId);
    const headEvent = runEvents[runEvents.length - 1];

    return {
      proof_id: randomUUID(),
      run_id: runId,
      created_at: new Date().toISOString(),
      head_event_hash: headEvent?.event_hash ?? '',
      events: runEvents,
      plugin_manifest_digests: [...manifests],
      validation_reports: [...reports],
    };
  }

  /** Get events filtered by run_id */
  getByRun(runId: string): readonly GatewayEvent[] {
    return this.events.filter(e => e.run_id === runId);
  }

  /** Get events filtered by plugin_id */
  getByPlugin(pluginId: string): readonly GatewayEvent[] {
    return this.events.filter(e => e.plugin_id === pluginId);
  }
}
