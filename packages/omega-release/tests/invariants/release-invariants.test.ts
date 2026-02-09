/**
 * OMEGA Release — Release Invariants Tests
 * Phase G.0 — INV-G0-01 through INV-G0-10
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  invVersionCoherence,
  invSemVerValidity,
  invVersionMonotonicity,
  invChangelogConsistency,
  invArtifactIntegrity,
  invSelfTestGate,
  invChecksumDeterminism,
  invPlatformCoverage,
  invBuildDeterminism,
  invManifestIntegrity,
  runAllInvariants,
} from '../../src/invariants/release-invariants.js';
import type { InvariantContext } from '../../src/invariants/types.js';
import { generateManifest } from '../../src/release/manifest.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('INV-G0-01: Version Coherence', () => {
  const testDir = join(tmpdir(), 'omega-inv-g0-01');

  beforeEach(() => mkdirSync(testDir, { recursive: true }));
  afterEach(() => rmSync(testDir, { recursive: true, force: true }));

  it('PASS when VERSION matches package.json', () => {
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
    const result = invVersionCoherence({ projectRoot: testDir, version: '1.0.0', packageJsonVersion: '1.0.0' });
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-G0-01');
  });

  it('FAIL when versions mismatch', () => {
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
    const result = invVersionCoherence({ projectRoot: testDir, version: '1.0.0', packageJsonVersion: '2.0.0' });
    expect(result.status).toBe('FAIL');
  });

  it('FAIL when VERSION file missing', () => {
    const result = invVersionCoherence({ projectRoot: testDir, version: '1.0.0' });
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-G0-02: SemVer Validity', () => {
  it('PASS for valid SemVer', () => {
    const result = invSemVerValidity({ projectRoot: '.', version: '1.0.0' });
    expect(result.status).toBe('PASS');
  });

  it('FAIL for invalid SemVer', () => {
    const result = invSemVerValidity({ projectRoot: '.', version: 'not-valid' });
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-G0-03: Version Monotonicity', () => {
  it('PASS when N+1 > N', () => {
    const result = invVersionMonotonicity('1.1.0', '1.0.0');
    expect(result.status).toBe('PASS');
  });

  it('FAIL when not greater', () => {
    const result = invVersionMonotonicity('1.0.0', '1.1.0');
    expect(result.status).toBe('FAIL');
  });

  it('FAIL for invalid versions', () => {
    const result = invVersionMonotonicity('invalid', 'also-invalid');
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-G0-04: Changelog Consistency', () => {
  it('PASS when version in changelog', () => {
    const content = '## [1.0.0] - 2026-02-10\n### Added\n- Feature';
    const result = invChangelogConsistency({ projectRoot: '.', version: '1.0.0', changelogContent: content });
    expect(result.status).toBe('PASS');
  });

  it('FAIL when version not in changelog', () => {
    const content = '## [0.9.0] - 2026-01-01\n### Added\n- Old feature';
    const result = invChangelogConsistency({ projectRoot: '.', version: '1.0.0', changelogContent: content });
    expect(result.status).toBe('FAIL');
  });
});

describe('INV-G0-05: Artifact Integrity', () => {
  it('PASS when all artifacts have SHA-256', () => {
    const ctx: InvariantContext = {
      projectRoot: '.',
      version: '1.0.0',
      artifacts: [
        { filename: 'f1.zip', sha256: 'a'.repeat(64) },
        { filename: 'f2.tar.gz', sha256: 'b'.repeat(64) },
      ],
    };
    expect(invArtifactIntegrity(ctx).status).toBe('PASS');
  });

  it('FAIL when artifact missing SHA-256', () => {
    const ctx: InvariantContext = {
      projectRoot: '.',
      version: '1.0.0',
      artifacts: [{ filename: 'f1.zip', sha256: '' }],
    };
    expect(invArtifactIntegrity(ctx).status).toBe('FAIL');
  });

  it('SKIP when no artifacts', () => {
    expect(invArtifactIntegrity({ projectRoot: '.', version: '1.0.0' }).status).toBe('SKIP');
  });
});

describe('INV-G0-06: Self-Test Gate', () => {
  it('PASS when self-test passed', () => {
    expect(invSelfTestGate({ projectRoot: '.', version: '1.0.0', selfTestVerdict: 'PASS' }).status).toBe('PASS');
  });

  it('FAIL when self-test failed', () => {
    expect(invSelfTestGate({ projectRoot: '.', version: '1.0.0', selfTestVerdict: 'FAIL' }).status).toBe('FAIL');
  });

  it('SKIP when not run', () => {
    expect(invSelfTestGate({ projectRoot: '.', version: '1.0.0' }).status).toBe('SKIP');
  });
});

describe('INV-G0-07: Checksum Determinism', () => {
  it('PASS — SHA-256 is deterministic', () => {
    const result = invChecksumDeterminism();
    expect(result.status).toBe('PASS');
    expect(result.id).toBe('INV-G0-07');
  });
});

describe('INV-G0-08: Platform Coverage', () => {
  it('PASS when all platforms covered', () => {
    const ctx: InvariantContext = {
      projectRoot: '.',
      version: '1.0.0',
      artifacts: [
        { filename: 'omega-1.0.0-win-x64.zip', sha256: 'a'.repeat(64) },
        { filename: 'omega-1.0.0-linux-x64.tar.gz', sha256: 'b'.repeat(64) },
        { filename: 'omega-1.0.0-macos-arm64.tar.gz', sha256: 'c'.repeat(64) },
      ],
    };
    expect(invPlatformCoverage(ctx).status).toBe('PASS');
  });

  it('FAIL when platform missing', () => {
    const ctx: InvariantContext = {
      projectRoot: '.',
      version: '1.0.0',
      artifacts: [{ filename: 'omega-1.0.0-win-x64.zip', sha256: 'a'.repeat(64) }],
    };
    expect(invPlatformCoverage(ctx).status).toBe('FAIL');
  });
});

describe('INV-G0-09: Build Determinism', () => {
  it('PASS when hashes match', () => {
    const hash = 'a'.repeat(64);
    expect(invBuildDeterminism(hash, hash).status).toBe('PASS');
  });

  it('FAIL when hashes differ', () => {
    expect(invBuildDeterminism('a'.repeat(64), 'b'.repeat(64)).status).toBe('FAIL');
  });

  it('SKIP when no hashes', () => {
    expect(invBuildDeterminism('', '').status).toBe('SKIP');
  });
});

describe('INV-G0-10: Manifest Integrity', () => {
  it('PASS when manifest hash is valid', () => {
    const manifest = generateManifest({
      version: '1.0.0',
      commit: 'abc',
      platforms: ['win-x64'],
      artifacts: [],
      testTotal: 0,
      testPassed: 0,
      invariantTotal: 0,
      invariantVerified: 0,
    });
    const result = invManifestIntegrity(manifest as unknown as Record<string, unknown>);
    expect(result.status).toBe('PASS');
  });

  it('FAIL when manifest hash is tampered', () => {
    const manifest = generateManifest({
      version: '1.0.0',
      commit: 'abc',
      platforms: ['win-x64'],
      artifacts: [],
      testTotal: 0,
      testPassed: 0,
      invariantTotal: 0,
      invariantVerified: 0,
    });
    const tampered = { ...manifest, hash: 'f'.repeat(64) };
    const result = invManifestIntegrity(tampered as unknown as Record<string, unknown>);
    expect(result.status).toBe('FAIL');
  });
});

describe('runAllInvariants', () => {
  const testDir = join(tmpdir(), 'omega-inv-all');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'VERSION'), '1.0.0');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('runs 7 invariants', () => {
    const results = runAllInvariants({
      projectRoot: testDir,
      version: '1.0.0',
      changelogContent: '## [1.0.0] - 2026-02-10\n',
    });
    expect(results).toHaveLength(7);
  });

  it('all invariants have IDs', () => {
    const results = runAllInvariants({
      projectRoot: testDir,
      version: '1.0.0',
      changelogContent: '## [1.0.0] - 2026-02-10\n',
    });
    for (const r of results) {
      expect(r.id).toMatch(/^INV-G0-\d+$/);
    }
  });
});
