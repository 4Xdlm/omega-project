import { describe, it, expect } from 'vitest';
import { parseCLIArgs, validateCLIArgs, formatCLIOutput } from '../src/cli.js';

describe('CLI', () => {
  it('parses --intent and --out', () => {
    const args = parseCLIArgs(['--intent', 'in.json', '--out', 'dir']);
    expect(args.intentPath).toBe('in.json');
    expect(args.outDir).toBe('dir');
  });

  it('parses --dry-run', () => {
    const args = parseCLIArgs(['--intent', 'x', '--dry-run']);
    expect(args.dryRun).toBe(true);
  });

  it('parses --verbose', () => {
    const args = parseCLIArgs(['--intent', 'x', '--verbose']);
    expect(args.verbose).toBe(true);
  });

  it('parses --strict (default)', () => {
    const args = parseCLIArgs(['--intent', 'x']);
    expect(args.strict).toBe(true);
  });

  it('parses --no-strict', () => {
    const args = parseCLIArgs(['--intent', 'x', '--no-strict']);
    expect(args.strict).toBe(false);
  });

  it('defaults outDir', () => {
    const args = parseCLIArgs(['--intent', 'x']);
    expect(args.outDir).toBe('./output');
  });

  it('validates missing intent', () => {
    const args = parseCLIArgs([]);
    const v = validateCLIArgs(args);
    expect(v.valid).toBe(false);
    expect(v.error).toContain('--intent');
  });

  it('validates valid args', () => {
    const args = parseCLIArgs(['--intent', 'x']);
    expect(validateCLIArgs(args).valid).toBe(true);
  });

  it('formats output', () => {
    const out = formatCLIOutput({ files_written: ['a.json', 'b.json'], verdict: 'PASS', duration_ms: 100 });
    expect(out).toContain('PASS');
    expect(out).toContain('a.json');
  });

  it('deterministic parse', () => {
    const a1 = parseCLIArgs(['--intent', 'x', '--dry-run']);
    const a2 = parseCLIArgs(['--intent', 'x', '--dry-run']);
    expect(a1).toEqual(a2);
  });
});
