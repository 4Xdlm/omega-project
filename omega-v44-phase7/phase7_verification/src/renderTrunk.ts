/**
 * OMEGA Phase 7 — Trunk Renderer
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 *
 * Renders TrunkSignature (from V4.4 core) into deterministic SVG.
 *
 * RULES:
 * ❌ No Math.random() or Date.now()
 * ❌ No hardcoded numeric values
 * ❌ No H/S/L calculation (use signature.color)
 * ❌ No oxygen.frequency calculation (use signature.oxygen.frequency)
 * ❌ No <text> elements
 * ❌ No separate O₂ circle/ring
 * ✅ All parameters from RenderParams or TrunkSignature
 */

import { createHash } from 'node:crypto';
import type { TrunkSignature, RenderParams, SvgResult } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamp value to range [min, max]
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate SHA-256 hash of string
 */
function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate anisotropy from amplitude
 * All parameters from RenderParams - NO hardcoded values
 *
 * Mapping:
 * - amplitude 0 → anisotropy 0 (circular, neutral)
 * - amplitude 1 → anisotropy max (maximum elongation)
 */
function calculateAnisotropy(
  amplitude: number,
  params: RenderParams
): number {
  // Linear scaling: amplitude directly controls anisotropy magnitude
  const anisotropy = amplitude * params.calibration.anisotropyMax;
  return clamp(
    anisotropy,
    params.calibration.anisotropyMin,
    params.calibration.anisotropyMax
  );
}

/**
 * Calculate opacity from persistence (Z-axis)
 * All parameters from RenderParams - NO hardcoded values
 */
function calculateOpacity(
  persistence: number,
  params: RenderParams
): number {
  const opacity = params.calibration.opacityBase +
    (persistence * params.calibration.opacityZCoefficient);
  return clamp(opacity, 0, 1);
}

/**
 * Calculate O₂ deformation at angle theta
 *
 * IMPORTANT:
 * ❌ oxygen.frequency comes from signature (FROM CORE)
 * ❌ We do NOT calculate frequency here
 */
function calculateOxygenDeformation(
  theta: number,
  signature: TrunkSignature,
  params: RenderParams
): number {
  // Clamp amplitude to max allowed
  const amplitude = clamp(
    signature.oxygen.amplitude,
    0,
    params.calibration.oxygenAmplitudeMax
  );

  // Use frequency FROM CORE (signature.oxygen.frequency)
  // ❌ NEVER calculate frequency on UI side
  return amplitude * Math.sin(
    signature.oxygen.frequency * theta + signature.oxygen.phase
  );
}

/**
 * Calculate radius at angle theta for anisotropic disc with O₂ deformation
 *
 * Formula:
 *   r(θ) = baseRadius × (1 + anisotropy × cos(2 × (θ - orientation)))
 *   r_final(θ) = r(θ) × (1 + oxygenDeformation(θ))
 *
 * O₂ is INTEGRATED into contour - NOT a separate circle
 */
function calculateRadius(
  theta: number,
  signature: TrunkSignature,
  params: RenderParams
): number {
  const baseRadius = params.rendering.baseRadius;
  const anisotropy = calculateAnisotropy(signature.amplitude, params);

  // Anisotropic disc shape
  const anisotropicRadius = baseRadius * (
    1 + anisotropy * Math.cos(2 * (theta - signature.orientation))
  );

  // O₂ deformation (INTEGRATED into contour)
  const o2Deformation = calculateOxygenDeformation(theta, signature, params);

  // Final radius with integrated O₂
  return anisotropicRadius * (1 + o2Deformation);
}

/**
 * Generate SVG path for trunk disc
 *
 * Creates closed path with pathResolution points
 */
function generateDiscPath(
  cx: number,
  cy: number,
  signature: TrunkSignature,
  params: RenderParams
): string {
  const steps = params.rendering.pathResolution;
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const r = calculateRadius(theta, signature, params);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);

    if (i === 0) {
      points.push(`M ${x.toFixed(6)} ${y.toFixed(6)}`);
    } else {
      points.push(`L ${x.toFixed(6)} ${y.toFixed(6)}`);
    }
  }

  points.push('Z');
  return points.join(' ');
}

/**
 * Generate fill color from signature
 *
 * ❌ H/S/L values come FROM CORE (signature.color)
 * ❌ We do NOT calculate H/S/L here
 */
function generateFillColor(signature: TrunkSignature): string {
  // Use H/S/L directly from signature (from core)
  const h = signature.color.h;
  const s = signature.color.s * 100;  // Convert to percentage
  const l = signature.color.l * 100;  // Convert to percentage

  return `hsl(${h.toFixed(2)}, ${s.toFixed(2)}%, ${l.toFixed(2)}%)`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render trunk signature to SVG
 *
 * @param signature - TrunkSignature from V4.4 core (READ ONLY)
 * @param params - RenderParams from RCE-01 profile
 * @returns SvgResult with SVG string and hash
 *
 * GUARANTEES:
 * - Deterministic: Same inputs → Same output
 * - No forbidden elements: No <text>, no separate O₂ circle
 * - All values from params or signature
 */
export function renderTrunk(
  signature: TrunkSignature,
  params: RenderParams
): SvgResult {
  const { width, height } = params.viewport;
  const cx = width / 2;
  const cy = height / 2;

  // Generate path
  const path = generateDiscPath(cx, cy, signature, params);

  // Generate color (from signature - NOT calculated here)
  const fill = generateFillColor(signature);

  // Calculate opacity (from params and signature.persistence)
  const opacity = calculateOpacity(signature.persistence, params);

  // Build SVG
  // ❌ NO <text> elements
  // ❌ NO separate O₂ circle/ring
  // ✅ Only one <path> element for the trunk disc
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <path d="${path}" fill="${fill}" fill-opacity="${opacity.toFixed(6)}"/>
</svg>`;

  // Calculate hash
  const hash = sha256(svg);

  return { svg, hash };
}

/**
 * Validate SVG output contains no forbidden elements
 *
 * @throws Error if forbidden elements found
 */
export function validateSvgOutput(svg: string): void {
  // Check for forbidden <text> elements
  if (/<text[^>]*>/i.test(svg)) {
    throw new Error('FORBIDDEN: SVG contains <text> element');
  }

  // Check for multiple <circle> elements (O₂ should be integrated, not separate)
  const circleMatches = svg.match(/<circle[^>]*>/gi);
  if (circleMatches && circleMatches.length > 0) {
    throw new Error('FORBIDDEN: SVG contains <circle> element (O₂ must be integrated)');
  }

  // Check for grid/line elements (forbidden even for debug)
  if (/<line[^>]*>/i.test(svg)) {
    throw new Error('FORBIDDEN: SVG contains <line> element');
  }

  // Check for rect that might be grid
  const rectMatches = svg.match(/<rect[^>]*>/gi);
  if (rectMatches && rectMatches.length > 1) {
    throw new Error('FORBIDDEN: SVG contains multiple <rect> elements (possible grid)');
  }
}
