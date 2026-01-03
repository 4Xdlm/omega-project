// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA OBSERVABILITY — PUBLIC API
// packages/omega-observability/src/index.ts
// Version: 1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// TYPES (re-export all types)
// ══════════════════════════════════════════════════════════════════════════════
export type {
  ProgressPhase,
  ProgressEvent,
  ProgressCallback,
  ProgressFormat,
  ProgressOptions,
  PipelineStats,
} from "./types.js";

export {
  DEFAULT_PROGRESS_OPTIONS,
  VALID_PHASES,
  isValidPhase,
} from "./types.js";

// ══════════════════════════════════════════════════════════════════════════════
// EMITTER (main class + factories)
// ══════════════════════════════════════════════════════════════════════════════
export {
  ProgressEmitter,
  createNoopEmitter,
  createCliEmitter,
  createCiEmitter,
  createCallbackEmitter,
  createTestEmitter,
} from "./emitter.js";

// ══════════════════════════════════════════════════════════════════════════════
// FORMATTERS (utility functions)
// ══════════════════════════════════════════════════════════════════════════════
export {
  formatCli,
  formatJsonl,
  formatDuration,
  formatBytes,
  formatRate,
  formatNumber,
  formatDoneSummary,
} from "./formatters.js";

// ══════════════════════════════════════════════════════════════════════════════
// VERSION
// ══════════════════════════════════════════════════════════════════════════════
export const VERSION = "1.0.0";
export const MODULE_NAME = "omega-observability";
