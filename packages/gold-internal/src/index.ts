/**
 * @fileoverview OMEGA Gold Internal - Public API
 * @module @omega/gold-internal
 *
 * Cross-package validation and gold certification.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  PackageValidation,
  ExportValidation,
  CrossPackageValidation,
  IntegrationValidation,
  CertificationLevel,
  GoldCertification,
  PackageCertification,
  CertificationMetrics,
  GoldReport,
  ReportFormat,
  OmegaPackage,
} from './types.js';

export { OMEGA_PACKAGES } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export type { IntegrationTest } from './validator.js';

export {
  getExportType,
  validateExport,
  validatePackageExports,
  runIntegrationTest,
  runIntegrationTests,
  createCrossPackageValidation,
  validateRequiredExports,
  validateCallable,
  validateInstantiable,
} from './validator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateCertificationId,
  determineCertificationLevel,
  calculateMetrics,
  createCertification,
  createGoldReport,
  formatReport,
} from './certification.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  coreHardeningIntegration,
  corePerformanceIntegration,
  proofPackHardeningIntegration,
  proofPackCoreIntegration,
  contractsHardeningIntegration,
  contractsProofPackIntegration,
  performanceHardeningIntegration,
  performanceProofPackIntegration,
  sealProofPackIntegration,
  ALL_INTEGRATIONS,
} from './integrations.js';
