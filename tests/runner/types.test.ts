/**
 * OMEGA Runner Types Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for runner types and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  ExitCode,
  EXIT_CODE_DESCRIPTIONS,
  DEFAULT_PROFILE,
  FIXED_PATHS,
  RUN_FILES,
  HASHABLE_FILES,
  isCliCommand,
  isExitCode,
  isSafePath,
  isAllowedWritePath,
  validatePath,
  generateRunId,
  extractIntentId,
} from '../../src/runner/types';
import type {
  CliCommand,
  ParsedArgs,
  RunResult,
  BatchResult,
  VerifyResult,
  CapsuleResult,
  HashMismatch,
  PathValidation,
  IntentValidation,
} from '../../src/runner/types';

describe('Runner Types — Phase I', () => {
  describe('ExitCode enum', () => {
    it('PASS is 0', () => {
      expect(ExitCode.PASS).toBe(0);
    });

    it('INTENT_INVALID is 10', () => {
      expect(ExitCode.INTENT_INVALID).toBe(10);
    });

    it('POLICY_LOCK_FAIL is 20', () => {
      expect(ExitCode.POLICY_LOCK_FAIL).toBe(20);
    });

    it('GENERATION_FAIL is 30', () => {
      expect(ExitCode.GENERATION_FAIL).toBe(30);
    });

    it('TRUTHGATE_FAIL is 40', () => {
      expect(ExitCode.TRUTHGATE_FAIL).toBe(40);
    });

    it('DELIVERY_FAIL is 50', () => {
      expect(ExitCode.DELIVERY_FAIL).toBe(50);
    });

    it('VERIFY_FAIL is 60', () => {
      expect(ExitCode.VERIFY_FAIL).toBe(60);
    });

    it('CAPSULE_FAIL is 70', () => {
      expect(ExitCode.CAPSULE_FAIL).toBe(70);
    });

    it('exit codes are multiples of 10', () => {
      const codes = Object.values(ExitCode).filter(v => typeof v === 'number');
      for (const code of codes) {
        expect((code as number) % 10).toBe(0);
      }
    });
  });

  describe('EXIT_CODE_DESCRIPTIONS', () => {
    it('has description for each exit code', () => {
      const codes = Object.values(ExitCode).filter(v => typeof v === 'number') as ExitCode[];
      for (const code of codes) {
        expect(EXIT_CODE_DESCRIPTIONS[code]).toBeDefined();
        expect(typeof EXIT_CODE_DESCRIPTIONS[code]).toBe('string');
      }
    });

    it('is frozen', () => {
      expect(Object.isFrozen(EXIT_CODE_DESCRIPTIONS)).toBe(true);
    });
  });

  describe('DEFAULT_PROFILE', () => {
    it('is OMEGA_STD', () => {
      expect(DEFAULT_PROFILE).toBe('OMEGA_STD');
    });
  });

  describe('FIXED_PATHS (I-INV-04)', () => {
    it('is frozen', () => {
      expect(Object.isFrozen(FIXED_PATHS)).toBe(true);
    });

    it('has policies path', () => {
      expect(FIXED_PATHS.POLICIES_PATH).toBe('config/policies/policies.v1.json');
    });

    it('has policies lock path', () => {
      expect(FIXED_PATHS.POLICIES_LOCK_PATH).toBe('config/policies/policies.lock');
    });

    it('has delivery profiles path', () => {
      expect(FIXED_PATHS.DELIVERY_PROFILES_PATH).toBe('config/delivery/profiles.v1.json');
    });

    it('has delivery lock path', () => {
      expect(FIXED_PATHS.DELIVERY_LOCK_PATH).toBe('config/delivery/profiles.lock');
    });

    it('has runs root', () => {
      expect(FIXED_PATHS.RUNS_ROOT).toBe('artefacts/runs');
    });

    it('has ledger path', () => {
      expect(FIXED_PATHS.LEDGER_PATH).toBe('data/intent-ledger');
    });

    it('paths do not use environment variables', () => {
      const paths = Object.values(FIXED_PATHS);
      for (const path of paths) {
        expect(path.includes('$')).toBe(false);
        expect(path.includes('process.env')).toBe(false);
      }
    });
  });

  describe('RUN_FILES', () => {
    it('is frozen', () => {
      expect(Object.isFrozen(RUN_FILES)).toBe(true);
    });

    it('has all required files', () => {
      expect(RUN_FILES.INTENT).toBe('intent.json');
      expect(RUN_FILES.CONTRACT).toBe('contract.json');
      expect(RUN_FILES.TRUTHGATE_VERDICT).toBe('truthgate_verdict.json');
      expect(RUN_FILES.TRUTHGATE_PROOF).toBe('truthgate_proof.json');
      expect(RUN_FILES.DELIVERY_MANIFEST).toBe('delivery_manifest.json');
      expect(RUN_FILES.ARTIFACTS_DIR).toBe('artifacts');
      expect(RUN_FILES.HASHES).toBe('hashes.txt');
      expect(RUN_FILES.REPORT).toBe('run_report.md');
      expect(RUN_FILES.RUN_HASH).toBe('run_hash.txt');
    });
  });

  describe('HASHABLE_FILES', () => {
    it('is frozen', () => {
      expect(Object.isFrozen(HASHABLE_FILES)).toBe(true);
    });

    it('excludes run_report.md (contains timestamps)', () => {
      expect(HASHABLE_FILES.includes(RUN_FILES.REPORT)).toBe(false);
    });

    it('includes required files', () => {
      expect(HASHABLE_FILES.includes(RUN_FILES.INTENT)).toBe(true);
      expect(HASHABLE_FILES.includes(RUN_FILES.CONTRACT)).toBe(true);
      expect(HASHABLE_FILES.includes(RUN_FILES.HASHES)).toBe(true);
    });
  });

  describe('isCliCommand', () => {
    it('returns true for valid commands', () => {
      expect(isCliCommand('run')).toBe(true);
      expect(isCliCommand('batch')).toBe(true);
      expect(isCliCommand('verify')).toBe(true);
      expect(isCliCommand('capsule')).toBe(true);
      expect(isCliCommand('help')).toBe(true);
    });

    it('returns false for invalid commands', () => {
      expect(isCliCommand('invalid')).toBe(false);
      expect(isCliCommand('')).toBe(false);
      expect(isCliCommand(null)).toBe(false);
      expect(isCliCommand(undefined)).toBe(false);
      expect(isCliCommand(123)).toBe(false);
    });
  });

  describe('isExitCode', () => {
    it('returns true for valid exit codes', () => {
      expect(isExitCode(0)).toBe(true);
      expect(isExitCode(10)).toBe(true);
      expect(isExitCode(20)).toBe(true);
      expect(isExitCode(30)).toBe(true);
      expect(isExitCode(40)).toBe(true);
      expect(isExitCode(50)).toBe(true);
      expect(isExitCode(60)).toBe(true);
      expect(isExitCode(70)).toBe(true);
    });

    it('returns false for invalid exit codes', () => {
      expect(isExitCode(1)).toBe(false);
      expect(isExitCode(99)).toBe(false);
      expect(isExitCode(-1)).toBe(false);
      expect(isExitCode('0')).toBe(false);
      expect(isExitCode(null)).toBe(false);
    });
  });

  describe('isSafePath', () => {
    it('returns true for simple filename', () => {
      expect(isSafePath('file.txt')).toBe(true);
    });

    it('returns true for nested path', () => {
      expect(isSafePath('dir/subdir/file.txt')).toBe(true);
    });

    it('returns false for empty path', () => {
      expect(isSafePath('')).toBe(false);
    });

    it('returns false for absolute Unix path', () => {
      expect(isSafePath('/etc/passwd')).toBe(false);
    });

    it('returns false for absolute Windows path', () => {
      expect(isSafePath('\\Windows\\System32')).toBe(false);
      expect(isSafePath('C:\\Windows')).toBe(false);
      expect(isSafePath('D:/data')).toBe(false);
    });

    it('returns false for parent traversal', () => {
      expect(isSafePath('../file.txt')).toBe(false);
      expect(isSafePath('dir/../file.txt')).toBe(false);
      expect(isSafePath('a/b/../c')).toBe(false);
    });

    it('returns false for null bytes', () => {
      expect(isSafePath('file\0.txt')).toBe(false);
    });

    it('returns true for path with spaces', () => {
      expect(isSafePath('my file.txt')).toBe(true);
    });

    it('returns true for path with unicode', () => {
      expect(isSafePath('données/fichier.txt')).toBe(true);
    });
  });

  describe('isAllowedWritePath (I-INV-08)', () => {
    it('returns true for artefacts/runs path', () => {
      expect(isAllowedWritePath('artefacts/runs/run_123/file.txt')).toBe(true);
    });

    it('returns true for ledger path', () => {
      expect(isAllowedWritePath('data/intent-ledger/entry.json')).toBe(true);
    });

    it('returns false for other paths', () => {
      expect(isAllowedWritePath('src/runner/file.ts')).toBe(false);
      expect(isAllowedWritePath('config/test.json')).toBe(false);
    });

    it('returns false for traversal attempt', () => {
      expect(isAllowedWritePath('artefacts/runs/../../../etc/passwd')).toBe(false);
    });

    it('returns false for SEALED zones', () => {
      expect(isAllowedWritePath('src/canon/file.ts')).toBe(false);
      expect(isAllowedWritePath('src/gates/file.ts')).toBe(false);
      expect(isAllowedWritePath('src/sentinel/file.ts')).toBe(false);
      expect(isAllowedWritePath('src/memory/file.ts')).toBe(false);
      expect(isAllowedWritePath('src/orchestrator/file.ts')).toBe(false);
      expect(isAllowedWritePath('src/delivery/file.ts')).toBe(false);
    });
  });

  describe('validatePath', () => {
    it('returns valid for safe path', () => {
      const result = validatePath('dir/file.txt');
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('returns violations for empty path', () => {
      const result = validatePath('');
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('empty'))).toBe(true);
    });

    it('returns violations for absolute path', () => {
      const result = validatePath('/absolute/path');
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('Absolute'))).toBe(true);
    });

    it('returns violations for drive letter', () => {
      const result = validatePath('C:\\path');
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('Drive'))).toBe(true);
    });

    it('returns violations for traversal', () => {
      const result = validatePath('../path');
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('traversal'))).toBe(true);
    });

    it('returns violations for null bytes', () => {
      const result = validatePath('file\0.txt');
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('Null'))).toBe(true);
    });

    it('returns frozen result', () => {
      const result = validatePath('test');
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('generateRunId', () => {
    it('generates run ID with intent and seq', () => {
      const runId = generateRunId('test-intent', 1);
      expect(runId).toBe('run_test-intent_1');
    });

    it('sanitizes special characters', () => {
      const runId = generateRunId('test/intent:bad', 2);
      expect(runId).toBe('run_test_intent_bad_2');
    });

    it('handles different sequence numbers', () => {
      expect(generateRunId('test', 1)).toBe('run_test_1');
      expect(generateRunId('test', 2)).toBe('run_test_2');
      expect(generateRunId('test', 100)).toBe('run_test_100');
    });
  });

  describe('extractIntentId', () => {
    it('extracts intent ID from run ID', () => {
      expect(extractIntentId('run_test-intent_1')).toBe('test-intent');
    });

    it('handles underscores in intent ID', () => {
      expect(extractIntentId('run_test_intent_123_5')).toBe('test_intent_123');
    });

    it('returns null for invalid format', () => {
      expect(extractIntentId('invalid')).toBeNull();
      expect(extractIntentId('run_')).toBeNull();
      expect(extractIntentId('run_test')).toBeNull();
    });
  });

  describe('Type interfaces', () => {
    it('ParsedArgs interface works correctly', () => {
      const args: ParsedArgs = {
        command: 'run',
        intentPath: 'test.json',
        profile: 'OMEGA_STD',
      };
      expect(args.command).toBe('run');
    });

    it('RunResult interface works correctly', () => {
      const result: RunResult = {
        success: true,
        exitCode: ExitCode.PASS,
        runId: 'run_test_1',
        runPath: 'artefacts/runs/run_test_1',
        runHash: 'abc123',
        timestamp: '2025-01-15T10:00:00Z',
      };
      expect(result.success).toBe(true);
    });

    it('BatchResult interface works correctly', () => {
      const result: BatchResult = {
        success: true,
        exitCode: ExitCode.PASS,
        runs: [],
        totalRuns: 5,
        successfulRuns: 5,
        failedRuns: 0,
      };
      expect(result.totalRuns).toBe(5);
    });

    it('VerifyResult interface works correctly', () => {
      const result: VerifyResult = {
        success: true,
        exitCode: ExitCode.PASS,
        mismatches: [],
        filesChecked: 10,
        filesValid: 10,
      };
      expect(result.filesChecked).toBe(10);
    });

    it('CapsuleResult interface works correctly', () => {
      const result: CapsuleResult = {
        success: true,
        exitCode: ExitCode.PASS,
        capsulePath: 'output.zip',
        capsuleHash: 'def456',
        fileCount: 5,
        totalBytes: 1000,
      };
      expect(result.capsulePath).toBe('output.zip');
    });

    it('HashMismatch interface works correctly', () => {
      const mismatch: HashMismatch = {
        file: 'test.txt',
        expected: 'abc',
        actual: 'def',
      };
      expect(mismatch.file).toBe('test.txt');
    });
  });
});
