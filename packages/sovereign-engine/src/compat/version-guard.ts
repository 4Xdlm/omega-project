/**
 * OMEGA Sovereign — Version Compat Guard
 * Sprint 6 Commit 6.3 (Roadmap 4.4)
 *
 * Enforces v2.0.0 format for SovereignForgeResult.
 * Provides date-based grace period for backward compatibility.
 */

import type { SovereignForgeResult } from '../engine.js';

/**
 * Date cutoff for backward compatibility grace period.
 * Before this date: undefined version → warning only
 * After this date: undefined version → hard fail
 */
const CUTOFF_DATE = new Date('2026-03-01T00:00:00Z');

/**
 * Assert that a SovereignForgeResult has version='2.0.0'.
 *
 * Behavior:
 * - version='2.0.0' → pass silently ✅
 * - version=undefined + before cutoff → warning only ⚠️
 * - version=undefined + after cutoff → hard fail ❌
 * - version=other → hard fail ❌
 *
 * @param result - The forge result to validate
 * @param currentDate - Optional date override for testing (defaults to new Date())
 * @throws {Error} if version is invalid or undefined after cutoff
 */
export function assertVersion2(
  result: SovereignForgeResult | { version?: string },
  currentDate: Date = new Date(),
): void {
  const version = (result as any).version;

  // Case 1: Valid v2.0.0 → pass
  if (version === '2.0.0') {
    return;
  }

  // Case 2: Undefined version → date-based logic
  if (version === undefined) {
    const isBeforeCutoff = currentDate < CUTOFF_DATE;

    if (isBeforeCutoff) {
      console.warn(
        '[COMPAT] SovereignForgeResult missing version field. ' +
        'This will be a hard error after 2026-03-01. ' +
        'Please upgrade to sovereign-engine@2.0.0+',
      );
      return; // Allow with warning
    } else {
      throw new Error(
        'SovereignForgeResult missing version field. ' +
        'Backward compatibility grace period expired (cutoff: 2026-03-01). ' +
        'Upgrade to sovereign-engine@2.0.0+ required.',
      );
    }
  }

  // Case 3: Invalid version → hard fail
  throw new Error(
    `Invalid SovereignForgeResult version: "${version}". ` +
    'Expected "2.0.0". Please use sovereign-engine@2.0.0+.',
  );
}
