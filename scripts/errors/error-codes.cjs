#!/usr/bin/env node
/**
 * OMEGA Error Standardization - Error Codes and Handling
 * @description Standardized error codes and handling for OMEGA project
 * @version 3.96.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '3.96.0',
  prefix: 'OMEGA'
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

const ErrorCategory = {
  VALIDATION: 'VAL',      // Input validation errors
  FILESYSTEM: 'FS',       // File system errors
  SANCTUARY: 'SAN',       // Sanctuary violation errors
  HASH: 'HASH',           // Hash/integrity errors
  GIT: 'GIT',             // Git operation errors
  CONFIG: 'CFG',          // Configuration errors
  RUNTIME: 'RUN',         // Runtime errors
  INVARIANT: 'INV',       // Invariant violation errors
  PHASE: 'PHS',           // Phase-related errors
  CERTIFICATE: 'CRT'      // Certificate errors
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

const ErrorSeverity = {
  CRITICAL: 'CRITICAL',   // System cannot continue
  ERROR: 'ERROR',         // Operation failed
  WARNING: 'WARNING',     // Operation completed with issues
  INFO: 'INFO'            // Informational
};

// ═══════════════════════════════════════════════════════════════════════════════
// STANDARD ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════

const ErrorCodes = {
  // Validation Errors (VAL-001 to VAL-099)
  VAL_001: { code: 'OMEGA-VAL-001', message: 'Invalid input format', severity: ErrorSeverity.ERROR },
  VAL_002: { code: 'OMEGA-VAL-002', message: 'Missing required parameter', severity: ErrorSeverity.ERROR },
  VAL_003: { code: 'OMEGA-VAL-003', message: 'Value out of range', severity: ErrorSeverity.ERROR },
  VAL_004: { code: 'OMEGA-VAL-004', message: 'Invalid file path', severity: ErrorSeverity.ERROR },
  VAL_005: { code: 'OMEGA-VAL-005', message: 'Invalid hash format', severity: ErrorSeverity.ERROR },

  // Filesystem Errors (FS-001 to FS-099)
  FS_001: { code: 'OMEGA-FS-001', message: 'File not found', severity: ErrorSeverity.ERROR },
  FS_002: { code: 'OMEGA-FS-002', message: 'Directory not found', severity: ErrorSeverity.ERROR },
  FS_003: { code: 'OMEGA-FS-003', message: 'Permission denied', severity: ErrorSeverity.CRITICAL },
  FS_004: { code: 'OMEGA-FS-004', message: 'File already exists', severity: ErrorSeverity.WARNING },
  FS_005: { code: 'OMEGA-FS-005', message: 'Write operation failed', severity: ErrorSeverity.ERROR },

  // Sanctuary Errors (SAN-001 to SAN-099)
  SAN_001: { code: 'OMEGA-SAN-001', message: 'Sanctuary violation: read-only path modified', severity: ErrorSeverity.CRITICAL },
  SAN_002: { code: 'OMEGA-SAN-002', message: 'Sanctuary violation: forbidden file access', severity: ErrorSeverity.CRITICAL },
  SAN_003: { code: 'OMEGA-SAN-003', message: 'Sanctuary violation: frozen module modified', severity: ErrorSeverity.CRITICAL },

  // Hash Errors (HASH-001 to HASH-099)
  HASH_001: { code: 'OMEGA-HASH-001', message: 'Hash mismatch', severity: ErrorSeverity.CRITICAL },
  HASH_002: { code: 'OMEGA-HASH-002', message: 'Invalid hash length', severity: ErrorSeverity.ERROR },
  HASH_003: { code: 'OMEGA-HASH-003', message: 'Hash calculation failed', severity: ErrorSeverity.ERROR },

  // Git Errors (GIT-001 to GIT-099)
  GIT_001: { code: 'OMEGA-GIT-001', message: 'Git operation failed', severity: ErrorSeverity.ERROR },
  GIT_002: { code: 'OMEGA-GIT-002', message: 'Forbidden git command detected', severity: ErrorSeverity.CRITICAL },
  GIT_003: { code: 'OMEGA-GIT-003', message: 'Branch protection violation', severity: ErrorSeverity.CRITICAL },
  GIT_004: { code: 'OMEGA-GIT-004', message: 'Uncommitted changes detected', severity: ErrorSeverity.WARNING },

  // Config Errors (CFG-001 to CFG-099)
  CFG_001: { code: 'OMEGA-CFG-001', message: 'Configuration file not found', severity: ErrorSeverity.ERROR },
  CFG_002: { code: 'OMEGA-CFG-002', message: 'Invalid configuration format', severity: ErrorSeverity.ERROR },
  CFG_003: { code: 'OMEGA-CFG-003', message: 'Missing required configuration', severity: ErrorSeverity.ERROR },

  // Runtime Errors (RUN-001 to RUN-099)
  RUN_001: { code: 'OMEGA-RUN-001', message: 'Unexpected runtime error', severity: ErrorSeverity.CRITICAL },
  RUN_002: { code: 'OMEGA-RUN-002', message: 'Timeout exceeded', severity: ErrorSeverity.ERROR },
  RUN_003: { code: 'OMEGA-RUN-003', message: 'Resource exhausted', severity: ErrorSeverity.CRITICAL },

  // Invariant Errors (INV-001 to INV-099)
  INV_001: { code: 'OMEGA-INV-001', message: 'Invariant violation detected', severity: ErrorSeverity.CRITICAL },
  INV_002: { code: 'OMEGA-INV-002', message: 'Contract violation', severity: ErrorSeverity.CRITICAL },
  INV_003: { code: 'OMEGA-INV-003', message: 'Precondition failed', severity: ErrorSeverity.ERROR },
  INV_004: { code: 'OMEGA-INV-004', message: 'Postcondition failed', severity: ErrorSeverity.ERROR },

  // Phase Errors (PHS-001 to PHS-099)
  PHS_001: { code: 'OMEGA-PHS-001', message: 'Phase not declared', severity: ErrorSeverity.ERROR },
  PHS_002: { code: 'OMEGA-PHS-002', message: 'Invalid phase number', severity: ErrorSeverity.ERROR },
  PHS_003: { code: 'OMEGA-PHS-003', message: 'Phase already completed', severity: ErrorSeverity.WARNING },

  // Certificate Errors (CRT-001 to CRT-099)
  CRT_001: { code: 'OMEGA-CRT-001', message: 'Certificate validation failed', severity: ErrorSeverity.CRITICAL },
  CRT_002: { code: 'OMEGA-CRT-002', message: 'Certificate not found', severity: ErrorSeverity.ERROR },
  CRT_003: { code: 'OMEGA-CRT-003', message: 'Certificate expired', severity: ErrorSeverity.WARNING }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class OmegaError extends Error {
  constructor(errorDef, details = null) {
    super(errorDef.message);
    this.name = 'OmegaError';
    this.code = errorDef.code;
    this.severity = errorDef.severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.version = CONFIG.version;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      version: this.version
    };
  }

  toString() {
    const detailStr = this.details ? ` | Details: ${JSON.stringify(this.details)}` : '';
    return `[${this.severity}] ${this.code}: ${this.message}${detailStr}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

function createError(errorKey, details = null) {
  const errorDef = ErrorCodes[errorKey];
  if (!errorDef) {
    throw new Error(`Unknown error code: ${errorKey}`);
  }
  return new OmegaError(errorDef, details);
}

function createCustomError(category, number, message, severity, details = null) {
  const code = `OMEGA-${category}-${String(number).padStart(3, '0')}`;
  return new OmegaError({ code, message, severity }, details);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

function formatError(error) {
  if (error instanceof OmegaError) {
    return error.toString();
  }
  return `[ERROR] OMEGA-RUN-001: ${error.message}`;
}

function logError(error, logger = console) {
  const formatted = formatError(error);
  const colors = {
    CRITICAL: '\x1b[31m',
    ERROR: '\x1b[31m',
    WARNING: '\x1b[33m',
    INFO: '\x1b[37m',
    reset: '\x1b[0m'
  };

  const severity = error.severity || 'ERROR';
  const color = colors[severity] || colors.ERROR;
  logger.error(`${color}${formatted}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function validateErrorCode(code) {
  const pattern = /^OMEGA-[A-Z]{2,4}-\d{3}$/;
  return pattern.test(code);
}

function parseErrorCode(code) {
  const match = code.match(/^OMEGA-([A-Z]{2,4})-(\d{3})$/);
  if (!match) return null;
  return {
    prefix: 'OMEGA',
    category: match[1],
    number: parseInt(match[2], 10)
  };
}

function getAllErrorCodes() {
  return Object.keys(ErrorCodes).map(key => ({
    key,
    ...ErrorCodes[key]
  }));
}

function getErrorsByCategory(category) {
  return getAllErrorCodes().filter(e => e.code.includes(`-${category}-`));
}

function getErrorsBySeverity(severity) {
  return getAllErrorCodes().filter(e => e.severity === severity);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  switch (command) {
    case 'list':
      console.log('OMEGA Error Codes:');
      getAllErrorCodes().forEach(e => {
        console.log(`  ${e.code}: ${e.message} [${e.severity}]`);
      });
      break;
    case 'categories':
      console.log('Error Categories:');
      Object.entries(ErrorCategory).forEach(([name, code]) => {
        console.log(`  ${code}: ${name}`);
      });
      break;
    case 'validate':
      const code = args[1];
      console.log(`${code}: ${validateErrorCode(code) ? 'VALID' : 'INVALID'}`);
      break;
    default:
      console.log('Usage: node error-codes.cjs [list|categories|validate <code>]');
  }
}

module.exports = {
  CONFIG,
  ErrorCategory,
  ErrorSeverity,
  ErrorCodes,
  OmegaError,
  createError,
  createCustomError,
  formatError,
  logError,
  validateErrorCode,
  parseErrorCode,
  getAllErrorCodes,
  getErrorsByCategory,
  getErrorsBySeverity
};
