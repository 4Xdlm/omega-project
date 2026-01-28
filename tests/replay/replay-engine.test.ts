/**
 * OMEGA Replay Engine Tests
 * Phase L - NASA-Grade L4
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { replayVerify, generateReplayReport } from '../../src/replay';

const FIXTURES_ROOT = join(__dirname, 'fixtures');
const VALID_RUN = join(FIXTURES_ROOT, 'valid_run');

// Create fixture before tests
beforeAll(() => {
  if (!existsSync(FIXTURES_ROOT)) {
    mkdirSync(FIXTURES_ROOT, { recursive: true });
  }

  // Create valid run fixture
  if (!existsSync(VALID_RUN)) {
    mkdirSync(VALID_RUN, { recursive: true });
    mkdirSync(join(VALID_RUN, 'artifacts'), { recursive: true });

    // Create files
    const files: Record<string, string> = {
      'intent.json': '{"intentId": "test"}',
      'contract.json': '{"type": "test"}',
      'truthgate_verdict.json': '{"verdict": "PASS"}',
      'truthgate_proof.json': '{"proof": []}',
      'delivery_manifest.json': '{"files": []}',
      'artifacts/output.txt': 'Test output',
    };

    // Write files and compute hashes
    const hashes: string[] = [];
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(VALID_RUN, path);
      writeFileSync(fullPath, content, 'utf-8');
      const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
      hashes.push(`${hash} *${path}`);
    }

    // Write hashes.txt
    const hashesContent = hashes.sort().join('\n') + '\n';
    writeFileSync(join(VALID_RUN, 'hashes.txt'), hashesContent, 'utf-8');

    // Write run_hash.txt
    const runHash = createHash('sha256').update(hashesContent, 'utf-8').digest('hex');
    writeFileSync(join(VALID_RUN, 'run_hash.txt'), runHash, 'utf-8');

    // Write run_report.md (use a past date that won't match current date)
    writeFileSync(join(VALID_RUN, 'run_report.md'), 'Timestamp: 2025-01-15T12:30:00.000Z\n', 'utf-8');
  }
});

describe('Phase L — Replay Engine', () => {
  describe('L-INV-01: Read-only verification', () => {
    it('verifies valid run successfully', () => {
      const result = replayVerify(VALID_RUN);
      expect(result.success).toBe(true);
      expect(result.structureValid).toBe(true);
      expect(result.hashesValid).toBe(true);
    });

    it('detects missing run directory', () => {
      const result = replayVerify('/nonexistent/path');
      expect(result.success).toBe(false);
      expect(result.tamperResults.some(t => t.type === 'file_missing')).toBe(true);
    });
  });

  describe('L-INV-02: Tamper detection', () => {
    it('detects modified file', () => {
      // Create tampered fixture
      const tamperedRun = join(FIXTURES_ROOT, 'tampered_run');
      if (!existsSync(tamperedRun)) {
        // Copy valid run
        mkdirSync(tamperedRun, { recursive: true });
        mkdirSync(join(tamperedRun, 'artifacts'), { recursive: true });

        const validHashes = readFileSync(join(VALID_RUN, 'hashes.txt'), 'utf-8');
        writeFileSync(join(tamperedRun, 'hashes.txt'), validHashes);
        writeFileSync(join(tamperedRun, 'run_hash.txt'), readFileSync(join(VALID_RUN, 'run_hash.txt')));

        // Write modified intent (tampered!)
        writeFileSync(join(tamperedRun, 'intent.json'), '{"intentId": "TAMPERED"}');
        writeFileSync(join(tamperedRun, 'contract.json'), '{"type": "test"}');
        writeFileSync(join(tamperedRun, 'truthgate_verdict.json'), '{"verdict": "PASS"}');
        writeFileSync(join(tamperedRun, 'truthgate_proof.json'), '{"proof": []}');
        writeFileSync(join(tamperedRun, 'delivery_manifest.json'), '{"files": []}');
        writeFileSync(join(tamperedRun, 'artifacts/output.txt'), 'Test output');
      }

      const result = replayVerify(tamperedRun);
      expect(result.success).toBe(false);
      expect(result.tamperResults.some(t => t.type === 'file_modified')).toBe(true);
    });
  });

  describe('L-INV-03: Report generation', () => {
    it('generates deterministic report', () => {
      const result = replayVerify(VALID_RUN);
      const report = generateReplayReport(result);

      expect(report).toContain('OMEGA Replay Verification Report');
      expect(report).toContain('PASS');
      expect(report).not.toContain(new Date().toISOString().substring(0, 10)); // No current date
    });
  });
});
