# OMEGA Data Flows

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Primary Flow: Text Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                        │
│                                                                             │
│   { text: string, metadata?: object, seed?: number }                        │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VALIDATION GATE (@omega/mycelium)                       │
│                                                                             │
│   validate(input: DNAInput) → ValidationResult                              │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Hard Validations (REJECT on failure):                                 │ │
│   │   • validateUTF8()    - Valid UTF-8 encoding                          │ │
│   │   • validateSize()    - Within size limits (MIN_LENGTH - MAX_LENGTH)  │ │
│   │   • validateBinary()  - No binary content                             │ │
│   │   • validateNotEmpty() - Non-empty after trim                         │ │
│   │   • validateControlChars() - No dangerous control characters          │ │
│   │   • validateNotHTML() - Not HTML markup                               │ │
│   │   • validateNotJSON() - Not JSON data                                 │ │
│   │   • validateNotXML()  - Not XML markup                                │ │
│   │   • validateSeed()    - Valid seed if provided                        │ │
│   │   • validateMode()    - Valid segmentation mode                       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Soft Normalizations (TRANSFORM):                                      │ │
│   │   • normalizeLineEndings() - CRLF/CR → LF                             │ │
│   │   • Whitespace normalization                                          │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌───────────────────────┐                   ┌───────────────────────────┐
│    REJECTED           │                   │      ACCEPTED             │
│                       │                   │                           │
│  RejectResult {       │                   │  AcceptResult {           │
│    accepted: false,   │                   │    accepted: true,        │
│    rejection: {       │                   │    processed: {           │
│      code: string,    │                   │      text: string,        │
│      message: string, │                   │      seed: number,        │
│      category: string │                   │      mode: SegmentMode,   │
│    }                  │                   │      metadata: {...}      │
│  }                    │                   │    }                      │
│                       │                   │  }                        │
└───────────────────────┘                   └─────────────┬─────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FINGERPRINTING (@omega/genome)                            │
│                                                                             │
│   processWithMycelium(input) → GenomeMyceliumResult                         │
│   analyze(input, options?) → NarrativeGenome                                │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Extraction Steps:                                                     │ │
│   │   1. Emotion14 Distribution - 14 base emotions                        │ │
│   │   2. EmotionAxis - Emotional characteristics                          │ │
│   │   3. StyleAxis - Writing style metrics                                │ │
│   │   4. StructureAxis - Structural patterns                              │ │
│   │   5. TempoAxis - Temporal/rhythm patterns                             │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   Output: NarrativeGenome {                                                 │
│     emotion14: { joy, sadness, anger, fear, ... },                         │
│     emotionAxis: { intensity, volatility, ... },                           │
│     styleAxis: { formality, complexity, ... },                             │
│     structureAxis: { paragraphDensity, ... },                              │
│     tempoAxis: { rhythm, pacing, ... },                                     │
│     metadata: ExtractionMetadata                                            │
│   }                                                                         │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   FINGERPRINT COMPUTATION (@omega/genome)                   │
│                                                                             │
│   computeFingerprint(genome) → GenomeFingerprint                            │
│                                                                             │
│   Steps:                                                                    │
│   1. quantizeFloat() - Normalize floats to cross-platform precision         │
│   2. stripMetadata() - Remove non-content metadata                          │
│   3. canonicalSerialize() - Deterministic JSON serialization                │
│   4. SHA-256 hash of canonical bytes                                        │
│                                                                             │
│   Output: GenomeFingerprint (64-char hex string)                            │
│                                                                             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   COMPARISON (@omega/genome)                                │
│                                                                             │
│   compare(genomeA, genomeB) → SimilarityResult                              │
│   compareDetailed(genomeA, genomeB) → DetailedComparison                    │
│                                                                             │
│   Comparison Methods:                                                       │
│   • cosineSimilarity() - Vector similarity                                  │
│   • flattenEmotionAxis() - Flatten for comparison                           │
│   • flattenStyleAxis()                                                      │
│   • flattenStructureAxis()                                                  │
│   • flattenTempoAxis()                                                      │
│                                                                             │
│   Output: SimilarityResult {                                                │
│     score: number (0-1),                                                    │
│     verdict: SimilarityVerdict                                              │
│   }                                                                         │
│                                                                             │
│   Verdict Thresholds:                                                       │
│   • IDENTICAL: 0.99+                                                        │
│   • VERY_SIMILAR: 0.90+                                                     │
│   • SIMILAR: 0.75+                                                          │
│   • SOMEWHAT_SIMILAR: 0.50+                                                 │
│   • DIFFERENT: <0.50                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Secondary Flow: Certification Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CERTIFICATION REQUEST                                   │
│                                                                             │
│   { packages: string[], options: CertificationOptions }                     │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                @omega/gold-cli: executeCli()                                │
│                                                                             │
│   1. Parse CLI arguments                                                    │
│   2. Load package list (OMEGA_PACKAGES)                                     │
│   3. Initialize runners                                                     │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                @omega/gold-suite: runSuite()                                │
│                                                                             │
│   For each package:                                                         │
│   1. Run tests via headless-runner                                          │
│   2. Collect results                                                        │
│   3. Aggregate metrics                                                      │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                @omega/headless-runner: execute()                            │
│                                                                             │
│   1. Load plan                                                              │
│   2. Execute steps deterministically                                        │
│   3. Capture output                                                         │
│   4. Return results                                                         │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                @omega/proof-pack: bundle()                                  │
│                                                                             │
│   1. Collect all test results                                               │
│   2. Generate hashes                                                        │
│   3. Create evidence bundle                                                 │
│   4. Serialize to file                                                      │
│                                                                             │
│   Output: ProofBundle {                                                     │
│     timestamp: ISO string,                                                  │
│     packages: PackageResult[],                                              │
│     hashes: { [file]: sha256 },                                             │
│     signature: string                                                       │
│   }                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Transformations

| Stage | Input Type | Output Type | Transform |
|-------|------------|-------------|-----------|
| Validation | DNAInput | ValidationResult | Sanitize + Validate |
| Analysis | AcceptResult | NarrativeGenome | Extract features |
| Fingerprinting | NarrativeGenome | GenomeFingerprint | Hash |
| Comparison | [NarrativeGenome, NarrativeGenome] | SimilarityResult | Vector math |
| Certification | PackageList | ProofBundle | Test + Bundle |

---

## Immutability Guarantees

All data transformations are **immutable**:
- Input objects are not modified
- New objects are created at each stage
- Original data preserved for audit

---

*END DATAFLOW.md*
