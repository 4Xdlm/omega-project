# ARCH_04_EXCHANGE_CONTRACTS.md

## Key Module Exchange Contracts

### Oracle (src/oracle/muse/)
- **Input**: Text segments, scoring parameters, PRNG seed
- **Output**: Emotional DNA scores, strategy results, physics computations
- **Contract**: Deterministic given same seed + input

### Decision Engine (packages/decision-engine/)
- **Input**: Events to classify, sentinel rules, queue configuration
- **Output**: Classified incidents, escalation decisions, decision traces
- **Contract**: Stateless classification, priority-based queue, review interface

### Sentinel (gateway/sentinel/)
- **Input**: Pipeline events, rule definitions
- **Output**: Pass/Fail verdicts, trace logs
- **Contract**: FROZEN module â€” read-only inspection

### Drift Detector (src/drift/)
- **Input**: Two DNA snapshots
- **Output**: Drift metrics, detected changes
- **Contract**: Pure comparison, no side effects

### Governance (src/governance/)
- **Input**: Policy definitions, runtime state
- **Output**: Override decisions, schema validation, event emissions
- **Contract**: Observable via event emitter

### Delivery Engine (src/delivery/)
- **Input**: Pipeline output, manifest config
- **Output**: Proof packs, rendered reports, normalized data, hashes
- **Contract**: Deterministic hash chain
