/**
 * OMEGA Trace Manager v1.0 - Hash-Chain (R1)
 * Phase C - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-TRACE-01: chain_hash[i] = SHA256(prev + entry_hash)
 * - INV-TRACE-02: Every attempt = trace (even DENY)
 * - INV-WRITE-03: Lock required
 */

import { appendFile, readFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import {
  TraceId,
  ChainHash,
  SentinelOperation,
  SentinelStage,
  SentinelContext,
  SentinelDecision,
  JudgementTraceEntry,
  createTraceId,
  toChainHash,
} from './types.js';
import { canonicalize, hashCanonical, sha256 } from '../shared/canonical.js';
import { withLock } from '../shared/lock.js';
import { Clock } from '../shared/clock.js';

const GENESIS_HASH = '0'.repeat(64);

export class TraceManager {
  private lastChainHash: ChainHash = toChainHash(GENESIS_HASH);
  private initialized = false;

  constructor(
    private readonly clock: Clock,
    private readonly tracePath: string = 'derived/judgements.ndjson'
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    try {
      await mkdir(dirname(this.tracePath), { recursive: true });
    } catch {}

    try {
      const content = await readFile(this.tracePath, 'utf-8');
      const lines = content.trim().split('\n').filter((l) => l);
      if (lines.length > 0) {
        const last = JSON.parse(lines[lines.length - 1]) as JudgementTraceEntry;
        this.lastChainHash = last.chain_hash;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    this.initialized = true;
  }

  async appendTrace(
    operation: SentinelOperation,
    stage: SentinelStage,
    payloadHash: string,
    context: SentinelContext,
    decision: SentinelDecision
  ): Promise<JudgementTraceEntry> {
    await this.initialize();

    const trace_id = createTraceId();

    // Create base entry for hashing (without computed hashes)
    const entryBase = {
      trace_id,
      operation,
      stage,
      payload_hash: payloadHash,
      context: {
        phase: context.phase,
        actor_id: context.actor_id,
        reason: context.reason,
        source: context.source,
        timestamp_mono_ns: context.timestamp_mono_ns,
      },
      decision: {
        verdict: decision.verdict,
        rule_id: decision.rule_id,
        trace_id: decision.trace_id,
        justification: decision.justification,
        timestamp_mono_ns: decision.timestamp_mono_ns,
      },
      prev_chain_hash: this.lastChainHash,
    };

    const entry_hash = hashCanonical(entryBase);
    const chain_hash = toChainHash(sha256(this.lastChainHash + entry_hash));

    const entry: JudgementTraceEntry = { ...entryBase, entry_hash, chain_hash };

    await withLock(this.tracePath, async () => {
      await appendFile(this.tracePath, canonicalize(entry) + '\n');
    });

    this.lastChainHash = chain_hash;
    return entry;
  }

  async verifyChain(): Promise<{ valid: boolean; entries: number; error?: string }> {
    try {
      const content = await readFile(this.tracePath, 'utf-8');
      const lines = content.trim().split('\n').filter((l) => l);
      let prev: ChainHash = toChainHash(GENESIS_HASH);

      for (let i = 0; i < lines.length; i++) {
        const entry = JSON.parse(lines[i]) as JudgementTraceEntry;

        if (entry.prev_chain_hash !== prev) {
          return { valid: false, entries: i, error: `Chain broken at ${i}` };
        }

        const base = {
          trace_id: entry.trace_id,
          operation: entry.operation,
          stage: entry.stage,
          payload_hash: entry.payload_hash,
          context: entry.context,
          decision: entry.decision,
          prev_chain_hash: entry.prev_chain_hash,
        };

        const expectedEntryHash = hashCanonical(base);
        if (entry.entry_hash !== expectedEntryHash) {
          return { valid: false, entries: i, error: `Entry hash mismatch at ${i}` };
        }

        const expectedChainHash = sha256(entry.prev_chain_hash + entry.entry_hash);
        if (entry.chain_hash !== expectedChainHash) {
          return { valid: false, entries: i, error: `Chain hash mismatch at ${i}` };
        }

        prev = entry.chain_hash;
      }

      return { valid: true, entries: lines.length };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { valid: true, entries: 0 };
      }
      throw err;
    }
  }

  getLastChainHash(): ChainHash {
    return this.lastChainHash;
  }
}
