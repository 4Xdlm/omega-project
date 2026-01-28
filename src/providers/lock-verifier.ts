/**
 * OMEGA Provider Lock Verifier
 * Phase K - Ensures config integrity
 */
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import type { LockVerifyResult, ProviderConfig } from './types';

// FIXED PATH - NO ENV OVERRIDE
const CONFIG_ROOT = join(__dirname, '../../config/providers');
const CONFIG_PATH = join(CONFIG_ROOT, 'providers.v1.json');
const LOCK_PATH = join(CONFIG_ROOT, 'providers.lock');

export function verifyProviderLock(): LockVerifyResult {
  if (!existsSync(CONFIG_PATH)) {
    return { valid: false, expectedHash: '', actualHash: 'FILE_NOT_FOUND' };
  }

  if (!existsSync(LOCK_PATH)) {
    return { valid: false, expectedHash: 'LOCK_NOT_FOUND', actualHash: '' };
  }

  const configBytes = readFileSync(CONFIG_PATH);
  const actualHash = createHash('sha256').update(configBytes).digest('hex').toUpperCase();
  const expectedHash = readFileSync(LOCK_PATH, 'utf-8').trim().toUpperCase();

  return {
    valid: actualHash === expectedHash,
    expectedHash,
    actualHash,
  };
}

export function loadProviderConfig(): { success: true; config: ProviderConfig } | { success: false; error: string } {
  const lockResult = verifyProviderLock();

  if (!lockResult.valid) {
    return {
      success: false,
      error: `Provider lock mismatch: expected ${lockResult.expectedHash}, got ${lockResult.actualHash}`,
    };
  }

  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    return { success: true, config };
  } catch (e) {
    return { success: false, error: `Failed to parse config: ${(e as Error).message}` };
  }
}
