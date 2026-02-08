/**
 * OMEGA Forge — Dead Zone Detection
 * Phase C.5 — Z plateau + dissipation failure detection
 */

import type { ParagraphEmotionState, DeadZone, F5Config } from '../types.js';
import { resolveF5ConfigValue } from '../config.js';

/**
 * Detect dead zones: segments where Z plateaus and dissipation fails.
 * A dead zone is a consecutive sequence of paragraphs where:
 * - Z/C ratio >= threshold (high persistence)
 * - Length >= minimum
 * - Dissipation rate is approximately 0 (no emotional change)
 */
export function detectDeadZones(
  states: readonly ParagraphEmotionState[],
  config: F5Config,
  C: number,
): readonly DeadZone[] {
  const minLength = resolveF5ConfigValue(config.DEAD_ZONE_MIN_LENGTH);
  const zThreshold = resolveF5ConfigValue(config.DEAD_ZONE_Z_THRESHOLD);

  if (states.length < minLength || C === 0) return [];

  const deadZones: DeadZone[] = [];
  let zoneStart = -1;
  let zoneZSum = 0;

  for (let i = 0; i < states.length; i++) {
    const zRatio = states[i].omega_state.Z / C;

    if (zRatio >= zThreshold) {
      if (zoneStart === -1) {
        zoneStart = i;
        zoneZSum = 0;
      }
      zoneZSum += states[i].omega_state.Z;
    } else {
      if (zoneStart !== -1 && (i - zoneStart) >= minLength) {
        const length = i - zoneStart;
        const avgZ = zoneZSum / length;

        const startY = states[zoneStart].omega_state.Y;
        const endY = states[i - 1].omega_state.Y;
        const dissRate = length > 1 ? Math.abs(endY - startY) / length : 0;

        let cause = 'Z_plateau';
        if (dissRate < 0.5) cause = 'dissipation_blocked';
        if (startY < 5 && endY < 5) cause = 'no_stimulus';

        deadZones.push({
          start_index: zoneStart,
          end_index: i - 1,
          length,
          avg_Z: avgZ,
          dissipation_rate: dissRate,
          cause,
        });
      }
      zoneStart = -1;
    }
  }

  if (zoneStart !== -1 && (states.length - zoneStart) >= minLength) {
    const length = states.length - zoneStart;
    const avgZ = zoneZSum / length;
    const startY = states[zoneStart].omega_state.Y;
    const endY = states[states.length - 1].omega_state.Y;
    const dissRate = length > 1 ? Math.abs(endY - startY) / length : 0;

    let cause = 'Z_plateau';
    if (dissRate < 0.5) cause = 'dissipation_blocked';
    if (startY < 5 && endY < 5) cause = 'no_stimulus';

    deadZones.push({
      start_index: zoneStart,
      end_index: states.length - 1,
      length,
      avg_Z: avgZ,
      dissipation_rate: dissRate,
      cause,
    });
  }

  return deadZones;
}
