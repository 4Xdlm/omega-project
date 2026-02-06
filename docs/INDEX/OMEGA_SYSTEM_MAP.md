# OMEGA SYSTEM MAP — v1.0

**Réponse produite sous contrainte OMEGA — NASA-grade — aucune approximation tolérée.**

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                       ║
║   OMEGA SYSTEM MAP — DUAL TOPOLOGY                                                    ║
║   Structural (what exists) + Decisional (how truth flows)                              ║
║                                                                                       ║
║   HEAD:     76434668                                                                  ║
║   Status:   BUILD SEALED — GOVERNANCE SEALED                                          ║
║   Source:   Repository scan (not approximation)                                       ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## MAP A — STRUCTURAL TOPOLOGY

*What exists. Where it lives. How layers stack.*

```mermaid
graph TB
    subgraph L0["LEVEL 0 — CORE (Invariants)"]
        TYPES["types.ts<br/>Core type system"]
        INV["invariants.ts<br/>System invariants"]
        SHARED["src/shared/<br/>Deterministic RNG, utils"]
        SCHEMAS["packages/schemas/<br/>JSON Schemas"]
    end

    subgraph L1["LEVEL 1 — COMPREHENSION (Analysis)"]
        ORACLE["src/oracle/<br/>Emotion V2, Muse"]
        TEXT_ANA["src/text_analyzer/<br/>Text analysis adapter"]
        GENOME["packages/genome/<br/>Narrative genome"]
        EMOTION["packages/emotion-gate/<br/>Emotion processing"]
        MYCELIUM["packages/mycelium/<br/>Emotional DNA fingerprint"]
        MYCELIUM_BIO["packages/mycelium-bio/<br/>Biological DNA model"]
        BRIDGE["packages/omega-bridge-ta-mycelium/<br/>Analyzer↔Mycelium bridge"]
        SEGMENT["packages/omega-segment-engine/<br/>Text segmentation"]
        AGGREGATE["packages/omega-aggregate-dna/<br/>DNA aggregation"]
    end

    subgraph L2["LEVEL 2 — MEMORY (State)"]
        CANON["src/canon/<br/>Fact storage (append-only)"]
        CANON_K["packages/canon-kernel/<br/>Core canon logic"]
        MEMORY["src/memory/<br/>Memory management"]
        MEM_WR["src/memory-write-runtime/<br/>Write-time hooks"]
        CONTRACTS["packages/contracts-canon/<br/>Canon contracts"]
    end

    subgraph L3["LEVEL 3 — DECISION (Judgment)"]
        SENTINEL["src/sentinel/<br/>Decision engine + rules"]
        JUDGE["packages/sentinel-judge/<br/>Judgment pipeline"]
        TRUTH["packages/truth-gate/<br/>Validation gates"]
        DECISION["packages/decision-engine/<br/>Decision pipeline"]
    end

    subgraph L4["LEVEL 4 — CREATION (Generation)"]
        GENESIS["src/genesis/<br/>Genesis Forge engine"]
        SCRIBE["src/scribe/<br/>Writing engine"]
        DRAFTER["src/genesis/engines/<br/>Drafter"]
        DELIVERY["src/delivery/<br/>Output delivery"]
        RUNNER["src/runner/<br/>Pipeline runner"]
        ORCHESTRATOR["src/orchestrator/<br/>Flow orchestration"]
        REPLAY["src/replay/<br/>Replay system"]
    end

    subgraph L5["LEVEL 5 — OBSERVATION (Governance Shell)"]
        GOV_RT["GOVERNANCE/runtime/<br/>Event capture, logs"]
        GOV_DRIFT["GOVERNANCE/drift/<br/>8 detectors + pipeline"]
        GOV_REG["GOVERNANCE/regression/<br/>Non-regression pipeline"]
        GOV_MISUSE["GOVERNANCE/misuse/<br/>Abuse detection"]
        GOV_OVER["GOVERNANCE/override/<br/>Human override"]
        GOV_VER["GOVERNANCE/versioning/<br/>Version contracts"]
        GOV_INC["GOVERNANCE/incident/<br/>Incident + rollback"]
    end

    subgraph INFRA["INFRASTRUCTURE"]
        GATEWAY["gateway/<br/>CLI runner, facade, resilience"]
        TOOLS["tools/<br/>Blueprint, calibration, oracles"]
        NEXUS["nexus/<br/>Atlas, proof, standards, ledger"]
        OBSERV["packages/omega-observability/<br/>Metrics + tracing"]
        PROOF["packages/proof-pack/<br/>Proof generation"]
        SBOM["packages/sbom/<br/>Software BOM"]
        TRUST["packages/trust-version/<br/>Version trust"]
    end

    %% VERTICAL DEPENDENCIES
    L1 --> L0
    L2 --> L0
    L3 --> L1
    L3 --> L2
    L4 --> L3
    L4 --> L1

    %% GOVERNANCE reads L0-L4 outputs
    L5 -.->|"READ ONLY"| L4
    L5 -.->|"READ ONLY"| L3
    L5 -.->|"READ ONLY"| L0

    %% INFRA supports all
    INFRA -.-> L4
    INFRA -.-> L5

    classDef core fill:#1a1a2e,stroke:#e94560,color:#fff
    classDef comp fill:#16213e,stroke:#0f3460,color:#fff
    classDef mem fill:#0f3460,stroke:#533483,color:#fff
    classDef dec fill:#533483,stroke:#e94560,color:#fff
    classDef gen fill:#2d4059,stroke:#ff5722,color:#fff
    classDef gov fill:#1b1b2f,stroke:#00b4d8,color:#fff
    classDef infra fill:#2b2b2b,stroke:#666,color:#ccc

    class L0 core
    class L1 comp
    class L2 mem
    class L3 dec
    class L4 gen
    class L5 gov
    class INFRA infra
```

---

## MAP B — DECISIONAL TOPOLOGY

*How truth flows. From raw input to certified output to monitored execution.*

```mermaid
graph LR
    subgraph INPUT["📥 INPUT"]
        RAW["Raw Text<br/>or World Parameters"]
        INTENT["Author Intent<br/>+ Emotional DNA target"]
    end

    subgraph COMPREHEND["🔍 COMPREHENSION"]
        TEXT_A["Text Analyzer<br/>(segmentation, parsing)"]
        ORACLES["Oracles<br/>(emotion, logic, rhythm,<br/>archetype, theme, voice)"]
        GENOME_P["Genome<br/>(narrative structure)"]
        DNA["Mycelium<br/>(emotional DNA extract)"]
    end

    subgraph JUDGE["⚖️ JUDGMENT"]
        SENTINEL_J["Sentinel<br/>(rule engine)"]
        TRUTH_G["Truth Gate<br/>(pass/fail validation)"]
        DECISION_E["Decision Engine<br/>(accept / reject / appeal)"]
    end

    subgraph MEMORY_S["🧠 MEMORY"]
        CANON_S["Canon<br/>(append-only facts)"]
        MEM_TIER["Memory Tiering<br/>(hot / cold / frozen)"]
    end

    subgraph CREATE["✍️ CREATION"]
        FORGE["Genesis Forge<br/>(deterministic generation)"]
        DRAFT["Drafter<br/>(prompt → text)"]
        SCRIBE_S["Scribe<br/>(style application)"]
    end

    subgraph OUTPUT["📤 OUTPUT"]
        DELIV["Delivery<br/>(certified output)"]
        HASH["SHA-256<br/>(hash proof)"]
        AUDIT["Audit Pack<br/>(proof bundle)"]
    end

    subgraph GOVERN["👁️ GOVERNANCE (read-only observation)"]
        RT["Runtime Events<br/>(append-only log)"]
        DRIFT_D["Drift Detection<br/>(8 detectors)"]
        REG["Non-Regression<br/>(snapshot comparison)"]
        MISUSE_D["Misuse Detection<br/>(abuse patterns)"]
        OVER["Human Override<br/>(bounded, traced)"]
        VER["Versioning<br/>(compat contracts)"]
        INC["Incident<br/>(postmortem + rollback)"]
    end

    %% TRUTH FLOW (left to right)
    RAW --> TEXT_A
    INTENT --> ORACLES
    TEXT_A --> ORACLES
    TEXT_A --> GENOME_P
    TEXT_A --> DNA
    ORACLES --> SENTINEL_J
    GENOME_P --> SENTINEL_J
    DNA --> SENTINEL_J
    SENTINEL_J --> TRUTH_G
    TRUTH_G -->|"PASS"| DECISION_E
    TRUTH_G -->|"FAIL"| REJECT["❌ REJECTED"]
    DECISION_E -->|"ACCEPTED"| CANON_S
    DECISION_E -->|"ACCEPTED"| FORGE
    CANON_S --> MEM_TIER
    FORGE --> DRAFT
    DRAFT --> SCRIBE_S
    SCRIBE_S --> DELIV
    DELIV --> HASH
    DELIV --> AUDIT

    %% GOVERNANCE OBSERVATION (dotted = read-only)
    DELIV -.-> RT
    FORGE -.-> RT
    DECISION_E -.-> RT
    RT -.-> DRIFT_D
    RT -.-> REG
    RT -.-> MISUSE_D
    DRIFT_D -.->|"ALERT"| OVER
    MISUSE_D -.->|"ALERT"| OVER
    REG -.->|"REGRESSION"| INC
    OVER -.->|"DECISION"| VER
    INC -.->|"ROLLBACK"| VER

    classDef input fill:#1b5e20,stroke:#4caf50,color:#fff
    classDef comp fill:#0d47a1,stroke:#2196f3,color:#fff
    classDef judge fill:#4a148c,stroke:#9c27b0,color:#fff
    classDef mem fill:#e65100,stroke:#ff9800,color:#fff
    classDef create fill:#b71c1c,stroke:#f44336,color:#fff
    classDef output fill:#004d40,stroke:#009688,color:#fff
    classDef gov fill:#263238,stroke:#607d8b,color:#fff
    classDef fail fill:#b71c1c,stroke:#f44336,color:#fff

    class INPUT input
    class COMPREHEND comp
    class JUDGE judge
    class MEMORY_S mem
    class CREATE create
    class OUTPUT output
    class GOVERN gov
    class REJECT fail
```

---

## MAP C — GOVERNANCE DETAIL

*The 7-module governance shell. All read-only. All observable.*

```mermaid
graph TB
    subgraph BUILD_SEALED["🔒 BUILD (SEALED — read-only source)"]
        B_OUT["Certified Outputs<br/>(hashed, deterministic)"]
    end

    subgraph GOV_SHELL["👁️ GOVERNANCE SHELL"]
        subgraph PHASE_D["D — Runtime"]
            RT_EV["RUNTIME_EVENT.json<br/>(per execution)"]
            GOV_LOG["GOVERNANCE_LOG.ndjson<br/>(append-only)"]
            SNAP["Snapshots<br/>(horodatés)"]
        end

        subgraph PHASE_E["E — Drift Detection"]
            D_SEM["Semantic Drift"]
            D_OUT["Output Drift"]
            D_FMT["Format Drift"]
            D_TEMP["Temporal Drift"]
            D_PERF["Performance Drift"]
            D_VAR["Variance Drift"]
            D_TOOL["Tooling Drift"]
            D_CONT["Contract Drift"]
            SCORE["Scoring Pipeline<br/>(classify + escalate)"]
            BASELINE["BASELINE_REF.sha256"]
        end

        subgraph PHASE_F["F — Non-Regression"]
            REG_BASE["Baseline Registry"]
            REG_MAT["Matrix Builder"]
            REG_RUN["Regression Runner"]
            REG_WAIV["Waiver Registry"]
        end

        subgraph PHASE_G["G — Misuse Control"]
            MIS_DET["Misuse Detectors"]
            MIS_PIPE["Misuse Pipeline"]
            MIS_RPT["Misuse Report"]
        end

        subgraph PHASE_H["H — Human Override"]
            OVR_PIPE["Override Pipeline"]
            OVR_VAL["Override Validators"]
            OVR_RPT["Override Report"]
        end

        subgraph PHASE_I["I — Versioning"]
            VER_PIPE["Version Pipeline"]
            VER_VAL["Version Validators"]
            VER_RPT["Version Report"]
        end

        subgraph PHASE_J["J — Incident"]
            INC_PIPE["Incident Pipeline"]
            INC_PM["Postmortem Generator"]
            INC_VAL["Incident Validators"]
        end
    end

    subgraph HUMAN["👤 HUMAN DECISION"]
        ARCH["Architecte Suprême<br/>(Francky)"]
    end

    %% Flow
    B_OUT ==>|"emits events"| RT_EV
    RT_EV --> GOV_LOG
    RT_EV --> SNAP

    GOV_LOG -->|"feeds"| D_SEM & D_OUT & D_FMT & D_TEMP
    GOV_LOG -->|"feeds"| D_PERF & D_VAR & D_TOOL & D_CONT
    D_SEM & D_OUT & D_FMT & D_TEMP --> SCORE
    D_PERF & D_VAR & D_TOOL & D_CONT --> SCORE
    BASELINE -.->|"reference"| SCORE

    SCORE -->|"regression?"| REG_RUN
    REG_BASE --> REG_MAT --> REG_RUN
    REG_WAIV -.-> REG_RUN

    SCORE -->|"misuse?"| MIS_PIPE
    MIS_DET --> MIS_PIPE --> MIS_RPT

    SCORE -->|"WARNING+"| OVR_PIPE
    MIS_RPT -->|"CRITICAL"| OVR_PIPE
    OVR_VAL --> OVR_PIPE --> OVR_RPT

    OVR_RPT -->|"requires decision"| ARCH
    INC_PIPE --> INC_PM
    INC_VAL --> INC_PIPE
    REG_RUN -->|"failure"| INC_PIPE

    ARCH -->|"override decision"| VER_PIPE
    ARCH -->|"rollback order"| INC_PIPE
    VER_VAL --> VER_PIPE --> VER_RPT

    classDef sealed fill:#1a1a2e,stroke:#e94560,color:#fff
    classDef gov fill:#0f3460,stroke:#00b4d8,color:#fff
    classDef human fill:#533483,stroke:#e94560,color:#fff

    class BUILD_SEALED sealed
    class GOV_SHELL gov
    class HUMAN human
```

---

## MAP D — MODULE INVENTORY (28 packages)

| Package | Layer | Role | Key Export |
|---------|-------|------|-----------|
| `canon-kernel` | L2 | Core canon persistence | CanonStore |
| `contracts-canon` | L2 | Canon interface contracts | CanonContract |
| `decision-engine` | L3 | Decision pipeline | DecisionEngine |
| `emotion-gate` | L1 | Emotion processing gate | EmotionGate |
| `genome` | L1 | Narrative genome extraction | GenomeExtractor |
| `gold-cli` | Infra | CLI tooling | — |
| `gold-internal` | Infra | Internal utilities | — |
| `gold-master` | Infra | Gold master baseline | GoldMaster |
| `gold-suite` | Infra | Test suite framework | GoldSuite |
| `hardening` | Infra | Security hardening | — |
| `headless-runner` | Infra | Headless execution | HeadlessRunner |
| `hostile` | Infra | Adversarial testing | HostileRunner |
| `integration-nexus-dep` | Infra | Nexus integration | — |
| `mod-narrative` | L4 | Narrative modifiers | NarrativeMod |
| `mycelium` | L1 | Emotional DNA fingerprint | Mycelium |
| `mycelium-bio` | L1 | Biological DNA model | BioModel |
| `omega-aggregate-dna` | L1 | DNA aggregation | AggregateEngine |
| `omega-bridge-ta-mycelium` | L1 | Analyzer↔Mycelium bridge | Bridge |
| `omega-observability` | L5 | Metrics + tracing | Observer |
| `omega-segment-engine` | L1 | Text segmentation | Segmenter |
| `oracle` | L1 | Oracle framework | OracleEngine |
| `orchestrator-core` | L4 | Flow orchestration | Orchestrator |
| `performance` | Infra | Performance benchmarks | PerfRunner |
| `proof-pack` | Infra | Proof bundle generation | ProofPacker |
| `sbom` | Infra | Software bill of materials | SBOMGenerator |
| `schemas` | L0 | JSON Schema definitions | SchemaRegistry |
| `search` | L1 | Search capabilities | SearchEngine |
| `sentinel-judge` | L3 | Judgment pipeline | SentinelJudge |
| `trust-version` | L5 | Version trust chain | TrustVersion |
| `truth-gate` | L3 | Pass/fail validation | TruthGate |

---

## MAP E — CRITICAL BOUNDARIES

```mermaid
graph LR
    subgraph FORBIDDEN["🚫 FORBIDDEN CROSSINGS"]
        F1["GOVERNANCE → modifies → BUILD<br/>❌ NEVER"]
        F2["BUILD → calls → GOVERNANCE<br/>❌ NEVER"]
        F3["Any layer → skips → Truth Gate<br/>❌ NEVER"]
        F4["Anyone → modifies → sealed phase<br/>❌ NEVER"]
    end

    subgraph ALLOWED["✅ PERMITTED FLOWS"]
        A1["GOVERNANCE → reads → BUILD outputs<br/>✅ ALWAYS"]
        A2["BUILD L(n) → uses → BUILD L(n-1)<br/>✅ LAYERED"]
        A3["GOVERNANCE → alerts → Human<br/>✅ ADVISORY"]
        A4["Human → overrides → via GOVERNANCE<br/>✅ TRACED + BOUNDED"]
    end

    classDef forbidden fill:#b71c1c,stroke:#f44336,color:#fff
    classDef allowed fill:#1b5e20,stroke:#4caf50,color:#fff

    class FORBIDDEN forbidden
    class ALLOWED allowed
```

---

## INVARIANTS

```
INV-SM-01: Maps are generated from repository scan, not invention
INV-SM-02: Structural map reflects actual directory layout
INV-SM-03: Decisional map reflects actual code flow
INV-SM-04: No module exists in map that doesn't exist in repo
INV-SM-05: Boundary rules are enforced by architecture, not convention
```

---

**FIN DU DOCUMENT OMEGA_SYSTEM_MAP v1.0**

*HEAD: 76434668 | Topologies: 5 maps | Packages: 28 | Layers: 6 | Governance modules: 7*
