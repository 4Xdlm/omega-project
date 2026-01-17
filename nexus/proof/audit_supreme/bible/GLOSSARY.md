# OMEGA Glossary

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## A

### AcceptResult
A validation result indicating input passed all checks. Contains the processed/normalized text ready for analysis.

### Axiom
A foundational truth in the SENTINEL certification system that cannot be derived from other statements. Forms the basis for all theorems.

---

## C

### Canonical Serialization
The process of converting a NarrativeGenome to a deterministic JSON string. Ensures identical genomes produce identical hashes across platforms.

### Certification
The formal process of proving a module meets all requirements through falsification testing.

### Cosine Similarity
The vector comparison method used to measure similarity between two NarrativeGenome instances. Returns a value between 0 (different) and 1 (identical).

### Crystal / Crystallization
The process of "freezing" invariants and making them immutable once proven.

---

## D

### Determinism
The property that identical inputs always produce identical outputs. A core OMEGA requirement.

### DNA
The input validation and processing layer (part of mycelium). Named for its role in "genetic" analysis of text.

### DNAInput
The input type for validation: `{ text: string, metadata?: object, seed?: number }`.

---

## E

### Emotion14
The 14-dimensional emotional signature extracted from text. Includes: joy, sadness, anger, fear, surprise, disgust, trust, anticipation, love, hope, anxiety, confusion, curiosity, determination.

### EmotionAxis
Aggregate emotional characteristics: intensity, volatility, dominance, valence.

### Evidence Pack
The collection of artifacts proving a task was completed: test logs, hashes, certificates.

---

## F

### Falsification
The Popperian approach to testing where the goal is to disprove claims rather than confirm them. If a claim survives all falsification attempts, it is considered valid.

### Fingerprint
See GenomeFingerprint.

### FROZEN
A module status indicating no modifications are allowed. Changes require a new version and new phase.

---

## G

### Gateway
The external API surface for OMEGA. Provides type-safe access to core functionality.

### Genome
See NarrativeGenome.

### GenomeFingerprint
A 64-character SHA-256 hex string uniquely identifying a NarrativeGenome. Computed from canonical serialization.

### Gold Standard
The certification suite that runs all tests and produces proof bundles.

---

## H

### Headless Runner
The test execution engine that runs plans deterministically without UI.

---

## I

### Invariant
A property that must always hold true. OMEGA has 101 defined invariants across all modules.

### Integration-Nexus-Dep
The integration layer that connects OMEGA packages to the NEXUS save system.

---

## L

### Layer
One of the 8 architectural levels in OMEGA: core, types, validation, analysis, ai, orchestration, cli, ui.

---

## M

### Mycelium
The input validation gate. All user input must pass through mycelium before processing. Named for fungal networks that filter nutrients.

### Mycelium-Bio
The biological/advanced validation layer with additional content analysis.

---

## N

### NarrativeGenome
The complete fingerprint of a narrative text containing:
- emotion14: 14-dimensional emotional signature
- emotionAxis: aggregate emotional characteristics
- styleAxis: writing style metrics
- structureAxis: structural patterns
- tempoAxis: rhythm and pacing

### NCR (Non-Conformance Report)
A formal report documenting when a requirement or invariant cannot be met.

### NEXUS
The canonical save system for OMEGA. Stores session state, seals, and ledger entries.

---

## O

### OMEGA
**O**bservation **M**easurement **E**motional **G**enome **A**nalysis. The project name.

### Oracle
The AI decision engine. Supports multiple backends (OpenAI, Anthropic, local).

### Orchestrator-Core
The foundational package providing deterministic execution guarantees.

---

## P

### Phase
A unit of development in OMEGA. Each phase has specific goals, tests, and artifacts. 155 phases completed as of v3.155.0.

### Proof Bundle
A cryptographically signed package containing test results, hashes, and evidence.

### Proof-Pack
The package responsible for creating and verifying proof bundles.

---

## Q

### Quantization
The process of normalizing floating-point numbers to ensure cross-platform determinism (precision: 1e-6).

---

## R

### RejectResult
A validation result indicating input failed one or more checks. Contains rejection code, message, and category.

### Rejection Code
A string identifier for validation failures (e.g., "EMPTY_TEXT", "BINARY_DETECTED", "TOO_LONG").

---

## S

### Sanctuary
A module with maximum trust status that is FROZEN and cannot be modified. Genome and mycelium are sanctuary modules.

### SEALED
A module status indicating the module is complete and tested but may receive non-breaking updates.

### SENTINEL
The root certification system. SENTINEL SUPREME provides the axioms and theorems for all proofs.

### Similarity Verdict
The categorical result of genome comparison:
- IDENTICAL: score >= 0.99
- VERY_SIMILAR: score >= 0.90
- SIMILAR: score >= 0.75
- SOMEWHAT_SIMILAR: score >= 0.50
- DIFFERENT: score < 0.50

### StreamingOracle
The Oracle variant that returns AI responses as a stream rather than complete response.

### StructureAxis
Structural pattern metrics: paragraphDensity, sentenceVariation, dialogueRatio.

### StyleAxis
Writing style metrics: formality, complexity, verbosity, emotionality.

---

## T

### TempoAxis
Rhythm and pacing metrics: rhythm, pacing, tension, resolution.

### Theorem
A statement derived from axioms through formal proof in the SENTINEL system.

### Trust Boundary
A point where data crosses from untrusted to trusted zones. OMEGA has two: input validation (mycelium) and output serialization.

---

## U

### Untrusted Zone
Any data that has not passed through validation. User input, file contents, CLI arguments are untrusted until validated.

---

## V

### Validation Gate
The entry point where input is checked before processing. Implemented by mycelium.

### ValidationResult
The union type `AcceptResult | RejectResult` returned by validation.

---

## Z

### ZIP Archive
A timestamped archive created after each phase completion. Contains source, tests, evidence, and certificates.

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
