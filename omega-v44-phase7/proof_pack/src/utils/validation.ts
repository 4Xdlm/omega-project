/**
 * OMEGA Phase 7 — Validation Utilities
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 *
 * Schema validation and parameter checking.
 */

import { createHash } from 'node:crypto';
import type { TrunkSignature, RenderParams, RenderReport } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate SHA-256 hash of string
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

/**
 * Calculate SHA-256 hash of object (via JSON)
 */
export function hashObject(obj: unknown): string {
  const json = JSON.stringify(obj, Object.keys(obj as object).sort());
  return sha256(json);
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUNK SIGNATURE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate TrunkSignature
 *
 * @throws Error if validation fails
 */
export function validateTrunkSignature(signature: unknown): asserts signature is TrunkSignature {
  if (!signature || typeof signature !== 'object') {
    throw new Error('TrunkSignature must be an object');
  }

  const sig = signature as Record<string, unknown>;

  // Required fields
  if (typeof sig.id !== 'string') {
    throw new Error('TrunkSignature.id must be a string');
  }

  if (typeof sig.orientation !== 'number' || sig.orientation < 0 || sig.orientation >= 2 * Math.PI) {
    throw new Error('TrunkSignature.orientation must be a number in [0, 2π)');
  }

  if (typeof sig.amplitude !== 'number' || sig.amplitude < 0 || sig.amplitude > 1) {
    throw new Error('TrunkSignature.amplitude must be a number in [0, 1]');
  }

  // Color validation
  if (!sig.color || typeof sig.color !== 'object') {
    throw new Error('TrunkSignature.color must be an object');
  }

  const color = sig.color as Record<string, unknown>;
  if (typeof color.h !== 'number' || color.h < 0 || color.h >= 360) {
    throw new Error('TrunkSignature.color.h must be a number in [0, 360)');
  }
  if (typeof color.s !== 'number' || color.s < 0 || color.s > 1) {
    throw new Error('TrunkSignature.color.s must be a number in [0, 1]');
  }
  if (typeof color.l !== 'number' || color.l < 0 || color.l > 1) {
    throw new Error('TrunkSignature.color.l must be a number in [0, 1]');
  }

  // Persistence validation
  if (typeof sig.persistence !== 'number' || sig.persistence < 0 || sig.persistence > 1) {
    throw new Error('TrunkSignature.persistence must be a number in [0, 1]');
  }

  // Oxygen validation
  if (!sig.oxygen || typeof sig.oxygen !== 'object') {
    throw new Error('TrunkSignature.oxygen must be an object');
  }

  const oxygen = sig.oxygen as Record<string, unknown>;
  if (typeof oxygen.level !== 'number' || oxygen.level < 0 || oxygen.level > 100) {
    throw new Error('TrunkSignature.oxygen.level must be a number in [0, 100]');
  }
  if (typeof oxygen.amplitude !== 'number' || oxygen.amplitude < 0 || oxygen.amplitude > 1) {
    throw new Error('TrunkSignature.oxygen.amplitude must be a number in [0, 1]');
  }
  if (typeof oxygen.frequency !== 'number') {
    throw new Error('TrunkSignature.oxygen.frequency must be a number');
  }
  if (typeof oxygen.phase !== 'number' || oxygen.phase < 0 || oxygen.phase >= 2 * Math.PI) {
    throw new Error('TrunkSignature.oxygen.phase must be a number in [0, 2π)');
  }

  // Source hash validation
  if (typeof sig.sourceHash !== 'string') {
    throw new Error('TrunkSignature.sourceHash must be a string');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER PARAMS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate RenderParams
 *
 * @throws Error if validation fails
 */
export function validateRenderParams(params: unknown): asserts params is RenderParams {
  if (!params || typeof params !== 'object') {
    throw new Error('RenderParams must be an object');
  }

  const p = params as Record<string, unknown>;

  // Basic fields
  if (typeof p.profileId !== 'string') {
    throw new Error('RenderParams.profileId must be a string');
  }
  if (typeof p.profileVersion !== 'string') {
    throw new Error('RenderParams.profileVersion must be a string');
  }

  // Viewport
  if (!p.viewport || typeof p.viewport !== 'object') {
    throw new Error('RenderParams.viewport must be an object');
  }
  const viewport = p.viewport as Record<string, unknown>;
  if (typeof viewport.width !== 'number' || viewport.width < 64 || viewport.width > 4096) {
    throw new Error('RenderParams.viewport.width must be 64-4096');
  }
  if (typeof viewport.height !== 'number' || viewport.height < 64 || viewport.height > 4096) {
    throw new Error('RenderParams.viewport.height must be 64-4096');
  }

  // Calibration
  if (!p.calibration || typeof p.calibration !== 'object') {
    throw new Error('RenderParams.calibration must be an object');
  }
  const cal = p.calibration as Record<string, unknown>;
  if (typeof cal.anisotropyMin !== 'number') {
    throw new Error('RenderParams.calibration.anisotropyMin must be a number');
  }
  if (typeof cal.anisotropyMax !== 'number') {
    throw new Error('RenderParams.calibration.anisotropyMax must be a number');
  }
  if (typeof cal.opacityBase !== 'number') {
    throw new Error('RenderParams.calibration.opacityBase must be a number');
  }
  if (typeof cal.opacityZCoefficient !== 'number') {
    throw new Error('RenderParams.calibration.opacityZCoefficient must be a number');
  }
  if (typeof cal.oxygenAmplitudeMax !== 'number') {
    throw new Error('RenderParams.calibration.oxygenAmplitudeMax must be a number');
  }
  if (typeof cal.renderTimeoutMs !== 'number') {
    throw new Error('RenderParams.calibration.renderTimeoutMs must be a number');
  }

  // Rendering
  if (!p.rendering || typeof p.rendering !== 'object') {
    throw new Error('RenderParams.rendering must be an object');
  }
  const render = p.rendering as Record<string, unknown>;
  if (typeof render.deviceScaleFactor !== 'number') {
    throw new Error('RenderParams.rendering.deviceScaleFactor must be a number');
  }
  if (render.colorSpace !== 'sRGB') {
    throw new Error('RenderParams.rendering.colorSpace must be "sRGB"');
  }
  if (typeof render.pathResolution !== 'number') {
    throw new Error('RenderParams.rendering.pathResolution must be a number');
  }
  if (typeof render.baseRadius !== 'number') {
    throw new Error('RenderParams.rendering.baseRadius must be a number');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER REPORT SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List of allowed fields in render_report.json
 * FROZEN - no additional fields allowed
 */
const ALLOWED_REPORT_FIELDS = new Set([
  'report_version',
  'render_profile_id',
  'render_timestamp_utc',
  'environment',
  'inputs',
  'rendering',
  'calibration',
  'outputs',
  'determinism',
]);

const ALLOWED_ENVIRONMENT_FIELDS = new Set(['docker', 'runtime', 'lockfiles', 'os']);
const ALLOWED_DOCKER_FIELDS = new Set(['image_name', 'image_digest']);
const ALLOWED_RUNTIME_FIELDS = new Set(['node', 'playwright', 'chromium']);
const ALLOWED_LOCKFILES_FIELDS = new Set(['package_lock_sha256']);
const ALLOWED_OS_FIELDS = new Set(['kernel', 'arch']);
const ALLOWED_INPUTS_FIELDS = new Set(['trunk_signature_hash', 'render_profile_hash']);
const ALLOWED_RENDERING_FIELDS = new Set([
  'viewport', 'device_scale_factor', 'color_space',
  'antialiasing', 'fonts', 'svg_renderer', 'gpu'
]);
const ALLOWED_VIEWPORT_FIELDS = new Set(['width', 'height']);
const ALLOWED_CALIBRATION_FIELDS = new Set([
  'anisotropy_min', 'anisotropy_max', 'opacity_base',
  'opacity_z_coefficient', 'oxygen_amplitude_max', 'render_timeout_ms'
]);
const ALLOWED_OUTPUTS_FIELDS = new Set(['svg', 'png']);
const ALLOWED_OUTPUT_ITEM_FIELDS = new Set(['path', 'sha256']);
const ALLOWED_DETERMINISM_FIELDS = new Set(['expected_behavior', 'runs_verified', 'status']);

/**
 * Validate render_report.json against FROZEN schema
 *
 * @throws Error if schema is violated (including extra fields)
 */
export function validateRenderReportSchema(report: unknown): asserts report is RenderReport {
  if (!report || typeof report !== 'object') {
    throw new Error('RenderReport must be an object');
  }

  const r = report as Record<string, unknown>;

  // Check top-level fields
  checkExtraFields('RenderReport', Object.keys(r), ALLOWED_REPORT_FIELDS);

  // Validate required fields
  if (r.report_version !== '1.0') {
    throw new Error('RenderReport.report_version must be "1.0"');
  }

  if (typeof r.render_profile_id !== 'string') {
    throw new Error('RenderReport.render_profile_id must be a string');
  }

  if (typeof r.render_timestamp_utc !== 'string') {
    throw new Error('RenderReport.render_timestamp_utc must be an ISO-8601 string');
  }

  // Validate environment
  validateEnvironment(r.environment);

  // Validate inputs
  validateInputs(r.inputs);

  // Validate rendering
  validateRendering(r.rendering);

  // Validate calibration
  validateCalibration(r.calibration);

  // Validate outputs
  validateOutputs(r.outputs);

  // Validate determinism
  validateDeterminism(r.determinism);
}

function checkExtraFields(context: string, actual: string[], allowed: Set<string>): void {
  for (const field of actual) {
    if (!allowed.has(field)) {
      throw new Error(`SCHEMA VIOLATION: ${context} has extra field "${field}" - NOT ALLOWED`);
    }
  }
}

function validateEnvironment(env: unknown): void {
  if (!env || typeof env !== 'object') {
    throw new Error('RenderReport.environment must be an object');
  }
  const e = env as Record<string, unknown>;
  checkExtraFields('environment', Object.keys(e), ALLOWED_ENVIRONMENT_FIELDS);

  // docker
  if (!e.docker || typeof e.docker !== 'object') throw new Error('environment.docker required');
  checkExtraFields('environment.docker', Object.keys(e.docker as object), ALLOWED_DOCKER_FIELDS);

  // runtime
  if (!e.runtime || typeof e.runtime !== 'object') throw new Error('environment.runtime required');
  checkExtraFields('environment.runtime', Object.keys(e.runtime as object), ALLOWED_RUNTIME_FIELDS);

  // lockfiles
  if (!e.lockfiles || typeof e.lockfiles !== 'object') throw new Error('environment.lockfiles required');
  checkExtraFields('environment.lockfiles', Object.keys(e.lockfiles as object), ALLOWED_LOCKFILES_FIELDS);

  // os
  if (!e.os || typeof e.os !== 'object') throw new Error('environment.os required');
  checkExtraFields('environment.os', Object.keys(e.os as object), ALLOWED_OS_FIELDS);
}

function validateInputs(inputs: unknown): void {
  if (!inputs || typeof inputs !== 'object') {
    throw new Error('RenderReport.inputs must be an object');
  }
  checkExtraFields('inputs', Object.keys(inputs as object), ALLOWED_INPUTS_FIELDS);
}

function validateRendering(rendering: unknown): void {
  if (!rendering || typeof rendering !== 'object') {
    throw new Error('RenderReport.rendering must be an object');
  }
  const r = rendering as Record<string, unknown>;
  checkExtraFields('rendering', Object.keys(r), ALLOWED_RENDERING_FIELDS);

  if (r.viewport && typeof r.viewport === 'object') {
    checkExtraFields('rendering.viewport', Object.keys(r.viewport as object), ALLOWED_VIEWPORT_FIELDS);
  }
}

function validateCalibration(calibration: unknown): void {
  if (!calibration || typeof calibration !== 'object') {
    throw new Error('RenderReport.calibration must be an object');
  }
  checkExtraFields('calibration', Object.keys(calibration as object), ALLOWED_CALIBRATION_FIELDS);
}

function validateOutputs(outputs: unknown): void {
  if (!outputs || typeof outputs !== 'object') {
    throw new Error('RenderReport.outputs must be an object');
  }
  const o = outputs as Record<string, unknown>;
  checkExtraFields('outputs', Object.keys(o), ALLOWED_OUTPUTS_FIELDS);

  if (o.svg && typeof o.svg === 'object') {
    checkExtraFields('outputs.svg', Object.keys(o.svg as object), ALLOWED_OUTPUT_ITEM_FIELDS);
  }
  if (o.png && typeof o.png === 'object') {
    checkExtraFields('outputs.png', Object.keys(o.png as object), ALLOWED_OUTPUT_ITEM_FIELDS);
  }
}

function validateDeterminism(determinism: unknown): void {
  if (!determinism || typeof determinism !== 'object') {
    throw new Error('RenderReport.determinism must be an object');
  }
  checkExtraFields('determinism', Object.keys(determinism as object), ALLOWED_DETERMINISM_FIELDS);

  const d = determinism as Record<string, unknown>;
  if (d.expected_behavior !== 'same_input_same_output') {
    throw new Error('determinism.expected_behavior must be "same_input_same_output"');
  }
  if (d.status !== 'PASS' && d.status !== 'FAIL') {
    throw new Error('determinism.status must be "PASS" or "FAIL"');
  }
}
