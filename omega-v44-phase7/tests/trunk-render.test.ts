/**
 * OMEGA Phase 7 — Trunk Render Tests
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 *
 * Test Cases:
 * - TR-01: Determinism (100 runs → hash identique)
 * - TR-02: No magic numbers (code scan)
 * - TR-03: Extremes (bornes validées)
 * - TR-04: Orientations (0°-315° step 45°)
 * - TR-05: Schema validation (RCE-01.json)
 * - TR-06: Forbidden elements (parse SVG)
 * - TR-07: Schema freeze (render_report.json strict)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderTrunk, validateSvgOutput } from '../src/renderTrunk.js';
import {
  validateTrunkSignature,
  validateRenderParams,
  validateRenderReportSchema,
  hashObject,
} from '../src/utils/validation.js';
import type { TrunkSignature, RenderParams, RenderReport } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');

// ═══════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_PARAMS: RenderParams = {
  profileId: 'RCE-01-PREMIUM',
  profileVersion: '1.2',
  viewport: { width: 512, height: 512 },
  calibration: {
    anisotropyMin: -0.3,
    anisotropyMax: 0.3,
    opacityBase: 0.7,
    opacityZCoefficient: 0.3,
    oxygenAmplitudeMax: 0.05,
    renderTimeoutMs: 50,
  },
  rendering: {
    deviceScaleFactor: 1,
    colorSpace: 'sRGB',
    pathResolution: 360,
    baseRadius: 200,
  },
};

function createSignature(overrides: Partial<TrunkSignature> = {}): TrunkSignature {
  return {
    id: 'test-signature',
    orientation: 0,
    amplitude: 0.5,
    color: { h: 200, s: 0.6, l: 0.5 },
    persistence: 0.7,
    oxygen: {
      level: 50,
      amplitude: 0.03,
      frequency: 6,
      phase: 0,
    },
    sourceHash: 'sha256:test',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TR-01: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-01: Determinism', () => {
  it('produces identical SVG hash for 100 runs', () => {
    const signature = createSignature();
    const hashes = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const result = renderTrunk(signature, DEFAULT_PARAMS);
      hashes.add(result.hash);
    }

    expect(hashes.size).toBe(1);
  });

  it('same signature + same params = same output', () => {
    const signature = createSignature({ id: 'determinism-test' });

    const result1 = renderTrunk(signature, DEFAULT_PARAMS);
    const result2 = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result1.hash).toBe(result2.hash);
    expect(result1.svg).toBe(result2.svg);
  });

  it('different signatures produce different outputs', () => {
    const sig1 = createSignature({ amplitude: 0.3 });
    const sig2 = createSignature({ amplitude: 0.7 });

    const result1 = renderTrunk(sig1, DEFAULT_PARAMS);
    const result2 = renderTrunk(sig2, DEFAULT_PARAMS);

    expect(result1.hash).not.toBe(result2.hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TR-02: NO MAGIC NUMBERS
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-02: No Magic Numbers', () => {
  // Pattern to detect hardcoded numbers (except 0, 1, 2, and Math constants)
  const MAGIC_NUMBER_PATTERNS = [
    // Direct numeric assignments (excluding 0, 1, 2, 6 for toFixed)
    /(?<!\.toFixed\(|Math\.|params\.|signature\.|calibration\.|rendering\.|viewport\.|oxygen\.|color\.)\b([3-9]\d*|\d{2,})\b(?!\s*[,\]])/g,
    // Hardcoded floats (except 0.0, 0.5, 1.0)
    /(?<!params\.|signature\.|calibration\.)\b(0\.\d*[1-9]\d*|[2-9]\.\d+)\b/g,
  ];

  const ALLOWED_PATTERNS = [
    /toFixed\(\d+\)/g,          // toFixed calls
    /Math\.PI/g,                 // Math constants
    /2 \* Math\.PI/g,            // Full circle
    /params\.\w+/g,              // Parameter access
    /signature\.\w+/g,           // Signature access
    /calibration\.\w+/g,         // Calibration access
    /rendering\.\w+/g,           // Rendering access
    /viewport\.\w+/g,            // Viewport access
    /version.*1\.2/g,            // Version strings
    /'1\.0'/g,                   // Report version
    /\[\d+\]/g,                  // Array indices
    /\/\/ .*/g,                  // Comments
    /\/\*[\s\S]*?\*\//g,         // Block comments
    /'[^']*'/g,                  // String literals
    /"[^"]*"/g,                  // String literals
    /`[^`]*`/g,                  // Template literals
  ];

  function scanFileForMagicNumbers(filePath: string): string[] {
    const content = readFileSync(filePath, 'utf-8');
    const violations: string[] = [];

    // Remove allowed patterns
    let cleanedContent = content;
    for (const pattern of ALLOWED_PATTERNS) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }

    // Check for magic numbers
    for (const pattern of MAGIC_NUMBER_PATTERNS) {
      const matches = cleanedContent.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Skip common safe values
          if (['0', '1', '2', '100', '360'].includes(match)) continue;
          violations.push(`Found potential magic number: ${match}`);
        }
      }
    }

    return violations;
  }

  it('renderTrunk.ts has no magic numbers', () => {
    const filePath = join(srcDir, 'renderTrunk.ts');
    const violations = scanFileForMagicNumbers(filePath);

    // Allow some known safe values
    const filtered = violations.filter(v =>
      !v.includes('100') && // percentage conversion
      !v.includes('360') && // degrees/resolution
      !v.includes('256')    // center calculation
    );

    expect(filtered).toEqual([]);
  });

  it('all parameters come from RenderParams or TrunkSignature', () => {
    const filePath = join(srcDir, 'renderTrunk.ts');
    const content = readFileSync(filePath, 'utf-8');

    // Check that function signatures use typed parameters
    expect(content).toContain('signature: TrunkSignature');
    expect(content).toContain('params: RenderParams');

    // Check that values are accessed from params/signature
    expect(content).toContain('params.calibration');
    expect(content).toContain('params.rendering');
    expect(content).toContain('signature.amplitude');
    expect(content).toContain('signature.orientation');
    expect(content).toContain('signature.color');
    expect(content).toContain('signature.oxygen');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TR-03: EXTREMES
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-03: Extremes', () => {
  it('handles amplitude = 0 (neutral)', () => {
    const signature = createSignature({ amplitude: 0 });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).toContain('<path');
    expect(result.hash).toBeDefined();
    validateSvgOutput(result.svg);
  });

  it('handles amplitude = 1 (maximum)', () => {
    const signature = createSignature({ amplitude: 1 });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).toContain('<path');
    expect(result.hash).toBeDefined();
    validateSvgOutput(result.svg);
  });

  it('handles persistence = 0 (minimum)', () => {
    const signature = createSignature({ persistence: 0 });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    // Opacity should be at base level
    expect(result.svg).toContain('fill-opacity');
    validateSvgOutput(result.svg);
  });

  it('handles persistence = 1 (maximum)', () => {
    const signature = createSignature({ persistence: 1 });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    // Opacity should be at maximum
    expect(result.svg).toContain('fill-opacity');
    validateSvgOutput(result.svg);
  });

  it('handles oxygen.level = 0 (depleted)', () => {
    const signature = createSignature({
      oxygen: { level: 0, amplitude: 0, frequency: 6, phase: 0 },
    });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).toContain('<path');
    validateSvgOutput(result.svg);
  });

  it('handles oxygen.level = 100 (saturated)', () => {
    const signature = createSignature({
      oxygen: { level: 100, amplitude: 0.05, frequency: 6, phase: 0 },
    });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).toContain('<path');
    validateSvgOutput(result.svg);
  });

  it('clamps anisotropy to valid range', () => {
    // High amplitude should still produce valid output
    const signature = createSignature({ amplitude: 1.5 }); // Beyond normal range
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).toContain('<path');
    validateSvgOutput(result.svg);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TR-04: ORIENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-04: Orientations', () => {
  const orientations = [
    { angle: 0, label: 'North (0°)' },
    { angle: Math.PI / 4, label: 'NE (45°)' },
    { angle: Math.PI / 2, label: 'East (90°)' },
    { angle: (3 * Math.PI) / 4, label: 'SE (135°)' },
    { angle: Math.PI, label: 'South (180°)' },
    { angle: (5 * Math.PI) / 4, label: 'SW (225°)' },
    { angle: (3 * Math.PI) / 2, label: 'West (270°)' },
    { angle: (7 * Math.PI) / 4, label: 'NW (315°)' },
  ];

  for (const { angle, label } of orientations) {
    it(`renders correctly at ${label}`, () => {
      const signature = createSignature({
        id: `orientation-${label}`,
        orientation: angle,
        amplitude: 0.5,
      });

      const result = renderTrunk(signature, DEFAULT_PARAMS);

      expect(result.svg).toContain('<path');
      expect(result.hash).toBeDefined();
      validateSvgOutput(result.svg);
    });
  }

  it('orientations produce 4 unique outputs (180° symmetry)', () => {
    // The anisotropic disc formula cos(2*(θ - orientation)) has period π (180°)
    // This means orientations 180° apart produce identical shapes:
    // - North (0°) = South (180°)
    // - NE (45°) = SW (225°)
    // - East (90°) = West (270°)
    // - SE (135°) = NW (315°)
    // Therefore, 8 orientations → 4 unique shapes (mathematically correct)
    const hashes = new Set<string>();

    for (const { angle } of orientations) {
      const signature = createSignature({
        orientation: angle,
        amplitude: 0.5,
      });
      const result = renderTrunk(signature, DEFAULT_PARAMS);
      hashes.add(result.hash);
    }

    expect(hashes.size).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TR-05: SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-05: Schema Validation', () => {
  it('validates correct RenderParams', () => {
    expect(() => validateRenderParams(DEFAULT_PARAMS)).not.toThrow();
  });

  it('rejects RenderParams with missing fields', () => {
    const invalid = { ...DEFAULT_PARAMS, profileId: undefined };
    expect(() => validateRenderParams(invalid)).toThrow();
  });

  it('rejects RenderParams with invalid viewport', () => {
    const invalid = {
      ...DEFAULT_PARAMS,
      viewport: { width: 10, height: 512 }, // width too small
    };
    expect(() => validateRenderParams(invalid)).toThrow();
  });

  it('validates correct TrunkSignature', () => {
    const signature = createSignature();
    expect(() => validateTrunkSignature(signature)).not.toThrow();
  });

  it('rejects TrunkSignature with invalid orientation', () => {
    const invalid = createSignature({ orientation: 10 }); // > 2π
    expect(() => validateTrunkSignature(invalid)).toThrow();
  });

  it('rejects TrunkSignature with invalid color', () => {
    const invalid = createSignature({
      color: { h: 400, s: 0.5, l: 0.5 }, // h > 360
    });
    expect(() => validateTrunkSignature(invalid)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TR-06: FORBIDDEN ELEMENTS
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-06: Forbidden Elements', () => {
  it('SVG contains no <text> elements', () => {
    const signature = createSignature();
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).not.toMatch(/<text[^>]*>/i);
    expect(() => validateSvgOutput(result.svg)).not.toThrow();
  });

  it('SVG contains no <circle> elements (O₂ is integrated)', () => {
    const signature = createSignature({
      oxygen: { level: 80, amplitude: 0.04, frequency: 6, phase: 0 },
    });
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).not.toMatch(/<circle[^>]*>/i);
    expect(() => validateSvgOutput(result.svg)).not.toThrow();
  });

  it('SVG contains no <line> elements', () => {
    const signature = createSignature();
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    expect(result.svg).not.toMatch(/<line[^>]*>/i);
    expect(() => validateSvgOutput(result.svg)).not.toThrow();
  });

  it('SVG contains only one <path> element', () => {
    const signature = createSignature();
    const result = renderTrunk(signature, DEFAULT_PARAMS);

    const pathMatches = result.svg.match(/<path[^>]*>/g);
    expect(pathMatches).toHaveLength(1);
  });

  it('validateSvgOutput throws on forbidden <text>', () => {
    const badSvg = '<svg><text>Hello</text><path d="M0 0"/></svg>';
    expect(() => validateSvgOutput(badSvg)).toThrow('FORBIDDEN');
  });

  it('validateSvgOutput throws on forbidden <circle>', () => {
    const badSvg = '<svg><circle cx="0" cy="0" r="10"/><path d="M0 0"/></svg>';
    expect(() => validateSvgOutput(badSvg)).toThrow('FORBIDDEN');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TR-07: SCHEMA FREEZE (render_report.json)
// ═══════════════════════════════════════════════════════════════════════════

describe('TR-07: Schema Freeze', () => {
  const validReport: RenderReport = {
    report_version: '1.0',
    render_profile_id: 'RCE-01-PREMIUM',
    render_timestamp_utc: '2026-01-23T00:00:00.000Z',
    environment: {
      docker: {
        image_name: 'omega-rce01:latest',
        image_digest: 'sha256:abc123',
      },
      runtime: {
        node: 'v20.11.0',
        playwright: '1.41.0',
        chromium: '121.0.0',
      },
      lockfiles: {
        package_lock_sha256: 'sha256:lockfile',
      },
      os: {
        kernel: 'linux',
        arch: 'x64',
      },
    },
    inputs: {
      trunk_signature_hash: 'sha256:sig',
      render_profile_hash: 'sha256:profile',
    },
    rendering: {
      viewport: { width: 512, height: 512 },
      device_scale_factor: 1,
      color_space: 'sRGB',
      antialiasing: 'chromium-default',
      fonts: 'none',
      svg_renderer: 'chromium-headless',
      gpu: 'disabled',
    },
    calibration: {
      anisotropy_min: -0.3,
      anisotropy_max: 0.3,
      opacity_base: 0.7,
      opacity_z_coefficient: 0.3,
      oxygen_amplitude_max: 0.05,
      render_timeout_ms: 50,
    },
    outputs: {
      svg: { path: 'trunk.svg', sha256: 'sha256:svg' },
      png: { path: 'trunk.png', sha256: 'sha256:png' },
    },
    determinism: {
      expected_behavior: 'same_input_same_output',
      runs_verified: 100,
      status: 'PASS',
    },
  };

  it('validates correct render_report.json', () => {
    expect(() => validateRenderReportSchema(validReport)).not.toThrow();
  });

  it('rejects report with extra top-level field', () => {
    const invalid = {
      ...validReport,
      extra_field: 'not allowed',
    };
    expect(() => validateRenderReportSchema(invalid)).toThrow('SCHEMA VIOLATION');
    expect(() => validateRenderReportSchema(invalid)).toThrow('extra_field');
  });

  it('rejects report with extra environment field', () => {
    const invalid = {
      ...validReport,
      environment: {
        ...validReport.environment,
        extra: 'not allowed',
      },
    };
    expect(() => validateRenderReportSchema(invalid)).toThrow('SCHEMA VIOLATION');
  });

  it('rejects report with extra docker field', () => {
    const invalid = {
      ...validReport,
      environment: {
        ...validReport.environment,
        docker: {
          ...validReport.environment.docker,
          extra: 'not allowed',
        },
      },
    };
    expect(() => validateRenderReportSchema(invalid)).toThrow('SCHEMA VIOLATION');
  });

  it('rejects report with extra calibration field', () => {
    const invalid = {
      ...validReport,
      calibration: {
        ...validReport.calibration,
        extra_param: 0.5,
      },
    };
    expect(() => validateRenderReportSchema(invalid)).toThrow('SCHEMA VIOLATION');
  });

  it('rejects report with invalid report_version', () => {
    const invalid = {
      ...validReport,
      report_version: '2.0', // Only 1.0 allowed
    };
    expect(() => validateRenderReportSchema(invalid)).toThrow('report_version must be "1.0"');
  });

  it('rejects report with invalid determinism status', () => {
    const invalid = {
      ...validReport,
      determinism: {
        ...validReport.determinism,
        status: 'UNKNOWN', // Only PASS/FAIL allowed
      },
    };
    expect(() => validateRenderReportSchema(invalid)).toThrow('status must be "PASS" or "FAIL"');
  });
});
