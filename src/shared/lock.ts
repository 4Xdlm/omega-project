/**
 * OMEGA File Lock v1.0 (Inter-process via O_EXCL)
 * Phase C - NASA-Grade L4
 *
 * INVARIANT INV-WRITE-03: Lock required before any append
 *
 * DESIGN (Francky): Inter-process lock, not just JS mutex
 */

import { open, unlink, FileHandle } from 'fs/promises';
import { constants } from 'fs';

export class LockError extends Error {
  constructor(
    public readonly filepath: string,
    public readonly reason: 'ALREADY_LOCKED' | 'LOCK_FAILED' | 'UNLOCK_FAILED',
    cause?: Error
  ) {
    super(`Lock error on ${filepath}: ${reason}`);
    this.name = 'LockError';
    this.cause = cause;
  }
}

export interface FileLock {
  release(): Promise<void>;
}

const LOCK_SUFFIX = '.lock';
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 50;

export async function acquireLock(filepath: string): Promise<FileLock> {
  const lockPath = filepath + LOCK_SUFFIX;
  const start = Date.now();

  while (true) {
    try {
      const handle: FileHandle = await open(
        lockPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY
      );
      await handle.write(`${process.pid}\n`);
      await handle.close();

      return {
        release: async () => {
          try {
            await unlink(lockPath);
          } catch (err) {
            throw new LockError(filepath, 'UNLOCK_FAILED', err as Error);
          }
        },
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      // EEXIST: lock file exists (expected)
      // EPERM: Windows returns this when file is locked by another process
      if (code === 'EEXIST' || code === 'EPERM') {
        if (Date.now() - start > LOCK_TIMEOUT_MS) {
          throw new LockError(filepath, 'ALREADY_LOCKED');
        }
        await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
        continue;
      }
      throw new LockError(filepath, 'LOCK_FAILED', err as Error);
    }
  }
}

export async function withLock<T>(filepath: string, fn: () => Promise<T>): Promise<T> {
  const lock = await acquireLock(filepath);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
