/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS DEP — REPLAY
 * Rejeu déterministe pour debug
 * Sprint 15.0 — NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Replay responsibilities:
 * - Reproduce execution from chronicle entry
 * - Compare original vs replayed output
 * - Generate diff for debugging
 * - Verify determinism
 */

import {
  NexusRequest,
  ChronicleEntry,
  ReplayResult,
  NexusErrorCode,
  RoutingDecision,
  ModuleTarget,
} from './types';
import { execute } from './executor';
import { computeHashSync } from './audit';
import { route } from './router';

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replay an execution from a chronicle entry
 */
export async function replay(chronicleEntry: ChronicleEntry): Promise<ReplayResult> {
  const startTime = Date.now();
  
  // Reconstruct request from chronicle entry
  const request = reconstructRequest(chronicleEntry);
  
  // Route the request
  const routingResult = route(request);
  
  if (!routingResult.success || !routingResult.decision) {
    return {
      original_output_hash: chronicleEntry.entry.output_hash,
      replay_output_hash: computeHashSync({ error: 'routing_failed' }),
      match: false,
      diff: `Routing failed: ${routingResult.error?.message}`,
      replay_duration_ms: Date.now() - startTime,
    };
  }
  
  // Execute the request
  const executionResult = await execute(request, routingResult.decision);
  
  // Compute hash of replayed output
  const replayOutputHash = computeHashSync(
    executionResult.success ? executionResult.data : executionResult.error
  );
  
  // Compare hashes
  const match = chronicleEntry.entry.output_hash === replayOutputHash;
  
  return {
    original_output_hash: chronicleEntry.entry.output_hash,
    replay_output_hash: replayOutputHash,
    match,
    diff: match ? undefined : generateDiff(chronicleEntry.entry.output_hash, replayOutputHash),
    replay_duration_ms: Date.now() - startTime,
  };
}

/**
 * Reconstruct NexusRequest from chronicle entry
 */
function reconstructRequest(chronicleEntry: ChronicleEntry): NexusRequest {
  const entry = chronicleEntry.entry;
  const [module, action] = entry.route.split('.') as [ModuleTarget, string];
  
  return {
    request_id: entry.request_id,
    session_id: entry.session_id,
    caller_id: entry.caller_id,
    module,
    action,
    payload: {}, // Payload cannot be reconstructed from hash
    seed: entry.seed,
  };
}

/**
 * Generate diff string for debugging
 */
function generateDiff(originalHash: string, replayHash: string): string {
  // Find first differing position
  let diffPos = 0;
  for (let i = 0; i < originalHash.length; i++) {
    if (originalHash[i] !== replayHash[i]) {
      diffPos = i;
      break;
    }
  }
  
  return `Hash mismatch at position ${diffPos}:\n` +
    `  Original: ${originalHash.substring(0, 20)}...${originalHash.substring(60)}\n` +
    `  Replayed: ${replayHash.substring(0, 20)}...${replayHash.substring(60)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY WITH PAYLOAD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replay with original payload (when available)
 */
export async function replayWithPayload(
  chronicleEntry: ChronicleEntry,
  originalPayload: unknown
): Promise<ReplayResult> {
  const startTime = Date.now();
  
  const entry = chronicleEntry.entry;
  const [module, action] = entry.route.split('.') as [ModuleTarget, string];
  
  const request: NexusRequest = {
    request_id: entry.request_id,
    session_id: entry.session_id,
    caller_id: entry.caller_id,
    module,
    action,
    payload: originalPayload,
    seed: entry.seed,
  };
  
  // Route the request
  const routingResult = route(request);
  
  if (!routingResult.success || !routingResult.decision) {
    return {
      original_output_hash: entry.output_hash,
      replay_output_hash: computeHashSync({ error: 'routing_failed' }),
      match: false,
      diff: `Routing failed: ${routingResult.error?.message}`,
      replay_duration_ms: Date.now() - startTime,
    };
  }
  
  // Execute the request
  const executionResult = await execute(request, routingResult.decision);
  
  // Compute hash of replayed output
  const replayOutputHash = computeHashSync(
    executionResult.success ? executionResult.data : executionResult.error
  );
  
  // Compare hashes
  const match = entry.output_hash === replayOutputHash;
  
  return {
    original_output_hash: entry.output_hash,
    replay_output_hash: replayOutputHash,
    match,
    diff: match ? undefined : generateDiff(entry.output_hash, replayOutputHash),
    replay_duration_ms: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replay multiple chronicle entries
 */
export async function replayBatch(
  entries: ChronicleEntry[],
  options: { stopOnMismatch?: boolean; parallel?: boolean } = {}
): Promise<{ results: ReplayResult[]; allMatch: boolean }> {
  const results: ReplayResult[] = [];
  
  if (options.parallel) {
    const promises = entries.map(entry => replay(entry));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  } else {
    for (const entry of entries) {
      const result = await replay(entry);
      results.push(result);
      
      if (options.stopOnMismatch && !result.match) {
        break;
      }
    }
  }
  
  const allMatch = results.every(r => r.match);
  
  return { results, allMatch };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify that replay produces deterministic results
 */
export async function verifyReplayDeterminism(
  chronicleEntry: ChronicleEntry,
  iterations: number = 3
): Promise<{ deterministic: boolean; hashes: string[] }> {
  const hashes: string[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await replay(chronicleEntry);
    hashes.push(result.replay_output_hash);
  }
  
  const allSame = hashes.every(h => h === hashes[0]);
  
  return {
    deterministic: allSame,
    hashes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLAY REPORT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayReport {
  entry_id: string;
  original_timestamp: string;
  replay_timestamp: string;
  route: string;
  original_hash: string;
  replay_hash: string;
  match: boolean;
  duration_original_ms: number;
  duration_replay_ms: number;
  diff?: string;
}

/**
 * Generate detailed replay report
 */
export function generateReplayReport(
  chronicleEntry: ChronicleEntry,
  replayResult: ReplayResult
): ReplayReport {
  return {
    entry_id: chronicleEntry.entry.request_id,
    original_timestamp: chronicleEntry.entry.timestamp,
    replay_timestamp: new Date().toISOString(),
    route: chronicleEntry.entry.route,
    original_hash: replayResult.original_output_hash,
    replay_hash: replayResult.replay_output_hash,
    match: replayResult.match,
    duration_original_ms: chronicleEntry.entry.duration_ms,
    duration_replay_ms: replayResult.replay_duration_ms,
    diff: replayResult.diff,
  };
}
