/**
 * OMEGA Delivery Normalizer Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 envelope normalization utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  LF,
  CRLF,
  UTF8_BOM,
  normalizeEnvelopeLineEndings,
  removeEnvelopeBOM,
  normalizeEnvelopeText,
  buildHeaderBlock,
  buildFooterBlock,
  validateBodyNoBOM,
  validateBodyLFOnly,
  validateBody,
  assembleArtifact,
  assembleWithProfile,
  ensureString,
  getByteLength,
  extractBody,
  verifyBodyPreserved,
} from '../../src/delivery/normalizer';
import type { DeliveryProfile } from '../../src/delivery/types';
import type { ProfileId, DeliveryFormat } from '../../src/delivery/types';

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

describe('Normalizer — Phase H', () => {
  describe('Constants', () => {
    it('LF is line feed character', () => {
      expect(LF).toBe('\n');
      expect(LF.charCodeAt(0)).toBe(10);
    });

    it('CRLF is carriage return + line feed', () => {
      expect(CRLF).toBe('\r\n');
      expect(CRLF.length).toBe(2);
    });

    it('UTF8_BOM is byte order mark', () => {
      expect(UTF8_BOM).toBe('\uFEFF');
      expect(UTF8_BOM.charCodeAt(0)).toBe(0xFEFF);
    });
  });

  describe('normalizeEnvelopeLineEndings', () => {
    it('preserves LF-only text', () => {
      const text = 'line1\nline2\nline3';
      expect(normalizeEnvelopeLineEndings(text)).toBe(text);
    });

    it('converts CRLF to LF', () => {
      const text = 'line1\r\nline2\r\nline3';
      expect(normalizeEnvelopeLineEndings(text)).toBe('line1\nline2\nline3');
    });

    it('converts lone CR to LF', () => {
      const text = 'line1\rline2\rline3';
      expect(normalizeEnvelopeLineEndings(text)).toBe('line1\nline2\nline3');
    });

    it('handles mixed line endings', () => {
      const text = 'line1\r\nline2\nline3\rline4';
      expect(normalizeEnvelopeLineEndings(text)).toBe('line1\nline2\nline3\nline4');
    });

    it('handles empty string', () => {
      expect(normalizeEnvelopeLineEndings('')).toBe('');
    });

    it('handles text without line endings', () => {
      expect(normalizeEnvelopeLineEndings('no newlines')).toBe('no newlines');
    });
  });

  describe('removeEnvelopeBOM', () => {
    it('removes BOM from start', () => {
      const text = UTF8_BOM + 'content';
      expect(removeEnvelopeBOM(text)).toBe('content');
    });

    it('preserves text without BOM', () => {
      const text = 'no bom content';
      expect(removeEnvelopeBOM(text)).toBe(text);
    });

    it('does not remove BOM from middle', () => {
      const text = 'before' + UTF8_BOM + 'after';
      expect(removeEnvelopeBOM(text)).toBe(text);
    });

    it('handles empty string', () => {
      expect(removeEnvelopeBOM('')).toBe('');
    });

    it('handles BOM-only string', () => {
      expect(removeEnvelopeBOM(UTF8_BOM)).toBe('');
    });
  });

  describe('normalizeEnvelopeText', () => {
    it('removes BOM and normalizes line endings', () => {
      const text = UTF8_BOM + 'line1\r\nline2';
      expect(normalizeEnvelopeText(text)).toBe('line1\nline2');
    });

    it('handles text with only BOM', () => {
      expect(normalizeEnvelopeText(UTF8_BOM + 'content')).toBe('content');
    });

    it('handles text with only CRLF', () => {
      expect(normalizeEnvelopeText('a\r\nb')).toBe('a\nb');
    });

    it('handles clean text', () => {
      const text = 'clean\ntext';
      expect(normalizeEnvelopeText(text)).toBe(text);
    });
  });

  describe('buildHeaderBlock', () => {
    it('builds header with trailing newline', () => {
      const profile = createProfile({
        headers: ['# Header', 'Line 2'],
      });

      const header = buildHeaderBlock(profile);

      expect(header).toBe('# Header\nLine 2\n');
    });

    it('returns empty string for no headers', () => {
      const profile = createProfile();

      expect(buildHeaderBlock(profile)).toBe('');
    });

    it('returns empty string for empty headers array', () => {
      const profile = createProfile({ headers: [] });

      expect(buildHeaderBlock(profile)).toBe('');
    });

    it('normalizes CRLF in headers', () => {
      const profile = createProfile({
        headers: ['line1\r\nline2'],
      });

      expect(buildHeaderBlock(profile)).toBe('line1\nline2\n');
    });

    it('removes BOM from headers', () => {
      const profile = createProfile({
        headers: [UTF8_BOM + 'header'],
      });

      expect(buildHeaderBlock(profile)).toBe('header\n');
    });

    it('handles single header', () => {
      const profile = createProfile({
        headers: ['---'],
      });

      expect(buildHeaderBlock(profile)).toBe('---\n');
    });
  });

  describe('buildFooterBlock', () => {
    it('builds footer without trailing newline', () => {
      const profile = createProfile({
        footers: ['---', 'Footer'],
      });

      const footer = buildFooterBlock(profile);

      expect(footer).toBe('---\nFooter');
    });

    it('returns empty string for no footers', () => {
      const profile = createProfile();

      expect(buildFooterBlock(profile)).toBe('');
    });

    it('returns empty string for empty footers array', () => {
      const profile = createProfile({ footers: [] });

      expect(buildFooterBlock(profile)).toBe('');
    });

    it('normalizes CRLF in footers', () => {
      const profile = createProfile({
        footers: ['line1\r\nline2'],
      });

      expect(buildFooterBlock(profile)).toBe('line1\nline2');
    });

    it('handles single footer', () => {
      const profile = createProfile({
        footers: ['---'],
      });

      expect(buildFooterBlock(profile)).toBe('---');
    });
  });

  describe('validateBodyNoBOM', () => {
    it('returns true for text without BOM', () => {
      expect(validateBodyNoBOM('clean text')).toBe(true);
    });

    it('returns false for text with BOM', () => {
      expect(validateBodyNoBOM(UTF8_BOM + 'text')).toBe(false);
    });

    it('returns true for empty string', () => {
      expect(validateBodyNoBOM('')).toBe(true);
    });

    it('returns true for BOM in middle (not start)', () => {
      expect(validateBodyNoBOM('before' + UTF8_BOM + 'after')).toBe(true);
    });
  });

  describe('validateBodyLFOnly', () => {
    it('returns true for LF-only text', () => {
      expect(validateBodyLFOnly('line1\nline2')).toBe(true);
    });

    it('returns false for CRLF text', () => {
      expect(validateBodyLFOnly('line1\r\nline2')).toBe(false);
    });

    it('returns false for CR-only text', () => {
      expect(validateBodyLFOnly('line1\rline2')).toBe(false);
    });

    it('returns true for no line endings', () => {
      expect(validateBodyLFOnly('no newlines')).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(validateBodyLFOnly('')).toBe(true);
    });
  });

  describe('validateBody', () => {
    it('returns valid for clean body', () => {
      const result = validateBody('clean\ntext');

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('detects BOM violation (H-INV-06)', () => {
      const result = validateBody(UTF8_BOM + 'text');

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('H-INV-06 VIOLATION: Body contains UTF-8 BOM');
    });

    it('detects CRLF violation (H-INV-07)', () => {
      const result = validateBody('line1\r\nline2');

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('H-INV-07 VIOLATION: Body contains CRLF or CR line endings');
    });

    it('detects multiple violations', () => {
      const result = validateBody(UTF8_BOM + 'line1\r\nline2');

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it('returns frozen result', () => {
      const result = validateBody('text');

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('assembleArtifact', () => {
    it('assembles header + body + footer', () => {
      const result = assembleArtifact('HEADER\n', 'BODY', '\nFOOTER');

      expect(result).toBe('HEADER\nBODY\nFOOTER');
    });

    it('preserves body exactly (H-INV-01)', () => {
      const body = 'exact\nbody\ntext';
      const result = assembleArtifact('H\n', body, '\nF');

      expect(result).toContain(body);
      expect(result.indexOf(body)).toBe(2); // After "H\n"
    });

    it('handles empty header', () => {
      const result = assembleArtifact('', 'BODY', '\nFOOTER');

      expect(result).toBe('BODY\nFOOTER');
    });

    it('handles empty footer', () => {
      const result = assembleArtifact('HEADER\n', 'BODY', '');

      expect(result).toBe('HEADER\nBODY');
    });

    it('handles empty header and footer', () => {
      const result = assembleArtifact('', 'BODY', '');

      expect(result).toBe('BODY');
    });

    it('handles empty body', () => {
      const result = assembleArtifact('H\n', '', '\nF');

      expect(result).toBe('H\n\nF');
    });

    it('preserves special characters in body', () => {
      const body = 'special: émoji 🎉 中文';
      const result = assembleArtifact('', body, '');

      expect(result).toBe(body);
    });
  });

  describe('assembleWithProfile', () => {
    it('uses profile headers and footers', () => {
      const profile = createProfile({
        headers: ['---', 'header: value'],
        footers: ['---', 'footer'],
      });

      const result = assembleWithProfile('BODY', profile);

      expect(result).toBe('---\nheader: value\nBODY---\nfooter');
    });

    it('handles profile without envelope', () => {
      const profile = createProfile();

      const result = assembleWithProfile('BODY', profile);

      expect(result).toBe('BODY');
    });

    it('preserves body exactly (H-INV-01)', () => {
      const profile = createProfile({
        headers: ['H'],
        footers: ['F'],
      });
      const body = 'exact body content';

      const result = assembleWithProfile(body, profile);

      expect(result).toContain(body);
    });
  });

  describe('ensureString', () => {
    it('returns string as-is', () => {
      const input = 'test string';
      expect(ensureString(input)).toBe(input);
    });

    it('converts Buffer to string', () => {
      const buffer = Buffer.from('buffer content', 'utf-8');
      expect(ensureString(buffer)).toBe('buffer content');
    });

    it('handles empty Buffer', () => {
      const buffer = Buffer.from('', 'utf-8');
      expect(ensureString(buffer)).toBe('');
    });

    it('handles UTF-8 Buffer correctly', () => {
      const buffer = Buffer.from('émoji 🎉', 'utf-8');
      expect(ensureString(buffer)).toBe('émoji 🎉');
    });
  });

  describe('getByteLength', () => {
    it('returns correct length for ASCII', () => {
      expect(getByteLength('hello')).toBe(5);
    });

    it('returns correct length for UTF-8 multibyte', () => {
      // é is 2 bytes in UTF-8
      expect(getByteLength('é')).toBe(2);
    });

    it('returns correct length for emoji', () => {
      // 🎉 is 4 bytes in UTF-8
      expect(getByteLength('🎉')).toBe(4);
    });

    it('returns 0 for empty string', () => {
      expect(getByteLength('')).toBe(0);
    });

    it('handles mixed content', () => {
      // h(1) + é(2) + l(1) + l(1) + o(1) + 🎉(4) = 10
      expect(getByteLength('héllo🎉')).toBe(10);
    });
  });

  describe('extractBody', () => {
    it('extracts body from artifact', () => {
      // HEADER\n = 7 chars, \nFOOTER = 7 chars, BODY = 4 chars
      const artifact = 'HEADER\nBODY\nFOOTER';
      const body = extractBody(artifact, 7, 7);

      // Body is between header and footer, newline before FOOTER is part of footer
      expect(body).toBe('BODY');
    });

    it('handles no header', () => {
      // No header, FOOTER = 6 chars, so \n is part of body
      const artifact = 'BODY\nFOOTER';
      const body = extractBody(artifact, 0, 6);

      expect(body).toBe('BODY\n');
    });

    it('handles no footer', () => {
      const artifact = 'HEADER\nBODY';
      const body = extractBody(artifact, 7, 0);

      expect(body).toBe('BODY');
    });

    it('handles body only', () => {
      const artifact = 'BODY';
      const body = extractBody(artifact, 0, 0);

      expect(body).toBe('BODY');
    });

    it('returns empty for adjacent header/footer', () => {
      const artifact = 'HEADERFOOTER';
      const body = extractBody(artifact, 6, 6);

      expect(body).toBe('');
    });
  });

  describe('verifyBodyPreserved (H-INV-01)', () => {
    it('returns true when body preserved', () => {
      const original = 'original body';
      const artifact = 'H\n' + original + '\nF';

      expect(verifyBodyPreserved(original, artifact, 2, 2)).toBe(true);
    });

    it('returns false when body modified', () => {
      const original = 'original body';
      const artifact = 'H\nmodified body\nF';

      expect(verifyBodyPreserved(original, artifact, 2, 2)).toBe(false);
    });

    it('handles no envelope', () => {
      const original = 'body only';

      expect(verifyBodyPreserved(original, original, 0, 0)).toBe(true);
    });

    it('detects byte-level differences', () => {
      const original = 'test';
      const modified = 'test '; // extra space

      expect(verifyBodyPreserved(original, modified, 0, 0)).toBe(false);
    });

    it('detects encoding differences', () => {
      const original = 'café';
      const different = 'cafe'; // missing accent

      expect(verifyBodyPreserved(original, different, 0, 0)).toBe(false);
    });
  });

  describe('H-INV-01: Body bytes preserved EXACTLY', () => {
    it('never modifies body during assembly', () => {
      const bodies = [
        'simple text',
        'with\nnewlines',
        'special: émoji 🎉',
        'tabs\there\ttoo',
        '   leading spaces',
        'trailing spaces   ',
        '',
        'a',
      ];

      for (const body of bodies) {
        const profile = createProfile({
          headers: ['H'],
          footers: ['F'],
        });

        const artifact = assembleWithProfile(body, profile);
        const header = buildHeaderBlock(profile);
        const footer = buildFooterBlock(profile);

        expect(verifyBodyPreserved(body, artifact, header.length, footer.length)).toBe(true);
      }
    });
  });

  describe('Determinism', () => {
    it('produces identical output for identical input', () => {
      const body = 'deterministic body';
      const profile = createProfile({
        headers: ['---'],
        footers: ['---'],
      });

      const result1 = assembleWithProfile(body, profile);
      const result2 = assembleWithProfile(body, profile);

      expect(result1).toBe(result2);
    });

    it('header block is deterministic', () => {
      const profile = createProfile({
        headers: ['H1', 'H2'],
      });

      expect(buildHeaderBlock(profile)).toBe(buildHeaderBlock(profile));
    });

    it('footer block is deterministic', () => {
      const profile = createProfile({
        footers: ['F1', 'F2'],
      });

      expect(buildFooterBlock(profile)).toBe(buildFooterBlock(profile));
    });
  });
});
