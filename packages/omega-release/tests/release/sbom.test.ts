/**
 * OMEGA Release — SBOM Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { generateSBOM, validateSBOM } from '../../src/release/sbom.js';

describe('generateSBOM', () => {
  it('generates CycloneDX 1.4 format', () => {
    const sbom = generateSBOM('1.0.0');
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.4');
    expect(sbom.version).toBe(1);
  });

  it('includes default OMEGA components', () => {
    const sbom = generateSBOM('1.0.0');
    expect(sbom.components.length).toBeGreaterThan(0);
    const names = sbom.components.map(c => c.name);
    expect(names).toContain('@omega/canon-kernel');
    expect(names).toContain('@omega/omega-release');
  });

  it('accepts custom components', () => {
    const custom = [{ type: 'library' as const, name: 'custom-lib', version: '1.0.0' }];
    const sbom = generateSBOM('1.0.0', custom);
    expect(sbom.components).toHaveLength(1);
    expect(sbom.components[0].name).toBe('custom-lib');
  });
});

describe('validateSBOM', () => {
  it('validates correct SBOM', () => {
    const sbom = generateSBOM('1.0.0');
    expect(validateSBOM(sbom)).toBe(true);
  });

  it('rejects wrong format', () => {
    expect(validateSBOM({ bomFormat: 'SPDX' as 'CycloneDX', specVersion: '1.4', version: 1, components: [] })).toBe(false);
  });

  it('rejects wrong spec version', () => {
    expect(validateSBOM({ bomFormat: 'CycloneDX', specVersion: '1.3' as '1.4', version: 1, components: [] })).toBe(false);
  });
});
