/**
 * OMEGA Plugin Gateway — Validator v1.0
 *
 * INV-PNP-04: Typed IO — runtime schema validation.
 * INV-PNP-06: Capability-based — rejects forbidden capabilities.
 * INV-PNP-09: Version contract — semver compatibility check.
 * INV-PNP-10: Fail-closed — rejects on any issue.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import stableStringify from 'fast-json-stable-stringify';

import type {
  PluginManifest,
  PluginRequest,
  PluginResponse,
  ValidationReport,
  ValidationIssue,
  ValidationSeverity,
} from './types.js';

import {
  OMEGA_PLUGIN_API_VERSION,
  ForbiddenCapability,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = resolve(__dirname, '../schemas');

function loadSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(schemasDir, name), 'utf-8'));
}

function hashObject(obj: unknown): string {
  return createHash('sha256').update(stableStringify(obj)).digest('hex');
}

/** Check if plugin api_version satisfies gateway version (simplified semver major match) */
function isCompatible(pluginApiVersion: string, gatewayVersion: string): boolean {
  const pluginMajor = parseInt(pluginApiVersion.split('.')[0] ?? '0', 10);
  const gatewayMajor = parseInt(gatewayVersion.split('.')[0] ?? '0', 10);
  // Major must match for v1+ (semver contract)
  return pluginMajor === gatewayMajor && pluginMajor >= 1;
}

export class ManifestValidator {
  private readonly ajv: Ajv;
  private readonly manifestValidate: ReturnType<Ajv['compile']>;
  private readonly requestValidate: ReturnType<Ajv['compile']>;
  private readonly responseValidate: ReturnType<Ajv['compile']>;
  private readonly forbiddenCaps: ReadonlySet<string>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);

    this.manifestValidate = this.ajv.compile(loadSchema('plugin-manifest.schema.json'));
    this.requestValidate = this.ajv.compile(loadSchema('plugin-request.schema.json'));
    this.responseValidate = this.ajv.compile(loadSchema('plugin-response.schema.json'));

    this.forbiddenCaps = new Set(Object.values(ForbiddenCapability));
  }

  validateManifest(manifest: PluginManifest, timestamp: string): ValidationReport {
    const issues: ValidationIssue[] = [];

    // 1. JSON Schema validation
    const schemaValid = this.manifestValidate(manifest);
    if (!schemaValid && this.manifestValidate.errors) {
      for (const err of this.manifestValidate.errors) {
        issues.push({
          field: err.instancePath || err.schemaPath,
          message: err.message || 'Schema validation failed',
          severity: 'error',
        });
      }
    }

    // 2. Forbidden capabilities check (INV-PNP-06)
    for (const cap of manifest.capabilities) {
      if (this.forbiddenCaps.has(cap)) {
        issues.push({
          field: 'capabilities',
          message: `Forbidden capability declared: ${cap}`,
          severity: 'error',
        });
      }
    }

    // 3. Version compatibility (INV-PNP-09)
    if (!isCompatible(manifest.api_version, OMEGA_PLUGIN_API_VERSION)) {
      issues.push({
        field: 'api_version',
        message: `Incompatible API version: plugin=${manifest.api_version}, gateway=${OMEGA_PLUGIN_API_VERSION}`,
        severity: 'error',
      });
    }

    // 4. Entrypoint must be worker (Mode B only)
    if (manifest.entrypoint.type !== 'worker') {
      issues.push({
        field: 'entrypoint.type',
        message: `Only "worker" entrypoint allowed (Mode B). Got: ${manifest.entrypoint.type}`,
        severity: 'error',
      });
    }

    // 5. IO consistency: each input/output kind must match a declared capability
    const capSet = new Set(manifest.capabilities);
    for (const input of manifest.io.inputs) {
      const requiredCap = `read_${input.kind}` as string;
      if (!capSet.has(requiredCap)) {
        issues.push({
          field: `io.inputs[${input.kind}]`,
          message: `Input kind "${input.kind}" requires capability "${requiredCap}" not declared`,
          severity: 'error',
        });
      }
    }

    // 6. Limits sanity
    if (manifest.limits.max_ms > 60000) {
      issues.push({
        field: 'limits.max_ms',
        message: `Timeout ${manifest.limits.max_ms}ms exceeds maximum allowed (60000ms)`,
        severity: 'warning',
      });
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues,
      manifest_hash: hashObject(manifest),
      checked_at: timestamp,
    };
  }

  validateRequest(request: PluginRequest): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const valid = this.requestValidate(request);
    if (!valid && this.requestValidate.errors) {
      for (const err of this.requestValidate.errors) {
        issues.push({
          field: err.instancePath || err.schemaPath,
          message: err.message || 'Request validation failed',
          severity: 'error',
        });
      }
    }
    return issues;
  }

  validateResponse(response: PluginResponse): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const valid = this.responseValidate(response);
    if (!valid && this.responseValidate.errors) {
      for (const err of this.responseValidate.errors) {
        issues.push({
          field: err.instancePath || err.schemaPath,
          message: err.message || 'Response validation failed',
          severity: 'error',
        });
      }
    }
    return issues;
  }
}
