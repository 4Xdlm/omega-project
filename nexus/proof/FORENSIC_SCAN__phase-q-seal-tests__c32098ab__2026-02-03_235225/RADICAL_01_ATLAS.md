# RADICAL_01_ATLAS.md

## Global Knowledge Graph â€” OMEGA Repository

### Node Types
- **MODULE**: Source code packages/directories
- **TEST**: Test files/suites
- **DOC**: Documentation files
- **PROOF**: Evidence/proof packs
- **TAG**: Git tags
- **SESSION**: SESSION_SAVE commits
- **CONFIG**: Configuration files

### Adjacency List

#### Modules
- **omega-core** -> [oracle/muse, delivery, orchestrator, canon, gates, memory, governance, drift, runner, sentinel]
- **@omega/decision-engine** -> [classifier, sentinel, queue, trace, incident, review]
- **@omega/hostile** -> [omega-core (test dependency)]
- **@omega/segment-engine** -> [canonical, segmenter]
- **@omega/aggregate-dna** -> [aggregate]
- **@omega/bridge-ta-mycelium** -> [bridge, analysis_to_dna]
- **@omega/schemas** -> [validator]
- **@omega/sbom** -> [sbom]
- **@omega/trust-version** -> [version]
- **@omega/hardening** -> [security utilities]
- **nexus/atlas** -> [store, query, subscriptions, indexManager]
- **nexus/raw** -> [storage, compression, encryption, memoryBackend]
- **nexus/proof-utils** -> [snapshot, verify, serialize, manifest, diff]
- **gateway/cli-runner** -> [commands/analyze, commands/compare, commands/batch, commands/export]

#### Tests -> Modules
- tests/delivery/*.test.ts -> src/delivery/
- tests/orchestrator/*.test.ts -> src/orchestrator/
- tests/canon/*.test.ts -> src/canon/
- tests/gates/*.test.ts -> src/gates/
- tests/memory/*.test.ts -> src/memory/
- tests/governance/*.test.ts -> src/governance/
- tests/drift/*.test.ts -> src/drift/
- tests/sentinel/*.test.ts -> gateway/sentinel/
- tests/e2e/*.test.ts -> [full pipeline integration]
- tests/streaming_invariants.test.ts -> [pipeline determinism]
- tests/scale_invariants.test.ts -> [pipeline scale]
- tests/progress_invariants.test.ts -> [pipeline progress]

#### Proofs -> Modules
- nexus/proof/ -> [all modules via evidence packs]

#### Sessions -> Timeline
- SESSION_SAVE commits -> [see GIT_03_SESSIONS_MAP.md]

### Key Paths
1. **Input -> Output**: Text file -> segmenter -> oracle/muse -> delivery -> proof pack
2. **Decision**: Event -> classifier -> sentinel -> queue -> escalation -> review
3. **Verification**: Code -> test -> evidence -> hash -> proof pack
