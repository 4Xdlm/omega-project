/**
 * @fileoverview OMEGA Gold Internal - Package Validator
 * @module @omega/gold-internal/validator
 *
 * Validates package exports and integrations.
 */

import type {
  PackageValidation,
  ExportValidation,
  CrossPackageValidation,
  IntegrationValidation,
  OMEGA_PACKAGES,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the type of an export.
 */
export function getExportType(
  value: unknown
): 'function' | 'class' | 'object' | 'const' | 'type' {
  if (typeof value === 'function') {
    // Check if it's a class by inspecting its string representation
    const fnStr = Function.prototype.toString.call(value);
    if (fnStr.startsWith('class ') || fnStr.startsWith('class{')) {
      return 'class';
    }
    return 'function';
  }
  if (typeof value === 'object' && value !== null) {
    return 'object';
  }
  return 'const';
}

/**
 * Validate a single export.
 */
export function validateExport(name: string, value: unknown): ExportValidation {
  try {
    const type = getExportType(value);
    return {
      name,
      type,
      valid: true,
    };
  } catch (e) {
    return {
      name,
      type: 'const',
      valid: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * Validate a package's exports.
 */
export function validatePackageExports(
  name: string,
  version: string,
  exports: Record<string, unknown>
): PackageValidation {
  const validations: ExportValidation[] = [];
  const errors: string[] = [];

  for (const [exportName, value] of Object.entries(exports)) {
    const validation = validateExport(exportName, value);
    validations.push(validation);
    if (!validation.valid && validation.error) {
      errors.push(`${exportName}: ${validation.error}`);
    }
  }

  return {
    name,
    version,
    valid: errors.length === 0,
    exports: validations,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Integration test definition.
 */
export interface IntegrationTest {
  readonly name: string;
  readonly packages: readonly string[];
  readonly test: () => boolean | Promise<boolean>;
}

/**
 * Run an integration test.
 */
export async function runIntegrationTest(
  test: IntegrationTest
): Promise<IntegrationValidation> {
  const errors: string[] = [];

  try {
    const result = await test.test();
    if (!result) {
      errors.push('Integration test returned false');
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return {
    name: test.name,
    packages: test.packages,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Run all integration tests.
 */
export async function runIntegrationTests(
  tests: readonly IntegrationTest[]
): Promise<readonly IntegrationValidation[]> {
  const results: IntegrationValidation[] = [];

  for (const test of tests) {
    results.push(await runIntegrationTest(test));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-PACKAGE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create cross-package validation result.
 */
export function createCrossPackageValidation(
  packages: readonly PackageValidation[],
  integrations: readonly IntegrationValidation[]
): CrossPackageValidation {
  const valid =
    packages.every((p) => p.valid) && integrations.every((i) => i.valid);

  return {
    packages,
    integrations,
    valid,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that a package has required exports.
 */
export function validateRequiredExports(
  exports: Record<string, unknown>,
  required: readonly string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const name of required) {
    if (!(name in exports)) {
      missing.push(name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate that a function is callable.
 */
export function validateCallable(
  fn: unknown
): { valid: boolean; error?: string } {
  if (typeof fn !== 'function') {
    return { valid: false, error: 'Not a function' };
  }
  return { valid: true };
}

/**
 * Validate that a class is instantiable.
 */
export function validateInstantiable(
  Class: unknown,
  args: unknown[] = []
): { valid: boolean; error?: string } {
  if (typeof Class !== 'function') {
    return { valid: false, error: 'Not a constructor' };
  }

  try {
    new (Class as new (...a: unknown[]) => unknown)(...args);
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Instantiation failed',
    };
  }
}
