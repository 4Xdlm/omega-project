/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Stress Engine - Module Index
 * 
 * Phase 23 - Sprint 23.3
 */

// Types
export {
  // Branded types
  RequestCount,
  RequestsPerSecond,
  LatencyMs,
  MemoryBytes,
  StressSeed,
  RunId,
  
  // Load profile
  LoadPattern,
  LoadProfile,
  
  // Request/Response
  StressRequest,
  StressResponse,
  
  // Metrics
  LatencyPercentiles,
  ThroughputMetrics,
  MemoryMetrics,
  MetricsSnapshot,
  
  // Run
  StressRunConfig,
  StressRunResult,
  RequestGenerator,
  RequestHandler,
  ThresholdViolation,
  
  // Thresholds
  StressThresholds,
  OMEGA_THRESHOLDS,
  
  // Factory functions
  requestCount,
  requestsPerSecond,
  latencyMs,
  memoryBytes,
  stressSeed,
  runId,
  
  // Constants
  ALL_PATTERNS,
} from './types.js';

// Runner
export {
  StressRunner,
  createStressRunner,
  runStressTest,
  defaultGenerator,
  createLoadProfile,
  calculateLoad,
  calculateLatencyPercentiles,
  calculateThroughputMetrics,
  calculateDeterministicHash,
  getMemoryMetrics,
} from './runner.js';

// Scenarios
export {
  // Preset profiles
  PROFILE_LIGHT,
  PROFILE_MEDIUM,
  PROFILE_HEAVY,
  PROFILE_SPIKE,
  PROFILE_WAVE,
  PROFILE_CHAOS,
  PROFILE_STEP,
  PROFILE_EXPONENTIAL,
  ALL_PROFILES,
  
  // Preset thresholds
  THRESHOLDS_STRICT,
  THRESHOLDS_RELAXED,
  ALL_THRESHOLDS,
  
  // Scenario builder
  ScenarioBuilder,
  createScenario,
  
  // Preset scenarios
  sanityCheckScenario,
  standardLoadScenario,
  spikeTestScenario,
  chaosTestScenario,
  determinismVerificationScenario,
  soakTestScenario,
  
  // Mock handlers
  fastMockHandler,
  variableLatencyHandler,
  flakyHandler,
} from './scenarios.js';
