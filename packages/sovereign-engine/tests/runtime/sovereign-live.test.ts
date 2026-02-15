/**
 * Tests for sovereign-live.ts — CLI integration
 * Note: These are basic smoke tests. Full E2E testing requires API key.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('sovereign-live CLI structure', () => {
  it('CLI script file exists and is readable', () => {
    const cliPath = path.resolve(process.cwd(), 'scripts/sovereign-live.ts');
    expect(fs.existsSync(cliPath)).toBe(true);

    const content = fs.readFileSync(cliPath, 'utf8');
    expect(content).toContain('#!/usr/bin/env node');
    expect(content).toContain('LIVE5-STABILITY');
  });

  it('CLI script imports required modules', () => {
    const cliPath = path.resolve(process.cwd(), 'scripts/sovereign-live.ts');
    const content = fs.readFileSync(cliPath, 'utf8');

    expect(content).toContain('loadGoldenRun');
    expect(content).toContain('createAnthropicProvider');
    expect(content).toContain('buildRunIdRecord');
    expect(content).toContain('generateSHA256SUMS');
    expect(content).toContain('validateDirectoryPathSafety');
  });

  it('CLI script exports main function', () => {
    const cliPath = path.resolve(process.cwd(), 'scripts/sovereign-live.ts');
    const content = fs.readFileSync(cliPath, 'utf8');

    expect(content).toContain('function main()');
    expect(content).toContain('parseArgs()');
  });

  it('CLI script validates required arguments', () => {
    const cliPath = path.resolve(process.cwd(), 'scripts/sovereign-live.ts');
    const content = fs.readFileSync(cliPath, 'utf8');

    expect(content).toContain('--run');
    expect(content).toContain('--out');
    expect(content).toContain('--count');
    expect(content).toContain('ANTHROPIC_API_KEY');
  });
});

describe('sovereign-live fail-closed behavior', () => {
  it('CLI script writes FAIL.json on error', () => {
    const cliPath = path.resolve(process.cwd(), 'scripts/sovereign-live.ts');
    const content = fs.readFileSync(cliPath, 'utf8');

    expect(content).toContain('writeFail');
    expect(content).toContain('FAIL.json');
    expect(content).toContain('process.exit(1)');
  });

  it('CLI script validates path safety', () => {
    const cliPath = path.resolve(process.cwd(), 'scripts/sovereign-live.ts');
    const content = fs.readFileSync(cliPath, 'utf8');

    expect(content).toContain('validateDirectoryPathSafety');
    expect(content).toContain('Path safety validation failed');
  });
});
