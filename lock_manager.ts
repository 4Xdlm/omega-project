import { writeFile, readFile, unlink, access } from "node:fs/promises";
import { constants as FS_CONSTANTS } from "node:fs";
import { join } from "node:path";

const LOCK_FILENAME = ".omega.lock";

type AcquireOptions = {
  ttlMs?: number;       // durÃƒÆ’Ã‚Â©e de vie du lock
  stealStale?: boolean; // rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â©rer le lock si stale
};

type LockPayload = {
  pid: number;
  timestamp: number;
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, FS_CONSTANTS.F_OK);
    return true;
  } catch {
    return false;
  }
}

function lockPath(projectRoot: string): string {
  return join(projectRoot, LOCK_FILENAME);
}

async function readPayload(projectRoot: string): Promise<LockPayload | null> {
  const p = lockPath(projectRoot);
  if (!(await fileExists(p))) return null;
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as LockPayload;
}

export async function hasLock(projectRoot: string): Promise<boolean> {
  return fileExists(lockPath(projectRoot));
}

export async function readLock(projectRoot: string): Promise<LockPayload | null> {
  return readPayload(projectRoot);
}

export async function isLockStale(
  projectRoot: string,
  ttlMs = 60_000
): Promise<boolean> {
  const payload = await readPayload(projectRoot);
  if (!payload) return false;
  return Date.now() - payload.timestamp > ttlMs;
}

export async function acquireLock(
  projectRoot: string,
  options: AcquireOptions = {}
): Promise<void> {
  const { ttlMs = 60_000, stealStale = true } = options;
  const p = lockPath(projectRoot);

  if (await fileExists(p)) {
    if (stealStale) {
      const stale = await isLockStale(projectRoot, ttlMs);
      if (!stale) {
        throw new Error("LOCK_ALREADY_EXISTS");
      }
      // stale ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ on rÃƒÆ’Ã‚Â©cupÃƒÆ’Ã‚Â¨re
      try {
        await unlink(p);
      } catch {
        // si suppression impossible, on ÃƒÆ’Ã‚Â©choue explicitement
        throw new Error("LOCK_STALE_BUT_CANNOT_BE_REMOVED");
      }
    } else {
      throw new Error("LOCK_ALREADY_EXISTS");
    }
  }

  const payload: LockPayload = {
    pid: process.pid,
    timestamp: Date.now(),
  };

  await writeFile(p, JSON.stringify(payload, null, 2), "utf-8");
}

export async function releaseLock(projectRoot: string): Promise<void> {
  const p = lockPath(projectRoot);
  try {
    await unlink(p);
  } catch {
    // idempotent
  }
}
