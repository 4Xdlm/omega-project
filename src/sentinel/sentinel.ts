/**
 * OMEGA Sentinel API v1.0
 * Phase C - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-C-01: Default DENY
 * - INV-C-02: rule_id always present
 * - INV-C-03: trace_id always present (even DENY)
 * - INV-TRACE-02: Every attempt = trace
 * - INV-2STEP-01/02: R2(B) two-step mode
 */

import {
  SentinelOperation,
  SentinelStage,
  SentinelContext,
  SentinelDecision,
  SentinelError,
  TraceId,
  ChainHash,
  JudgementTraceEntry,
  createTraceId,
} from './types.js';
import { RuleEngine } from './rule-engine.js';
import { TraceManager } from './trace.js';
import { hashCanonical } from '../shared/canonical.js';
import { Clock, SystemClock } from '../shared/clock.js';

export interface SentinelConfig {
  readonly twoStepEnabled: boolean; // R2(B) - default OFF
  readonly clock: Clock;
  readonly tracePath?: string;
}

const DEFAULT_CONFIG: SentinelConfig = {
  twoStepEnabled: false,
  clock: SystemClock,
};

export interface AuthorizeResult {
  readonly decision: SentinelDecision;
  readonly trace: JudgementTraceEntry;
}

export class Sentinel {
  private readonly ruleEngine: RuleEngine;
  private readonly traceManager: TraceManager;
  private readonly config: SentinelConfig;
  private readonly proposed = new Map<string, SentinelDecision>();

  constructor(
    config: Partial<SentinelConfig> = {},
    ruleEngine?: RuleEngine,
    traceManager?: TraceManager
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ruleEngine = ruleEngine ?? new RuleEngine();
    this.traceManager =
      traceManager ?? new TraceManager(this.config.clock, this.config.tracePath);
  }

  async initialize(): Promise<void> {
    await this.traceManager.initialize();
  }

  async authorize(
    stage: SentinelStage,
    operation: SentinelOperation,
    payload: unknown,
    context: SentinelContext
  ): Promise<AuthorizeResult> {
    // INV-2STEP-02: PROPOSE requires twoStepEnabled
    if (stage === 'PROPOSE' && !this.config.twoStepEnabled) {
      throw new SentinelError('PROPOSE requires twoStepEnabled', 'TWO_STEP_REQUIRED');
    }

    // INV-2STEP-01: FINAL with twoStep requires prior PROPOSE
    if (stage === 'FINAL' && this.config.twoStepEnabled) {
      const key = this.proposeKey(operation, payload, context);
      const prior = this.proposed.get(key);
      if (!prior || prior.verdict !== 'ALLOW') {
        throw new SentinelError('FINAL requires prior PROPOSE ALLOW', 'TWO_STEP_REQUIRED');
      }
      this.proposed.delete(key);
    }

    // Evaluate rules (INV-C-01: default DENY)
    const result = this.ruleEngine.evaluate(operation, payload, context);

    const decision: SentinelDecision = {
      verdict: result.match.verdict,
      rule_id: result.rule_id, // INV-C-02
      trace_id: '' as TraceId, // Will be set after trace
      justification: result.match.justification.slice(0, 200),
      timestamp_mono_ns: this.config.clock.nowMonoNs(),
    };

    const payloadHash = hashCanonical(payload);

    // INV-TRACE-02: ALWAYS trace, even DENY (INV-C-03)
    const trace = await this.traceManager.appendTrace(
      operation,
      stage,
      payloadHash,
      context,
      decision
    );

    const finalDecision: SentinelDecision = { ...decision, trace_id: trace.trace_id };

    if (stage === 'PROPOSE' && this.config.twoStepEnabled) {
      this.proposed.set(this.proposeKey(operation, payload, context), finalDecision);
    }

    return { decision: finalDecision, trace };
  }

  async verifyTraceChain() {
    return this.traceManager.verifyChain();
  }

  getLastChainHash(): ChainHash {
    return this.traceManager.getLastChainHash();
  }

  private proposeKey(op: SentinelOperation, payload: unknown, ctx: SentinelContext): string {
    return hashCanonical({ op, payload, actor_id: ctx.actor_id });
  }
}

// Singleton
let instance: Sentinel | null = null;

export async function getSentinel(cfg?: Partial<SentinelConfig>): Promise<Sentinel> {
  if (!instance) {
    instance = new Sentinel(cfg);
    await instance.initialize();
  }
  return instance;
}

export function resetSentinel(): void {
  instance = null;
}
