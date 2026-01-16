/**
 * OMEGA Phase 96 - Error Standardization Tests
 * @version 3.96.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
let errModule: any;

beforeAll(() => { errModule = require('../scripts/errors/error-codes.cjs'); });

function fileExists(p: string): boolean { return existsSync(join(ROOT_DIR, p)); }
function readFile(p: string): string { return readFileSync(join(ROOT_DIR, p), 'utf-8'); }

describe('Error Codes Script', () => {
  it('should have error-codes.cjs', () => { expect(fileExists('scripts/errors/error-codes.cjs')).toBe(true); });
  it('should export CONFIG', () => { expect(errModule.CONFIG).toBeDefined(); });
  it('should have version 3.96.0', () => { expect(errModule.CONFIG.version).toBe('3.96.0'); });
  it('should export ErrorCategory', () => { expect(errModule.ErrorCategory).toBeDefined(); });
  it('should export ErrorSeverity', () => { expect(errModule.ErrorSeverity).toBeDefined(); });
  it('should export ErrorCodes', () => { expect(errModule.ErrorCodes).toBeDefined(); });
  it('should export OmegaError', () => { expect(errModule.OmegaError).toBeDefined(); });
  it('should export createError', () => { expect(typeof errModule.createError).toBe('function'); });
});

describe('Error Categories', () => {
  it('should have VAL category', () => { expect(errModule.ErrorCategory.VALIDATION).toBe('VAL'); });
  it('should have FS category', () => { expect(errModule.ErrorCategory.FILESYSTEM).toBe('FS'); });
  it('should have SAN category', () => { expect(errModule.ErrorCategory.SANCTUARY).toBe('SAN'); });
  it('should have HASH category', () => { expect(errModule.ErrorCategory.HASH).toBe('HASH'); });
  it('should have GIT category', () => { expect(errModule.ErrorCategory.GIT).toBe('GIT'); });
  it('should have INV category', () => { expect(errModule.ErrorCategory.INVARIANT).toBe('INV'); });
  it('should have PHS category', () => { expect(errModule.ErrorCategory.PHASE).toBe('PHS'); });
});

describe('Error Severity', () => {
  it('should have CRITICAL', () => { expect(errModule.ErrorSeverity.CRITICAL).toBe('CRITICAL'); });
  it('should have ERROR', () => { expect(errModule.ErrorSeverity.ERROR).toBe('ERROR'); });
  it('should have WARNING', () => { expect(errModule.ErrorSeverity.WARNING).toBe('WARNING'); });
  it('should have INFO', () => { expect(errModule.ErrorSeverity.INFO).toBe('INFO'); });
});

describe('Error Creation', () => {
  it('should create error from code', () => {
    const err = errModule.createError('VAL_001');
    expect(err).toBeDefined();
    expect(err.code).toBe('OMEGA-VAL-001');
  });

  it('should include details in error', () => {
    const err = errModule.createError('VAL_001', { field: 'test' });
    expect(err.details).toEqual({ field: 'test' });
  });

  it('should have timestamp', () => {
    const err = errModule.createError('VAL_001');
    expect(err.timestamp).toBeDefined();
    expect(typeof err.timestamp).toBe('string');
  });

  it('should serialize to JSON', () => {
    const err = errModule.createError('VAL_001', { field: 'test' });
    const json = err.toJSON();
    expect(json.code).toBe('OMEGA-VAL-001');
    expect(json.details).toEqual({ field: 'test' });
  });

  it('should format as string', () => {
    const err = errModule.createError('VAL_001');
    const str = err.toString();
    expect(str).toContain('OMEGA-VAL-001');
    expect(str).toContain('ERROR');
  });
});

describe('Error Code Validation', () => {
  it('should validate correct format', () => {
    expect(errModule.validateErrorCode('OMEGA-VAL-001')).toBe(true);
    expect(errModule.validateErrorCode('OMEGA-SAN-099')).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(errModule.validateErrorCode('VAL-001')).toBe(false);
    expect(errModule.validateErrorCode('OMEGA-V-001')).toBe(false);
    expect(errModule.validateErrorCode('OMEGA-VAL-1')).toBe(false);
  });

  it('should parse error code', () => {
    const parsed = errModule.parseErrorCode('OMEGA-VAL-001');
    expect(parsed.prefix).toBe('OMEGA');
    expect(parsed.category).toBe('VAL');
    expect(parsed.number).toBe(1);
  });
});

describe('Error Code Listing', () => {
  it('should get all error codes', () => {
    const codes = errModule.getAllErrorCodes();
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(10);
  });

  it('should get errors by category', () => {
    const valErrors = errModule.getErrorsByCategory('VAL');
    expect(valErrors.length).toBeGreaterThan(0);
    expect(valErrors.every((e: any) => e.code.includes('-VAL-'))).toBe(true);
  });

  it('should get errors by severity', () => {
    const criticalErrors = errModule.getErrorsBySeverity('CRITICAL');
    expect(criticalErrors.length).toBeGreaterThan(0);
    expect(criticalErrors.every((e: any) => e.severity === 'CRITICAL')).toBe(true);
  });
});

describe('Sanctuary Errors', () => {
  it('should have SAN_001 as CRITICAL', () => {
    expect(errModule.ErrorCodes.SAN_001.severity).toBe('CRITICAL');
  });

  it('should have SAN_002 as CRITICAL', () => {
    expect(errModule.ErrorCodes.SAN_002.severity).toBe('CRITICAL');
  });

  it('should have SAN_003 as CRITICAL', () => {
    expect(errModule.ErrorCodes.SAN_003.severity).toBe('CRITICAL');
  });
});

describe('Documentation', () => {
  it('should have ERROR_CODES.md', () => { expect(fileExists('docs/ERROR_CODES.md')).toBe(true); });
  it('should document categories', () => { expect(readFile('docs/ERROR_CODES.md')).toMatch(/Categories/); });
  it('should document severity', () => { expect(readFile('docs/ERROR_CODES.md')).toMatch(/Severity/); });
  it('should reference Phase 96', () => { expect(readFile('docs/ERROR_CODES.md')).toMatch(/Phase:?\s*96/); });
});
