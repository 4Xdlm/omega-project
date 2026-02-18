/**
 * OMNIPOTENT Sprint 1 — SSOT Invariant Tests
 * SSOT-EMO-01, SSOT-EMO-02, NO-MAGIC-01, BRIEF-01, BRIEF-02, BRIEF-03
 *
 * Verifies that sovereign-engine has NO local reimplementation of
 * omega-forge SSOT functions, and that ForgeEmotionBrief integration
 * produces consistent results.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getSrcDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../src'),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SSOT-EMO-01: No local trajectory/canonical/xyz implementations
// ═══════════════════════════════════════════════════════════════════════════════

describe('SSOT-EMO-01: No Shadow Implementations in sovereign-engine', () => {
  const srcDir = getSrcDir();
  const tsFiles = getAllTsFiles(srcDir);

  const FORBIDDEN_PATTERNS = [
    // Functions that must ONLY exist in omega-forge
    /function\s+buildPrescribedTrajectory\s*\(/,
    /function\s+buildTrajectoryCore\s*\(/,
    /function\s+toOmegaState\s*\(/,
    /function\s+fromOmegaState\s*\(/,
    /function\s+verifyLaw[1-6]\s*\(/,
    /function\s+checkInertia\s*\(/,
    /function\s+checkFeasibility\s*\(/,
  ];

  it('SSOT-EMO-01: no local reimplementation of omega-forge SSOT functions', () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;

      // Skip files that import from @omega/omega-forge (they're consumers, not reimplementors)
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relativePath}: matches ${pattern.source}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('SSOT-EMO-01b: no local EMOTION_KEYWORDS definition', () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');

      // EMOTION_KEYWORDS should NOT be defined locally
      if (/(?:const|let|var)\s+EMOTION_KEYWORDS\s*=/.test(content)) {
        violations.push(`${relativePath}: defines EMOTION_KEYWORDS locally`);
      }
    }

    expect(violations).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SSOT-EMO-02: Brief hash consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe('SSOT-EMO-02: ForgeEmotionBrief Consistency', () => {
  it('SSOT-EMO-02: computeForgeEmotionBrief is deterministic', async () => {
    const { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } = await import('@omega/omega-forge');

    const params = {
      waypoints: [
        { position: 0.0, emotion: 'trust', intensity: 0.7 },
        { position: 0.5, emotion: 'fear', intensity: 0.9 },
        { position: 1.0, emotion: 'trust', intensity: 0.5 },
      ],
      sceneStartPct: 0.0,
      sceneEndPct: 1.0,
      totalParagraphs: 10,
      canonicalTable: DEFAULT_CANONICAL_TABLE,
      persistenceCeiling: 100,
      language: 'fr' as const,
      producerBuildHash: 'test-build-hash',
    };

    const brief1 = computeForgeEmotionBrief(params);
    const brief2 = computeForgeEmotionBrief(params);

    expect(brief1.brief_hash).toBe(brief2.brief_hash);
    expect(brief1.brief_hash).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NO-MAGIC-01: No inline magic numbers for persistence_ceiling
// ═══════════════════════════════════════════════════════════════════════════════

describe('NO-MAGIC-01: No Magic Numbers', () => {
  const srcDir = getSrcDir();
  const tsFiles = getAllTsFiles(srcDir);

  it('NO-MAGIC-01: no inline persistence_ceiling = <number> outside config.ts', () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = readFile(file);
      if (!content) continue;
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');

      // Skip config.ts (it's allowed to define the constant)
      if (relativePath === 'config.ts' || relativePath.includes('config.ts')) continue;

      // Check for inline ceiling/C definitions (not from imports)
      if (/persistence_ceiling\s*[:=]\s*\d+/.test(content) && !content.includes('SOVEREIGN_CONFIG')) {
        violations.push(`${relativePath}: inline persistence_ceiling value`);
      }
    }

    expect(violations).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BRIEF-01/02/03: ForgeEmotionBrief contract verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('ForgeEmotionBrief Contract (from sovereign perspective)', () => {
  it('BRIEF-01: brief_hash is 64 hex chars', async () => {
    const { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } = await import('@omega/omega-forge');

    const brief = computeForgeEmotionBrief({
      waypoints: [
        { position: 0.0, emotion: 'joy', intensity: 0.8 },
        { position: 1.0, emotion: 'sadness', intensity: 0.6 },
      ],
      sceneStartPct: 0.0,
      sceneEndPct: 1.0,
      totalParagraphs: 5,
      canonicalTable: DEFAULT_CANONICAL_TABLE,
      persistenceCeiling: 100,
      language: 'fr',
      producerBuildHash: 'test',
    });

    expect(brief.brief_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('BRIEF-02: capabilities reflect real data (no phantom capabilities)', async () => {
    const { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } = await import('@omega/omega-forge');

    const brief = computeForgeEmotionBrief({
      waypoints: [
        { position: 0.0, emotion: 'trust', intensity: 0.7 },
        { position: 1.0, emotion: 'fear', intensity: 0.9 },
      ],
      sceneStartPct: 0.0,
      sceneEndPct: 1.0,
      totalParagraphs: 8,
      canonicalTable: DEFAULT_CANONICAL_TABLE,
      persistenceCeiling: 100,
      language: 'fr',
      producerBuildHash: 'test',
    });

    // Must include trajectory signals
    expect(brief.capabilities).toContain('emotion.trajectory.prescribed.14d');
    expect(brief.capabilities).toContain('emotion.trajectory.prescribed.xyz');

    // Trajectory data must actually exist
    expect(brief.trajectory.length).toBeGreaterThan(0);
    expect(brief.trajectory[0].target_14d).toBeDefined();
    expect(brief.trajectory[0].target_omega).toBeDefined();
  });

  it('BRIEF-03: schema_version is forge.emotion.v1', async () => {
    const { computeForgeEmotionBrief, DEFAULT_CANONICAL_TABLE } = await import('@omega/omega-forge');

    const brief = computeForgeEmotionBrief({
      waypoints: [{ position: 0.5, emotion: 'joy', intensity: 0.5 }],
      sceneStartPct: 0.0,
      sceneEndPct: 1.0,
      totalParagraphs: 3,
      canonicalTable: DEFAULT_CANONICAL_TABLE,
      persistenceCeiling: 100,
      language: 'fr',
      producerBuildHash: 'test',
    });

    expect(brief.schema_version).toBe('forge.emotion.v1');
  });
});
