/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — JUDGE CACHE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/judge-cache.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * SHA256-keyed cache for LLM judge results.
 * - Memory: Map<string, JudgeResult>
 * - Disk: JSON persistence (judge-cache.json)
 * - Key: SHA256(axis + prose + seed)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface JudgeResult {
  readonly score: number;
  readonly reason: string;
}

export interface CacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JUDGE CACHE
// ═══════════════════════════════════════════════════════════════════════════════

export class JudgeCache {
  private readonly store: Map<string, JudgeResult>;
  private readonly filePath: string;
  private hitCount = 0;
  private missCount = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.store = new Map();
    this.loadFromDisk();
  }

  get(key: string): JudgeResult | null {
    const result = this.store.get(key);
    if (result !== undefined) {
      this.hitCount++;
      return result;
    }
    this.missCount++;
    return null;
  }

  set(key: string, value: JudgeResult): void {
    this.store.set(key, value);
  }

  persist(): void {
    const data: Record<string, JudgeResult> = {};
    for (const [k, v] of this.store) {
      data[k] = v;
    }
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  stats(): CacheStats {
    const total = this.hitCount + this.missCount;
    return {
      entries: this.store.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
    };
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw) as Record<string, JudgeResult>;
        for (const [k, v] of Object.entries(data)) {
          this.store.set(k, v);
        }
      }
    } catch {
      // Silently ignore corrupt/missing cache file
    }
  }
}
