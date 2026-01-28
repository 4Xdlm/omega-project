/**
 * OMEGA Delivery Renderer v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Format-specific rendering for TEXT, MARKDOWN, JSON_PACK.
 * CRITICAL: Body bytes are NEVER modified - only envelope is added.
 *
 * INVARIANTS:
 * - H-INV-01: Body bytes preserved EXACTLY
 * - H-INV-05: Stable hashes (deterministic output)
 * - H-INV-06: UTF-8 BOM-less output
 * - H-INV-07: LF line endings only
 *
 * SPEC: DELIVERY_SPEC v1.0 §H2
 */

import type {
  DeliveryProfile,
  DeliveryFormat,
  DeliveryInput,
  DeliveryArtifact,
  Sha256,
  ISO8601,
} from './types';
import { isDeliveryFormat } from './types';
import {
  buildHeaderBlock,
  buildFooterBlock,
  assembleArtifact,
  validateBody,
  getByteLength,
} from './normalizer';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of rendering an artifact.
 */
export interface RenderResult {
  readonly content: string;
  readonly bodyHash: Sha256;
  readonly contentHash: Sha256;
  readonly byteLength: number;
  readonly format: DeliveryFormat;
  readonly profileId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes SHA256 hash of content.
 */
function computeHash(content: string): Sha256 {
  return createHash('sha256').update(content, 'utf-8').digest('hex') as Sha256;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders TEXT format artifact.
 * Body is preserved exactly with optional envelope.
 *
 * @param body - Validated text body (NEVER modified)
 * @param profile - Delivery profile
 * @returns Rendered content
 */
function renderText(body: string, profile: DeliveryProfile): string {
  const header = buildHeaderBlock(profile);
  const footer = buildFooterBlock(profile);
  return assembleArtifact(header, body, footer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders MARKDOWN format artifact.
 * Body is preserved exactly with optional envelope (frontmatter/footer).
 *
 * @param body - Validated text body (NEVER modified)
 * @param profile - Delivery profile
 * @returns Rendered content
 */
function renderMarkdown(body: string, profile: DeliveryProfile): string {
  const header = buildHeaderBlock(profile);
  const footer = buildFooterBlock(profile);
  return assembleArtifact(header, body, footer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON_PACK RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JSON Pack structure for delivery.
 */
interface JsonPackStructure {
  readonly meta: {
    readonly format: 'JSON_PACK';
    readonly version: '1.0';
    readonly profileId: string;
    readonly timestamp: ISO8601;
    readonly bodyHash: Sha256;
    readonly byteLength: number;
  };
  readonly body: string;
}

/**
 * Renders JSON_PACK format artifact.
 * Body is preserved exactly inside JSON structure.
 *
 * @param body - Validated text body (NEVER modified)
 * @param profile - Delivery profile
 * @param timestamp - ISO8601 timestamp for determinism
 * @returns Rendered JSON content
 */
function renderJsonPack(
  body: string,
  profile: DeliveryProfile,
  timestamp: ISO8601
): string {
  const bodyHash = computeHash(body);
  const byteLength = getByteLength(body);

  const pack: JsonPackStructure = {
    meta: {
      format: 'JSON_PACK',
      version: '1.0',
      profileId: profile.profileId,
      timestamp,
      bodyHash,
      byteLength,
    },
    body,
  };

  // Deterministic JSON output: sorted keys, 2-space indent
  return JSON.stringify(pack, null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render options for customization.
 */
export interface RenderOptions {
  readonly timestamp?: ISO8601;
}

/**
 * Renders artifact for the specified format.
 * H-INV-01: Body bytes preserved EXACTLY.
 *
 * @param input - Delivery input with body and profile
 * @param options - Optional render options
 * @returns Render result with content and metadata
 * @throws Error if body validation fails or format unsupported
 */
export function render(
  input: DeliveryInput,
  options: RenderOptions = {}
): RenderResult {
  const { body, profile } = input;

  // Validate body (H-INV-06, H-INV-07)
  const validation = validateBody(body);
  if (!validation.valid) {
    throw new Error(`Body validation failed: ${validation.violations.join('; ')}`);
  }

  // Validate format
  if (!isDeliveryFormat(profile.format)) {
    throw new Error(`Unsupported format: ${profile.format}`);
  }

  // Generate timestamp for determinism
  const timestamp = options.timestamp ?? (new Date().toISOString() as ISO8601);

  let content: string;

  switch (profile.format) {
    case 'TEXT':
      content = renderText(body, profile);
      break;

    case 'MARKDOWN':
      content = renderMarkdown(body, profile);
      break;

    case 'JSON_PACK':
      content = renderJsonPack(body, profile, timestamp);
      break;

    case 'PROOF_PACK':
    case 'HASH_CHAIN':
      // These formats are handled by specialized modules
      throw new Error(
        `Format ${profile.format} must use specialized renderer`
      );

    default: {
      const _exhaustive: never = profile.format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }

  const bodyHash = computeHash(body);
  const contentHash = computeHash(content);

  return Object.freeze({
    content,
    bodyHash,
    contentHash,
    byteLength: getByteLength(content),
    format: profile.format,
    profileId: profile.profileId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a complete DeliveryArtifact from render result.
 *
 * @param result - Render result
 * @param filename - Output filename
 * @param timestamp - ISO8601 timestamp
 * @returns Complete delivery artifact
 */
export function buildArtifact(
  result: RenderResult,
  filename: string,
  timestamp: ISO8601
): DeliveryArtifact {
  return Object.freeze({
    filename,
    format: result.format,
    content: result.content,
    hash: result.contentHash,
    bodyHash: result.bodyHash,
    byteLength: result.byteLength,
    timestamp,
    profileId: result.profileId,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets the default filename for an artifact.
 *
 * @param profile - Delivery profile
 * @param baseName - Base name without extension
 * @returns Filename with extension
 */
export function getDefaultFilename(
  profile: DeliveryProfile,
  baseName: string
): string {
  return `${baseName}${profile.extension}`;
}

/**
 * Checks if a format is supported by this renderer.
 *
 * @param format - Format to check
 * @returns true if format can be rendered
 */
export function isRenderableFormat(format: DeliveryFormat): boolean {
  return format === 'TEXT' || format === 'MARKDOWN' || format === 'JSON_PACK';
}

/**
 * Gets formats that require specialized renderers.
 *
 * @returns Array of specialized formats
 */
export function getSpecializedFormats(): readonly DeliveryFormat[] {
  return Object.freeze(['PROOF_PACK', 'HASH_CHAIN'] as const);
}
