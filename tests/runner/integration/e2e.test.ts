/**
 * OMEGA Runner E2E Integration Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * End-to-end tests for runner pipeline.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  executePipeline,
  getPipelineFiles,
  createRunPath,
  writeAllRunFiles,
  verifyRun,
  isRunIntact,
  createCapsule,
  generateRunReport,
  writeReportToRun,
  readReportFromRun,
  ExitCode,
  FIXED_PATHS,
  RUN_FILES,
} from '../../../src/runner';

const TEST_DIR = join(process.cwd(), '.test_e2e');
const RUNS_PATH = join(TEST_DIR, FIXED_PATHS.RUNS_ROOT);
const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z';

describe('E2E Integration — Phase I', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(RUNS_PATH, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Full Pipeline Flow', () => {
    it('executes complete pipeline: Intent → Pipeline → Files → Verify', async () => {
      // Step 1: Create intent
      const intent = {
        intentId: 'e2e-full-flow',
        content: 'This is a complete E2E test of the pipeline.',
      };
      const intentJson = JSON.stringify(intent);

      // Step 2: Execute pipeline
      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
      expect(result.runHash).toMatch(/^[a-f0-9]{64}$/);

      // Step 3: Write files to disk
      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Step 4: Verify all expected files exist
      expect(existsSync(join(runDir.path, RUN_FILES.INTENT))).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.CONTRACT))).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.TRUTHGATE_VERDICT))).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.TRUTHGATE_PROOF))).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.DELIVERY_MANIFEST))).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.HASHES))).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.RUN_HASH))).toBe(true);

      // Step 5: Verify the run
      const verifyResult = verifyRun(runDir.path);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.mismatches).toHaveLength(0);

      // Step 6: Check isRunIntact
      expect(isRunIntact(runDir.path)).toBe(true);
    });

    it('executes pipeline → write → report → verify → capsule', async () => {
      const intent = { intentId: 'e2e-complete', content: 'Complete workflow test' };
      const intentJson = JSON.stringify(intent);

      // Pipeline
      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });
      expect(result.success).toBe(true);

      // Write
      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Report
      const report = generateRunReport(result);
      const writeSuccess = writeReportToRun(runDir.path, report);
      expect(writeSuccess).toBe(true);

      // Read report back
      const readReport = readReportFromRun(runDir.path);
      expect(readReport).toContain('# Run Report');

      // Verify
      const verifyResult = verifyRun(runDir.path);
      expect(verifyResult.success).toBe(true);

      // Capsule
      const capsuleResult = await createCapsule(runDir.path, {
        outputPath: join(TEST_DIR, 'test.capsule.zip'),
      });
      expect(capsuleResult.success).toBe(true);
      expect(capsuleResult.fileCount).toBeGreaterThan(0);
    });
  });

  describe('Multiple Runs', () => {
    it('handles multiple independent runs', async () => {
      const intents = [
        { intentId: 'multi-1', content: 'First run' },
        { intentId: 'multi-2', content: 'Second run' },
        { intentId: 'multi-3', content: 'Third run' },
      ];

      const runPaths: string[] = [];

      for (const intent of intents) {
        const intentJson = JSON.stringify(intent);
        const { files, result } = getPipelineFiles(intentJson, {
          profile: 'OMEGA_STD',
          timestamp: FIXED_TIMESTAMP,
          basePath: TEST_DIR,
        });

        expect(result.success).toBe(true);

        const runDir = createRunPath(TEST_DIR, intent.intentId);
        writeAllRunFiles(runDir, files);
        runPaths.push(runDir.path);
      }

      // All runs should exist and verify
      for (const runPath of runPaths) {
        expect(existsSync(runPath)).toBe(true);
        expect(verifyRun(runPath).success).toBe(true);
      }
    });

    it('handles sequential runs with same intent ID', async () => {
      const intent = { intentId: 'sequential', content: 'Same intent, multiple runs' };
      const intentJson = JSON.stringify(intent);

      const runDirs: string[] = [];

      // Create 3 runs with same intent ID
      for (let i = 0; i < 3; i++) {
        const { files, result } = getPipelineFiles(intentJson, {
          profile: 'OMEGA_STD',
          timestamp: `2025-01-15T10:${30 + i}:00.000Z`,
          basePath: TEST_DIR,
        });

        const runDir = createRunPath(TEST_DIR, intent.intentId);
        writeAllRunFiles(runDir, files);
        runDirs.push(runDir.path);
      }

      // Should have 3 different run directories
      expect(new Set(runDirs).size).toBe(3);

      // All should verify
      for (const runPath of runDirs) {
        expect(verifyRun(runPath).success).toBe(true);
      }
    });
  });

  describe('Artifact Verification', () => {
    it('artifacts directory contains output files', async () => {
      const intent = { intentId: 'artifacts-test', content: 'Test artifact creation' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Check artifacts directory
      const artifactsPath = join(runDir.path, RUN_FILES.ARTIFACTS_DIR);
      expect(existsSync(artifactsPath)).toBe(true);

      const artifacts = readdirSync(artifactsPath);
      expect(artifacts.length).toBeGreaterThan(0);
      expect(artifacts).toContain('output.txt');
    });

    it('artifact content matches intent content', async () => {
      const content = 'Specific test content for artifact verification';
      const intent = { intentId: 'artifact-content', content };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read artifact content
      const artifactPath = join(runDir.path, RUN_FILES.ARTIFACTS_DIR, 'output.txt');
      const artifactContent = readFileSync(artifactPath, 'utf-8');

      expect(artifactContent).toBe(content);
    });
  });

  describe('Hash Chain Verification', () => {
    it('run hash in file matches computed hash', async () => {
      const intent = { intentId: 'hash-verify', content: 'Hash chain test' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read run hash from file
      const runHashFile = readFileSync(join(runDir.path, RUN_FILES.RUN_HASH), 'utf-8').trim();

      // Should match result
      expect(runHashFile).toBe(result.runHash);

      // Verification should pass
      expect(verifyRun(runDir.path).success).toBe(true);
    });

    it('hashes file contains all expected files', async () => {
      const intent = { intentId: 'hashes-file', content: 'Hashes file test' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read hashes file
      const hashesContent = readFileSync(join(runDir.path, RUN_FILES.HASHES), 'utf-8');
      const lines = hashesContent.split('\n').filter(l => l.trim());

      // Should have entries for all files
      expect(lines.length).toBeGreaterThan(0);

      // Each line should have format: hash  filename
      for (const line of lines) {
        expect(line).toMatch(/^[a-f0-9]{64}\s{2}.+$/);
      }
    });
  });

  describe('JSON File Content', () => {
    it('intent.json contains valid JSON', async () => {
      const intent = { intentId: 'json-test', content: 'JSON validation' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read and parse intent.json
      const content = readFileSync(join(runDir.path, RUN_FILES.INTENT), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.intentId).toBe('json-test');
      expect(parsed.content).toBe('JSON validation');
    });

    it('contract.json contains generation data', async () => {
      const intent = { intentId: 'contract-test', content: 'Contract validation' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read and parse contract.json
      const content = readFileSync(join(runDir.path, RUN_FILES.CONTRACT), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.intentId).toBe('contract-test');
      expect(parsed.generatedText).toBe('Contract validation');
      expect(parsed.timestamp).toBe(FIXED_TIMESTAMP);
    });

    it('truthgate_verdict.json contains validation result', async () => {
      const intent = { intentId: 'verdict-test', content: 'Verdict validation' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read and parse truthgate_verdict.json
      const content = readFileSync(join(runDir.path, RUN_FILES.TRUTHGATE_VERDICT), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.passed).toBe(true);
      expect(parsed.validatedText).toBe('Verdict validation');
      expect(parsed.violations).toHaveLength(0);
    });

    it('delivery_manifest.json contains manifest data', async () => {
      const intent = { intentId: 'manifest-test', content: 'Manifest validation' };
      const intentJson = JSON.stringify(intent);

      const { files, result } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      // Read and parse delivery_manifest.json
      const content = readFileSync(join(runDir.path, RUN_FILES.DELIVERY_MANIFEST), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.0');
      expect(parsed.profile).toBe('OMEGA_STD');
      expect(parsed.entries).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid JSON intent', () => {
      const { files, result } = getPipelineFiles('not valid json', {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
      expect(files.size).toBe(0);
    });

    it('handles missing intentId', () => {
      const { files, result } = getPipelineFiles(JSON.stringify({ content: 'no id' }), {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
    });

    it('handles missing content', () => {
      const { files, result } = getPipelineFiles(JSON.stringify({ intentId: 'no-content' }), {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.INTENT_INVALID);
    });
  });
});
