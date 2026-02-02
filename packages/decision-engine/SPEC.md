# @omega/decision-engine — Technical Specification

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Date**: 2026-02-02

## 1. Overview

The Decision Engine provides a deterministic decision-making pipeline for processing build verdicts in the OMEGA system.

## 2. Architecture

### 2.1 Data Flow

```
BuildVerdict
    │
    ↓
┌───────────┐
│ SENTINEL  │  Read-only observation
└─────┬─────┘
      │
      ↓ RuntimeEvent
┌───────────┐
│CLASSIFIER │  Deterministic classification
└─────┬─────┘
      │
      ↓ ClassificationResult
┌─────┴─────┬─────────────┐
│           │             │
↓           ↓             ↓
ACCEPT    ALERT         BLOCK
│           │             │
│     ┌─────┴─────┐  ┌────┴────┐
│     │   QUEUE   │  │INCIDENT │
│     └─────┬─────┘  │   LOG   │
│           │        └────┬────┘
│     ┌─────┴─────┐       │
│     │  REVIEW   │       │
│     └─────┬─────┘       │
│           │             │
└───────────┴──────┬──────┘
                   │
             ┌─────┴─────┐
             │   TRACE   │  Audit trail
             └───────────┘
```

### 2.2 Module Dependencies

```
types/
  └── (shared type definitions)

sentinel/
  └── types/

classifier/
  ├── types/
  └── sentinel/

queue/
  └── types/

incident/
  └── types/

trace/
  └── types/

review/
  ├── types/
  └── queue/
```

## 3. Type Definitions

### 3.1 Verdict Types

```typescript
type VerdictSource = 'ORACLE' | 'DECISION_ENGINE';
type VerdictOutcome = 'ACCEPT' | 'REJECT' | 'CONDITIONAL';

interface BuildVerdict {
  readonly id: string;
  readonly timestamp: number;
  readonly source: VerdictSource;
  readonly verdict: VerdictOutcome;
  readonly payload: unknown;
  readonly hash: string;
}
```

### 3.2 Event Types

```typescript
type RuntimeEventType = 'VERDICT_OBSERVED';

interface RuntimeEvent {
  readonly id: string;
  readonly timestamp: number;
  readonly type: RuntimeEventType;
  readonly verdict: BuildVerdict;
  readonly metadata: RuntimeEventMetadata;
}

interface RuntimeEventMetadata {
  readonly observedAt: number;
  readonly hash: string;
}
```

### 3.3 Classification Types

```typescript
type Classification = 'ACCEPT' | 'ALERT' | 'BLOCK';
type DecisionOutcome = 'ACCEPTED' | 'ALERTED' | 'BLOCKED';

interface ClassificationResult {
  readonly event: RuntimeEvent;
  readonly classification: Classification;
  readonly score: number;           // [0, 1]
  readonly matchedRules: readonly string[];
  readonly reasoning: string;
  readonly timestamp: number;
}

interface ClassificationRule {
  readonly id: string;
  readonly priority: number;
  readonly condition: (event: RuntimeEvent) => boolean;
  readonly action: Classification;
  readonly weight: number;
  readonly description?: string;
}
```

### 3.4 Queue Types

```typescript
interface QueueEntry {
  readonly id: string;
  readonly event: RuntimeEvent;
  readonly priority: number;
  readonly enqueuedAt: number;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED';
}
```

### 3.5 Incident Types

```typescript
interface IncidentEntry {
  readonly id: string;
  readonly event: RuntimeEvent;
  readonly reason: string;
  readonly loggedAt: number;
  readonly hash: string;
}

interface IncidentFilter {
  readonly since?: number;
  readonly until?: number;
  readonly sourceType?: string;
}
```

### 3.6 Trace Types

```typescript
interface Decision {
  readonly id: string;
  readonly event: RuntimeEvent;
  readonly classification: ClassificationResult;
  readonly outcome: DecisionOutcome;
  readonly timestamp: number;
}

interface TraceEntry {
  readonly id: string;
  readonly decision: Decision;
  readonly tracedAt: number;
  readonly hash: string;
  readonly previousHash: string | null;
  readonly metadata: Record<string, unknown>;
}
```

### 3.7 Review Types

```typescript
interface ReviewDecision {
  readonly id: string;
  readonly entryId: string;
  readonly action: 'APPROVE' | 'REJECT' | 'DEFER';
  readonly reviewerId: string;
  readonly comment?: string;
  readonly timestamp: number;
  readonly hash: string;
}
```

## 4. Invariants

### 4.1 SENTINEL Invariants

| ID | Description | Enforcement |
|----|-------------|-------------|
| INV-SENTINEL-01 | Read-only (never modifies verdicts) | Freeze objects, copy on observe |
| INV-SENTINEL-02 | Timestamp precision (±1ms) | Use injected clock |
| INV-SENTINEL-03 | Hash preservation (original → event) | Copy hash field unchanged |
| INV-SENTINEL-04 | Performance <10ms per verdict | Minimal operations in hot path |

### 4.2 CLASSIFIER Invariants

| ID | Description | Enforcement |
|----|-------------|-------------|
| INV-CLASSIFIER-01 | Determinism (same event → same result) | Pure function, no side effects |
| INV-CLASSIFIER-02 | Rules ordered by priority (desc) | Sort on add |
| INV-CLASSIFIER-03 | Score normalized [0, 1] | Clamp in normalizeScore |
| INV-CLASSIFIER-04 | Performance <50ms per event | Early exit, efficient matching |
| INV-CLASSIFIER-05 | No event left unclassified | Default classification fallback |

### 4.3 QUEUE Invariants

| ID | Description | Enforcement |
|----|-------------|-------------|
| INV-QUEUE-01 | Order by priority (dequeue = max) | Binary search insert, maintain sorted |
| INV-QUEUE-02 | FIFO at equal priority | Track insertion order |
| INV-QUEUE-03 | No event loss | Verify count, map consistency |
| INV-QUEUE-04 | Thread-safe | Single-threaded JS assumption |

### 4.4 INCIDENT Invariants

| ID | Description | Enforcement |
|----|-------------|-------------|
| INV-INCIDENT-01 | Append-only (never modify) | Freeze entries, no update API |
| INV-INCIDENT-02 | Hash verifiable | Compute on save, verify on load |
| INV-INCIDENT-03 | Strict chronology | Enforce increasing timestamps |

### 4.5 TRACE Invariants

| ID | Description | Enforcement |
|----|-------------|-------------|
| INV-TRACE-01 | All decisions traced | No skipping, always record |
| INV-TRACE-02 | Hash chained (merkle-style) | Include previousHash in hash input |
| INV-TRACE-03 | Export reproducible | Sort by timestamp, stable JSON |

### 4.6 REVIEW Invariants

| ID | Description | Enforcement |
|----|-------------|-------------|
| INV-REVIEW-01 | Decision = hash signed | Compute hash on every decision |
| INV-REVIEW-02 | History complete | Track all decisions by entry |
| INV-REVIEW-03 | No silent review | Update queue status on every action |

## 5. API Reference

### 5.1 SENTINEL

```typescript
interface Sentinel {
  observeVerdict(verdict: BuildVerdict): RuntimeEvent;
  getSnapshot(): RuntimeSnapshot;
  getStats(): SentinelStats;
  reset(): void;
}

function createSentinel(options?: SentinelOptions): Sentinel;
```

### 5.2 CLASSIFIER

```typescript
interface Classifier {
  classify(event: RuntimeEvent): ClassificationResult;
  addRule(rule: ClassificationRule): void;
  removeRule(ruleId: string): boolean;
  getRules(): readonly ClassificationRule[];
  clearRules(): void;
}

function createClassifier(options?: ClassifierOptions): Classifier;
function createDefaultRules(): ClassificationRule[];
```

### 5.3 ESCALATION_QUEUE

```typescript
interface EscalationQueue {
  enqueue(event: RuntimeEvent, priority: number): QueueEntry;
  dequeue(): QueueEntry | null;
  peek(): QueueEntry | null;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
  getAll(): readonly QueueEntry[];
  getById(id: string): QueueEntry | null;
  updateStatus(id: string, status: QueueEntry['status']): boolean;
}

function createEscalationQueue(options?: EscalationQueueOptions): EscalationQueue;
```

### 5.4 INCIDENT_LOG

```typescript
interface IncidentLog {
  logIncident(event: RuntimeEvent, reason: string): IncidentEntry;
  getIncident(id: string): IncidentEntry | null;
  getIncidents(filter?: IncidentFilter): readonly IncidentEntry[];
  count(filter?: IncidentFilter): number;
  getAll(): readonly IncidentEntry[];
  verifyIntegrity(): boolean;
}

function createIncidentLog(options?: IncidentLogOptions): IncidentLog;
```

### 5.5 DECISION_TRACE

```typescript
interface DecisionTrace {
  trace(decision: Decision, metadata?: Record<string, unknown>): TraceEntry;
  getTrace(id: string): TraceEntry | null;
  getTraces(filter?: TraceFilter): readonly TraceEntry[];
  exportTraces(format: 'json' | 'csv'): string;
  getAll(): readonly TraceEntry[];
  verifyChain(): boolean;
  size(): number;
}

function createDecisionTrace(options?: DecisionTraceOptions): DecisionTrace;
```

### 5.6 REVIEW_INTERFACE

```typescript
interface ReviewInterface {
  approve(entryId: string, reviewerId: string, comment?: string): ReviewDecision;
  reject(entryId: string, reviewerId: string, comment?: string): ReviewDecision;
  defer(entryId: string, reviewerId: string, reason: string): ReviewDecision;
  getPendingReviews(): readonly QueueEntry[];
  getReviewHistory(entryId: string): readonly ReviewDecision[];
  getAllDecisions(): readonly ReviewDecision[];
  verifyDecision(decision: ReviewDecision): boolean;
}

function createReviewInterface(options: ReviewInterfaceOptions): ReviewInterface;
```

## 6. Performance Requirements

| Metric | Requirement |
|--------|-------------|
| SENTINEL observation | <10ms |
| CLASSIFIER classification | <50ms |
| Overall throughput | >1000 events/sec |
| Memory overhead | <100MB for 10k events |

## 7. Test Requirements

| Module | Minimum Tests |
|--------|---------------|
| SENTINEL | 150 |
| CLASSIFIER | 200 |
| QUEUE | 100 |
| INCIDENT | 50 |
| TRACE | 100 |
| REVIEW | 80 |
| Integration | 20 |
| **Total** | **700** |

## 8. Validation Criteria

- [ ] All 14 invariants have explicit tests
- [ ] Performance benchmarks pass
- [ ] Hash chain verification succeeds
- [ ] Export is deterministic
- [ ] No TODO/FIXME/any/@ts-ignore
- [ ] Coverage ≥80%
- [ ] TypeScript strict mode passes
