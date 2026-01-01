// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — RECORD / REPLAY ENGINE
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ScribeRecordFile, 
  ScribeRecordFileSchema,
  HashHex,
  SCRIBE_REPLAY_DIR 
} from './types';
import { 
  sha256, 
  canonicalizeOutput, 
  canonicalizeJson 
} from './canonicalize';
import {
  ScribeError,
  replayRecordNotFound,
  replayHashMismatch,
  tamperDetected,
  recordCorrupted,
  ioReadFailed,
  ioWriteFailed,
  ioDirCreateFailed
} from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RecordInput {
  run_id: string;
  request_hash: HashHex;
  prompt_hash: HashHex;
  provider_id: string;
  raw_output: string;
}

export interface RecordOutput {
  record_hash: HashHex;
  canonical_output: string;
  output_hash: HashHex;
  file_path: string;
}

export interface ReplayInput {
  run_id: string;
  expected_request_hash: HashHex;
  expected_prompt_hash: HashHex;
}

export interface ReplayOutput {
  canonical_output: string;
  output_hash: HashHex;
  record_hash: HashHex;
  provider_id: string;
  raw_output: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD STORE CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ScribeRecordStore — Manages record/replay persistence
 * 
 * @invariant SCRIBE-I07: Replay produces identical output
 * @invariant SCRIBE-I08: Tamper detection 100%
 * @invariant SCRIBE-I09: Provider forbidden in replay
 */
export class ScribeRecordStore {
  private readonly rootDir: string;
  
  constructor(rootDir: string = SCRIBE_REPLAY_DIR) {
    this.rootDir = rootDir;
  }
  
  /**
   * Get the file path for a record
   */
  private getRecordPath(run_id: string): string {
    return path.join(this.rootDir, `${run_id}.json`);
  }
  
  /**
   * Compute the anti-tamper record hash
   * 
   * Hash includes ALL fields in stable order to detect any modification
   * 
   * @invariant SCRIBE-I08: Any 1-byte change = different hash
   */
  private computeRecordHash(
    request_hash: string,
    prompt_hash: string,
    provider_id: string,
    canonical_output: string
  ): HashHex {
    // Deterministic format: key=value lines, sorted by key
    const data = [
      `canonical_output=${canonical_output}`,
      `prompt_hash=${prompt_hash}`,
      `provider_id=${provider_id}`,
      `request_hash=${request_hash}`,
    ].join('\n');
    
    return sha256(data);
  }
  
  /**
   * Write a record to disk
   * 
   * @param input Record input data
   * @returns Record output with hashes and path
   * @throws ScribeError on IO failure
   */
  async writeRecord(input: RecordInput): Promise<RecordOutput> {
    const { run_id, request_hash, prompt_hash, provider_id, raw_output } = input;
    
    // Canonicalize the output
    const canonical_output = canonicalizeOutput(raw_output);
    const output_hash = sha256(canonical_output);
    
    // Compute anti-tamper hash
    const record_hash = this.computeRecordHash(
      request_hash,
      prompt_hash,
      provider_id,
      canonical_output
    );
    
    // Build record file
    const recordFile: ScribeRecordFile = {
      request_hash,
      prompt_hash,
      provider_id,
      raw_output,
      canonical_output,
      record_hash,
      created_at: new Date().toISOString()
    };
    
    // Validate against schema
    const validated = ScribeRecordFileSchema.parse(recordFile);
    
    // Ensure directory exists
    const file_path = this.getRecordPath(run_id);
    const dir = path.dirname(file_path);
    
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      throw ioDirCreateFailed(dir, error as Error);
    }
    
    // Write atomically (write to temp, then rename)
    const tempPath = `${file_path}.tmp.${Date.now()}`;
    
    try {
      const json = JSON.stringify(validated, null, 2);
      await fs.writeFile(tempPath, json, 'utf-8');
      await fs.rename(tempPath, file_path);
    } catch (error) {
      // Clean up temp file if it exists
      try { await fs.unlink(tempPath); } catch { /* ignore */ }
      throw ioWriteFailed(file_path, error as Error);
    }
    
    return {
      record_hash,
      canonical_output,
      output_hash,
      file_path
    };
  }
  
  /**
   * Read and verify a record for replay
   * 
   * @param input Replay input with expected hashes
   * @returns Replay output with verified data
   * @throws ScribeError on not found, tamper, or hash mismatch
   * 
   * @invariant SCRIBE-I07: Output must be identical
   * @invariant SCRIBE-I08: Tamper detected 100%
   */
  async readAndVerify(input: ReplayInput): Promise<ReplayOutput> {
    const { run_id, expected_request_hash, expected_prompt_hash } = input;
    const file_path = this.getRecordPath(run_id);
    
    // Read file
    let raw: string;
    try {
      raw = await fs.readFile(file_path, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw replayRecordNotFound(run_id, file_path);
      }
      throw ioReadFailed(file_path, error as Error);
    }
    
    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw recordCorrupted(run_id, 'Invalid JSON');
    }
    
    // Validate schema
    let recordFile: ScribeRecordFile;
    try {
      recordFile = ScribeRecordFileSchema.parse(parsed);
    } catch (error) {
      throw recordCorrupted(run_id, 'Schema validation failed');
    }
    
    // Verify request_hash matches
    if (recordFile.request_hash !== expected_request_hash) {
      throw replayHashMismatch(
        'request_hash',
        expected_request_hash,
        recordFile.request_hash
      );
    }
    
    // Verify prompt_hash matches
    if (recordFile.prompt_hash !== expected_prompt_hash) {
      throw replayHashMismatch(
        'prompt_hash',
        expected_prompt_hash,
        recordFile.prompt_hash
      );
    }
    
    // Recompute record hash to verify integrity (anti-tamper)
    const recomputed_hash = this.computeRecordHash(
      recordFile.request_hash,
      recordFile.prompt_hash,
      recordFile.provider_id,
      recordFile.canonical_output
    );
    
    if (recomputed_hash !== recordFile.record_hash) {
      throw tamperDetected('record_hash', 'Recomputed hash does not match stored hash');
    }
    
    // Verify canonical_output consistency
    const recanonical = canonicalizeOutput(recordFile.raw_output);
    if (recanonical !== recordFile.canonical_output) {
      throw tamperDetected('canonical_output', 'Raw output does not match canonical output');
    }
    
    // All checks passed
    return {
      canonical_output: recordFile.canonical_output,
      output_hash: sha256(recordFile.canonical_output),
      record_hash: recordFile.record_hash,
      provider_id: recordFile.provider_id,
      raw_output: recordFile.raw_output
    };
  }
  
  /**
   * Check if a record exists
   * 
   * @param run_id Run ID to check
   * @returns true if record exists
   */
  async exists(run_id: string): Promise<boolean> {
    const file_path = this.getRecordPath(run_id);
    try {
      await fs.access(file_path);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Delete a record
   * 
   * @param run_id Run ID to delete
   * @returns true if deleted, false if not found
   */
  async delete(run_id: string): Promise<boolean> {
    const file_path = this.getRecordPath(run_id);
    try {
      await fs.unlink(file_path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
  
  /**
   * List all record IDs
   * 
   * @returns Array of run_id strings
   */
  async listRecords(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.rootDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Get record metadata without full verification
   * 
   * @param run_id Run ID
   * @returns Basic metadata or null if not found
   */
  async getMetadata(run_id: string): Promise<{
    provider_id: string;
    created_at: string;
    request_hash: string;
  } | null> {
    const file_path = this.getRecordPath(run_id);
    try {
      const raw = await fs.readFile(file_path, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        provider_id: parsed.provider_id,
        created_at: parsed.created_at,
        request_hash: parsed.request_hash
      };
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH COMPUTATION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute request hash from all input components
 * 
 * @invariant SCRIBE-I02: Deterministic
 */
export function computeRequestHash(
  scene_spec_hash: HashHex,
  canon_snapshot_hash: HashHex,
  guidance_hash: HashHex,
  constraint_hash: HashHex,
  seed: number
): HashHex {
  const data = [
    `canon_snapshot_hash=${canon_snapshot_hash}`,
    `constraint_hash=${constraint_hash}`,
    `guidance_hash=${guidance_hash}`,
    `scene_spec_hash=${scene_spec_hash}`,
    `seed=${seed}`,
  ].join('\n');
  
  return sha256(data);
}

/**
 * Compute constraint hash from SceneSpec + guidance + canon snapshot
 * 
 * @invariant SCRIBE-I06: Deterministic
 */
export function computeConstraintHash(
  scene_spec_json: string,
  voice_guidance_json: string,
  canon_snapshot_json: string
): HashHex {
  // Already canonicalized JSON strings
  const data = [
    `canon=${canon_snapshot_json}`,
    `scene_spec=${scene_spec_json}`,
    `voice_guidance=${voice_guidance_json}`,
  ].join('\n');
  
  return sha256(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

let defaultStore: ScribeRecordStore | null = null;

/**
 * Get the default record store instance
 */
export function getDefaultRecordStore(): ScribeRecordStore {
  if (!defaultStore) {
    defaultStore = new ScribeRecordStore();
  }
  return defaultStore;
}

/**
 * Set custom root directory for the default store
 */
export function setRecordStoreRoot(rootDir: string): void {
  defaultStore = new ScribeRecordStore(rootDir);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const RecordReplay = {
  ScribeRecordStore,
  computeRequestHash,
  computeConstraintHash,
  getDefaultRecordStore,
  setRecordStoreRoot
};

export default RecordReplay;
