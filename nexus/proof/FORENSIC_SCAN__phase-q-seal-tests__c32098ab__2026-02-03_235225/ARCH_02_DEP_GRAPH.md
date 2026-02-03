# ARCH_02_DEP_GRAPH.md

## Inter-Package Dependency Graph

### Adjacency List
- **@omega/canon-kernel** -> (none)
- **@omega/contracts-canon** -> @omega/orchestrator-core
- **@omega/decision-engine** -> @omega/orchestrator-core
- **@omega/emotion-gate** -> @omega/canon-kernel
- **@omega/genome** -> @omega/mycelium
- **@omega/gold-cli** -> @omega/gold-internal, @omega/orchestrator-core, @omega/proof-pack
- **@omega/gold-internal** -> @omega/contracts-canon, @omega/hardening, @omega/headless-runner, @omega/orchestrator-core, @omega/performance, @omega/proof-pack
- **@omega/gold-master** -> @omega/gold-internal, @omega/gold-suite, @omega/hardening, @omega/orchestrator-core, @omega/performance, @omega/proof-pack
- **@omega/gold-suite** -> @omega/gold-internal, @omega/orchestrator-core
- **@omega/hardening** -> @omega/orchestrator-core
- **@omega/headless-runner** -> @omega/orchestrator-core
- **@omega/integration-nexus-dep** -> (none)
- **@omega/mod-narrative** -> (none)
- **@omega/mycelium** -> (none)
- **@omega/mycelium-bio** -> (none)
- **@omega/aggregate-dna** -> (none)
- **@omega/bridge-ta-mycelium** -> (none)
- **@omega/observability** -> (none)
- **@omega/segment-engine** -> (none)
- **@omega/oracle** -> (none)
- **@omega/orchestrator-core** -> (none)
- **@omega/performance** -> @omega/orchestrator-core
- **@omega/proof-pack** -> @omega/contracts-canon, @omega/orchestrator-core
- **@omega/search** -> (none)
- **@omega/sentinel-judge** -> (none)
- **@omega/truth-gate** -> @omega/canon-engine, @omega/canon-kernel
