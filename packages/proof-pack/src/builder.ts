/**
 * @fileoverview OMEGA Proof Pack - Builder
 * @module @omega/proof-pack/builder
 *
 * Builds proof packs from evidence files.
 */

import { sha256 } from '@omega/orchestrator-core';
import type {
  ProofPackManifest,
  ProofPackBundle,
  ProofPackOptions,
  ProofPackMetadata,
  EvidenceEntry,
  EvidenceFile,
  EvidenceType,
} from './types.js';
import {
  MANIFEST_VERSION,
  GENERATOR_VERSION,
  DEFAULT_STANDARD,
  MIME_TYPES,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builder for creating proof packs.
 */
export class ProofPackBuilder {
  private readonly options: ProofPackOptions;
  private readonly evidence: EvidenceEntry[] = [];
  private readonly content: Map<string, string> = new Map();
  private evidenceCounter = 0;

  constructor(options: ProofPackOptions) {
    this.options = options;
  }

  /**
   * Add an evidence file.
   */
  addEvidence(file: EvidenceFile): this {
    const id = this.generateEvidenceId(file.type);
    const contentStr = typeof file.content === 'string'
      ? file.content
      : file.content.toString('base64');
    const hash = sha256(contentStr);
    const sizeBytes = Buffer.byteLength(contentStr, 'utf8');
    const mimeType = file.mimeType ?? this.detectMimeType(file.path);

    const entry: EvidenceEntry = {
      id,
      type: file.type,
      path: file.path,
      hash,
      createdAt: new Date().toISOString(),
      description: file.description,
      sizeBytes,
      mimeType,
    };

    this.evidence.push(entry);
    this.content.set(file.path, contentStr);

    return this;
  }

  /**
   * Add a test log.
   */
  addTestLog(path: string, content: string, description?: string): this {
    return this.addEvidence({
      type: 'TEST_LOG',
      path,
      content,
      description: description ?? 'Test execution log',
    });
  }

  /**
   * Add a hash manifest.
   */
  addHashManifest(path: string, content: string): this {
    return this.addEvidence({
      type: 'HASH_MANIFEST',
      path,
      content,
      description: 'SHA-256 hash manifest',
    });
  }

  /**
   * Add a certificate.
   */
  addCertificate(path: string, content: string): this {
    return this.addEvidence({
      type: 'CERTIFICATE',
      path,
      content,
      description: 'Phase/module certificate',
    });
  }

  /**
   * Add a source bundle.
   */
  addSourceBundle(path: string, content: string): this {
    return this.addEvidence({
      type: 'SOURCE_BUNDLE',
      path,
      content,
      description: 'Source code snapshot',
    });
  }

  /**
   * Add a configuration file.
   */
  addConfig(path: string, content: string): this {
    return this.addEvidence({
      type: 'CONFIG',
      path,
      content,
      description: 'Configuration file',
    });
  }

  /**
   * Add an artifact.
   */
  addArtifact(path: string, content: string, description?: string): this {
    return this.addEvidence({
      type: 'ARTIFACT',
      path,
      content,
      description: description ?? 'Generated artifact',
    });
  }

  /**
   * Add a recording.
   */
  addRecording(path: string, content: string): this {
    return this.addEvidence({
      type: 'RECORDING',
      path,
      content,
      description: 'Execution recording',
    });
  }

  /**
   * Add an execution trace.
   */
  addTrace(path: string, content: string): this {
    return this.addEvidence({
      type: 'TRACE',
      path,
      content,
      description: 'Execution trace',
    });
  }

  /**
   * Build the proof pack.
   */
  build(): ProofPackBundle {
    const packId = this.generatePackId();
    const createdAt = new Date().toISOString();
    const metadata = this.buildMetadata();
    const rootHash = this.computeRootHash();

    const manifest: ProofPackManifest = {
      version: MANIFEST_VERSION,
      packId,
      name: this.options.name,
      createdAt,
      phase: this.options.phase,
      module: this.options.module,
      evidence: Object.freeze([...this.evidence]),
      metadata,
      rootHash,
    };

    const content: Record<string, string> = {};
    for (const [path, data] of this.content) {
      content[path] = data;
    }

    return Object.freeze({
      manifest: Object.freeze(manifest),
      content: Object.freeze(content),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generatePackId(): string {
    const timestamp = Date.now().toString(36);
    const phase = this.options.phase?.toString().padStart(2, '0') ?? '00';
    return `PACK-${phase}-${timestamp}`;
  }

  private generateEvidenceId(type: EvidenceType): string {
    const counter = (++this.evidenceCounter).toString().padStart(4, '0');
    return `EV-${type.substring(0, 4).toUpperCase()}-${counter}`;
  }

  private buildMetadata(): ProofPackMetadata {
    return Object.freeze({
      standard: this.options.standard ?? DEFAULT_STANDARD,
      generatorVersion: GENERATOR_VERSION,
      commit: this.options.commit,
      tag: this.options.tag,
      tags: this.options.tags ? Object.freeze([...this.options.tags]) : undefined,
      certifiedBy: this.options.certifiedBy,
    });
  }

  private computeRootHash(): string {
    // Sort evidence by ID for determinism
    const sortedHashes = [...this.evidence]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((e) => e.hash)
      .join(':');

    return sha256(sortedHashes);
  }

  private detectMimeType(path: string): string {
    const ext = path.substring(path.lastIndexOf('.'));
    return MIME_TYPES[ext] ?? 'application/octet-stream';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a proof pack builder.
 */
export function createProofPackBuilder(options: ProofPackOptions): ProofPackBuilder {
  return new ProofPackBuilder(options);
}

/**
 * Create a proof pack for a phase.
 */
export function createPhaseProofPack(
  phase: number,
  module: string,
  options: Partial<ProofPackOptions> = {}
): ProofPackBuilder {
  return new ProofPackBuilder({
    name: `Phase ${phase} - ${module}`,
    phase,
    module,
    ...options,
  });
}
