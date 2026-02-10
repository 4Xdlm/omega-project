/**
 * OMEGA Genesis Planner — Mock Provider
 * Phase P.1-LLM — Wraps existing deterministic generators.
 * Guarantees byte-identical output with pre-P.1-LLM behavior.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import { generateArcs } from '../generators/arc-generator.js';
import { generateScenes } from '../generators/scene-generator.js';
import { generateBeats } from '../generators/beat-generator.js';
import type { Intent, Canon, Constraints, Arc, EmotionTarget, Scene, GConfig } from '../types.js';
import type { NarrativeProvider, ProviderResponse, ProviderContext } from './types.js';

const DETERMINISTIC_TIMESTAMP = '2026-01-01T00:00:00.000Z';

function wrapResponse(content: string): ProviderResponse {
  return {
    content,
    contentHash: sha256(content),
    mode: 'mock',
    model: 'mock-deterministic',
    cached: false,
    timestamp: DETERMINISTIC_TIMESTAMP,
  };
}

export function createMockProvider(): NarrativeProvider {
  return {
    mode: 'mock',

    generateArcs(prompt: string, _context: ProviderContext): ProviderResponse {
      const inputs = JSON.parse(prompt) as { intent: Intent; canon: Canon; constraints: Constraints };
      const arcs = generateArcs(inputs.intent, inputs.canon, inputs.constraints);
      return wrapResponse(canonicalize(arcs));
    },

    enrichScenes(prompt: string, _context: ProviderContext): ProviderResponse {
      const inputs = JSON.parse(prompt) as {
        arc: Arc; arcIndex: number; totalArcs: number;
        canon: Canon; constraints: Constraints; emotionTarget: EmotionTarget;
      };
      const scenes = generateScenes(
        inputs.arc, inputs.arcIndex, inputs.totalArcs,
        inputs.canon, inputs.constraints, inputs.emotionTarget,
      );
      return wrapResponse(canonicalize(scenes));
    },

    detailBeats(prompt: string, _context: ProviderContext): ProviderResponse {
      const inputs = JSON.parse(prompt) as { scene: Scene; sceneIndex: number; config: GConfig };
      const beats = generateBeats(inputs.scene, inputs.sceneIndex, inputs.config);
      return wrapResponse(canonicalize(beats));
    },
  };
}
