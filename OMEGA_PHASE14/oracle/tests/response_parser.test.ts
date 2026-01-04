/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Response Parser Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for LLM response parsing and normalization.
 * INV-ORC-02: Invalid JSON = explicit error
 * 
 * Total: 10 tests
 * 
 * @module oracle/tests/response_parser.test
 * @version 3.14.0
 */

import { describe, it, expect } from 'vitest';
import {
  extractJson,
  parseJson,
  normalizeResponse,
  parseResponse,
  tryParseResponse,
  ParseError,
  NormalizationError,
} from '../response_parser.js';
import { EMOTION_V2_VERSION } from '../emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: JSON Extraction (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('JSON Extraction', () => {
  it('extracts clean JSON', () => {
    const raw = '{"key": "value"}';
    expect(extractJson(raw)).toBe('{"key": "value"}');
  });
  
  it('extracts JSON from markdown fence', () => {
    const raw = '```json\n{"key": "value"}\n```';
    expect(extractJson(raw)).toBe('{"key": "value"}');
  });
  
  it('throws on no JSON found', () => {
    expect(() => extractJson('no json here')).toThrow(ParseError);
    expect(() => extractJson('')).toThrow(ParseError);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Normalization (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Normalization', () => {
  it('normalizes minimal response', () => {
    const parsed = {
      signals: [{ channel: 'lexical', valence: -0.5, arousal: 0.7, confidence: 0.8 }],
      appraisal: {
        emotions: [{ label: 'fear', family: 'fear_family', weight: 1, polarity: -1 }],
      },
      rationale: 'Test',
    };
    
    const result = normalizeResponse(parsed, {
      trace_id: 'test',
      created_at_ms: 1000,
      input_hash: 'HASH',
      provider_id: 'test-provider',
    });
    
    expect(result.schema_version).toBe(EMOTION_V2_VERSION);
    expect(result.trace_id).toBe('test');
    expect(result.appraisal.dominant).toBe('fear');
  });
  
  it('normalizes unknown emotion labels', () => {
    const parsed = {
      signals: [{ channel: 'semantic', valence: 0, arousal: 0.5, confidence: 0.5 }],
      appraisal: {
        emotions: [{ label: 'happy', family: 'joy_family', weight: 1, polarity: 1 }],
      },
      rationale: 'Test',
    };
    
    const result = normalizeResponse(parsed, {
      trace_id: 't',
      created_at_ms: 0,
      input_hash: 'h',
    });
    
    // 'happy' should be mapped to 'joy'
    expect(result.appraisal.emotions[0].label).toBe('joy');
  });
  
  it('clamps values to valid ranges', () => {
    const parsed = {
      signals: [{ channel: 'semantic', valence: 5, arousal: -1, confidence: 2 }],
      appraisal: {
        emotions: [{ label: 'joy', family: 'joy_family', weight: 10, polarity: 1 }],
      },
      rationale: 'Test',
    };
    
    const result = normalizeResponse(parsed, {
      trace_id: 't',
      created_at_ms: 0,
      input_hash: 'h',
      max_confidence: 0.95,
    });
    
    expect(result.signals[0].valence).toBe(1); // Clamped
    expect(result.signals[0].arousal).toBe(0); // Clamped
    expect(result.signals[0].confidence).toBeLessThanOrEqual(0.95);
    expect(result.appraisal.emotions[0].weight).toBe(1); // Clamped
  });
  
  it('sorts emotions by weight DESC', () => {
    const parsed = {
      signals: [{ channel: 'semantic', valence: 0, arousal: 0.5, confidence: 0.5 }],
      appraisal: {
        emotions: [
          { label: 'joy', family: 'joy_family', weight: 0.3, polarity: 1 },
          { label: 'fear', family: 'fear_family', weight: 0.7, polarity: -1 },
        ],
      },
      rationale: 'Test',
    };
    
    const result = normalizeResponse(parsed, {
      trace_id: 't',
      created_at_ms: 0,
      input_hash: 'h',
    });
    
    expect(result.appraisal.emotions[0].label).toBe('fear');
    expect(result.appraisal.emotions[1].label).toBe('joy');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Full Parsing - INV-ORC-02 (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full Parsing - INV-ORC-02', () => {
  it('parses valid response', () => {
    const raw = JSON.stringify({
      schema_version: EMOTION_V2_VERSION,
      trace_id: 'test',
      created_at_ms: 1000,
      signals: [{ channel: 'semantic', valence: -0.3, arousal: 0.6, confidence: 0.8 }],
      appraisal: {
        emotions: [{ label: 'fear', family: 'fear_family', weight: 1, polarity: -1 }],
        dominant: 'fear',
        ambiguity: 0,
        valence_aggregate: -0.3,
        arousal_aggregate: 0.6,
      },
      model: { provider_id: 'p', model_name: 'm', latency_ms: 100 },
      rationale: 'Test',
      input_hash: 'HASH',
      cached: false,
      calibrated: false,
    });
    
    const result = parseResponse(raw, {});
    expect(result.appraisal.dominant).toBe('fear');
  });
  
  it('throws ParseError on invalid JSON', () => {
    expect(() => parseResponse('not json', {})).toThrow(ParseError);
    expect(() => parseResponse('{invalid}', {})).toThrow(ParseError);
  });
  
  it('tryParseResponse returns null on error', () => {
    expect(tryParseResponse('not json', {})).toBeNull();
    expect(tryParseResponse('{}', { trace_id: 't', input_hash: 'h' })).not.toBeNull();
  });
});
