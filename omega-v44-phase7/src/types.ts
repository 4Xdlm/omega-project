/**
 * OMEGA Phase 7 — Type Definitions
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 *
 * These types define the interface between the frozen V4.4 core
 * and the Phase 7 renderer. The renderer is READ-ONLY.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TRUNK SIGNATURE (FROM CORE - READ ONLY)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TrunkSignature comes from the V4.4 core (Phases 1-6).
 * Phase 7 NEVER calculates these values - only reads them.
 *
 * ❌ No H/S/L calculation on UI side
 * ❌ No oxygen.frequency calculation on UI side
 */
export interface TrunkSignature {
  /** Unique identifier */
  readonly id: string;

  /** Orientation in radians [0, 2π) - from core */
  readonly orientation: number;

  /** Emotional amplitude [0, 1] - from core */
  readonly amplitude: number;

  /**
   * Color from core - NEVER calculated on UI side
   * H/S/L values come directly from the V4.4 analysis
   */
  readonly color: {
    readonly h: number;  // Hue [0, 360)
    readonly s: number;  // Saturation [0, 1]
    readonly l: number;  // Lightness [0, 1]
  };

  /** Persistence (Z-axis) [0, 1] - from core */
  readonly persistence: number;

  /**
   * Oxygen parameters - from core
   * ❌ frequency is NEVER calculated on UI side
   */
  readonly oxygen: {
    readonly level: number;      // O₂ level [0, 100]
    readonly amplitude: number;  // Deformation amplitude [0, 1]
    readonly frequency: number;  // Wave frequency - FROM CORE ONLY
    readonly phase: number;      // Wave phase [0, 2π)
  };

  /** Source hash for traceability */
  readonly sourceHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER PARAMETERS (FROM PROFILE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render parameters from RCE-01 profile.
 * All visual tuning parameters come from here - NO hardcoded values.
 */
export interface RenderParams {
  /** Profile identifier */
  readonly profileId: string;

  /** Profile version */
  readonly profileVersion: string;

  /** Viewport dimensions */
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };

  /** Calibration parameters (injected at build time) */
  readonly calibration: {
    readonly anisotropyMin: number;
    readonly anisotropyMax: number;
    readonly opacityBase: number;
    readonly opacityZCoefficient: number;
    readonly oxygenAmplitudeMax: number;
    readonly renderTimeoutMs: number;
  };

  /** Rendering settings */
  readonly rendering: {
    readonly deviceScaleFactor: number;
    readonly colorSpace: 'sRGB';
    readonly pathResolution: number;
    readonly baseRadius: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER REPORT (STRICT SCHEMA - NO ADDITIONAL FIELDS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render report schema - FROZEN
 *
 * ❌ No additional fields allowed
 * ❌ No "improvements" permitted
 * ✅ Test TR-07 validates this strictly
 */
export interface RenderReport {
  readonly report_version: '1.0';
  readonly render_profile_id: string;
  readonly render_timestamp_utc: string;

  readonly environment: {
    readonly docker: {
      readonly image_name: string;
      readonly image_digest: string;
    };
    readonly runtime: {
      readonly node: string;
      readonly playwright: string;
      readonly chromium: string;
    };
    readonly lockfiles: {
      readonly package_lock_sha256: string;
    };
    readonly os: {
      readonly kernel: string;
      readonly arch: string;
    };
  };

  readonly inputs: {
    readonly trunk_signature_hash: string;
    readonly render_profile_hash: string;
  };

  readonly rendering: {
    readonly viewport: {
      readonly width: number;
      readonly height: number;
    };
    readonly device_scale_factor: number;
    readonly color_space: 'sRGB';
    readonly antialiasing: 'chromium-default';
    readonly fonts: 'none';
    readonly svg_renderer: 'chromium-headless';
    readonly gpu: 'disabled';
  };

  readonly calibration: {
    readonly anisotropy_min: number;
    readonly anisotropy_max: number;
    readonly opacity_base: number;
    readonly opacity_z_coefficient: number;
    readonly oxygen_amplitude_max: number;
    readonly render_timeout_ms: number;
  };

  readonly outputs: {
    readonly svg: {
      readonly path: string;
      readonly sha256: string;
    };
    readonly png: {
      readonly path: string;
      readonly sha256: string;
    };
  };

  readonly determinism: {
    readonly expected_behavior: 'same_input_same_output';
    readonly runs_verified: number;
    readonly status: 'PASS' | 'FAIL';
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SVG output result
 */
export interface SvgResult {
  readonly svg: string;
  readonly hash: string;
}

/**
 * PNG output result
 */
export interface PngResult {
  readonly buffer: Buffer;
  readonly hash: string;
}

/**
 * Complete render result
 */
export interface RenderResult {
  readonly svg: SvgResult;
  readonly png: PngResult;
  readonly report: RenderReport;
}
