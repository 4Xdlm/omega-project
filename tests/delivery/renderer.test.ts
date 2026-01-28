/**
 * OMEGA Delivery Renderer Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 format-specific rendering.
 */

import { describe, it, expect } from 'vitest';
import {
  render,
  buildArtifact,
  getDefaultFilename,
  isRenderableFormat,
  getSpecializedFormats,
} from '../../src/delivery/renderer';
import type { RenderResult, RenderOptions } from '../../src/delivery/renderer';
import type {
  DeliveryProfile,
  DeliveryInput,
  DeliveryFormat,
  ProfileId,
  ISO8601,
} from '../../src/delivery/types';
import { createHash } from 'crypto';

// Helper to compute hash
function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

// Test profile factory
function createProfile(overrides: Partial<DeliveryProfile> = {}): DeliveryProfile {
  return {
    profileId: 'PROF-test' as ProfileId,
    format: 'TEXT' as DeliveryFormat,
    extension: '.txt',
    encoding: 'UTF-8',
    lineEnding: 'LF',
    ...overrides,
  };
}

// Test input factory
function createInput(
  body: string,
  profileOverrides: Partial<DeliveryProfile> = {}
): DeliveryInput {
  return {
    body,
    profile: createProfile(profileOverrides),
  };
}

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;

describe('Renderer — Phase H', () => {
  describe('render (H-INV-01: Body bytes preserved)', () => {
    it('preserves body exactly in TEXT format', () => {
      const body = 'exact body content';
      const input = createInput(body, { format: 'TEXT' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
    });

    it('preserves body exactly in MARKDOWN format', () => {
      const body = '# Title\n\nBody content';
      const input = createInput(body, { format: 'MARKDOWN' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
    });

    it('preserves body exactly in JSON_PACK format', () => {
      const body = 'body for json pack';
      const input = createInput(body, { format: 'JSON_PACK' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      const parsed = JSON.parse(result.content);
      expect(parsed.body).toBe(body);
    });

    it('preserves special characters in body', () => {
      const body = 'émoji 🎉 中文 tabs\there';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toContain(body);
    });

    it('preserves whitespace in body', () => {
      const body = '   leading\ntrailing   \n  both  ';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
    });

    it('preserves empty lines in body', () => {
      const body = 'line1\n\n\nline4';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
    });
  });

  describe('render with envelope', () => {
    it('adds header to TEXT format', () => {
      const body = 'body';
      const input = createInput(body, {
        format: 'TEXT',
        headers: ['HEADER'],
      });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe('HEADER\nbody');
    });

    it('adds footer to TEXT format', () => {
      const body = 'body';
      const input = createInput(body, {
        format: 'TEXT',
        footers: ['FOOTER'],
      });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe('bodyFOOTER');
    });

    it('adds header and footer to TEXT format', () => {
      const body = 'body';
      const input = createInput(body, {
        format: 'TEXT',
        headers: ['---'],
        footers: ['---'],
      });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe('---\nbody---');
    });

    it('adds envelope to MARKDOWN format', () => {
      const body = '# Content';
      const input = createInput(body, {
        format: 'MARKDOWN',
        headers: ['---', 'title: Test', '---'],
        footers: ['', '---', 'Generated'],
      });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toContain('---\ntitle: Test\n---\n');
      expect(result.content).toContain('# Content');
      expect(result.content).toContain('\n---\nGenerated');
    });
  });

  describe('render validation (H-INV-06, H-INV-07)', () => {
    it('throws for body with BOM (H-INV-06)', () => {
      const body = '\uFEFFcontent with BOM';
      const input = createInput(body);

      expect(() => render(input)).toThrow('H-INV-06');
    });

    it('throws for body with CRLF (H-INV-07)', () => {
      const body = 'line1\r\nline2';
      const input = createInput(body);

      expect(() => render(input)).toThrow('H-INV-07');
    });

    it('throws for body with CR (H-INV-07)', () => {
      const body = 'line1\rline2';
      const input = createInput(body);

      expect(() => render(input)).toThrow('H-INV-07');
    });

    it('allows clean body', () => {
      const body = 'clean\nbody';
      const input = createInput(body);

      expect(() => render(input, { timestamp: FIXED_TIMESTAMP })).not.toThrow();
    });
  });

  describe('render hash computation', () => {
    it('computes correct bodyHash', () => {
      const body = 'hash test body';
      const input = createInput(body);
      const expectedHash = computeHash(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.bodyHash).toBe(expectedHash);
    });

    it('computes correct contentHash', () => {
      const body = 'content hash test';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });
      const expectedHash = computeHash(result.content);

      expect(result.contentHash).toBe(expectedHash);
    });

    it('bodyHash equals contentHash when no envelope', () => {
      const body = 'no envelope';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.bodyHash).toBe(result.contentHash);
    });

    it('bodyHash differs from contentHash with envelope', () => {
      const body = 'with envelope';
      const input = createInput(body, {
        headers: ['HEADER'],
      });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.bodyHash).not.toBe(result.contentHash);
    });
  });

  describe('render result properties', () => {
    it('returns frozen result', () => {
      const input = createInput('body');

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('includes correct format', () => {
      const input = createInput('body', { format: 'MARKDOWN' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.format).toBe('MARKDOWN');
    });

    it('includes correct profileId', () => {
      const input = createInput('body', { profileId: 'PROF-custom' as ProfileId });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.profileId).toBe('PROF-custom');
    });

    it('computes correct byteLength', () => {
      const body = 'émoji 🎉'; // Mixed UTF-8
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.byteLength).toBe(Buffer.byteLength(result.content, 'utf-8'));
    });
  });

  describe('render JSON_PACK format', () => {
    it('produces valid JSON', () => {
      const input = createInput('json body', { format: 'JSON_PACK' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it('includes meta with correct structure', () => {
      const input = createInput('json body', {
        format: 'JSON_PACK',
        profileId: 'PROF-json' as ProfileId,
      });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });
      const parsed = JSON.parse(result.content);

      expect(parsed.meta.format).toBe('JSON_PACK');
      expect(parsed.meta.version).toBe('1.0');
      expect(parsed.meta.profileId).toBe('PROF-json');
      expect(parsed.meta.timestamp).toBe(FIXED_TIMESTAMP);
      expect(parsed.meta.bodyHash).toBe(result.bodyHash);
    });

    it('includes byteLength in meta', () => {
      const body = 'test body';
      const input = createInput(body, { format: 'JSON_PACK' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });
      const parsed = JSON.parse(result.content);

      expect(parsed.meta.byteLength).toBe(Buffer.byteLength(body, 'utf-8'));
    });

    it('uses 2-space indentation', () => {
      const input = createInput('body', { format: 'JSON_PACK' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toContain('  "meta"');
    });
  });

  describe('render specialized formats', () => {
    it('throws for PROOF_PACK format', () => {
      const input = createInput('body', { format: 'PROOF_PACK' });

      expect(() => render(input, { timestamp: FIXED_TIMESTAMP })).toThrow(
        'specialized renderer'
      );
    });

    it('throws for HASH_CHAIN format', () => {
      const input = createInput('body', { format: 'HASH_CHAIN' });

      expect(() => render(input, { timestamp: FIXED_TIMESTAMP })).toThrow(
        'specialized renderer'
      );
    });
  });

  describe('render determinism (H-INV-05)', () => {
    it('produces identical output for identical input', () => {
      const input = createInput('deterministic body');
      const options: RenderOptions = { timestamp: FIXED_TIMESTAMP };

      const result1 = render(input, options);
      const result2 = render(input, options);

      expect(result1.content).toBe(result2.content);
      expect(result1.contentHash).toBe(result2.contentHash);
    });

    it('produces identical JSON_PACK for identical input', () => {
      const input = createInput('json body', { format: 'JSON_PACK' });
      const options: RenderOptions = { timestamp: FIXED_TIMESTAMP };

      const result1 = render(input, options);
      const result2 = render(input, options);

      expect(result1.content).toBe(result2.content);
    });

    it('produces different output for different timestamps', () => {
      const input = createInput('body', { format: 'JSON_PACK' });

      const result1 = render(input, { timestamp: '2025-01-01T00:00:00.000Z' as ISO8601 });
      const result2 = render(input, { timestamp: '2025-01-02T00:00:00.000Z' as ISO8601 });

      expect(result1.content).not.toBe(result2.content);
    });

    it('uses current time if timestamp not provided', () => {
      const input = createInput('body', { format: 'JSON_PACK' });

      const result = render(input);
      const parsed = JSON.parse(result.content);

      expect(parsed.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('buildArtifact', () => {
    it('builds complete artifact from render result', () => {
      const input = createInput('body', { profileId: 'PROF-test' as ProfileId });
      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      const artifact = buildArtifact(result, 'output.txt', FIXED_TIMESTAMP);

      expect(artifact.filename).toBe('output.txt');
      expect(artifact.format).toBe('TEXT');
      expect(artifact.content).toBe(result.content);
      expect(artifact.hash).toBe(result.contentHash);
      expect(artifact.bodyHash).toBe(result.bodyHash);
      expect(artifact.byteLength).toBe(result.byteLength);
      expect(artifact.timestamp).toBe(FIXED_TIMESTAMP);
      expect(artifact.profileId).toBe('PROF-test');
    });

    it('returns frozen artifact', () => {
      const input = createInput('body');
      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      const artifact = buildArtifact(result, 'output.txt', FIXED_TIMESTAMP);

      expect(Object.isFrozen(artifact)).toBe(true);
    });
  });

  describe('getDefaultFilename', () => {
    it('returns filename with profile extension', () => {
      const profile = createProfile({ extension: '.txt' });

      expect(getDefaultFilename(profile, 'output')).toBe('output.txt');
    });

    it('handles .md extension', () => {
      const profile = createProfile({ extension: '.md' });

      expect(getDefaultFilename(profile, 'readme')).toBe('readme.md');
    });

    it('handles .json extension', () => {
      const profile = createProfile({ extension: '.json' });

      expect(getDefaultFilename(profile, 'data')).toBe('data.json');
    });

    it('preserves baseName exactly', () => {
      const profile = createProfile({ extension: '.txt' });

      expect(getDefaultFilename(profile, 'My File')).toBe('My File.txt');
    });
  });

  describe('isRenderableFormat', () => {
    it('returns true for TEXT', () => {
      expect(isRenderableFormat('TEXT')).toBe(true);
    });

    it('returns true for MARKDOWN', () => {
      expect(isRenderableFormat('MARKDOWN')).toBe(true);
    });

    it('returns true for JSON_PACK', () => {
      expect(isRenderableFormat('JSON_PACK')).toBe(true);
    });

    it('returns false for PROOF_PACK', () => {
      expect(isRenderableFormat('PROOF_PACK')).toBe(false);
    });

    it('returns false for HASH_CHAIN', () => {
      expect(isRenderableFormat('HASH_CHAIN')).toBe(false);
    });
  });

  describe('getSpecializedFormats', () => {
    it('returns PROOF_PACK and HASH_CHAIN', () => {
      const formats = getSpecializedFormats();

      expect(formats).toContain('PROOF_PACK');
      expect(formats).toContain('HASH_CHAIN');
      expect(formats).toHaveLength(2);
    });

    it('returns frozen array', () => {
      const formats = getSpecializedFormats();

      expect(Object.isFrozen(formats)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles empty body', () => {
      const input = createInput('');

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe('');
      expect(result.byteLength).toBe(0);
    });

    it('handles very long body', () => {
      const body = 'a'.repeat(100000);
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
      expect(result.byteLength).toBe(100000);
    });

    it('handles body with only newlines', () => {
      const body = '\n\n\n';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
    });

    it('handles body with only spaces', () => {
      const body = '   ';
      const input = createInput(body);

      const result = render(input, { timestamp: FIXED_TIMESTAMP });

      expect(result.content).toBe(body);
    });

    it('handles JSON_PACK with JSON body', () => {
      const body = '{"key": "value"}';
      const input = createInput(body, { format: 'JSON_PACK' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });
      const parsed = JSON.parse(result.content);

      expect(parsed.body).toBe(body);
    });

    it('handles body with quotes in JSON_PACK', () => {
      const body = 'He said "hello"';
      const input = createInput(body, { format: 'JSON_PACK' });

      const result = render(input, { timestamp: FIXED_TIMESTAMP });
      const parsed = JSON.parse(result.content);

      expect(parsed.body).toBe(body);
    });
  });
});
