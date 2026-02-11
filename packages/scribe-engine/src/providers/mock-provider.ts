/**
 * OMEGA Scribe Engine — Mock Provider
 * Phase P.2-SCRIBE — Deterministic mock (backwards compatible with C.2 weaver)
 */

import { sha256 } from '@omega/canon-kernel';
import type { ScribeProvider, ScribeProviderConfig, ScribeProviderResponse, ScribeContext } from './types.js';

/**
 * Mock provider: generates placeholder prose from the prompt.
 * Extracts beat actions and wraps them in minimal prose sentences.
 * Deterministic: same prompt → same output.
 */
export function createMockProvider(_config: ScribeProviderConfig): ScribeProvider {
  return {
    mode: 'mock',

    generateSceneProse(prompt: string, context: ScribeContext): ScribeProviderResponse {
      // Extract scene content from prompt by hashing
      // Mock produces structured placeholder prose
      const lines = prompt.split('\n').filter(l => l.trim().length > 0);
      const proseLines: string[] = [];

      for (const line of lines) {
        // Extract beat actions (lines starting with "- Beat:" or containing action descriptions)
        const beatMatch = line.match(/(?:Beat|Action|BEAT).*?:\s*(.+)/i);
        if (beatMatch) {
          proseLines.push(beatMatch[1].trim() + '.');
        }
      }

      // If no beats found, create placeholder from scene ID
      if (proseLines.length === 0) {
        proseLines.push(`[Scene ${context.sceneId} — mock prose placeholder]`);
      }

      const prose = proseLines.join(' ');
      const proseHash = sha256(prose);

      return {
        prose,
        proseHash,
        mode: 'mock',
        model: 'mock-v1',
        cached: false,
        timestamp: new Date().toISOString(),
      };
    },
  };
}
