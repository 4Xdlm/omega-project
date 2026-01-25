/**
 * OMEGA Truth Gate — Toxicity Detector
 *
 * Detects toxic content in narrative operations.
 * Uses pattern matching and keyword detection.
 */

import type { CanonTx, CanonOp } from '@omega/canon-kernel';
import type { ToxicityResult, ToxicityType, ToxicitySeverity, DriftDetectorConfig } from './types.js';
import { DEFAULT_DRIFT_CONFIG } from './drift-detector.js';

/**
 * ToxicityDetector - Detects harmful content.
 */
export class ToxicityDetector {
  private readonly config: DriftDetectorConfig;

  // Built-in patterns for toxicity detection
  private readonly TOXIC_PATTERNS: ReadonlyMap<ToxicityType, readonly RegExp[]> = new Map([
    ['hate_speech', [
      /\b(hate|hatred)\b.*\b(group|race|religion|gender)\b/i,
      /\b(inferior|subhuman)\b.*\b(race|people|group)\b/i,
      /\bagainst\b.*\b(race|religion|gender)\b/i,
    ]],
    ['violence_glorification', [
      /\b(glorif|celebrat)\w*\b.*\b(violence|killing|murder)\b/i,
      /\b(deserve|should)\b.*\b(die|be killed)\b/i,
    ]],
    ['harassment', [
      /\b(stalk|harass|bully)\w*\b.*\b(them|her|him|you)\b/i,
      /\b(kill|hurt|harm)\b.*\byourself\b/i,
    ]],
    ['self_harm', [
      /\b(commit|attempt)\b.*\bsuicide\b/i,
      /\b(cut|harm)\b.*\b(yourself|myself)\b/i,
      /\bhow\s+to\b.*\b(kill|hurt)\b.*\b(yourself|myself)\b/i,
    ]],
    ['dangerous_content', [
      /\b(make|build|create)\b.*\b(bomb|explosive|weapon)\b/i,
      /\b(poison|drug)\b.*\b(someone|people)\b/i,
      /\bhow\s+to\b.*\bbomb\b/i,
    ]],
  ]);

  constructor(config: Partial<DriftDetectorConfig> = {}) {
    this.config = { ...DEFAULT_DRIFT_CONFIG, ...config };
  }

  /**
   * Analyze transaction for toxic content.
   */
  analyzeToxicity(tx: CanonTx): ToxicityResult {
    if (!this.config.enable_content_analysis) {
      return this.createSafeResult();
    }

    let maxToxicityScore = 0;
    let primaryToxicityType: ToxicityType = 'none';
    const flaggedContent: string[] = [];
    const details: string[] = [];

    // Analyze each operation
    for (const op of tx.ops) {
      const opToxicity = this.analyzeOperationToxicity(op);
      if (opToxicity.toxicity_score > maxToxicityScore) {
        maxToxicityScore = opToxicity.toxicity_score;
        primaryToxicityType = opToxicity.toxicity_type;
      }
      flaggedContent.push(...opToxicity.flagged_content);
      if (opToxicity.toxicity_score > 0) {
        details.push(opToxicity.details);
      }
    }

    // Check against custom blocked terms
    for (const op of tx.ops) {
      const blockedTerms = this.checkBlockedTerms(op);
      if (blockedTerms.length > 0) {
        maxToxicityScore = Math.max(maxToxicityScore, 0.8);
        flaggedContent.push(...blockedTerms);
        details.push(`Blocked terms found: ${blockedTerms.join(', ')}`);
      }
    }

    const severity = this.scoreToToxicitySeverity(maxToxicityScore);

    return {
      toxicity_score: maxToxicityScore,
      toxicity_type: primaryToxicityType,
      severity,
      flagged_content: [...new Set(flaggedContent)],
      details: details.join('; ') || 'No toxicity detected',
    };
  }

  /**
   * Analyze single operation for toxicity.
   */
  private analyzeOperationToxicity(op: CanonOp): ToxicityResult {
    const content = this.extractTextContent(op);
    if (!content) {
      return this.createSafeResult();
    }

    let maxScore = 0;
    let detectedType: ToxicityType = 'none';
    const flagged: string[] = [];

    // Check against patterns
    for (const [type, patterns] of this.TOXIC_PATTERNS) {
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const score = this.getTypeScore(type);
          if (score > maxScore) {
            maxScore = score;
            detectedType = type;
          }
          flagged.push(match[0]);
        }
      }
    }

    return {
      toxicity_score: maxScore,
      toxicity_type: detectedType,
      severity: this.scoreToToxicitySeverity(maxScore),
      flagged_content: flagged,
      details: flagged.length > 0 ? `Found toxic patterns in content` : 'No toxicity detected',
    };
  }

  /**
   * Extract text content from operation.
   */
  private extractTextContent(op: CanonOp): string | null {
    if (op.value === null || op.value === undefined) {
      return null;
    }

    if (typeof op.value === 'string') {
      return op.value;
    }

    if (typeof op.value === 'object') {
      // Extract text fields from object
      const textFields = ['text', 'content', 'body', 'message', 'description', 'narrative'];
      for (const field of textFields) {
        const val = (op.value as Record<string, unknown>)[field];
        if (typeof val === 'string') {
          return val;
        }
      }

      // Stringify and check
      return JSON.stringify(op.value);
    }

    return String(op.value);
  }

  /**
   * Check for blocked terms.
   */
  private checkBlockedTerms(op: CanonOp): string[] {
    const content = this.extractTextContent(op);
    if (!content) {
      return [];
    }

    const found: string[] = [];
    const contentLower = content.toLowerCase();

    for (const term of this.config.blocked_terms) {
      if (contentLower.includes(term.toLowerCase())) {
        found.push(term);
      }
    }

    return found;
  }

  /**
   * Get score for toxicity type.
   */
  private getTypeScore(type: ToxicityType): number {
    const scores: Record<ToxicityType, number> = {
      'hate_speech': 0.9,
      'violence_glorification': 0.85,
      'harassment': 0.8,
      'self_harm': 0.95,
      'dangerous_content': 0.9,
      'explicit_content': 0.6,
      'misinformation': 0.5,
      'none': 0,
    };
    return scores[type] ?? 0;
  }

  /**
   * Convert score to severity.
   */
  private scoreToToxicitySeverity(score: number): ToxicitySeverity {
    if (score >= 0.8) return 'severe';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'none';
  }

  /**
   * Create safe result.
   */
  private createSafeResult(): ToxicityResult {
    return {
      toxicity_score: 0,
      toxicity_type: 'none',
      severity: 'none',
      flagged_content: [],
      details: 'No toxicity detected',
    };
  }
}

/**
 * Create a toxicity detector.
 */
export function createToxicityDetector(config?: Partial<DriftDetectorConfig>): ToxicityDetector {
  return new ToxicityDetector(config);
}
