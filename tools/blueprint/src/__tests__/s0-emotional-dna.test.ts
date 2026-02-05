import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const STANDARD_DIR = path.join(REPO_ROOT, 'nexus/standards/EMOTIONAL_DNA_v1.0');

describe('S0: Emotional DNA Standard', () => {
  it('IR Schema exists and is valid JSON', async () => {
    const schemaPath = path.join(STANDARD_DIR, 'IR/EMOTIONAL_DNA_IR_SCHEMA.json');
    const content = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    expect(schema.$schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.required).toContain('version');
    expect(schema.required).toContain('identity');
    expect(schema.required).toContain('emotional_axes');
    expect(schema.required).toContain('provenance');
  });

  it('IR Spec document exists', async () => {
    const specPath = path.join(STANDARD_DIR, 'IR/EMOTIONAL_DNA_IR_SPEC.md');
    const content = await fs.readFile(specPath, 'utf-8');
    expect(content).toContain('EMOTIONAL DNA IR SPECIFICATION');
    expect(content).toContain('v1.0');
  });

  it('Validator TypeScript exists', async () => {
    const validatorPath = path.join(STANDARD_DIR, 'IR/validator.ts');
    const content = await fs.readFile(validatorPath, 'utf-8');
    expect(content).toContain('export function validate');
    expect(content).toContain('export function canonicalize');
  });

  it('Legal contract exists with required sections', async () => {
    const contractPath = path.join(STANDARD_DIR, 'LEGAL/EMOTIONAL_DNA_CONTRACT_v1.0.md');
    const content = await fs.readFile(contractPath, 'utf-8');
    expect(content).toContain('DEFINITIONS');
    expect(content).toContain('GRANT OF RIGHTS');
    expect(content).toContain('LIABILITY');
  });

  it('All annexes exist', async () => {
    const annexes = [
      'LEGAL/ANNEX_A_MATHEMATICAL_MODEL.md',
      'LEGAL/ANNEX_B_INVARIANTS.md',
      'LEGAL/ANNEX_C_CONFORMITY_TESTS.md',
      'LEGAL/ANNEX_D_COMPATIBILITY_MATRIX.md'
    ];

    for (const annex of annexes) {
      const annexPath = path.join(STANDARD_DIR, annex);
      const exists = await fs.access(annexPath).then(() => true).catch(() => false);
      expect(exists, `Missing ${annex}`).toBe(true);
    }
  });

  it('Manifest exists with SHA256 entries', async () => {
    const manifestPath = path.join(STANDARD_DIR, 'MANIFEST/STANDARD_MANIFEST.sha256');
    const content = await fs.readFile(manifestPath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBeGreaterThan(0);

    // Check format
    for (const line of lines) {
      expect(line).toMatch(/^[a-f0-9]{64}\s{2}.+$/);
    }
  });

  it('ZIP archive exists', async () => {
    const zipPath = path.join(REPO_ROOT, 'nexus/standards/EMOTIONAL_DNA_STANDARD_v1.0_6595bc99.zip');
    const exists = await fs.access(zipPath).then(() => true).catch(() => false);
    expect(exists, 'S0 ZIP archive should exist').toBe(true);

    const stats = await fs.stat(zipPath);
    expect(stats.size).toBeGreaterThan(5000);
  });

  it('No magic numbers in schema (constants documented)', async () => {
    const schemaPath = path.join(STANDARD_DIR, 'IR/EMOTIONAL_DNA_IR_SCHEMA.json');
    const content = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // Check that numeric constraints have descriptions
    if (schema.properties.emotional_axes.properties.dimensions) {
      expect(schema.properties.emotional_axes.properties.dimensions.description).toBeDefined();
    }
  });
});
