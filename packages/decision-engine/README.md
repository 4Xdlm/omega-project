# @omega/decision-engine

**NASA-Grade L4 Decision Engine** for the OMEGA project.

## Overview

The Decision Engine provides a complete decision-making pipeline for processing build verdicts with full audit trail and human-in-the-loop escalation.

## Architecture

```
VERDICT → SENTINEL → CLASSIFIER → ACCEPT/ALERT/BLOCK
                          ↓
                   ┌──────┴──────┐
                   ↓      ↓      ↓
               ACCEPT  ALERT  BLOCK
                   ↓      ↓      ↓
                   │   QUEUE  INCIDENT
                   │      ↓      │
                   │   REVIEW    │
                   │      ↓      │
                   └──→ TRACE ←──┘
```

## Modules

### SENTINEL
Observes build verdicts in read-only mode.

```typescript
import { createSentinel } from '@omega/decision-engine';

const sentinel = createSentinel();
const event = sentinel.observeVerdict(verdict);
```

### CLASSIFIER
Deterministically classifies events as ACCEPT/ALERT/BLOCK.

```typescript
import { createClassifier, createDefaultRules } from '@omega/decision-engine';

const classifier = createClassifier({ rules: createDefaultRules() });
const result = classifier.classify(event);
```

### ESCALATION_QUEUE
Priority queue for ALERT events requiring human review.

```typescript
import { createEscalationQueue, PRIORITY_LEVELS } from '@omega/decision-engine';

const queue = createEscalationQueue();
queue.enqueue(event, PRIORITY_LEVELS.HIGH);
```

### INCIDENT_LOG
Append-only journal for BLOCK events.

```typescript
import { createIncidentLog } from '@omega/decision-engine';

const log = createIncidentLog();
log.logIncident(event, 'Reason for blocking');
```

### DECISION_TRACE
Hash-chained audit trail for all decisions.

```typescript
import { createDecisionTrace } from '@omega/decision-engine';

const trace = createDecisionTrace();
trace.trace(decision);
```

### REVIEW_INTERFACE
Human review API for escalated events.

```typescript
import { createReviewInterface } from '@omega/decision-engine';

const review = createReviewInterface({ queue });
review.approve(entryId, 'reviewer-id', 'Approved after review');
```

## Invariants

| ID | Description |
|----|-------------|
| INV-SENTINEL-01 | Read-only (never modifies verdicts) |
| INV-SENTINEL-02 | Timestamp precision (±1ms) |
| INV-SENTINEL-03 | Hash preservation (original → event) |
| INV-SENTINEL-04 | Performance <10ms per verdict |
| INV-CLASSIFIER-01 | Determinism (same event → same result) |
| INV-CLASSIFIER-02 | Rules ordered by priority (desc) |
| INV-CLASSIFIER-03 | Score normalized [0, 1] |
| INV-CLASSIFIER-04 | Performance <50ms per event |
| INV-CLASSIFIER-05 | No event left unclassified |
| INV-QUEUE-01 | Order by priority (dequeue = max) |
| INV-QUEUE-02 | FIFO at equal priority |
| INV-QUEUE-03 | No event loss |
| INV-QUEUE-04 | Thread-safe |
| INV-INCIDENT-01 | Append-only (never modify) |
| INV-INCIDENT-02 | Hash verifiable |
| INV-INCIDENT-03 | Strict chronology |
| INV-TRACE-01 | All decisions traced |
| INV-TRACE-02 | Hash chained (merkle-style) |
| INV-TRACE-03 | Export reproducible |
| INV-REVIEW-01 | Decision = hash signed |
| INV-REVIEW-02 | History complete |
| INV-REVIEW-03 | No silent review |

## Performance

- SENTINEL: <10ms per verdict
- CLASSIFIER: <50ms per event
- Throughput: 1000+ events/sec

## Testing

```bash
npm test                    # Run tests
npm run test:coverage       # Run with coverage
npm run typecheck           # TypeScript check
```

## License

UNLICENSED - OMEGA Project Internal
