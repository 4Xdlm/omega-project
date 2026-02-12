/**
 * OMEGA — ATOMIC CACHE WRITER WITH FILE LOCKING
 * Phase: PR-1 | Invariant: INV-CACHE-LOCK-01
 *
 * Provides atomic filesystem operations with exclusive locking to prevent
 * cache corruption during concurrent writes.
 *
 * Key features:
 * - Exclusive file locking with timeout & stale detection
 * - Atomic write via tmp → rename
 * - Calibration-driven timeouts (with fallback defaults)
 * - Crash residue cleanup
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ============================================================================
// TYPES
// ============================================================================

export interface CalibrationLockConfig {
  LOCK_TIMEOUT_MS: number;
  LOCK_SPIN_MS: number;
  LOCK_STALE_MS: number;
}

// ============================================================================
// CALIBRATION LOADING (GAP-1A)
// ============================================================================

let calibrationCache: CalibrationLockConfig | null = null;

function loadCalibrationLockConfig(calibrationPath?: string): CalibrationLockConfig {
  if (calibrationCache) return calibrationCache;

  const defaults: CalibrationLockConfig = {
    LOCK_TIMEOUT_MS: 10000,
    LOCK_SPIN_MS: 50,
    LOCK_STALE_MS: 30000,
  };

  if (!calibrationPath) {
    calibrationPath = join(process.cwd(), 'budgets', 'calibration.json');
  }

  if (!existsSync(calibrationPath)) {
    console.warn(`[atomic-cache] calibration.json not found at ${calibrationPath}, using defaults`);
    calibrationCache = defaults;
    return defaults;
  }

  try {
    const raw = readFileSync(calibrationPath, 'utf8');
    const data = JSON.parse(raw);

    calibrationCache = {
      LOCK_TIMEOUT_MS: data.LOCK_TIMEOUT_MS ?? defaults.LOCK_TIMEOUT_MS,
      LOCK_SPIN_MS: data.LOCK_SPIN_MS ?? defaults.LOCK_SPIN_MS,
      LOCK_STALE_MS: data.LOCK_STALE_MS ?? defaults.LOCK_STALE_MS,
    };

    // Warn if any field is null
    if (data.LOCK_TIMEOUT_MS === null || data.LOCK_SPIN_MS === null || data.LOCK_STALE_MS === null) {
      console.warn('[atomic-cache] calibration.json contains null lock fields, using defaults');
    }

    return calibrationCache;
  } catch (err) {
    console.warn(`[atomic-cache] failed to load calibration.json: ${err}, using defaults`);
    calibrationCache = defaults;
    return defaults;
  }
}

// ============================================================================
// LOCK MANAGEMENT
// ============================================================================

function getLockPath(filePath: string): string {
  return `${filePath}.lock`;
}

/**
 * Check if a lock file is stale (older than LOCK_STALE_MS).
 * If stale, consider it abandoned and safe to override.
 */
function isLockStale(lockPath: string, config: CalibrationLockConfig): boolean {
  if (!existsSync(lockPath)) return false;

  try {
    const lockContent = readFileSync(lockPath, 'utf8');
    const lockData = JSON.parse(lockContent);
    const lockAge = Date.now() - lockData.timestamp;
    return lockAge > config.LOCK_STALE_MS;
  } catch {
    // Corrupt lock file → treat as stale
    return true;
  }
}

/**
 * Acquire exclusive lock with timeout and stale detection.
 * Throws if unable to acquire within LOCK_TIMEOUT_MS.
 */
export function acquireLock(filePath: string, calibrationPath?: string): void {
  const config = loadCalibrationLockConfig(calibrationPath);
  const lockPath = getLockPath(filePath);
  const startTime = Date.now();

  while (Date.now() - startTime < config.LOCK_TIMEOUT_MS) {
    if (!existsSync(lockPath)) {
      // No lock exists → acquire
      try {
        mkdirSync(dirname(lockPath), { recursive: true });
        writeFileSync(lockPath, JSON.stringify({ timestamp: Date.now(), pid: process.pid }), 'utf8');
        return;
      } catch {
        // Race condition: another process acquired lock between check and write
        // Continue spinning
      }
    } else if (isLockStale(lockPath, config)) {
      // Stale lock → force acquire
      try {
        unlinkSync(lockPath);
        writeFileSync(lockPath, JSON.stringify({ timestamp: Date.now(), pid: process.pid }), 'utf8');
        return;
      } catch {
        // Race condition during stale cleanup
      }
    }

    // Spin wait
    const spinEnd = Date.now() + config.LOCK_SPIN_MS;
    while (Date.now() < spinEnd) {
      // Busy wait (Node.js has no native sleep without async)
    }
  }

  throw new Error(`[atomic-cache] Failed to acquire lock for ${filePath} within ${config.LOCK_TIMEOUT_MS}ms`);
}

/**
 * Release lock. Safe to call even if lock doesn't exist.
 */
export function releaseLock(filePath: string): void {
  const lockPath = getLockPath(filePath);
  if (existsSync(lockPath)) {
    try {
      unlinkSync(lockPath);
    } catch {
      // Ignore errors (file may have been removed by another process)
    }
  }
}

// ============================================================================
// ATOMIC WRITE (GAP-1C: cleanup crash residue)
// ============================================================================

/**
 * Atomic write: lock → write to tmp → rename → unlock.
 * Cleans up any orphaned .tmp files from previous crashes.
 */
export function atomicWriteFileSync(
  filePath: string,
  content: string,
  calibrationPath?: string
): void {
  acquireLock(filePath, calibrationPath);

  try {
    mkdirSync(dirname(filePath), { recursive: true });

    // GAP-1C: Cleanup crash residue (orphaned .tmp files)
    const tmpPattern = `${filePath}.tmp`;
    if (existsSync(tmpPattern)) {
      try {
        unlinkSync(tmpPattern);
      } catch {
        // Ignore if another process is cleaning up
      }
    }

    // Write to unique tmp file
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmpPath, content, 'utf8');

    // Atomic rename (overwrites target on all platforms)
    renameSync(tmpPath, filePath);
  } finally {
    releaseLock(filePath);
  }
}

// ============================================================================
// DROP-IN CACHE REPLACEMENTS
// ============================================================================

export interface CacheEntry {
  [key: string]: unknown;
}

/**
 * Read cache with atomic safety (no lock needed for reads).
 */
export function readCacheAtomic<T = CacheEntry>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write cache with atomic safety (lock → tmp → rename).
 */
export function writeCacheAtomic(
  filePath: string,
  data: CacheEntry,
  calibrationPath?: string
): void {
  const content = JSON.stringify(data, null, 2);
  atomicWriteFileSync(filePath, content, calibrationPath);
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Clear calibration cache (for testing).
 */
export function clearCalibrationCache(): void {
  calibrationCache = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { loadCalibrationLockConfig };
