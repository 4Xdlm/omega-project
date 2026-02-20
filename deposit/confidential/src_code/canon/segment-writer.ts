/**
 * OMEGA Canon Segment Writer v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-01: APPEND_ONLY - Jamais de delete/update
 * - INV-E-SEG-01: Segments ordonnés séquentiellement
 * - INV-E-SEG-02: Append en fin de segment uniquement
 * - INV-E-SEG-03: Segment sealed = immuable
 * - INV-E-SEG-04: Rotation à SEGMENT_MAX_BYTES
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §8
 */

import { appendFile, mkdir, stat, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Clock } from '../shared/clock';
import { withLock } from '../shared/lock';
import { canonicalize, sha256 } from '../shared/canonical';
import type { ConfigResolver } from './config-symbol';
import {
  SEGMENT_MAX_BYTES,
  SEGMENT_PREFIX,
  SEGMENT_EXTENSION,
} from './config-symbol';
import type { CanonClaim, ChainHash, MonoNs } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Segment writer interface.
 */
export interface SegmentWriter {
  /** Append a claim to the current segment */
  append(claim: CanonClaim): Promise<void>;

  /** Force rotation to new segment */
  rotate(): Promise<void>;

  /** Get current segment ID */
  getCurrentSegmentId(): string;

  /** Flush buffer to disk */
  flush(): Promise<void>;

  /** Close writer and release resources */
  close(): Promise<void>;

  /** Get segment info */
  getSegmentInfo(): SegmentInfo;
}

/**
 * Information about the current segment.
 */
export interface SegmentInfo {
  readonly id: string;
  readonly path: string;
  readonly claimCount: number;
  readonly byteSize: number;
  readonly firstClaimId: string | null;
  readonly lastClaimId: string | null;
}

/**
 * Options for creating a segment writer.
 */
export interface SegmentWriterOptions {
  readonly storageDir: string;
  readonly clock: Clock;
  readonly config: ConfigResolver;
  readonly segmentId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE SEGMENT WRITER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * File-based segment writer.
 * Writes claims as NDJSON (newline-delimited JSON).
 *
 * INV-E-01: Append-only
 * INV-E-SEG-04: Rotation at SEGMENT_MAX_BYTES
 */
export class FileSegmentWriter implements SegmentWriter {
  private readonly storageDir: string;
  private readonly clock: Clock;
  private readonly maxBytes: number;
  private readonly prefix: string;
  private readonly extension: string;

  private segmentId: string;
  private segmentPath: string;
  private claimCount: number = 0;
  private byteSize: number = 0;
  private firstClaimId: string | null = null;
  private lastClaimId: string | null = null;
  private buffer: string[] = [];
  private closed: boolean = false;

  constructor(options: SegmentWriterOptions) {
    this.storageDir = options.storageDir;
    this.clock = options.clock;
    this.maxBytes = options.config.resolveNumber(SEGMENT_MAX_BYTES);
    this.prefix = options.config.resolveString(SEGMENT_PREFIX);
    this.extension = options.config.resolveString(SEGMENT_EXTENSION);

    // Generate segment ID if not provided
    this.segmentId = options.segmentId ?? this.generateSegmentId();
    this.segmentPath = this.getSegmentPath(this.segmentId);
  }

  /**
   * Initialize the segment writer.
   * Creates storage directory if needed.
   */
  async init(): Promise<void> {
    if (!existsSync(this.storageDir)) {
      await mkdir(this.storageDir, { recursive: true });
    }

    // Check existing segment size
    if (existsSync(this.segmentPath)) {
      const stats = await stat(this.segmentPath);
      this.byteSize = stats.size;

      // Count existing claims
      const content = await readFile(this.segmentPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      this.claimCount = lines.length;

      if (lines.length > 0) {
        const first = JSON.parse(lines[0]) as CanonClaim;
        const last = JSON.parse(lines[lines.length - 1]) as CanonClaim;
        this.firstClaimId = first.id;
        this.lastClaimId = last.id;
      }
    }
  }

  /**
   * Append a claim to the current segment.
   *
   * INV-E-01: Append-only
   * INV-E-SEG-02: Append at end only
   */
  async append(claim: CanonClaim): Promise<void> {
    if (this.closed) {
      throw new Error('SegmentWriter is closed');
    }

    // Serialize claim as canonical NDJSON line
    const line = canonicalize(claim) + '\n';
    const lineBytes = Buffer.byteLength(line, 'utf-8');

    // Check if rotation needed (INV-E-SEG-04)
    if (this.byteSize + lineBytes > this.maxBytes && this.claimCount > 0) {
      await this.rotate();
    }

    // Buffer the line
    this.buffer.push(line);
    this.byteSize += lineBytes;
    this.claimCount++;

    if (this.firstClaimId === null) {
      this.firstClaimId = claim.id;
    }
    this.lastClaimId = claim.id;

    // Auto-flush if buffer is large
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }

  /**
   * Force rotation to a new segment.
   *
   * INV-E-SEG-03: Current segment becomes sealed
   */
  async rotate(): Promise<void> {
    if (this.closed) {
      throw new Error('SegmentWriter is closed');
    }

    // Flush current buffer first
    await this.flush();

    // Generate new segment
    this.segmentId = this.generateSegmentId();
    this.segmentPath = this.getSegmentPath(this.segmentId);
    this.claimCount = 0;
    this.byteSize = 0;
    this.firstClaimId = null;
    this.lastClaimId = null;
  }

  /**
   * Get current segment ID.
   */
  getCurrentSegmentId(): string {
    return this.segmentId;
  }

  /**
   * Flush buffer to disk.
   *
   * Uses file lock for safe concurrent access.
   */
  async flush(): Promise<void> {
    if (this.closed || this.buffer.length === 0) {
      return;
    }

    const data = this.buffer.join('');
    this.buffer = [];

    await withLock(this.segmentPath, async () => {
      await appendFile(this.segmentPath, data, 'utf-8');
    });
  }

  /**
   * Close writer and release resources.
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    await this.flush();
    this.closed = true;
  }

  /**
   * Get current segment info.
   */
  getSegmentInfo(): SegmentInfo {
    return {
      id: this.segmentId,
      path: this.segmentPath,
      claimCount: this.claimCount,
      byteSize: this.byteSize,
      firstClaimId: this.firstClaimId,
      lastClaimId: this.lastClaimId,
    };
  }

  /**
   * Generate a new segment ID based on timestamp.
   */
  private generateSegmentId(): string {
    const mono = this.clock.nowMonoNs();
    return `${this.prefix}${mono.toString(16)}`;
  }

  /**
   * Get the file path for a segment ID.
   */
  private getSegmentPath(segmentId: string): string {
    return join(this.storageDir, `${segmentId}${this.extension}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY SEGMENT WRITER (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory segment writer for testing.
 */
export class InMemorySegmentWriter implements SegmentWriter {
  private segmentId: string;
  private claims: CanonClaim[] = [];
  private segments: Map<string, CanonClaim[]> = new Map();
  private maxClaims: number;
  private segmentCounter: number = 0;

  constructor(maxClaims: number = 100) {
    this.maxClaims = maxClaims;
    this.segmentId = this.generateSegmentId();
    this.segments.set(this.segmentId, []);
  }

  async append(claim: CanonClaim): Promise<void> {
    const currentSegment = this.segments.get(this.segmentId)!;

    if (currentSegment.length >= this.maxClaims) {
      await this.rotate();
    }

    this.segments.get(this.segmentId)!.push(claim);
    this.claims.push(claim);
  }

  async rotate(): Promise<void> {
    this.segmentId = this.generateSegmentId();
    this.segments.set(this.segmentId, []);
  }

  getCurrentSegmentId(): string {
    return this.segmentId;
  }

  async flush(): Promise<void> {
    // No-op for in-memory
  }

  async close(): Promise<void> {
    // No-op for in-memory
  }

  getSegmentInfo(): SegmentInfo {
    const currentSegment = this.segments.get(this.segmentId) ?? [];
    return {
      id: this.segmentId,
      path: `memory://${this.segmentId}`,
      claimCount: currentSegment.length,
      byteSize: 0,
      firstClaimId: currentSegment[0]?.id ?? null,
      lastClaimId: currentSegment[currentSegment.length - 1]?.id ?? null,
    };
  }

  /** Get all claims (test helper) */
  getAllClaims(): CanonClaim[] {
    return [...this.claims];
  }

  /** Get all segments (test helper) */
  getAllSegments(): Map<string, CanonClaim[]> {
    return new Map(this.segments);
  }

  private generateSegmentId(): string {
    return `seg-mem-${this.segmentCounter++}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates and initializes a file segment writer.
 */
export async function createSegmentWriter(
  options: SegmentWriterOptions
): Promise<FileSegmentWriter> {
  const writer = new FileSegmentWriter(options);
  await writer.init();
  return writer;
}

/**
 * Computes hash of a segment file.
 */
export async function computeSegmentHash(segmentPath: string): Promise<ChainHash> {
  const content = await readFile(segmentPath, 'utf-8');
  return sha256(content) as ChainHash;
}

/**
 * Reads all claims from a segment file.
 */
export async function readSegmentClaims(segmentPath: string): Promise<CanonClaim[]> {
  if (!existsSync(segmentPath)) {
    return [];
  }

  const content = await readFile(segmentPath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as CanonClaim);
}
