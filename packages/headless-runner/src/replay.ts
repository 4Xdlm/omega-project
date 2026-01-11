/**
 * @fileoverview Replay Engine for the OMEGA Headless Runner.
 * Enables recording and replaying of deterministic plan executions.
 */

import type { Clock, IdFactory } from '@omega/orchestrator-core';
import { DeterministicClock, SeededIdFactory, sha256, stableStringify } from '@omega/orchestrator-core';
import type { HeadlessRunResult, OutputFiles, LogEntry } from './types.js';

/**
 * Recording of a plan execution.
 */
export interface RunRecording {
  /** Recording version for compatibility */
  readonly version: string;
  /** Original run result */
  readonly result: HeadlessRunResult;
  /** Log entries from the run */
  readonly logs: readonly LogEntry[];
  /** Plan content (JSON string) */
  readonly planContent: string;
  /** Seed used for execution */
  readonly seed: string;
  /** Start time (ms since epoch) */
  readonly startTimeMs: number;
  /** Recording metadata */
  readonly metadata?: RecordingMetadata;
  /** SHA-256 hash of the recording (excluding this field) */
  readonly hash?: string;
}

/**
 * Recording metadata.
 */
export interface RecordingMetadata {
  /** When the recording was created */
  readonly createdAt: string;
  /** Optional description */
  readonly description?: string;
  /** Optional tags for categorization */
  readonly tags?: readonly string[];
  /** Platform info */
  readonly platform?: string;
}

/**
 * Replay result.
 */
export interface ReplayResult {
  /** Whether replay succeeded */
  readonly success: boolean;
  /** Whether replay matched original */
  readonly matched: boolean;
  /** Original result */
  readonly original: HeadlessRunResult;
  /** Replayed result */
  readonly replayed: HeadlessRunResult;
  /** Differences found (if any) */
  readonly differences: ReplayDifference[];
  /** Replay duration in milliseconds */
  readonly replayDurationMs: number;
}

/**
 * Single difference between original and replayed runs.
 */
export interface ReplayDifference {
  /** Field path that differs */
  readonly path: string;
  /** Original value */
  readonly original: unknown;
  /** Replayed value */
  readonly replayed: unknown;
}

/**
 * Recording store interface.
 */
export interface RecordingStore {
  /** Saves a recording */
  save(recording: RunRecording): string;
  /** Loads a recording by ID */
  load(id: string): RunRecording | undefined;
  /** Lists all recording IDs */
  list(): string[];
  /** Deletes a recording */
  delete(id: string): boolean;
  /** Checks if a recording exists */
  exists(id: string): boolean;
}

/**
 * In-memory recording store.
 */
export class InMemoryRecordingStore implements RecordingStore {
  private readonly recordings: Map<string, RunRecording> = new Map();
  private readonly idFactory: IdFactory;

  constructor(idFactory?: IdFactory) {
    this.idFactory = idFactory ?? new SeededIdFactory('recording', 'rec');
  }

  save(recording: RunRecording): string {
    const id = this.idFactory.next();
    this.recordings.set(id, recording);
    return id;
  }

  load(id: string): RunRecording | undefined {
    return this.recordings.get(id);
  }

  list(): string[] {
    return Array.from(this.recordings.keys()).sort();
  }

  delete(id: string): boolean {
    return this.recordings.delete(id);
  }

  exists(id: string): boolean {
    return this.recordings.has(id);
  }
}

/**
 * Creates a recording from a run result.
 */
export function createRecording(
  result: HeadlessRunResult,
  logs: readonly LogEntry[],
  planContent: string,
  seed: string,
  startTimeMs: number,
  metadata?: RecordingMetadata
): RunRecording {
  const recordingWithoutHash: Omit<RunRecording, 'hash'> = {
    version: '1.0.0',
    result,
    logs,
    planContent,
    seed,
    startTimeMs,
    metadata,
  };

  const hash = sha256(stableStringify(recordingWithoutHash));

  return {
    ...recordingWithoutHash,
    hash,
  };
}

/**
 * Validates a recording's integrity.
 */
export function validateRecording(recording: RunRecording): boolean {
  if (!recording.hash) {
    return false;
  }

  const { hash: _storedHash, ...withoutHash } = recording;
  const computedHash = sha256(stableStringify(withoutHash));

  return computedHash === recording.hash;
}

/**
 * Compares two run results for differences.
 */
export function compareResults(
  original: HeadlessRunResult,
  replayed: HeadlessRunResult
): ReplayDifference[] {
  const differences: ReplayDifference[] = [];

  // Compare key fields
  const fieldsToCompare: (keyof HeadlessRunResult)[] = [
    'success',
    'stepsExecuted',
    'stepsSucceeded',
    'stepsFailed',
  ];

  for (const field of fieldsToCompare) {
    if (original[field] !== replayed[field]) {
      differences.push({
        path: field,
        original: original[field],
        replayed: replayed[field],
      });
    }
  }

  // Compare error if present
  if (original.error !== replayed.error) {
    differences.push({
      path: 'error',
      original: original.error,
      replayed: replayed.error,
    });
  }

  return differences;
}

/**
 * Replay options.
 */
export interface ReplayOptions {
  /** Custom clock for replay (defaults to recording's startTimeMs) */
  clock?: Clock;
  /** Custom ID factory for replay */
  idFactory?: IdFactory;
  /** Whether to verify hash before replay */
  verifyHash?: boolean;
}

/**
 * Creates a replay context from a recording.
 */
export function createReplayContext(
  recording: RunRecording,
  options: ReplayOptions = {}
): { clock: Clock; idFactory: IdFactory; planContent: string } {
  const clock = options.clock ?? new DeterministicClock(recording.startTimeMs);
  const idFactory = options.idFactory ?? new SeededIdFactory(recording.seed, 'run');

  return {
    clock,
    idFactory,
    planContent: recording.planContent,
  };
}

/**
 * Recording query options.
 */
export interface RecordingQuery {
  /** Filter by tags */
  tags?: string[];
  /** Filter by success status */
  success?: boolean;
  /** Filter by date range (ISO strings) */
  after?: string;
  before?: string;
  /** Maximum results */
  limit?: number;
}

/**
 * Filters recordings based on query.
 */
export function filterRecordings(
  recordings: RunRecording[],
  query: RecordingQuery
): RunRecording[] {
  let filtered = recordings;

  if (query.tags && query.tags.length > 0) {
    filtered = filtered.filter((r) =>
      query.tags!.every((tag) => r.metadata?.tags?.includes(tag))
    );
  }

  if (query.success !== undefined) {
    filtered = filtered.filter((r) => r.result.success === query.success);
  }

  if (query.after) {
    filtered = filtered.filter((r) =>
      r.metadata?.createdAt && r.metadata.createdAt >= query.after!
    );
  }

  if (query.before) {
    filtered = filtered.filter((r) =>
      r.metadata?.createdAt && r.metadata.createdAt <= query.before!
    );
  }

  if (query.limit && query.limit > 0) {
    filtered = filtered.slice(0, query.limit);
  }

  return filtered;
}

/**
 * Recording summary for listing.
 */
export interface RecordingSummary {
  /** Recording ID */
  readonly id: string;
  /** Run ID from the result */
  readonly runId: string;
  /** Whether the run was successful */
  readonly success: boolean;
  /** Number of steps executed */
  readonly stepsExecuted: number;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Created timestamp */
  readonly createdAt?: string;
  /** Tags */
  readonly tags?: readonly string[];
}

/**
 * Creates a summary from a recording.
 */
export function summarizeRecording(id: string, recording: RunRecording): RecordingSummary {
  return {
    id,
    runId: recording.result.runId,
    success: recording.result.success,
    stepsExecuted: recording.result.stepsExecuted,
    durationMs: recording.result.durationMs,
    createdAt: recording.metadata?.createdAt,
    tags: recording.metadata?.tags,
  };
}

/**
 * Exports a recording to JSON string.
 */
export function exportRecording(recording: RunRecording): string {
  return stableStringify(recording);
}

/**
 * Imports a recording from JSON string.
 */
export function importRecording(json: string): RunRecording {
  const parsed = JSON.parse(json) as RunRecording;

  // Validate required fields
  if (!parsed.version || !parsed.result || !parsed.planContent || !parsed.seed) {
    throw new Error('Invalid recording format: missing required fields');
  }

  return parsed;
}
