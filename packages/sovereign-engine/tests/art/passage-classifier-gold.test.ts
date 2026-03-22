/**
 * OMEGA Passage Classifier Gold Set Tests — R-LAB-TYPE
 * Date: 2026-03-22
 *
 * Basic regression tests for the rebuilt passage classifier.
 * Full accuracy validation is done via the audit-classifier.ts script.
 */

import { describe, it, expect } from 'vitest';
import { classifyPassage, type PassageClassification } from '../../src/scoring/passage-classifier.js';

describe('Passage Classifier (R-LAB-TYPE)', () => {
  it('returns normalized vector summing to 1.0', () => {
    const text = 'Il marchait dans la rue. Le soleil brillait. Les oiseaux chantaient dans les arbres.';
    const cls = classifyPassage(text);
    const sum = cls.narration + cls.description + cls.dialogue + cls.introspection + cls.action;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
  });

  it('dominant_type is one of the 5 valid types', () => {
    const text = 'He walked and then he ran and then he fell and then he got up.';
    const cls = classifyPassage(text);
    expect(['narration', 'description', 'dialogue', 'introspection', 'action']).toContain(cls.dominant_type);
  });

  it('all values are between 0 and 1', () => {
    const text = 'She thought about her life. She wondered what it all meant. Perhaps nothing.';
    const cls = classifyPassage(text);
    for (const key of ['narration', 'description', 'dialogue', 'introspection', 'action'] as const) {
      expect(cls[key]).toBeGreaterThanOrEqual(0);
      expect(cls[key]).toBeLessThanOrEqual(1);
    }
  });

  it('detects action in text with short sentences and action verbs', () => {
    const text = 'He struck. The man fell. Blood everywhere. He ran. Jumped the fence. Landed hard. Kept running. Fired twice. The bullet hit the wall.';
    const cls = classifyPassage(text);
    expect(cls.action).toBeGreaterThan(0.1);
  });

  it('detects dialogue with speech markers', () => {
    const text = `"Where are you going?" he asked.
"Home," she said.
"But it's late," he replied.
"I don't care," she whispered.
He said nothing. She turned and walked away.
"Wait," he called out.
"No," she answered without turning back.`;
    const cls = classifyPassage(text);
    expect(cls.dialogue).toBeGreaterThan(0.2);
  });

  it('detects introspection with mental verbs and first person', () => {
    const text = 'I thought about what she said. I wondered if she was right. Perhaps I was wrong. I felt confused. I remembered our first meeting. Maybe I should have known. I believed in something different then.';
    const cls = classifyPassage(text);
    expect(cls.introspection).toBeGreaterThan(0.05);
  });

  it('determinism: same text = same result', () => {
    const text = 'The rain fell on the empty street.';
    const r1 = classifyPassage(text);
    const r2 = classifyPassage(text);
    expect(r1.dominant_type).toBe(r2.dominant_type);
    expect(r1.narration).toBe(r2.narration);
  });
});
