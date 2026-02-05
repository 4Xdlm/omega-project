/**
 * PHASE I — VALIDATORS INDEX
 * Public exports for Phase I validators.
 */

export {
  validateVER001,
  validateVER002,
  validateVER003,
  validateVER004,
  validateVER005,
  validateAllRules
} from './rules.js';

export {
  determineCompatibility,
  buildCompatibilityMatrix,
  getCompatibilityEntry,
  isUpgradePathAvailable
} from './compatibility.js';
