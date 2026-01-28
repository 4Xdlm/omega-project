/**
 * OMEGA Runner Report Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for report generation and logging.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  formatExitCode,
  formatTimestamp,
  truncateHash,
  generateRunReport,
  generateRunReportMarkdown,
  generateRunReportJson,
  generateRunReportText,
  generateBatchReport,
  generateBatchReportMarkdown,
  generateBatchReportJson,
  generateVerifyReport,
  generateVerifyReportMarkdown,
  generateVerifyReportJson,
  generateCapsuleReport,
  generateCapsuleReportMarkdown,
  generateCapsuleReportJson,
  writeReportToRun,
  readReportFromRun,
  formatLogEntry,
  appendLog,
  createLogEntryFromRun,
  createLogEntryFromVerify,
  DEFAULT_REPORT_OPTIONS,
} from '../../src/runner/report';
import type { LogEntry } from '../../src/runner/report';
import type { RunResult, BatchResult, VerifyResult, CapsuleResult } from '../../src/runner/types';
import { ExitCode, FIXED_PATHS, RUN_FILES } from '../../src/runner/types';
import { createRunPath, createRunDirectory } from '../../src/runner/run-directory';

const TEST_DIR = join(process.cwd(), '.test_report');
const RUNS_PATH = join(TEST_DIR, FIXED_PATHS.RUNS_ROOT);
const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z';

// Mock results for testing
const mockRunResult: RunResult = {
  success: true,
  exitCode: ExitCode.PASS,
  runId: 'run_test_1',
  runPath: '/test/artefacts/runs/run_test_1',
  runHash: 'a'.repeat(64),
  timestamp: FIXED_TIMESTAMP,
};

const mockFailedRunResult: RunResult = {
  success: false,
  exitCode: ExitCode.INTENT_INVALID,
  runId: 'run_fail_1',
  runPath: '/test/artefacts/runs/run_fail_1',
  runHash: '',
  error: 'Invalid JSON format',
  timestamp: FIXED_TIMESTAMP,
};

const mockBatchResult: BatchResult = {
  success: true,
  exitCode: ExitCode.PASS,
  runs: [mockRunResult, mockFailedRunResult],
  totalRuns: 2,
  successfulRuns: 1,
  failedRuns: 1,
};

const mockVerifyResult: VerifyResult = {
  success: true,
  exitCode: ExitCode.PASS,
  mismatches: [],
  filesChecked: 5,
  filesValid: 5,
};

const mockFailedVerifyResult: VerifyResult = {
  success: false,
  exitCode: ExitCode.VERIFY_FAIL,
  mismatches: [
    { file: 'intent.json', expected: 'a'.repeat(64), actual: 'b'.repeat(64) },
  ],
  filesChecked: 5,
  filesValid: 4,
};

const mockCapsuleResult: CapsuleResult = {
  success: true,
  exitCode: ExitCode.PASS,
  capsulePath: '/test/capsule.zip',
  capsuleHash: 'c'.repeat(64),
  fileCount: 8,
  totalBytes: 12345,
};

describe('Report — Phase I', () => {
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

  describe('DEFAULT_REPORT_OPTIONS', () => {
    it('has markdown as default format', () => {
      expect(DEFAULT_REPORT_OPTIONS.format).toBe('markdown');
    });

    it('includes timestamp by default', () => {
      expect(DEFAULT_REPORT_OPTIONS.includeTimestamp).toBe(true);
    });

    it('includes hashes by default', () => {
      expect(DEFAULT_REPORT_OPTIONS.includeHashes).toBe(true);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DEFAULT_REPORT_OPTIONS)).toBe(true);
    });
  });

  describe('formatExitCode', () => {
    it('formats PASS code', () => {
      const formatted = formatExitCode(ExitCode.PASS);
      expect(formatted).toContain('0');
      expect(formatted).toContain('Success');
    });

    it('formats INTENT_INVALID code', () => {
      const formatted = formatExitCode(ExitCode.INTENT_INVALID);
      expect(formatted).toContain('10');
    });

    it('formats VERIFY_FAIL code', () => {
      const formatted = formatExitCode(ExitCode.VERIFY_FAIL);
      expect(formatted).toContain('60');
    });

    it('handles unknown code', () => {
      const formatted = formatExitCode(999 as ExitCode);
      expect(formatted).toContain('999');
    });
  });

  describe('formatTimestamp', () => {
    it('formats valid ISO timestamp', () => {
      const formatted = formatTimestamp(FIXED_TIMESTAMP);
      expect(formatted).toBe(FIXED_TIMESTAMP);
    });

    it('returns input for invalid timestamp', () => {
      const formatted = formatTimestamp('invalid');
      expect(formatted).toBe('invalid');
    });
  });

  describe('truncateHash', () => {
    it('truncates long hash', () => {
      const hash = 'a'.repeat(64);
      const truncated = truncateHash(hash, 16);
      expect(truncated).toBe('aaaaaaaaaaaaaaaa...');
    });

    it('keeps short hash unchanged', () => {
      const hash = 'abc';
      const truncated = truncateHash(hash, 16);
      expect(truncated).toBe('abc');
    });

    it('uses default length of 16', () => {
      const hash = 'a'.repeat(64);
      const truncated = truncateHash(hash);
      expect(truncated.length).toBe(19); // 16 + 3 for ...
    });
  });

  describe('generateRunReportMarkdown', () => {
    it('generates markdown for successful run', () => {
      const report = generateRunReportMarkdown(mockRunResult);

      expect(report).toContain('# Run Report');
      expect(report).toContain('**Success**: YES');
      expect(report).toContain('run_test_1');
    });

    it('generates markdown for failed run', () => {
      const report = generateRunReportMarkdown(mockFailedRunResult);

      expect(report).toContain('**Success**: NO');
      expect(report).toContain('Invalid JSON format');
    });

    it('includes run hash', () => {
      const report = generateRunReportMarkdown(mockRunResult);
      expect(report).toContain(mockRunResult.runHash);
    });

    it('includes timestamp', () => {
      const report = generateRunReportMarkdown(mockRunResult);
      expect(report).toContain(FIXED_TIMESTAMP);
    });

    it('excludes hash when option is false', () => {
      const report = generateRunReportMarkdown(mockRunResult, { includeHashes: false });
      expect(report).not.toContain('## Hashes');
    });
  });

  describe('generateRunReportJson', () => {
    it('generates valid JSON', () => {
      const report = generateRunReportJson(mockRunResult);
      const parsed = JSON.parse(report);

      expect(parsed.version).toBe('1.0');
      expect(parsed.type).toBe('run_report');
      expect(parsed.success).toBe(true);
    });

    it('includes all fields', () => {
      const report = generateRunReportJson(mockRunResult);
      const parsed = JSON.parse(report);

      expect(parsed.runId).toBe('run_test_1');
      expect(parsed.exitCode).toBe(ExitCode.PASS);
      expect(parsed.runHash).toBe(mockRunResult.runHash);
    });

    it('includes error for failed run', () => {
      const report = generateRunReportJson(mockFailedRunResult);
      const parsed = JSON.parse(report);

      expect(parsed.error).toBe('Invalid JSON format');
    });
  });

  describe('generateRunReportText', () => {
    it('generates plain text report', () => {
      const report = generateRunReportText(mockRunResult);

      expect(report).toContain('OMEGA Run Report');
      expect(report).toContain('Status:    PASS');
    });

    it('shows FAIL status for failed run', () => {
      const report = generateRunReportText(mockFailedRunResult);
      expect(report).toContain('Status:    FAIL');
    });
  });

  describe('generateRunReport', () => {
    it('defaults to markdown format', () => {
      const report = generateRunReport(mockRunResult);
      expect(report).toContain('# Run Report');
    });

    it('respects json format option', () => {
      const report = generateRunReport(mockRunResult, { format: 'json' });
      expect(() => JSON.parse(report)).not.toThrow();
    });

    it('respects text format option', () => {
      const report = generateRunReport(mockRunResult, { format: 'text' });
      expect(report).toContain('OMEGA Run Report');
    });
  });

  describe('generateBatchReportMarkdown', () => {
    it('generates batch summary', () => {
      const report = generateBatchReportMarkdown(mockBatchResult);

      expect(report).toContain('# Batch Run Report');
      expect(report).toContain('Total Runs**: 2');
      expect(report).toContain('Successful**: 1');
      expect(report).toContain('Failed**: 1');
    });

    it('includes individual runs table', () => {
      const report = generateBatchReportMarkdown(mockBatchResult);

      expect(report).toContain('## Individual Runs');
      expect(report).toContain('run_test_1');
      expect(report).toContain('run_fail_1');
    });
  });

  describe('generateBatchReportJson', () => {
    it('generates valid JSON with summary', () => {
      const report = generateBatchReportJson(mockBatchResult);
      const parsed = JSON.parse(report);

      expect(parsed.type).toBe('batch_report');
      expect(parsed.summary.totalRuns).toBe(2);
      expect(parsed.runs).toHaveLength(2);
    });
  });

  describe('generateBatchReport', () => {
    it('defaults to markdown format', () => {
      const report = generateBatchReport(mockBatchResult);
      expect(report).toContain('# Batch Run Report');
    });

    it('respects json format option', () => {
      const report = generateBatchReport(mockBatchResult, { format: 'json' });
      expect(() => JSON.parse(report)).not.toThrow();
    });
  });

  describe('generateVerifyReportMarkdown', () => {
    it('generates report for passed verification', () => {
      const report = generateVerifyReportMarkdown(mockVerifyResult, '/test/run');

      expect(report).toContain('# Verification Report');
      expect(report).toContain('PASSED');
      expect(report).toContain('Files Checked**: 5');
    });

    it('generates report for failed verification', () => {
      const report = generateVerifyReportMarkdown(mockFailedVerifyResult, '/test/run');

      expect(report).toContain('FAILED');
      expect(report).toContain('## Mismatches');
      expect(report).toContain('intent.json');
    });
  });

  describe('generateVerifyReportJson', () => {
    it('generates valid JSON', () => {
      const report = generateVerifyReportJson(mockVerifyResult, '/test/run');
      const parsed = JSON.parse(report);

      expect(parsed.type).toBe('verify_report');
      expect(parsed.statistics.filesChecked).toBe(5);
      expect(parsed.mismatches).toHaveLength(0);
    });

    it('includes mismatches for failed verification', () => {
      const report = generateVerifyReportJson(mockFailedVerifyResult, '/test/run');
      const parsed = JSON.parse(report);

      expect(parsed.mismatches).toHaveLength(1);
      expect(parsed.mismatches[0].file).toBe('intent.json');
    });
  });

  describe('generateVerifyReport', () => {
    it('defaults to markdown format', () => {
      const report = generateVerifyReport(mockVerifyResult, '/test/run');
      expect(report).toContain('# Verification Report');
    });
  });

  describe('generateCapsuleReportMarkdown', () => {
    it('generates capsule report', () => {
      const report = generateCapsuleReportMarkdown(mockCapsuleResult);

      expect(report).toContain('# Capsule Report');
      expect(report).toContain('**Success**: YES');
      expect(report).toContain('File Count**: 8');
      // Use regex to match locale-independent number format
      expect(report).toMatch(/12[,.\s]?345/);
    });

    it('includes capsule hash', () => {
      const report = generateCapsuleReportMarkdown(mockCapsuleResult);
      expect(report).toContain(mockCapsuleResult.capsuleHash);
    });
  });

  describe('generateCapsuleReportJson', () => {
    it('generates valid JSON', () => {
      const report = generateCapsuleReportJson(mockCapsuleResult);
      const parsed = JSON.parse(report);

      expect(parsed.type).toBe('capsule_report');
      expect(parsed.fileCount).toBe(8);
      expect(parsed.totalBytes).toBe(12345);
    });
  });

  describe('generateCapsuleReport', () => {
    it('defaults to markdown format', () => {
      const report = generateCapsuleReport(mockCapsuleResult);
      expect(report).toContain('# Capsule Report');
    });
  });

  describe('writeReportToRun', () => {
    it('writes report to run directory', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      const success = writeReportToRun(runDir.path, '# Test Report');

      expect(success).toBe(true);
      expect(existsSync(join(runDir.path, RUN_FILES.REPORT))).toBe(true);
    });

    it('returns false for non-existent directory', () => {
      const success = writeReportToRun(join(RUNS_PATH, 'missing'), '# Test');
      expect(success).toBe(false);
    });
  });

  describe('readReportFromRun', () => {
    it('reads existing report', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeReportToRun(runDir.path, '# Test Report');

      const content = readReportFromRun(runDir.path);

      expect(content).toBe('# Test Report');
    });

    it('returns null for missing report', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      const content = readReportFromRun(runDir.path);

      expect(content).toBeNull();
    });
  });

  describe('formatLogEntry', () => {
    it('formats complete log entry', () => {
      const entry: LogEntry = {
        timestamp: FIXED_TIMESTAMP,
        level: 'INFO',
        message: 'Test message',
        runId: 'run_test_1',
        exitCode: ExitCode.PASS,
      };

      const formatted = formatLogEntry(entry);

      expect(formatted).toContain(FIXED_TIMESTAMP);
      expect(formatted).toContain('[INFO]');
      expect(formatted).toContain('[run_test_1]');
      expect(formatted).toContain('Test message');
      expect(formatted).toContain('(exit: 0)');
    });

    it('handles entry without optional fields', () => {
      const entry: LogEntry = {
        timestamp: FIXED_TIMESTAMP,
        level: 'WARN',
        message: 'Warning message',
      };

      const formatted = formatLogEntry(entry);

      expect(formatted).toContain('[WARN]');
      expect(formatted).toContain('Warning message');
      expect(formatted).not.toContain('[undefined]');
    });
  });

  describe('appendLog (I-INV-07)', () => {
    it('appends log entry to file', () => {
      const logPath = join(TEST_DIR, 'test.log');
      const entry: LogEntry = {
        timestamp: FIXED_TIMESTAMP,
        level: 'INFO',
        message: 'First entry',
      };

      appendLog(logPath, entry);

      const content = readFileSync(logPath, 'utf-8');
      expect(content).toContain('First entry');
    });

    it('appends multiple entries', () => {
      const logPath = join(TEST_DIR, 'multi.log');

      appendLog(logPath, { timestamp: FIXED_TIMESTAMP, level: 'INFO', message: 'Entry 1' });
      appendLog(logPath, { timestamp: FIXED_TIMESTAMP, level: 'INFO', message: 'Entry 2' });

      const content = readFileSync(logPath, 'utf-8');
      expect(content).toContain('Entry 1');
      expect(content).toContain('Entry 2');
    });

    it('creates directory if needed', () => {
      const logPath = join(TEST_DIR, 'nested', 'deep', 'test.log');

      appendLog(logPath, { timestamp: FIXED_TIMESTAMP, level: 'INFO', message: 'Nested' });

      expect(existsSync(logPath)).toBe(true);
    });
  });

  describe('createLogEntryFromRun', () => {
    it('creates INFO entry for successful run', () => {
      const entry = createLogEntryFromRun(mockRunResult);

      expect(entry.level).toBe('INFO');
      expect(entry.runId).toBe('run_test_1');
      expect(entry.exitCode).toBe(ExitCode.PASS);
    });

    it('creates ERROR entry for failed run', () => {
      const entry = createLogEntryFromRun(mockFailedRunResult);

      expect(entry.level).toBe('ERROR');
      expect(entry.message).toContain('Invalid JSON format');
    });
  });

  describe('createLogEntryFromVerify', () => {
    it('creates INFO entry for passed verification', () => {
      const entry = createLogEntryFromVerify(mockVerifyResult, '/test/run', FIXED_TIMESTAMP);

      expect(entry.level).toBe('INFO');
      expect(entry.message).toContain('passed');
    });

    it('creates ERROR entry for failed verification', () => {
      const entry = createLogEntryFromVerify(mockFailedVerifyResult, '/test/run', FIXED_TIMESTAMP);

      expect(entry.level).toBe('ERROR');
      expect(entry.message).toContain('1 mismatches');
    });
  });

  describe('Edge cases', () => {
    it('handles empty run hash', () => {
      const result: RunResult = {
        ...mockRunResult,
        runHash: '',
      };

      const report = generateRunReportMarkdown(result, { includeHashes: true });
      expect(report).not.toContain('## Hashes');
    });

    it('handles null run ID', () => {
      const result: RunResult = {
        ...mockRunResult,
        runId: '',
      };

      const report = generateRunReportText(result);
      expect(report).toContain('N/A');
    });

    it('handles empty batch runs', () => {
      const result: BatchResult = {
        success: true,
        exitCode: ExitCode.PASS,
        runs: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
      };

      const report = generateBatchReportMarkdown(result);
      expect(report).toContain('Total Runs**: 0');
    });
  });
});
