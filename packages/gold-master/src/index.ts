/**
 * @fileoverview OMEGA Gold Master - Entry Point
 * @module @omega/gold-master
 *
 * Ultimate certification system for OMEGA.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// Types
export type {
  GoldMasterStatus,
  GoldMasterLevel,
  GoldMasterConfig,
  GoldMasterResult,
  GoldMasterSummary,
  PackageCertification,
  IntegrationCertification,
  FreezeManifest,
  FrozenPackage,
} from './types.js';

export { DEFAULT_GOLD_MASTER_CONFIG } from './types.js';

// Certifier
export {
  GoldMasterCertifier,
  createGoldMasterCertifier,
  runGoldMaster,
  createFreezeManifest,
  verifyFreezeManifest,
} from './certifier.js';
