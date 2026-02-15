/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DELTA CLICHÉ
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: delta/delta-cliche.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Scans prose for banned patterns (clichés, AI patterns, filter words).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, ClicheDelta, ClicheMatch } from '../types.js';

export function computeClicheDelta(packet: ForgePacket, prose: string): ClicheDelta {
  const matches: ClicheMatch[] = [];

  for (const pattern of packet.kill_lists.banned_cliches) {
    const normalizedPattern = pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(escapeRegex(normalizedPattern), 'gi');
    const found = prose.match(regex);

    if (found) {
      for (const match of found) {
        const index = prose.indexOf(match);
        const location = `char ${index}`;
        matches.push({
          pattern,
          location,
          category: 'cliche',
        });
      }
    }
  }

  let ai_pattern_matches = 0;
  for (const pattern of packet.kill_lists.banned_ai_patterns) {
    const normalizedPattern = pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(escapeRegex(normalizedPattern), 'gi');
    const found = prose.match(regex);

    if (found) {
      ai_pattern_matches += found.length;
      for (const match of found) {
        const index = prose.indexOf(match);
        const location = `char ${index}`;
        matches.push({
          pattern,
          location,
          category: 'ai_pattern',
        });
      }
    }
  }

  let filter_word_matches = 0;
  for (const pattern of packet.kill_lists.banned_filter_words) {
    const normalizedPattern = pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(escapeRegex(normalizedPattern), 'gi');
    const found = prose.match(regex);

    if (found) {
      filter_word_matches += found.length;
      for (const match of found) {
        const index = prose.indexOf(match);
        const location = `char ${index}`;
        matches.push({
          pattern,
          location,
          category: 'filter_word',
        });
      }
    }
  }

  return {
    total_matches: matches.length,
    matches,
    ai_pattern_matches,
    filter_word_matches,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
