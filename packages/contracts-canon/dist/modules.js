/**
 * @fileoverview OMEGA Contracts Canon - Module Contracts
 * @module @omega/contracts-canon/modules
 *
 * Canonical registry of all OMEGA module contracts.
 */
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const V1_0_0 = Object.freeze({ major: 1, minor: 0, patch: 0 });
// ═══════════════════════════════════════════════════════════════════════════════
// MODULE FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
function createModuleContract(id, name, version, stability, type, packageName, description, dependencies, exports, invariants) {
    return Object.freeze({
        metadata: Object.freeze({
            id,
            name,
            version,
            stability,
            since: '2026-01-01',
            description,
        }),
        type,
        package: packageName,
        dependencies: Object.freeze(dependencies),
        exports: Object.freeze(exports),
        invariants: Object.freeze(invariants),
    });
}
// ═══════════════════════════════════════════════════════════════════════════════
// ROOT MODULES
// ═══════════════════════════════════════════════════════════════════════════════
export const MOD_SENTINEL = createModuleContract('MOD-SENTINEL', 'Sentinel', V1_0_0, 'FROZEN', 'ROOT', '@omega/sentinel', 'Root proof system - foundation axioms, crystallization, falsification', [], [
    'ProofSystem',
    'Crystallizer',
    'Falsifier',
    'RegionManager',
    'ArtifactStore',
    'RefusalHandler',
    'NegativeSpace',
    'GravityEngine',
    'MetaCertifier',
], ['INV-SAN-01', 'INV-SAN-02']);
// ═══════════════════════════════════════════════════════════════════════════════
// CORE MODULES
// ═══════════════════════════════════════════════════════════════════════════════
export const MOD_ORCHESTRATOR_CORE = createModuleContract('MOD-ORCHESTRATOR-CORE', 'Orchestrator Core', V1_0_0, 'STABLE', 'CORE', '@omega/orchestrator-core', 'Core orchestration - plans, execution, determinism, artifacts', [], [
    'Clock',
    'DeterministicClock',
    'IdFactory',
    'SeededIdFactory',
    'sha256',
    'stableStringify',
    'RunContext',
    'Plan',
    'Executor',
    'DeterminismGuard',
    'ArtifactRegistry',
], ['INV-DET-01', 'INV-DET-02', 'INV-DET-03', 'INV-DET-04', 'INV-DET-05',
    'INV-EXE-01', 'INV-EXE-02', 'INV-EXE-03', 'INV-EXE-04',
    'INV-ART-01', 'INV-ART-02', 'INV-ART-03']);
export const MOD_HEADLESS_RUNNER = createModuleContract('MOD-HEADLESS-RUNNER', 'Headless Runner', V1_0_0, 'STABLE', 'CORE', '@omega/headless-runner', 'CLI runner - headless execution, recording, replay', [
    { module: '@omega/orchestrator-core', version: '>=0.1.0', type: 'required' },
], [
    'runHeadless',
    'createRecording',
    'validateRecording',
    'compareResults',
    'createReplayContext',
    'InMemoryRecordingStore',
    'parseArgs',
    'createCliExecutor',
], ['INV-REP-01', 'INV-REP-02', 'INV-REP-03', 'INV-REP-04']);
export const MOD_CONTRACTS_CANON = createModuleContract('MOD-CONTRACTS-CANON', 'Contracts Canon', V1_0_0, 'STABLE', 'CORE', '@omega/contracts-canon', 'Canonical contracts - types, invariants, modules, validation', [
    { module: '@omega/orchestrator-core', version: '>=0.1.0', type: 'required' },
], [
    'ContractRegistry',
    'InMemoryContractRegistry',
    'ALL_INVARIANTS',
    'ALL_MODULES',
    'validateContract',
    'checkInvariant',
], []);
// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT MODULES
// ═══════════════════════════════════════════════════════════════════════════════
export const MOD_GENOME = createModuleContract('MOD-GENOME', 'Genome', V1_0_0, 'FROZEN', 'CLIENT', '@omega/genome', 'Narrative genome analysis - emotion14, fingerprinting, similarity', [
    { module: '@omega/sentinel', version: '>=1.0.0', type: 'required' },
], [
    'analyze',
    'fingerprint',
    'similarity',
    'Emotion14',
    'GenomeFingerprint',
    'SimilarityResult',
], []);
export const MOD_MYCELIUM = createModuleContract('MOD-MYCELIUM', 'Mycelium', V1_0_0, 'STABLE', 'CLIENT', '@omega/mycelium', 'Mycelium network - normalization, validation, constants', [], [
    'normalize',
    'validate',
    'MYCELIUM_CONSTANTS',
], []);
export const MOD_MYCELIUM_BIO = createModuleContract('MOD-MYCELIUM-BIO', 'Mycelium Bio', V1_0_0, 'STABLE', 'CLIENT', '@omega/mycelium-bio', 'Biological processing - DNA building, emotion fields, morpho engine', [
    { module: '@omega/mycelium', version: '>=0.1.0', type: 'required' },
], [
    'buildDNA',
    'EmotionField',
    'MorphoEngine',
    'BioFingerprint',
], []);
// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION MODULES
// ═══════════════════════════════════════════════════════════════════════════════
export const MOD_NEXUS_DEP = createModuleContract('MOD-NEXUS-DEP', 'Integration NEXUS DEP', V1_0_0, 'STABLE', 'INTEGRATION', '@omega/integration-nexus-dep', 'Integration hub - adapters, pipeline, router, scheduler', [
    { module: '@omega/genome', version: '>=1.0.0', type: 'required' },
    { module: '@omega/mycelium', version: '>=0.1.0', type: 'required' },
    { module: '@omega/mycelium-bio', version: '>=0.1.0', type: 'required' },
], [
    'GenomeAdapter',
    'MyceliumAdapter',
    'MyceliumBioAdapter',
    'PipelineBuilder',
    'PipelineExecutor',
    'Router',
    'Scheduler',
], ['INV-NEX-01', 'INV-NEX-02', 'INV-NEX-03']);
// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY MODULES
// ═══════════════════════════════════════════════════════════════════════════════
export const MOD_SEGMENT_ENGINE = createModuleContract('MOD-SEGMENT-ENGINE', 'Segment Engine', V1_0_0, 'STABLE', 'UTILITY', '@omega/omega-segment-engine', 'Text segmentation - normalizer, segmenter, stream processing', [], [
    'Segmenter',
    'Normalizer',
    'StreamSegmenter',
    'UTF8Stream',
], []);
export const MOD_OBSERVABILITY = createModuleContract('MOD-OBSERVABILITY', 'Observability', V1_0_0, 'STABLE', 'UTILITY', '@omega/omega-observability', 'Observability - event emitter, formatters, telemetry', [], [
    'EventEmitter',
    'Formatters',
    'TelemetryCollector',
], []);
// ═══════════════════════════════════════════════════════════════════════════════
// MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * All module contracts.
 */
export const ALL_MODULES = Object.freeze([
    // Root
    MOD_SENTINEL,
    // Core
    MOD_ORCHESTRATOR_CORE,
    MOD_HEADLESS_RUNNER,
    MOD_CONTRACTS_CANON,
    // Client
    MOD_GENOME,
    MOD_MYCELIUM,
    MOD_MYCELIUM_BIO,
    // Integration
    MOD_NEXUS_DEP,
    // Utility
    MOD_SEGMENT_ENGINE,
    MOD_OBSERVABILITY,
]);
/**
 * Get modules by type.
 */
export function getModulesByType(type) {
    return ALL_MODULES.filter((mod) => mod.type === type);
}
/**
 * Get module by ID.
 */
export function getModule(id) {
    return ALL_MODULES.find((mod) => mod.metadata.id === id);
}
/**
 * Get module by package name.
 */
export function getModuleByPackage(packageName) {
    return ALL_MODULES.find((mod) => mod.package === packageName);
}
/**
 * Total module count.
 */
export const MODULE_COUNT = ALL_MODULES.length;
//# sourceMappingURL=modules.js.map