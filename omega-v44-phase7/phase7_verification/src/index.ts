/**
 * OMEGA Phase 7 — Main Export
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 */

// Types
export type {
  TrunkSignature,
  RenderParams,
  RenderReport,
  SvgResult,
  PngResult,
  RenderResult,
} from './types.js';

// Render functions
export { renderTrunk, validateSvgOutput } from './renderTrunk.js';
export { exportPng, getChromiumVersion, getPlaywrightVersion } from './exportPng.js';

// Validation utilities
export {
  sha256,
  hashObject,
  validateTrunkSignature,
  validateRenderParams,
  validateRenderReportSchema,
} from './utils/validation.js';
