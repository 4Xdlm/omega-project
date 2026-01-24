# OMEGA INTERFACE CONTRACTS
# Generated: 2026-01-24
# By: Claude EXECUTOR OMEGA

---

## Contract 1: Emotion Analysis

### Input

```typescript
interface AnalyzeInput {
  text: string;              // UTF-8, non-empty
  context?: NarrativeContext;
}
```

### Output

```typescript
interface EmotionAnalysisResult {
  state: EmotionState14D;    // All values in [0, 1]
  confidence: number;        // in [0, 1]
  dominantEmotion: Emotion14;
  valence: number;           // in [-1, 1]
  arousal: number;           // in [0, 1]
}
```

### Invariants

| ID | Rule | Verification |
|----|------|--------------|
| INV-EMO-01 | All state values in [0, 1] | Type guard + runtime check |
| INV-EMO-02 | Same input + same seed = same output | Determinism test |
| INV-EMO-03 | dominantEmotion = argmax(state) | Unit test |

---

## Contract 2: Generation (Provider)

### Input

```typescript
interface GenerationRequest {
  prompt: string;            // Non-empty
  systemPrompt?: string;
  maxTokens: number;         // Positive integer
  temperature: number;       // in [0, 2]
}
```

### Output

```typescript
interface GenerationResponse {
  text: string;
  finishReason: 'stop' | 'length' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}
```

### Invariants

| ID | Rule | Verification |
|----|------|--------------|
| INV-GEN-01 | Response always has text (may be empty on error) | Unit test |
| INV-GEN-02 | finishReason always set | Type enforcement |
| INV-GEN-03 | MockProvider is deterministic with seed | Determinism test |

---

## Contract 3: J1 Emotion Binding Judge

### Input

```typescript
interface J1Input {
  text: string;              // Text to judge
  targetEmotion: EmotionState14D;
  config: J1Config;          // Includes threshold tau
}
```

### Output

```typescript
interface J1Result {
  verdict: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
  overallScore: number;      // in [0, 1]
  details: SegmentAnalysis[];
}
```

### Invariants

| ID | Rule | Verification |
|----|------|--------------|
| INV-J1-01 | verdict = 'PASS' iff distance(target, extracted) <= tau | Unit test |
| INV-J1-02 | Deterministic given same input | Determinism test |
| INV-J1-03 | overallScore in [0, 1] | Type guard |

---

## Contract 4: OMEGA Type Conversion

### Input

```typescript
interface OmegaEmotionStateV2 {
  emotions: OmegaEmotionSignal[];
  weights: OmegaEmotionWeight;
  timestamp: number;
  // ... additional fields
}
```

### Output (omegaToGenesis)

```typescript
interface OmegaToGenesisResult {
  success: boolean;
  state: EmotionState14D;
  warnings: string[];
  metadata: {
    sourceVersion: string;
    mappingStrategy: string;
  };
}
```

### Invariants

| ID | Rule | Verification |
|----|------|--------------|
| INV-CONV-01 | Lossless: F_inv(F(omega)) = omega | Round-trip test |
| INV-CONV-02 | All mapped values in [0, 1] | Type guard |

---

## Contract 5: PRISM Analysis

### Input

```typescript
interface PrismInput {
  text: string;
  referenceState?: EmotionState14D;
}
```

### Output

```typescript
interface PrismResult {
  scores: EmotionState14D;
  dominant: Emotion14;
  confidence: number;
}
```

### Invariants

| ID | Rule | Verification |
|----|------|--------------|
| INV-PRISM-01 | All scores in [0, 1] | Type guard |
| INV-PRISM-02 | Deterministic | Determinism test |

---

## Contract 6: Drafter Orchestration

### Input

```typescript
interface DrafterConfig {
  provider: DrafterProvider;
  emotionBridge: EmotionBridge;
  j1Judge: J1EmotionBindingJudge;
  maxRetries?: number;
}
```

### Output

```typescript
interface DrafterOutput {
  text: string;
  emotionState: EmotionState14D;
  j1Result: J1Result;
  iterations: number;
  traceId: string;
}
```

### Invariants

| ID | Rule | Verification |
|----|------|--------------|
| INV-DRAFT-01 | traceId = SHA-256(prompt) | Hash verification |
| INV-DRAFT-02 | iterations <= maxRetries + 1 | Bounded loop |

---

## Hash Policy

| Contract | Hashed? | Purpose |
|----------|---------|---------|
| Emotion Analysis | NO | Internal processing |
| Generation | NO | External API call |
| J1 Judge | NO | Scoring |
| OMEGA Converter | NO | Type mapping |
| PRISM | NO | Analysis |
| Drafter | YES (traceId) | Traceability anchor |

---

## Cross-Module Dependencies

```
EmotionBridge ──────► J1_JUDGE
      │                  │
      ▼                  ▼
   PRISM             DRAFTER
      │                  │
      └──────────────────┘
              │
              ▼
         PROVIDERS
```

---

**END OF INTERFACE CONTRACTS**
