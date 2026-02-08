import { describe, it, expect } from 'vitest';
import { analyzeDensity } from '../../src/metrics/density-analyzer.js';
import { buildMinimalProseParagraph } from '../fixtures.js';

describe('Density Analyzer', () => {
  it('computes description density', () => {
    const para = buildMinimalProseParagraph({ sensory_anchors: ['beacon', 'salt air'] });
    const profile = analyzeDensity([para]);
    expect(profile.description_density).toBe(1);
  });

  it('computes dialogue ratio', () => {
    const para = buildMinimalProseParagraph({ text: '"Hello there" said the man. The room was quiet.' });
    const profile = analyzeDensity([para]);
    expect(profile.dialogue_ratio).toBeGreaterThan(0);
  });

  it('computes sensory density', () => {
    const para = buildMinimalProseParagraph({ sensory_anchors: ['salt', 'wind', 'cold'] });
    const profile = analyzeDensity([para]);
    expect(profile.sensory_density).toBe(3);
  });

  it('computes action density', () => {
    const para = buildMinimalProseParagraph({ emotion: 'fear', rhetorical_devices: ['action'] });
    const profile = analyzeDensity([para]);
    expect(profile.action_density).toBe(1);
  });

  it('computes introspection density', () => {
    const para = buildMinimalProseParagraph({ emotion: 'sadness', rhetorical_devices: ['introspection'] });
    const profile = analyzeDensity([para]);
    expect(profile.introspection_density).toBe(1);
  });

  it('handles empty', () => {
    const profile = analyzeDensity([]);
    expect(profile.description_density).toBe(0);
    expect(profile.dialogue_ratio).toBe(0);
  });

  it('handles all-description paragraphs', () => {
    const paras = [
      buildMinimalProseParagraph({ paragraph_id: 'P1', sensory_anchors: ['a'] }),
      buildMinimalProseParagraph({ paragraph_id: 'P2', sensory_anchors: ['b'] }),
    ];
    const profile = analyzeDensity(paras);
    expect(profile.description_density).toBe(1);
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph();
    const p1 = analyzeDensity([para]);
    const p2 = analyzeDensity([para]);
    expect(p1.description_density).toBe(p2.description_density);
    expect(p1.dialogue_ratio).toBe(p2.dialogue_ratio);
  });
});
