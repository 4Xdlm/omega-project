/**
 * p.sample.neutral — Adapter v1.0
 * DR-2: Adapter wraps validation around pure core.
 */

import { AdapterBase } from '../../../packages/plugin-sdk/src/adapter-base.js';
import type { PluginPayload, JSONPayload } from '../../../packages/plugin-sdk/src/types.js';
import { analyzeText } from './core.js';
import { MIN_CONTENT_LENGTH, OUTPUT_SCHEMA_REF } from './constants.js';

export class NeutralPluginAdapter extends AdapterBase {
  readonly pluginId = 'p.sample.neutral';

  validateInput(payload: PluginPayload): string | null {
    if (payload.kind !== 'text') return `Expected kind="text", got kind="${payload.kind}"`;
    if (payload.content.length < MIN_CONTENT_LENGTH) return `Content too short: ${payload.content.length} < ${MIN_CONTENT_LENGTH}`;
    return null;
  }

  compute(payload: PluginPayload): PluginPayload {
    const textPayload = payload as { kind: 'text'; content: string; encoding: 'utf-8'; metadata: Record<string, string> };
    const result = analyzeText(textPayload.content);
    const output: JSONPayload = {
      kind: 'json',
      schema_ref: OUTPUT_SCHEMA_REF,
      data: {
        summary: result.summary,
        word_count: result.word_count,
        char_count: result.char_count,
        language_hint: result.language_hint,
        tags: [...result.tags],
        complexity_score: result.complexity_score,
      },
    };
    return output;
  }
}

const adapter = new NeutralPluginAdapter();
export const handleRequest = adapter.handleRequest.bind(adapter);
