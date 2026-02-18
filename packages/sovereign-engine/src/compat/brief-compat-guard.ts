/**
 * OMEGA Sovereign — ForgeEmotionBrief Schema Version Compat Guard
 * Sprint 6 Commit 6.4 (Roadmap 4.4)
 *
 * Enforces schema version for ForgeEmotionBrief.
 * Provides date-based grace period for v1 → v2 migration.
 *
 * v1 = 'forge.emotion.v1' (current, deprecated after deadline)
 * v2 = 'forge.emotion.v2' (future, not yet created)
 */

import type { ForgeEmotionBrief } from '@omega/omega-forge';

/**
 * Compat window configuration.
 * v1 is accepted with deprecation warning until DEADLINE.
 * After DEADLINE, v1 is rejected with hard error.
 */
export const BRIEF_COMPAT_WINDOW = {
  v1_supported: true,
  deadline: '2026-04-01T00:00:00Z',
} as const;

/**
 * Check ForgeEmotionBrief schema version.
 *
 * Behavior:
 * - 'forge.emotion.v2' or higher → pass silently ✅
 * - 'forge.emotion.v1' + before deadline → warning ⚠️
 * - 'forge.emotion.v1' + after deadline → hard fail ❌
 * - undefined/unknown → hard fail ❌
 *
 * @param brief - The ForgeEmotionBrief to validate
 * @param currentDate - Optional date override for testing (defaults to new Date())
 * @throws {Error} if schema_version is invalid or v1 after deadline
 */
export function checkBriefSchemaVersion(
  brief: ForgeEmotionBrief | { schema_version?: string },
  currentDate: Date = new Date(),
): void {
  const version = brief.schema_version;

  // Case 1: v2+ → pass silently
  if (version && version !== 'forge.emotion.v1') {
    // Accept v2 and higher
    if (version.startsWith('forge.emotion.v')) {
      return;
    }
    // Unknown schema prefix → fail
    throw new Error(
      `Unknown ForgeEmotionBrief schema_version: "${version}". ` +
      'Expected "forge.emotion.v1" or "forge.emotion.v2".',
    );
  }

  // Case 2: v1 → date-based logic
  if (version === 'forge.emotion.v1') {
    const deadline = new Date(BRIEF_COMPAT_WINDOW.deadline);
    const isBeforeDeadline = currentDate < deadline;

    if (BRIEF_COMPAT_WINDOW.v1_supported && isBeforeDeadline) {
      console.warn(
        `[COMPAT] ForgeEmotionBrief uses deprecated schema "${version}". ` +
        `This will be rejected after ${BRIEF_COMPAT_WINDOW.deadline}. ` +
        'Please upgrade to forge.emotion.v2.',
      );
      return; // Accept v1 during window
    }

    throw new Error(
      `ForgeEmotionBrief schema "${version}" is no longer supported. ` +
      `Backward compatibility deadline expired (${BRIEF_COMPAT_WINDOW.deadline}). ` +
      'Upgrade to forge.emotion.v2 required.',
    );
  }

  // Case 3: undefined → fail
  throw new Error(
    'ForgeEmotionBrief missing schema_version field. ' +
    'Expected "forge.emotion.v1" or "forge.emotion.v2".',
  );
}
