# OMEGA Layer Descriptions

## Generated
- Date: 2026-01-17
- Auditor: Claude Code (Prompt 11 Ultimate)

---

## Layer 1: Core (Foundation)

**Package:** `orchestrator-core`

**Purpose:** Provides the deterministic execution foundation for the entire system.

**Responsibilities:**
- Plan definition and execution
- State context management
- Error propagation patterns
- Execution guarantees

**Key Types:**
- `Plan` - Execution plan definition
- `ExecutionContext` - Runtime context
- `PlanResult` - Execution outcome

**Dependencies:** None (foundation layer)

**LOC:** 4,990

---

## Layer 2: Types (Shared Definitions)

**Packages:** `types`, `genome-types`, `oracle-types`

**Purpose:** Define shared type contracts across the system.

**Responsibilities:**
- Type definitions for all modules
- Interface contracts
- Enum definitions
- Utility types

**Key Types:**
- `NarrativeGenome` - Core fingerprint structure
- `ValidationResult` - Validation outcomes
- `SimilarityResult` - Comparison results
- `OracleConfig` - AI configuration

**Dependencies:** None

**Combined LOC:** ~3,000

---

## Layer 3: Validation (Input Gate)

**Packages:** `mycelium` (FROZEN), `mycelium-bio`

**Purpose:** All input enters through validation layer.

**Responsibilities:**
- UTF-8 encoding validation
- Size limit enforcement
- Binary content detection
- Markup/data format rejection
- Control character filtering
- Text normalization

**Key Functions:**
- `validate(input: DNAInput): ValidationResult`
- `validateUTF8(text: string): boolean`
- `validateSize(text: string, options): boolean`
- `normalizeLineEndings(text: string): string`

**Dependencies:** types

**Status:** mycelium is FROZEN (v1.0.0)

**LOC:** mycelium: 2,591 | mycelium-bio: 1,243

---

## Layer 4: Analysis (Core Algorithms)

**Packages:** `genome` (FROZEN), `search`

**Purpose:** Core analytical algorithms for text processing.

**Responsibilities:**
- Emotional fingerprint extraction
- Style analysis
- Structure analysis
- Text search and ranking
- Similarity computation

**Key Functions:**
- `analyze(input, options): NarrativeGenome`
- `compare(genomeA, genomeB): SimilarityResult`
- `computeFingerprint(genome): GenomeFingerprint`
- `searchText(query, corpus): SearchResult[]`

**Dependencies:** types, validation (mycelium)

**Status:** genome is FROZEN (v1.2.0)

**LOC:** genome: 3,646 | search: 9,142

---

## Layer 5: AI (Intelligence)

**Packages:** `oracle`, `oracle-types`

**Purpose:** AI integration for decision support.

**Responsibilities:**
- Multi-backend AI support (OpenAI, Anthropic, local)
- Streaming responses
- Caching
- Metrics collection

**Key Classes:**
- `Oracle` - Main AI interface
- `StreamingOracle` - Real-time responses
- `OracleCache` - Response caching
- `OracleMetrics` - Usage tracking

**Dependencies:** types, orchestrator-core

**LOC:** oracle: 5,227

---

## Layer 6: Orchestration (Test & Proof)

**Packages:** `headless-runner`, `gold-suite`, `proof-pack`

**Purpose:** Test execution and evidence generation.

**Responsibilities:**
- Headless test execution
- Test suite management
- Proof bundle creation
- Hash verification

**Key Functions:**
- `execute(plan): ExecutionResult`
- `runSuite(packages): SuiteResult`
- `bundle(results): ProofBundle`
- `verify(bundle): VerificationResult`

**Dependencies:** orchestrator-core, genome, mycelium

**LOC:** headless-runner: 1,892 | gold-suite: 1,434 | proof-pack: 2,156

---

## Layer 7: CLI (Command Line)

**Packages:** `gold-cli`, `omega-templates`

**Purpose:** Command-line interface for certification.

**Responsibilities:**
- CLI argument parsing
- Command execution
- Output formatting
- Template management

**Key Commands:**
- `gold certify [packages]` - Run certification
- `gold verify [bundle]` - Verify proof bundle
- `gold report` - Generate reports

**Dependencies:** gold-suite, proof-pack, integration-nexus-dep

**LOC:** gold-cli: 3,245

---

## Layer 8: UI (User Interface)

**Package:** `omega-ui` (in apps/)

**Purpose:** Desktop application for end users.

**Responsibilities:**
- Text input interface
- Visualization of genomes
- Comparison views
- Settings management

**Technology:**
- Tauri (Rust backend)
- React (TypeScript frontend)
- Zustand (state management)

**Dependencies:** gateway, genome, mycelium, oracle

**LOC:** ~8,000

---

## Layer Dependency Matrix

```
         | Core | Types | Valid | Analy | AI  | Orch | CLI | UI  |
---------|------|-------|-------|-------|-----|------|-----|-----|
Core     |  -   |       |       |       |     |      |     |     |
Types    |      |   -   |       |       |     |      |     |     |
Valid    |      |   X   |   -   |       |     |      |     |     |
Analysis |      |   X   |   X   |   -   |     |      |     |     |
AI       |  X   |   X   |       |       |  -  |      |     |     |
Orch     |  X   |       |   X   |   X   |     |   -  |     |     |
CLI      |      |       |       |       |     |   X  |  -  |     |
UI       |      |       |   X   |   X   |  X  |      |     |  -  |
```

X = depends on

---

*OMEGA BIBLE v1.0 - Generated 2026-01-17*
