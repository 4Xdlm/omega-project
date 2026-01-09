/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — ARTIFACT SERIALIZATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module artifact/serialization
 * @version 2.0.0
 * @license MIT
 * 
 * SERIALIZATION — ARTIFACT IMPORT/EXPORT
 * =======================================
 * 
 * Handles serialization and deserialization of certification artifacts:
 * - JSON export/import
 * - YAML export (human-readable)
 * - Compact binary format (future)
 * - Format validation
 * 
 * INVARIANTS:
 * - INV-SER-01: Serialization is reversible (JSON → Artifact → JSON)
 * - INV-SER-02: Hash is preserved through serialization
 * - INV-SER-03: Invalid format is rejected
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  type CertificationArtifact,
  type EvidenceItem,
  type ArtifactStatus,
  isValidStatus,
  isValidEvidenceType,
  verifyArtifactHash
} from './artifact.js';

import { type RegionId, isRegionId } from '../regions/definitions.js';
import { type ProofStrength, isProofStrength } from '../foundation/proof_strength.js';
import { isValidSHA256 } from '../foundation/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialization format
 */
export type SerializationFormat = 'json' | 'yaml' | 'compact';

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Format to use */
  readonly format: SerializationFormat;
  
  /** Pretty print (for JSON) */
  readonly pretty?: boolean;
  
  /** Include computed fields */
  readonly includeComputed?: boolean;
}

/**
 * Deserialization result
 */
export interface DeserializationResult {
  /** Success status */
  readonly success: boolean;
  
  /** Deserialized artifact (if success) */
  readonly artifact: CertificationArtifact | null;
  
  /** Error message (if failure) */
  readonly error: string | null;
  
  /** Hash verification passed */
  readonly hashVerified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize artifact to JSON
 */
export function toJSON(
  artifact: CertificationArtifact,
  pretty: boolean = false
): string {
  const json = {
    $schema: 'omega-sentinel-artifact-v2.0.0',
    id: artifact.id,
    version: artifact.version,
    status: artifact.status,
    createdAt: artifact.createdAt,
    modifiedAt: artifact.modifiedAt,
    sealedAt: artifact.sealedAt,
    invariantId: artifact.invariantId,
    invariantHash: artifact.invariantHash,
    region: artifact.region,
    metrics: {
      proofStrength: artifact.metrics.proofStrength,
      survivalRate: artifact.metrics.survivalRate,
      coverage: artifact.metrics.coverage,
      proofCount: artifact.metrics.proofCount,
      mandatoryCoverage: artifact.metrics.mandatoryCoverage,
      hasExternalCertifier: artifact.metrics.hasExternalCertifier,
      isSystemValid: artifact.metrics.isSystemValid
    },
    evidence: artifact.evidence.map(e => ({
      type: e.type,
      id: e.id,
      description: e.description,
      ...(e.strength && { strength: e.strength }),
      timestamp: e.timestamp,
      contentHash: e.contentHash,
      ...(e.sourceUri && { sourceUri: e.sourceUri })
    })),
    previousArtifactHash: artifact.previousArtifactHash,
    hash: artifact.hash,
    externalCertifierId: artifact.externalCertifierId,
    externalCertifierSignature: artifact.externalCertifierSignature,
    notes: artifact.notes
  };
  
  return pretty ? JSON.stringify(json, null, 2) : JSON.stringify(json);
}

/**
 * Deserialize artifact from JSON
 */
export function fromJSON(json: string): DeserializationResult {
  try {
    const parsed = JSON.parse(json);
    return validateAndCreate(parsed);
  } catch (error) {
    return {
      success: false,
      artifact: null,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
      hashVerified: false
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// YAML SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize artifact to YAML-like format
 * (Simple implementation without external dependency)
 */
export function toYAML(artifact: CertificationArtifact): string {
  const lines: string[] = [
    '# OMEGA SENTINEL SUPREME — Certification Artifact',
    `# Generated: ${new Date().toISOString()}`,
    '',
    `$schema: omega-sentinel-artifact-v2.0.0`,
    `id: ${artifact.id}`,
    `version: ${artifact.version}`,
    `status: ${artifact.status}`,
    `createdAt: ${artifact.createdAt}`,
    `modifiedAt: ${artifact.modifiedAt}`,
    `sealedAt: ${artifact.sealedAt ?? 'null'}`,
    '',
    '# Invariant Reference',
    `invariantId: ${artifact.invariantId}`,
    `invariantHash: ${artifact.invariantHash}`,
    '',
    '# Certification',
    `region: ${artifact.region}`,
    '',
    'metrics:',
    `  proofStrength: ${artifact.metrics.proofStrength}`,
    `  survivalRate: ${artifact.metrics.survivalRate}`,
    `  coverage: ${artifact.metrics.coverage}`,
    `  proofCount: ${artifact.metrics.proofCount}`,
    `  mandatoryCoverage: ${artifact.metrics.mandatoryCoverage}`,
    `  hasExternalCertifier: ${artifact.metrics.hasExternalCertifier}`,
    `  isSystemValid: ${artifact.metrics.isSystemValid}`,
    ''
  ];
  
  // Evidence
  lines.push('evidence:');
  if (artifact.evidence.length === 0) {
    lines.push('  []');
  } else {
    for (const e of artifact.evidence) {
      lines.push(`  - type: ${e.type}`);
      lines.push(`    id: ${e.id}`);
      lines.push(`    description: "${e.description}"`);
      if (e.strength) {
        lines.push(`    strength: ${e.strength}`);
      }
      lines.push(`    timestamp: ${e.timestamp}`);
      lines.push(`    contentHash: ${e.contentHash}`);
      if (e.sourceUri) {
        lines.push(`    sourceUri: ${e.sourceUri}`);
      }
    }
  }
  
  lines.push('');
  lines.push('# Chain');
  lines.push(`previousArtifactHash: ${artifact.previousArtifactHash ?? 'null'}`);
  lines.push(`hash: ${artifact.hash ?? 'null'}`);
  lines.push('');
  lines.push('# External Certification');
  lines.push(`externalCertifierId: ${artifact.externalCertifierId ?? 'null'}`);
  lines.push(`externalCertifierSignature: ${artifact.externalCertifierSignature ?? 'null'}`);
  lines.push('');
  lines.push('# Notes');
  lines.push('notes:');
  if (artifact.notes.length === 0) {
    lines.push('  []');
  } else {
    for (const note of artifact.notes) {
      lines.push(`  - "${note}"`);
    }
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate and create artifact from parsed data
 */
function validateAndCreate(data: unknown): DeserializationResult {
  // Type check
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      artifact: null,
      error: 'Invalid data: expected object',
      hashVerified: false
    };
  }
  
  const obj = data as Record<string, unknown>;
  
  // Required fields
  const requiredFields = [
    'id', 'version', 'status', 'createdAt', 'modifiedAt',
    'invariantId', 'invariantHash', 'region', 'metrics'
  ];
  
  for (const field of requiredFields) {
    if (!(field in obj)) {
      return {
        success: false,
        artifact: null,
        error: `Missing required field: ${field}`,
        hashVerified: false
      };
    }
  }
  
  // Validate status
  if (!isValidStatus(obj.status)) {
    return {
      success: false,
      artifact: null,
      error: `Invalid status: ${obj.status}`,
      hashVerified: false
    };
  }
  
  // Validate region
  if (!isRegionId(obj.region)) {
    return {
      success: false,
      artifact: null,
      error: `Invalid region: ${obj.region}`,
      hashVerified: false
    };
  }
  
  // Validate metrics
  const metricsResult = validateMetrics(obj.metrics);
  if (!metricsResult.valid) {
    return {
      success: false,
      artifact: null,
      error: metricsResult.error!,
      hashVerified: false
    };
  }
  
  // Validate evidence
  const evidenceResult = validateEvidence(obj.evidence);
  if (!evidenceResult.valid) {
    return {
      success: false,
      artifact: null,
      error: evidenceResult.error!,
      hashVerified: false
    };
  }
  
  // Create artifact
  const artifact: CertificationArtifact = Object.freeze({
    id: String(obj.id),
    version: String(obj.version),
    status: obj.status as ArtifactStatus,
    createdAt: String(obj.createdAt),
    modifiedAt: String(obj.modifiedAt),
    sealedAt: obj.sealedAt ? String(obj.sealedAt) : null,
    invariantId: String(obj.invariantId),
    invariantHash: String(obj.invariantHash),
    region: obj.region as RegionId,
    metrics: metricsResult.metrics!,
    evidence: Object.freeze(evidenceResult.evidence!),
    previousArtifactHash: obj.previousArtifactHash ? String(obj.previousArtifactHash) : null,
    hash: obj.hash ? String(obj.hash) : null,
    externalCertifierId: obj.externalCertifierId ? String(obj.externalCertifierId) : null,
    externalCertifierSignature: obj.externalCertifierSignature ? String(obj.externalCertifierSignature) : null,
    notes: Object.freeze((obj.notes as string[]) ?? [])
  });
  
  // Verify hash if present
  const hashVerified = artifact.hash ? verifyArtifactHash(artifact) : true;
  
  return {
    success: true,
    artifact,
    error: null,
    hashVerified
  };
}

/**
 * Validate metrics object
 */
function validateMetrics(metrics: unknown): {
  valid: boolean;
  metrics?: CertificationArtifact['metrics'];
  error?: string;
} {
  if (!metrics || typeof metrics !== 'object') {
    return { valid: false, error: 'Invalid metrics: expected object' };
  }
  
  const m = metrics as Record<string, unknown>;
  
  // Check required fields
  const requiredFields = [
    'proofStrength', 'survivalRate', 'coverage', 
    'proofCount', 'mandatoryCoverage', 'hasExternalCertifier', 'isSystemValid'
  ];
  
  for (const field of requiredFields) {
    if (!(field in m)) {
      return { valid: false, error: `Missing metrics field: ${field}` };
    }
  }
  
  // Validate proof strength
  if (!isProofStrength(m.proofStrength)) {
    return { valid: false, error: `Invalid proof strength: ${m.proofStrength}` };
  }
  
  // Validate numeric fields
  if (typeof m.survivalRate !== 'number' || m.survivalRate < 0 || m.survivalRate > 1) {
    return { valid: false, error: 'Invalid survival rate' };
  }
  
  if (typeof m.coverage !== 'number' || m.coverage < 0 || m.coverage > 1) {
    return { valid: false, error: 'Invalid coverage' };
  }
  
  if (typeof m.proofCount !== 'number' || m.proofCount < 0) {
    return { valid: false, error: 'Invalid proof count' };
  }
  
  if (typeof m.mandatoryCoverage !== 'number' || m.mandatoryCoverage < 0 || m.mandatoryCoverage > 1) {
    return { valid: false, error: 'Invalid mandatory coverage' };
  }
  
  return {
    valid: true,
    metrics: Object.freeze({
      proofStrength: m.proofStrength as ProofStrength,
      survivalRate: m.survivalRate as number,
      coverage: m.coverage as number,
      proofCount: m.proofCount as number,
      mandatoryCoverage: m.mandatoryCoverage as number,
      hasExternalCertifier: Boolean(m.hasExternalCertifier),
      isSystemValid: Boolean(m.isSystemValid)
    })
  };
}

/**
 * Validate evidence array
 */
function validateEvidence(evidence: unknown): {
  valid: boolean;
  evidence?: readonly EvidenceItem[];
  error?: string;
} {
  if (!evidence) {
    return { valid: true, evidence: [] };
  }
  
  if (!Array.isArray(evidence)) {
    return { valid: false, error: 'Invalid evidence: expected array' };
  }
  
  const items: EvidenceItem[] = [];
  
  for (let i = 0; i < evidence.length; i++) {
    const e = evidence[i];
    
    if (!e || typeof e !== 'object') {
      return { valid: false, error: `Invalid evidence item at index ${i}` };
    }
    
    const item = e as Record<string, unknown>;
    
    if (!isValidEvidenceType(item.type)) {
      return { valid: false, error: `Invalid evidence type at index ${i}: ${item.type}` };
    }
    
    if (typeof item.id !== 'string') {
      return { valid: false, error: `Missing evidence id at index ${i}` };
    }
    
    if (typeof item.description !== 'string') {
      return { valid: false, error: `Missing evidence description at index ${i}` };
    }
    
    if (typeof item.timestamp !== 'string') {
      return { valid: false, error: `Missing evidence timestamp at index ${i}` };
    }
    
    if (typeof item.contentHash !== 'string') {
      return { valid: false, error: `Missing evidence contentHash at index ${i}` };
    }
    
    items.push(Object.freeze({
      type: item.type as EvidenceItem['type'],
      id: item.id,
      description: item.description,
      strength: item.strength as ProofStrength | undefined,
      timestamp: item.timestamp,
      contentHash: item.contentHash,
      sourceUri: item.sourceUri as string | undefined
    }));
  }
  
  return { valid: true, evidence: items };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize artifact to specified format
 */
export function serialize(
  artifact: CertificationArtifact,
  options: SerializationOptions = { format: 'json' }
): string {
  switch (options.format) {
    case 'json':
      return toJSON(artifact, options.pretty);
    case 'yaml':
      return toYAML(artifact);
    case 'compact':
      // For now, compact is just minified JSON
      return toJSON(artifact, false);
    default:
      throw new Error(`Unknown format: ${options.format}`);
  }
}

/**
 * Check if JSON is valid artifact format
 */
export function isValidArtifactJSON(json: string): boolean {
  return fromJSON(json).success;
}

/**
 * Get artifact summary as string
 */
export function getArtifactSummary(artifact: CertificationArtifact): string {
  return [
    `Artifact: ${artifact.id}`,
    `Status: ${artifact.status}`,
    `Invariant: ${artifact.invariantId}`,
    `Region: ${artifact.region}`,
    `Evidence: ${artifact.evidence.length} items`,
    `Hash: ${artifact.hash ?? 'not sealed'}`
  ].join('\n');
}
