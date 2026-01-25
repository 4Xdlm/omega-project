# OMEGA Phase A.2 — API Surface

## Package: @omega/truth-gate

### Main Exports (src/index.ts)

```typescript
// Gate
export { TruthGate, createTruthGate } from './gate';
export type { 
  TruthGateConfig, 
  GateVerdict, 
  ValidatorResult,
  ValidationContext,
  PolicyPack,
  VerdictType,
  ValidatorId,
  PolicyId,
  StoreSnapshotRef
} from './gate';

// Validators
export {
  BaseValidator,
  VCanonSchemaValidator,
  VHashChainValidator,
  VRailSeparationValidator,
  VEmotionSSOTValidator,
  VNoMagicNumbersValidator,
  VPolicyLockValidator,
  VNarrativeDriftToxicityValidator,
  ALL_VALIDATOR_IDS,
  createAllValidators,
  createValidatorById
} from './validators';
export type { Validator } from './validators';

// Ledger
export { VerdictLedger, createVerdictLedger } from './ledger';
export type { LedgerEntry, LedgerSnapshot } from './ledger';

// Policy
export { PolicyManager, createPolicyManager } from './policy';
export type { PolicyConfig, PolicyRules } from './policy';

// Drift/Toxicity
export { DriftDetector, ToxicityDetector, NarrativeAnalyzer } from './drift';
export type { DriftResult, ToxicityResult, NarrativeAnalysis } from './drift';
```

### TruthGate API

```typescript
class TruthGate {
  constructor(config: TruthGateConfig);
  
  // Validator management
  registerValidator(validator: Validator): void;
  unregisterValidator(validator_id: ValidatorId): boolean;
  getValidator(validator_id: ValidatorId): Validator | undefined;
  getRegisteredValidators(): readonly Validator[];
  getValidatorCount(): number;
  hasValidator(validator_id: ValidatorId): boolean;
  
  // Policy management
  setPolicy(policy: PolicyPack): void;
  getPolicy(): PolicyPack;
  
  // Validation
  validate(tx: CanonTx, storeSnapshot?: StoreSnapshotRef, previousTx?: CanonTx): GateVerdict;
  validateDryRun(tx: CanonTx, storeSnapshot?: StoreSnapshotRef, previousTx?: CanonTx): GateVerdict;
  wouldAllow(tx: CanonTx, storeSnapshot?: StoreSnapshotRef, previousTx?: CanonTx): boolean;
  
  // Ledger access
  getLedger(): VerdictLedger;
  getVerdictHistory(tx_id: string): readonly GateVerdict[];
  verifyLedgerIntegrity(): boolean;
  getLedgerStats(): { total_verdicts, allow_count, deny_count, defer_count };
}
```

### VerdictLedger API

```typescript
class VerdictLedger {
  append(verdict: GateVerdict): LedgerEntry;
  getEntry(index: number): LedgerEntry | undefined;
  getAllEntries(): readonly LedgerEntry[];
  getAllVerdicts(): readonly GateVerdict[];
  getVerdictsByTxId(tx_id: string): readonly GateVerdict[];
  getVerdictsByType(type: VerdictType): readonly GateVerdict[];
  getLatestVerdict(tx_id: string): GateVerdict | undefined;
  hasVerdict(tx_id: string): boolean;
  countByType(type: VerdictType): number;
  getEntryCount(): number;
  getHeadHash(): string;
  getSnapshot(): LedgerSnapshot;
  verifyIntegrity(): boolean;
  verifyReplay(): boolean;
  getEntriesInRange(start: number, end: number): readonly LedgerEntry[];
  getEntryByVerdictId(verdict_id: string): LedgerEntry | undefined;
}
```

### Validator Interface

```typescript
interface Validator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly description: string;
  validate(tx: CanonTx, context: ValidationContext): ValidatorResult;
}
```

### Key Types

```typescript
type ValidatorId = 
  | 'V-CANON-SCHEMA'
  | 'V-HASH-CHAIN'
  | 'V-RAIL-SEPARATION'
  | 'V-EMOTION-SSOT'
  | 'V-NO-MAGIC-NUMBERS'
  | 'V-POLICY-LOCK'
  | 'V-NARRATIVE-DRIFT-TOXICITY';

type VerdictType = 'ALLOW' | 'DENY' | 'DEFER';

interface GateVerdict {
  verdict_id: string;
  tx_id: string;
  final_verdict: VerdictType;
  validator_results: readonly ValidatorResult[];
  policy_id: PolicyId;
  timestamp: number;
  evidence_summary: readonly Evidence[];
}

interface ValidatorResult {
  validator_id: ValidatorId;
  verdict: VerdictType;
  evidence: readonly Evidence[];
  execution_time_ms: number;
}
```

## Invariants

- INV-TG-001: All transactions must pass through TruthGate
- INV-TG-002: All verdicts recorded in append-only ledger
- INV-TG-003: Ledger hash chain integrity
- INV-TG-004: No PROMOTE operations on interpretation rail
- INV-TG-005: Protected entities (system:, policy:, config:) blocked
- INV-TG-006: EmotionV2 SSOT enforced (no conflicting emotion updates)
- INV-TG-007: Toxic content results in DENY verdict
