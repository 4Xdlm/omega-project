/**
 * OMEGA DECISION TRACE
 * ====================
 * NASA-Grade L4 / DO-178C / AS9100D
 * 
 * Système de traçabilité décisionnelle
 * Chaque décision critique produit une trace complète:
 * - ID unique
 * - Inputs utilisés
 * - Invariants invoqués
 * - Résultat
 * - Hash de preuve
 * 
 * INV-TRACE-01: Toute décision critique est tracée
 * INV-TRACE-02: Traces immuables après création
 * INV-TRACE-03: Rejeu déterministe possible
 * INV-TRACE-04: Hash d'intégrité sur chaque trace
 * INV-TRACE-05: Export forensic complet
 * 
 * @module decision_trace
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Niveau de décision
 */
export type DecisionLevel = 'INFO' | 'NORMAL' | 'CRITICAL' | 'IRREVERSIBLE';

/**
 * Résultat d'une décision
 */
export type DecisionOutcome = 'APPROVED' | 'REJECTED' | 'PENDING' | 'ERROR';

/**
 * Entrée de la décision (input)
 */
export interface DecisionInput {
  readonly key: string;
  readonly value: unknown;
  readonly hash: string;
}

/**
 * Invariant vérifié lors de la décision
 */
export interface InvariantCheck {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly details?: string;
}

/**
 * Trace de décision complète
 */
export interface DecisionTrace {
  readonly id: string;
  readonly timestamp: string;
  readonly module: string;
  readonly action: string;
  readonly level: DecisionLevel;
  readonly actor: string;
  readonly inputs: readonly DecisionInput[];
  readonly invariantsChecked: readonly InvariantCheck[];
  readonly outcome: DecisionOutcome;
  readonly reason: string;
  readonly durationMs: number;
  readonly hash: string;
  readonly previousHash: string | null;
}

/**
 * Résumé d'audit
 */
export interface AuditSummary {
  readonly totalDecisions: number;
  readonly approved: number;
  readonly rejected: number;
  readonly pending: number;
  readonly errors: number;
  readonly byModule: Record<string, number>;
  readonly byLevel: Record<DecisionLevel, number>;
  readonly chainValid: boolean;
  readonly firstDecision: string;
  readonly lastDecision: string;
}

/**
 * Contexte injectable
 */
export interface TraceContext {
  readonly timestamp: () => string;
  readonly generateId: () => string;
  readonly computeHash: (data: string) => string;
  readonly measure: () => { stop: () => number };
}

// ============================================================================
// TRACE BUILDER
// ============================================================================

/**
 * Builder pour construire une trace de décision
 */
export class DecisionTraceBuilder {
  private module: string = '';
  private action: string = '';
  private level: DecisionLevel = 'NORMAL';
  private actor: string = '';
  private inputs: DecisionInput[] = [];
  private invariants: InvariantCheck[] = [];
  private outcome: DecisionOutcome = 'PENDING';
  private reason: string = '';
  private readonly context: TraceContext;
  private readonly startTime: { stop: () => number };
  private previousHash: string | null = null;

  constructor(context: TraceContext, previousHash: string | null = null) {
    this.context = context;
    this.startTime = context.measure();
    this.previousHash = previousHash;
  }

  setModule(module: string): this {
    this.module = module;
    return this;
  }

  setAction(action: string): this {
    this.action = action;
    return this;
  }

  setLevel(level: DecisionLevel): this {
    this.level = level;
    return this;
  }

  setActor(actor: string): this {
    this.actor = actor;
    return this;
  }

  addInput(key: string, value: unknown): this {
    const valueStr = JSON.stringify(value);
    this.inputs.push({
      key,
      value,
      hash: this.context.computeHash(valueStr),
    });
    return this;
  }

  addInvariantCheck(id: string, name: string, passed: boolean, details?: string): this {
    this.invariants.push({ id, name, passed, details });
    return this;
  }

  approve(reason: string): DecisionTrace {
    this.outcome = 'APPROVED';
    this.reason = reason;
    return this.build();
  }

  reject(reason: string): DecisionTrace {
    this.outcome = 'REJECTED';
    this.reason = reason;
    return this.build();
  }

  error(reason: string): DecisionTrace {
    this.outcome = 'ERROR';
    this.reason = reason;
    return this.build();
  }

  pending(reason: string): DecisionTrace {
    this.outcome = 'PENDING';
    this.reason = reason;
    return this.build();
  }

  private build(): DecisionTrace {
    const id = this.context.generateId();
    const timestamp = this.context.timestamp();
    const durationMs = this.startTime.stop();

    // Données pour le hash (sans le hash lui-même)
    const hashData = JSON.stringify({
      id,
      timestamp,
      module: this.module,
      action: this.action,
      level: this.level,
      actor: this.actor,
      inputs: this.inputs,
      invariantsChecked: this.invariants,
      outcome: this.outcome,
      reason: this.reason,
      durationMs,
      previousHash: this.previousHash,
    });

    const trace: DecisionTrace = Object.freeze({
      id,
      timestamp,
      module: this.module,
      action: this.action,
      level: this.level,
      actor: this.actor,
      inputs: Object.freeze([...this.inputs]),
      invariantsChecked: Object.freeze([...this.invariants]),
      outcome: this.outcome,
      reason: this.reason,
      durationMs,
      hash: this.context.computeHash(hashData),
      previousHash: this.previousHash,
    });

    return trace;
  }
}

// ============================================================================
// TRACE STORE
// ============================================================================

/**
 * Store de traces de décision (append-only)
 * INV-TRACE-02: Traces immuables après création
 */
export class DecisionTraceStore {
  private readonly traces: DecisionTrace[] = [];
  private readonly context: TraceContext;

  constructor(context: TraceContext) {
    this.context = context;
  }

  /**
   * Crée un nouveau builder pour une décision
   */
  createTrace(): DecisionTraceBuilder {
    const previousHash = this.traces.length > 0
      ? this.traces[this.traces.length - 1].hash
      : null;
    return new DecisionTraceBuilder(this.context, previousHash);
  }

  /**
   * Enregistre une trace (append-only)
   * INV-TRACE-01: Toute décision critique est tracée
   */
  record(trace: DecisionTrace): void {
    // Vérifier la chaîne
    if (this.traces.length > 0) {
      const lastTrace = this.traces[this.traces.length - 1];
      if (trace.previousHash !== lastTrace.hash) {
        throw new Error('CHAIN_INTEGRITY_VIOLATION: previousHash does not match last trace');
      }
    } else if (trace.previousHash !== null) {
      throw new Error('CHAIN_INTEGRITY_VIOLATION: First trace should have null previousHash');
    }

    this.traces.push(trace);
  }

  /**
   * Récupère toutes les traces (copie immuable)
   */
  getAll(): readonly DecisionTrace[] {
    return Object.freeze([...this.traces]);
  }

  /**
   * Récupère une trace par ID
   */
  getById(id: string): DecisionTrace | undefined {
    return this.traces.find(t => t.id === id);
  }

  /**
   * Récupère les traces d'un module
   */
  getByModule(module: string): readonly DecisionTrace[] {
    return Object.freeze(this.traces.filter(t => t.module === module));
  }

  /**
   * Récupère les traces d'un niveau
   */
  getByLevel(level: DecisionLevel): readonly DecisionTrace[] {
    return Object.freeze(this.traces.filter(t => t.level === level));
  }

  /**
   * Récupère les traces rejetées
   */
  getRejected(): readonly DecisionTrace[] {
    return Object.freeze(this.traces.filter(t => t.outcome === 'REJECTED'));
  }

  /**
   * Vérifie l'intégrité de la chaîne
   * INV-TRACE-04: Hash d'intégrité sur chaque trace
   */
  verifyChain(): { valid: boolean; brokenAt?: number; reason?: string } {
    for (let i = 0; i < this.traces.length; i++) {
      const trace = this.traces[i];
      
      // Vérifier le lien avec la trace précédente
      if (i === 0) {
        if (trace.previousHash !== null) {
          return { valid: false, brokenAt: i, reason: 'First trace has non-null previousHash' };
        }
      } else {
        const prevTrace = this.traces[i - 1];
        if (trace.previousHash !== prevTrace.hash) {
          return { valid: false, brokenAt: i, reason: 'previousHash mismatch' };
        }
      }

      // Recalculer le hash pour vérifier l'intégrité
      const hashData = JSON.stringify({
        id: trace.id,
        timestamp: trace.timestamp,
        module: trace.module,
        action: trace.action,
        level: trace.level,
        actor: trace.actor,
        inputs: trace.inputs,
        invariantsChecked: trace.invariantsChecked,
        outcome: trace.outcome,
        reason: trace.reason,
        durationMs: trace.durationMs,
        previousHash: trace.previousHash,
      });
      const expectedHash = this.context.computeHash(hashData);
      
      if (trace.hash !== expectedHash) {
        return { valid: false, brokenAt: i, reason: 'Hash integrity violation' };
      }
    }

    return { valid: true };
  }

  /**
   * Génère un résumé d'audit
   * INV-TRACE-05: Export forensic complet
   */
  getAuditSummary(): AuditSummary {
    const byModule: Record<string, number> = {};
    const byLevel: Record<DecisionLevel, number> = {
      INFO: 0,
      NORMAL: 0,
      CRITICAL: 0,
      IRREVERSIBLE: 0,
    };

    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let errors = 0;

    for (const trace of this.traces) {
      // By outcome
      switch (trace.outcome) {
        case 'APPROVED': approved++; break;
        case 'REJECTED': rejected++; break;
        case 'PENDING': pending++; break;
        case 'ERROR': errors++; break;
      }

      // By module
      byModule[trace.module] = (byModule[trace.module] || 0) + 1;

      // By level
      byLevel[trace.level]++;
    }

    const chainResult = this.verifyChain();

    return {
      totalDecisions: this.traces.length,
      approved,
      rejected,
      pending,
      errors,
      byModule,
      byLevel,
      chainValid: chainResult.valid,
      firstDecision: this.traces[0]?.timestamp ?? '',
      lastDecision: this.traces[this.traces.length - 1]?.timestamp ?? '',
    };
  }

  /**
   * Exporte toutes les traces en JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      traces: this.traces,
      summary: this.getAuditSummary(),
      exportedAt: this.context.timestamp(),
    }, null, 2);
  }

  /**
   * Exporte pour rejeu forensic
   * INV-TRACE-03: Rejeu déterministe possible
   */
  exportForReplay(): string {
    return JSON.stringify({
      version: '1.0.0',
      traces: this.traces.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        module: t.module,
        action: t.action,
        level: t.level,
        actor: t.actor,
        inputs: t.inputs,
        expectedOutcome: t.outcome,
        expectedHash: t.hash,
      })),
    }, null, 2);
  }
}

// ============================================================================
// CONTEXTES
// ============================================================================

/**
 * Crée un contexte par défaut (production)
 */
export function createDefaultTraceContext(): TraceContext {
  return {
    timestamp: () => new Date().toISOString(),
    generateId: () => crypto.randomUUID(),
    computeHash: (data: string) => {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },
    measure: () => {
      const start = performance.now();
      return {
        stop: () => Math.round(performance.now() - start),
      };
    },
  };
}

/**
 * Crée un contexte de test (déterministe)
 */
export function createTestTraceContext(
  fixedTimestamp: string = '2026-01-04T12:00:00.000Z'
): TraceContext {
  let idCounter = 0;
  return {
    timestamp: () => fixedTimestamp,
    generateId: () => `TRACE-${String(++idCounter).padStart(6, '0')}`,
    computeHash: (data: string) => {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },
    measure: () => {
      return {
        stop: () => 1, // Durée fixe pour tests
      };
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Crée rapidement une trace de décision simple
 */
export function quickTrace(
  store: DecisionTraceStore,
  module: string,
  action: string,
  outcome: DecisionOutcome,
  reason: string
): DecisionTrace {
  const builder = store.createTrace()
    .setModule(module)
    .setAction(action)
    .setActor('SYSTEM');

  switch (outcome) {
    case 'APPROVED': return builder.approve(reason);
    case 'REJECTED': return builder.reject(reason);
    case 'ERROR': return builder.error(reason);
    case 'PENDING': return builder.pending(reason);
  }
}
