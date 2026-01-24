/**
 * OMEGA V4.4 — CLI Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Tests:
 * - Pipeline execution
 * - Determinism verification
 * - Hash verification
 * - Manifest generation
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OmegaCLI } from '../../src/phase6_cli/index.js';
import type { CLIRunInput } from '../../src/phase6_cli/index.js';

describe('OmegaCLI', () => {
  let cli: OmegaCLI;

  beforeEach(() => {
    cli = new OmegaCLI();
  });

  describe('Pipeline Execution', () => {
    it('executes pipeline on single input', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Hello world', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.results).toHaveLength(1);
      expect(output.dna).toBeDefined();
      expect(output.globalHash).toBeDefined();
      expect(output.globalHash.length).toBe(64);
    });

    it('executes pipeline on multiple inputs', () => {
      const inputs: CLIRunInput[] = [
        { text: 'First message', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'Second message', timestamp: 1000000001000, sourceId: 'test' },
        { text: 'Third message', timestamp: 1000000002000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.results).toHaveLength(3);
      expect(output.metadata.inputCount).toBe(3);
    });

    it('handles empty input array', () => {
      const inputs: CLIRunInput[] = [];

      const output = cli.run(inputs);

      expect(output.results).toHaveLength(0);
      expect(output.metadata.inputCount).toBe(0);
      expect(output.globalHash).toBeDefined();
    });

    it('includes all pipeline phases in results', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Test message', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);
      const result = output.results[0];

      // Phase 2: Core output
      expect(result?.coreOutput).toBeDefined();
      expect(result?.coreOutput.computeHash).toBeDefined();

      // Phase 3: Snapshot
      expect(result?.snapshot).toBeDefined();
      expect(result?.snapshot.snapshotId).toBeDefined();

      // Phase 4: Validation
      expect(result?.validation).toBeDefined();
      expect(result?.validation.verdict).toBeDefined();
    });

    it('generates DNA from all snapshots', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Happy joyful content', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'Sad melancholic feeling', timestamp: 1000000001000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.dna.tree).toHaveLength(2);
      expect(output.dna.metadata.snapshotCount).toBe(2);
      expect(output.dna.dnaHash).toBeDefined();
    });

    it('tracks valid and invalid counts', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Valid text', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'Another valid text', timestamp: 1000000001000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.metadata.validCount + output.metadata.invalidCount).toBe(2);
    });
  });

  describe('Determinism', () => {
    it('same input produces same output hash', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Deterministic test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);

      expect(output1.globalHash).toBe(output2.globalHash);
    });

    it('same inputs produce same core hashes', () => {
      const inputs: CLIRunInput[] = [
        { text: 'First', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'Second', timestamp: 1000000001000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);

      for (let i = 0; i < inputs.length; i++) {
        expect(output1.results[i]?.coreOutput.computeHash).toBe(
          output2.results[i]?.coreOutput.computeHash
        );
      }
    });

    it('same inputs produce same snapshot hashes', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Snapshot test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);

      expect(output1.results[0]?.snapshot.contentHash).toBe(
        output2.results[0]?.snapshot.contentHash
      );
    });

    it('same inputs produce same DNA hash', () => {
      const inputs: CLIRunInput[] = [
        { text: 'DNA test one', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'DNA test two', timestamp: 1000000001000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);

      expect(output1.dna.dnaHash).toBe(output2.dna.dnaHash);
    });

    it('verifyDeterminism returns true for valid inputs', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Verification test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      expect(cli.verifyDeterminism(inputs)).toBe(true);
    });

    it('different inputs produce different hashes', () => {
      const inputs1: CLIRunInput[] = [
        { text: 'Input A', timestamp: 1000000000000, sourceId: 'test' },
      ];
      const inputs2: CLIRunInput[] = [
        { text: 'Input B', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs1);
      const output2 = cli.run(inputs2);

      expect(output1.globalHash).not.toBe(output2.globalHash);
    });

    it('different timestamps produce different hashes', () => {
      const inputs1: CLIRunInput[] = [
        { text: 'Same text', timestamp: 1000000000000, sourceId: 'test' },
      ];
      const inputs2: CLIRunInput[] = [
        { text: 'Same text', timestamp: 1000000000001, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs1);
      const output2 = cli.run(inputs2);

      expect(output1.globalHash).not.toBe(output2.globalHash);
    });

    it('multiple runs with many inputs are deterministic', () => {
      const inputs: CLIRunInput[] = Array.from({ length: 10 }, (_, i) => ({
        text: `Message number ${i}`,
        timestamp: 1000000000000 + i * 1000,
        sourceId: 'test',
      }));

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);
      const output3 = cli.run(inputs);

      expect(output1.globalHash).toBe(output2.globalHash);
      expect(output2.globalHash).toBe(output3.globalHash);
    });
  });

  describe('Verification', () => {
    it('verify returns match for identical outputs', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);

      const result = cli.verify(output1, output2);

      expect(result.matches).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it('verify returns no match for different outputs', () => {
      const inputs1: CLIRunInput[] = [
        { text: 'Test A', timestamp: 1000000000000, sourceId: 'test' },
      ];
      const inputs2: CLIRunInput[] = [
        { text: 'Test B', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs1);
      const output2 = cli.run(inputs2);

      const result = cli.verify(output1, output2);

      expect(result.matches).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it('verify identifies count differences', () => {
      const inputs1: CLIRunInput[] = [
        { text: 'One', timestamp: 1000000000000, sourceId: 'test' },
      ];
      const inputs2: CLIRunInput[] = [
        { text: 'One', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'Two', timestamp: 1000000001000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs1);
      const output2 = cli.run(inputs2);

      const result = cli.verify(output1, output2);

      const countDiff = result.differences.find(d => d.field === 'results.length');
      expect(countDiff).toBeDefined();
    });

    it('verify identifies hash differences', () => {
      const inputs1: CLIRunInput[] = [
        { text: 'Text A', timestamp: 1000000000000, sourceId: 'test' },
      ];
      const inputs2: CLIRunInput[] = [
        { text: 'Text B', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs1);
      const output2 = cli.run(inputs2);

      const result = cli.verify(output1, output2);

      const hashDiffs = result.differences.filter(d =>
        d.field.includes('computeHash') || d.field.includes('contentHash')
      );
      expect(hashDiffs.length).toBeGreaterThan(0);
    });
  });

  describe('Manifest', () => {
    it('generates valid manifest', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);
      const manifest = cli.generateManifest(output);

      expect(manifest.globalHash).toBe(output.globalHash);
      expect(manifest.coreHashes).toHaveLength(1);
      expect(manifest.snapshotHashes).toHaveLength(1);
      expect(manifest.dnaHash).toBe(output.dna.dnaHash);
      expect(manifest.version).toBe('4.4.0');
    });

    it('manifest hashes match output hashes', () => {
      const inputs: CLIRunInput[] = [
        { text: 'First', timestamp: 1000000000000, sourceId: 'test' },
        { text: 'Second', timestamp: 1000000001000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);
      const manifest = cli.generateManifest(output);

      for (let i = 0; i < inputs.length; i++) {
        expect(manifest.coreHashes[i]).toBe(output.results[i]?.coreOutput.computeHash);
        expect(manifest.snapshotHashes[i]).toBe(output.results[i]?.snapshot.contentHash);
      }
    });

    it('manifest is deterministic', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Manifest test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output1 = cli.run(inputs);
      const output2 = cli.run(inputs);

      const manifest1 = cli.generateManifest(output1);
      const manifest2 = cli.generateManifest(output2);

      expect(manifest1.globalHash).toBe(manifest2.globalHash);
      expect(manifest1.dnaHash).toBe(manifest2.dnaHash);
    });
  });

  describe('Metadata', () => {
    it('includes run ID', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.metadata.runId).toBeDefined();
      expect(output.metadata.runId.length).toBe(36); // UUID format
    });

    it('includes timestamp', () => {
      const before = Date.now();
      const inputs: CLIRunInput[] = [
        { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);
      const after = Date.now();

      expect(output.metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(output.metadata.timestamp).toBeLessThanOrEqual(after);
    });

    it('includes duration', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.metadata.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('includes version', () => {
      const inputs: CLIRunInput[] = [
        { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
      ];

      const output = cli.run(inputs);

      expect(output.metadata.version).toBe('4.4.0');
    });
  });

  describe('Version', () => {
    it('returns correct version', () => {
      expect(cli.getVersion()).toBe('4.4.0');
    });
  });
});

describe('CLI Performance', () => {
  let cli: OmegaCLI;

  beforeEach(() => {
    cli = new OmegaCLI();
  });

  it('single input pipeline completes under 50ms', () => {
    const inputs: CLIRunInput[] = [
      { text: 'Performance test', timestamp: 1000000000000, sourceId: 'test' },
    ];

    const start = performance.now();
    cli.run(inputs);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it('10 inputs pipeline completes under 100ms', () => {
    const inputs: CLIRunInput[] = Array.from({ length: 10 }, (_, i) => ({
      text: `Message ${i} with some content`,
      timestamp: 1000000000000 + i * 1000,
      sourceId: 'test',
    }));

    const start = performance.now();
    cli.run(inputs);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('100 inputs pipeline completes under 200ms', () => {
    const inputs: CLIRunInput[] = Array.from({ length: 100 }, (_, i) => ({
      text: `Message ${i} with some content to process`,
      timestamp: 1000000000000 + i * 1000,
      sourceId: 'test',
    }));

    const start = performance.now();
    cli.run(inputs);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200);
  });

  it('verification completes under 10ms', () => {
    const inputs: CLIRunInput[] = [
      { text: 'Test', timestamp: 1000000000000, sourceId: 'test' },
    ];

    const output1 = cli.run(inputs);
    const output2 = cli.run(inputs);

    const start = performance.now();
    cli.verify(output1, output2);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('manifest generation completes under 5ms', () => {
    const inputs: CLIRunInput[] = Array.from({ length: 50 }, (_, i) => ({
      text: `Message ${i}`,
      timestamp: 1000000000000 + i * 1000,
      sourceId: 'test',
    }));

    const output = cli.run(inputs);

    const start = performance.now();
    cli.generateManifest(output);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });
});
