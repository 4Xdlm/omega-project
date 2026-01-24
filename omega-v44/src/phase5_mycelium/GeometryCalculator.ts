/**
 * OMEGA V4.4 — Phase 5: Geometry Calculator
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Converts text to deterministic geometric data:
 * - Each letter → number
 * - Words/sentences → branch size
 * - Variance → branch density
 * - Hash → geometry fingerprint
 */

import { sha256 } from '../phase2_core/hash.js';
import type { GeometryData } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRY CALCULATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Geometry Calculator - Text to geometric features
 */
export class GeometryCalculator {
  /**
   * Calculate branches from text
   * DETERMINISTIC: Same text = same result
   */
  calculateBranches(text: string): GeometryData {
    if (!text || text.length === 0) {
      return {
        branchSize: 0,
        branchDensity: 0,
        geometryHash: sha256(''),
      };
    }

    // Convert letters to numbers
    const numbers = this.textToNumbers(text);

    // Calculate statistics
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;

    // Calculate variance for density
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;

    // Branch size from mean
    const branchSize = mean;

    // Branch density from variance
    const branchDensity = Math.sqrt(variance);

    // Geometry hash from number sequence
    const geometryHash = this.hashNumbers(numbers);

    return {
      branchSize,
      branchDensity,
      geometryHash,
    };
  }

  /**
   * Convert text to array of numbers
   * Each character → its Unicode code point
   */
  private textToNumbers(text: string): number[] {
    const numbers: number[] = [];

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      numbers.push(code);
    }

    return numbers;
  }

  /**
   * Hash array of numbers
   */
  private hashNumbers(numbers: number[]): string {
    const str = numbers.join(',');
    return sha256(str);
  }

  /**
   * Calculate distance between two geometries
   */
  calculateDistance(g1: GeometryData, g2: GeometryData): number {
    // Euclidean distance in 2D space (size, density)
    const sizeDiff = g1.branchSize - g2.branchSize;
    const densityDiff = g1.branchDensity - g2.branchDensity;

    return Math.sqrt(sizeDiff * sizeDiff + densityDiff * densityDiff);
  }

  /**
   * Check if two geometries have same hash
   */
  isSameGeometry(g1: GeometryData, g2: GeometryData): boolean {
    return g1.geometryHash === g2.geometryHash;
  }
}
