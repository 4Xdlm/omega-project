/**
 * Oracle Context System
 * @module @omega/oracle/context
 * @description Context awareness for multi-text analysis
 */

import type { OracleResponse, EmotionalInsight } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// THRESHOLDS (internal, not exported)
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum difference between halves to detect trend */
const TREND_DETECTION_THRESHOLD = 0.1;

/** Minimum difference to consider emotions divergent */
const EMOTION_DIVERGENCE_THRESHOLD = 0.2;

/** Similarity >= this is "very similar" */
const HIGH_SIMILARITY_THRESHOLD = 0.8;

/** Similarity >= this is "moderate similarity" */
const MODERATE_SIMILARITY_THRESHOLD = 0.5;

/**
 * Context entry representing a single analyzed text
 */
export interface ContextEntry {
  id: string;
  text: string;
  insights: EmotionalInsight[];
  timestamp: number;
  weight: number;
  tags: string[];
}

/**
 * Context configuration
 */
export interface ContextConfig {
  /** Maximum entries in context */
  maxEntries: number;
  /** Context decay rate (0-1) */
  decayRate: number;
  /** Minimum weight before removal */
  minWeight: number;
  /** Enable automatic decay */
  autoDecay: boolean;
  /** Decay interval in ms */
  decayInterval: number;
}

/**
 * Default context configuration
 */
export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  maxEntries: 100,
  decayRate: 0.1,
  minWeight: 0.01,
  autoDecay: true,
  decayInterval: 60000, // 1 minute
};

/**
 * Emotion trend data
 */
export interface EmotionTrend {
  emotion: string;
  values: number[];
  timestamps: number[];
  trend: 'increasing' | 'decreasing' | 'stable';
  average: number;
  variance: number;
}

/**
 * Context summary
 */
export interface ContextSummary {
  entryCount: number;
  totalWeight: number;
  dominantEmotions: string[];
  trends: EmotionTrend[];
  themes: string[];
  timespan: { start: number; end: number };
}

/**
 * Comparison result between texts
 */
export interface ComparisonResult {
  similarity: number;
  sharedEmotions: string[];
  divergentEmotions: { emotion: string; diff: number }[];
  emotionalDistance: number;
  narrative: string;
}

/**
 * Oracle Context Manager
 * Maintains context across multiple analyses for trend detection
 */
export class OracleContext {
  private entries: Map<string, ContextEntry>;
  private config: ContextConfig;
  private decayTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = { ...DEFAULT_CONTEXT_CONFIG, ...config };
    this.entries = new Map();

    if (this.config.autoDecay) {
      this.startDecayTimer();
    }
  }

  /**
   * Start automatic decay timer
   */
  private startDecayTimer(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
    }
    this.decayTimer = setInterval(() => {
      this.applyDecay();
    }, this.config.decayInterval);
  }

  /**
   * Stop automatic decay timer
   */
  stopDecayTimer(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }

  /**
   * Add entry to context
   */
  addEntry(response: OracleResponse, tags: string[] = []): string {
    // Ensure space
    while (this.entries.size >= this.config.maxEntries) {
      this.removeLowestWeight();
    }

    const entry: ContextEntry = {
      id: response.id,
      text: response.text,
      insights: response.insights,
      timestamp: response.metadata.timestamp,
      weight: 1.0,
      tags,
    };

    this.entries.set(entry.id, entry);
    return entry.id;
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): ContextEntry | null {
    return this.entries.get(id) || null;
  }

  /**
   * Remove entry by ID
   */
  removeEntry(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Get all entries
   */
  getAllEntries(): ContextEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get entries by tag
   */
  getEntriesByTag(tag: string): ContextEntry[] {
    return this.getAllEntries().filter((e) => e.tags.includes(tag));
  }

  /**
   * Apply decay to all entries
   */
  applyDecay(): number {
    let removed = 0;
    const toRemove: string[] = [];

    for (const [id, entry] of this.entries) {
      entry.weight *= 1 - this.config.decayRate;
      if (entry.weight < this.config.minWeight) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.entries.delete(id);
      removed++;
    }

    return removed;
  }

  /**
   * Remove entry with lowest weight
   */
  private removeLowestWeight(): void {
    let lowestId: string | null = null;
    let lowestWeight = Infinity;

    for (const [id, entry] of this.entries) {
      if (entry.weight < lowestWeight) {
        lowestWeight = entry.weight;
        lowestId = id;
      }
    }

    if (lowestId) {
      this.entries.delete(lowestId);
    }
  }

  /**
   * Boost weight of an entry
   */
  boostEntry(id: string, amount: number = 0.5): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    entry.weight = Math.min(1.0, entry.weight + amount);
    return true;
  }

  /**
   * Get dominant emotions across context
   */
  getDominantEmotions(limit: number = 5): string[] {
    const emotionScores = new Map<string, number>();

    for (const entry of this.entries.values()) {
      for (const insight of entry.insights) {
        const current = emotionScores.get(insight.primaryEmotion) || 0;
        emotionScores.set(
          insight.primaryEmotion,
          current + insight.confidence * entry.weight
        );
      }
    }

    return Array.from(emotionScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([emotion]) => emotion);
  }

  /**
   * Get emotion trends over time
   */
  getEmotionTrends(): EmotionTrend[] {
    const emotionData = new Map<string, { values: number[]; timestamps: number[] }>();

    // Sort entries by timestamp
    const sortedEntries = this.getAllEntries().sort((a, b) => a.timestamp - b.timestamp);

    for (const entry of sortedEntries) {
      for (const insight of entry.insights) {
        const data = emotionData.get(insight.primaryEmotion) || {
          values: [],
          timestamps: [],
        };
        data.values.push(insight.confidence * entry.weight);
        data.timestamps.push(entry.timestamp);
        emotionData.set(insight.primaryEmotion, data);
      }
    }

    const trends: EmotionTrend[] = [];

    for (const [emotion, data] of emotionData) {
      if (data.values.length < 2) {
        trends.push({
          emotion,
          values: data.values,
          timestamps: data.timestamps,
          trend: 'stable',
          average: data.values[0] || 0,
          variance: 0,
        });
        continue;
      }

      const average = data.values.reduce((sum, v) => sum + v, 0) / data.values.length;
      const variance =
        data.values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / data.values.length;

      // Simple trend detection using first half vs second half
      const mid = Math.floor(data.values.length / 2);
      const firstHalf = data.values.slice(0, mid);
      const secondHalf = data.values.slice(mid);
      const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      const diff = secondAvg - firstAvg;
      if (diff > TREND_DETECTION_THRESHOLD) trend = 'increasing';
      else if (diff < -TREND_DETECTION_THRESHOLD) trend = 'decreasing';

      trends.push({
        emotion,
        values: data.values,
        timestamps: data.timestamps,
        trend,
        average,
        variance,
      });
    }

    return trends.sort((a, b) => b.average - a.average);
  }

  /**
   * Compare two entries
   */
  compare(id1: string, id2: string): ComparisonResult | null {
    const entry1 = this.entries.get(id1);
    const entry2 = this.entries.get(id2);

    if (!entry1 || !entry2) return null;

    const emotions1 = new Map(entry1.insights.map((i) => [i.primaryEmotion, i.confidence]));
    const emotions2 = new Map(entry2.insights.map((i) => [i.primaryEmotion, i.confidence]));

    // Find shared emotions
    const sharedEmotions: string[] = [];
    const divergentEmotions: { emotion: string; diff: number }[] = [];

    const allEmotions = new Set([...emotions1.keys(), ...emotions2.keys()]);

    let distance = 0;
    for (const emotion of allEmotions) {
      const v1 = emotions1.get(emotion) || 0;
      const v2 = emotions2.get(emotion) || 0;

      if (v1 > 0 && v2 > 0) {
        sharedEmotions.push(emotion);
      }

      const diff = Math.abs(v1 - v2);
      distance += diff;

      if (diff > EMOTION_DIVERGENCE_THRESHOLD) {
        divergentEmotions.push({ emotion, diff });
      }
    }

    const maxDistance = allEmotions.size * 1.0;
    const similarity = maxDistance > 0 ? 1 - distance / maxDistance : 1;

    let narrative = '';
    if (similarity > HIGH_SIMILARITY_THRESHOLD) {
      narrative = `Very similar emotional profiles with ${sharedEmotions.length} shared emotions.`;
    } else if (similarity > MODERATE_SIMILARITY_THRESHOLD) {
      narrative = `Moderate similarity. Key differences in: ${divergentEmotions.map((d) => d.emotion).join(', ')}.`;
    } else {
      narrative = `Significantly different emotional profiles. Major divergence in ${divergentEmotions.length} emotions.`;
    }

    return {
      similarity,
      sharedEmotions,
      divergentEmotions: divergentEmotions.sort((a, b) => b.diff - a.diff),
      emotionalDistance: distance,
      narrative,
    };
  }

  /**
   * Get context summary
   */
  getSummary(): ContextSummary {
    const entries = this.getAllEntries();

    if (entries.length === 0) {
      return {
        entryCount: 0,
        totalWeight: 0,
        dominantEmotions: [],
        trends: [],
        themes: [],
        timespan: { start: 0, end: 0 },
      };
    }

    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    const timestamps = entries.map((e) => e.timestamp);

    // Extract themes from tags
    const themeCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        themeCounts.set(tag, (themeCounts.get(tag) || 0) + 1);
      }
    }

    const themes = Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    return {
      entryCount: entries.length,
      totalWeight,
      dominantEmotions: this.getDominantEmotions(5),
      trends: this.getEmotionTrends(),
      themes,
      timespan: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
      },
    };
  }

  /**
   * Find similar entries
   */
  findSimilar(id: string, threshold: number = 0.5): ContextEntry[] {
    const target = this.entries.get(id);
    if (!target) return [];

    const similar: ContextEntry[] = [];

    for (const [otherId, entry] of this.entries) {
      if (otherId === id) continue;

      const comparison = this.compare(id, otherId);
      if (comparison && comparison.similarity >= threshold) {
        similar.push(entry);
      }
    }

    return similar.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get entry count
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Export context
   */
  export(): ContextEntry[] {
    return this.getAllEntries();
  }

  /**
   * Import context
   */
  import(entries: ContextEntry[]): void {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
    // Trim if over limit
    while (this.entries.size > this.config.maxEntries) {
      this.removeLowestWeight();
    }
  }

  /**
   * Dispose context manager
   */
  dispose(): void {
    this.stopDecayTimer();
    this.entries.clear();
  }
}

/**
 * Create context manager instance
 */
export function createContext(config?: Partial<ContextConfig>): OracleContext {
  return new OracleContext(config);
}
