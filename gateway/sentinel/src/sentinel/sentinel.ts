/**
 * OMEGA SENTINEL — Core Watchdog
 * Phase 16.1 — Security Watchdog
 * 
 * Real-time input validation and security monitoring.
 * 
 * INVARIANTS:
 * - INV-SEN-01: Tout input vérifié
 * - INV-SEN-02: Payload > limit = BLOCK
 * - INV-SEN-03: Pattern malicieux = BLOCK
 * - INV-SEN-04: Résultat déterministe
 * - INV-SEN-05: Timestamp toujours présent
 * - INV-SEN-06: Report cohérent
 */

import {
  DEFAULT_CONFIG,
  MALICIOUS_PATTERNS,
  SentinelStatus,
  BlockReason,
  SENTINEL_VERSION,
} from './constants.js';

import type {
  SentinelConfig,
  SentinelResult,
  SentinelReport,
  CheckResult,
  PatternMatch,
  StructureViolation,
  CategoryStats,
  SentinelInput,
  JsonValue,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SENTINEL CLASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SENTINEL — Security Watchdog
 * 
 * Validates all inputs against size limits, malicious patterns,
 * and structural constraints.
 */
export class Sentinel {
  private config: SentinelConfig;
  private startTime: number;
  private stats: {
    overall: CategoryStats;
    byCheckType: {
      payloadSize: CategoryStats;
      patterns: CategoryStats;
      structure: CategoryStats;
    };
    byBlockReason: Record<BlockReason, number>;
    byPatternCategory: Record<string, number>;
    recentBlocks: { timestamp: string; reason: BlockReason; inputHash: string }[];
  };

  constructor(config: Partial<SentinelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = Date.now();
    this.stats = this.initStats();
  }

  private initStats() {
    const emptyCategory = (): CategoryStats => ({
      total: 0,
      passed: 0,
      blocked: 0,
      warned: 0,
    });

    return {
      overall: emptyCategory(),
      byCheckType: {
        payloadSize: emptyCategory(),
        patterns: emptyCategory(),
        structure: emptyCategory(),
      },
      byBlockReason: Object.values(BlockReason).reduce(
        (acc, reason) => ({ ...acc, [reason]: 0 }),
        {} as Record<BlockReason, number>
      ),
      byPatternCategory: {} as Record<string, number>,
      recentBlocks: [] as { timestamp: string; reason: BlockReason; inputHash: string }[],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN CHECK METHOD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main validation entry point
   * INV-SEN-01: Tout input vérifié
   * INV-SEN-05: Timestamp toujours présent
   */
  check(input: SentinelInput): SentinelResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    
    // Calculate input hash for determinism (INV-SEN-04)
    const inputHash = this.calculateHash(input);

    // Run all checks
    const payloadCheck = this.checkPayloadSize(input);
    const patternCheck = this.checkPatterns(input);
    const structureCheck = this.checkStructure(input);

    // Determine overall status
    const checks = { payloadSize: payloadCheck, patterns: patternCheck, structure: structureCheck };
    const allPassed = Object.values(checks).every(c => c.status === SentinelStatus.PASS);
    const hasBlock = Object.values(checks).some(c => c.status === SentinelStatus.BLOCK);
    
    const status = hasBlock 
      ? SentinelStatus.BLOCK 
      : allPassed 
        ? SentinelStatus.PASS 
        : SentinelStatus.WARN;

    const durationMs = performance.now() - startTime;

    // Update statistics
    this.updateStats(status, checks, inputHash);

    // Build summary
    const summary = this.buildSummary(status, checks);

    // INV-SEN-05: Timestamp toujours présent
    return {
      status,
      passed: allPassed,
      timestamp,
      durationMs,
      checks,
      summary,
      inputHash,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYLOAD SIZE CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check payload size against limit
   * INV-SEN-02: Payload > limit = BLOCK
   */
  checkPayloadSize(input: SentinelInput): CheckResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    try {
      const serialized = JSON.stringify(input);
      const payloadSize = new TextEncoder().encode(serialized).length;

      if (payloadSize > this.config.maxPayloadSize) {
        return {
          status: SentinelStatus.BLOCK,
          reason: BlockReason.PAYLOAD_TOO_LARGE,
          message: `Payload size ${payloadSize} bytes exceeds limit of ${this.config.maxPayloadSize} bytes`,
          timestamp,
          durationMs: performance.now() - startTime,
          payloadSize,
        };
      }

      return {
        status: SentinelStatus.PASS,
        message: `Payload size ${payloadSize} bytes is within limit`,
        timestamp,
        durationMs: performance.now() - startTime,
        payloadSize,
      };
    } catch (error) {
      // Circular reference or other serialization error
      return {
        status: SentinelStatus.BLOCK,
        reason: BlockReason.CIRCULAR_REFERENCE,
        message: `Failed to serialize input: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp,
        durationMs: performance.now() - startTime,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check for malicious patterns
   * INV-SEN-03: Pattern malicieux = BLOCK
   */
  checkPatterns(input: SentinelInput): CheckResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const patternMatches: PatternMatch[] = [];

    // Extract all strings from input
    const strings = this.extractStrings(input);

    // Check each string against enabled pattern categories
    for (const { value, path } of strings) {
      for (const { category, patterns } of MALICIOUS_PATTERNS) {
        // Check if this category is enabled
        if (!this.isCategoryEnabled(category)) continue;

        for (let i = 0; i < patterns.length; i++) {
          const match = value.match(patterns[i]);
          if (match) {
            patternMatches.push({
              category,
              patternIndex: i,
              matchedContent: this.truncate(match[0], 50),
              path,
            });
          }
        }
      }
    }

    if (patternMatches.length > 0) {
      return {
        status: SentinelStatus.BLOCK,
        reason: BlockReason.MALICIOUS_PATTERN,
        message: `Found ${patternMatches.length} malicious pattern(s)`,
        timestamp,
        durationMs: performance.now() - startTime,
        patternMatches,
      };
    }

    return {
      status: SentinelStatus.PASS,
      message: 'No malicious patterns detected',
      timestamp,
      durationMs: performance.now() - startTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURE CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check structural constraints (depth, array/string length)
   */
  checkStructure(input: SentinelInput): CheckResult {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const violations: StructureViolation[] = [];

    this.checkStructureRecursive(input, '', 0, violations, new WeakSet());

    if (violations.length > 0) {
      const firstViolation = violations[0];
      return {
        status: SentinelStatus.BLOCK,
        reason: firstViolation.type,
        message: `Structure violation: ${firstViolation.type} at ${firstViolation.path || 'root'}`,
        timestamp,
        durationMs: performance.now() - startTime,
        structureViolations: violations,
      };
    }

    return {
      status: SentinelStatus.PASS,
      message: 'Structure validation passed',
      timestamp,
      durationMs: performance.now() - startTime,
    };
  }

  private checkStructureRecursive(
    value: SentinelInput,
    path: string,
    depth: number,
    violations: StructureViolation[],
    seen: WeakSet<object>
  ): void {
    // Check depth
    if (depth > this.config.maxDepth) {
      violations.push({
        type: BlockReason.MAX_DEPTH_EXCEEDED,
        path,
        actual: depth,
        limit: this.config.maxDepth,
      });
      return;
    }

    if (value === null || value === undefined) {
      return;
    }

    // Check string length
    if (typeof value === 'string') {
      if (value.length > this.config.maxStringLength) {
        violations.push({
          type: BlockReason.MAX_STRING_LENGTH_EXCEEDED,
          path,
          actual: value.length,
          limit: this.config.maxStringLength,
        });
      }
      return;
    }

    // Check array length and recurse
    if (Array.isArray(value)) {
      if (value.length > this.config.maxArrayLength) {
        violations.push({
          type: BlockReason.MAX_ARRAY_LENGTH_EXCEEDED,
          path,
          actual: value.length,
          limit: this.config.maxArrayLength,
        });
        return;
      }

      // Check for circular reference
      if (seen.has(value)) {
        violations.push({
          type: BlockReason.CIRCULAR_REFERENCE,
          path,
          actual: 0,
          limit: 0,
        });
        return;
      }
      seen.add(value);

      for (let i = 0; i < value.length; i++) {
        this.checkStructureRecursive(value[i], `${path}[${i}]`, depth + 1, violations, seen);
      }
      return;
    }

    // Check object
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      
      if (keys.length > this.config.maxObjectKeys) {
        violations.push({
          type: BlockReason.MAX_OBJECT_KEYS_EXCEEDED,
          path,
          actual: keys.length,
          limit: this.config.maxObjectKeys,
        });
        return;
      }

      // Check for circular reference
      if (seen.has(value)) {
        violations.push({
          type: BlockReason.CIRCULAR_REFERENCE,
          path,
          actual: 0,
          limit: 0,
        });
        return;
      }
      seen.add(value);

      for (const key of keys) {
        const newPath = path ? `${path}.${key}` : key;
        this.checkStructureRecursive((value as Record<string, JsonValue>)[key], newPath, depth + 1, violations, seen);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get SENTINEL report with statistics
   * INV-SEN-06: Report cohérent
   */
  getReport(): SentinelReport {
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      version: SENTINEL_VERSION,
      uptimeMs: Date.now() - this.startTime,
      overall: { ...this.stats.overall },
      byCheckType: {
        payloadSize: { ...this.stats.byCheckType.payloadSize },
        patterns: { ...this.stats.byCheckType.patterns },
        structure: { ...this.stats.byCheckType.structure },
      },
      byBlockReason: { ...this.stats.byBlockReason },
      byPatternCategory: { ...this.stats.byPatternCategory },
      recentBlocks: [...this.stats.recentBlocks],
      config: { ...this.config },
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initStats();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate deterministic hash of input
   * INV-SEN-04: Résultat déterministe
   */
  private calculateHash(input: SentinelInput): string {
    try {
      const str = JSON.stringify(input);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    } catch {
      return 'ffffffff';
    }
  }

  /**
   * Extract all strings from a value
   */
  private extractStrings(value: SentinelInput, path = ''): { value: string; path: string }[] {
    const strings: { value: string; path: string }[] = [];

    if (typeof value === 'string') {
      strings.push({ value, path });
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        strings.push(...this.extractStrings(value[i], `${path}[${i}]`));
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        const newPath = path ? `${path}.${key}` : key;
        strings.push(...this.extractStrings(val, newPath));
      }
    }

    return strings;
  }

  /**
   * Check if a pattern category is enabled
   */
  private isCategoryEnabled(category: string): boolean {
    switch (category) {
      case 'XSS': return this.config.enableXssCheck;
      case 'SQL_INJECTION': return this.config.enableSqlCheck;
      case 'COMMAND_INJECTION': return this.config.enableCommandCheck;
      case 'NOSQL_INJECTION': return this.config.enableNoSqlCheck;
      case 'TEMPLATE_INJECTION': return this.config.enableTemplateCheck;
      case 'PROTOTYPE_POLLUTION': return this.config.enablePrototypeCheck;
      default: return true;
    }
  }

  /**
   * Truncate string for safe logging
   */
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  /**
   * Update statistics after a check
   */
  private updateStats(
    status: SentinelStatus,
    checks: { payloadSize: CheckResult; patterns: CheckResult; structure: CheckResult },
    inputHash: string
  ): void {
    // Update overall stats
    this.stats.overall.total++;
    if (status === SentinelStatus.PASS) this.stats.overall.passed++;
    else if (status === SentinelStatus.BLOCK) this.stats.overall.blocked++;
    else this.stats.overall.warned++;

    // Update per-check stats
    for (const [type, result] of Object.entries(checks) as [keyof typeof checks, CheckResult][]) {
      this.stats.byCheckType[type].total++;
      if (result.status === SentinelStatus.PASS) this.stats.byCheckType[type].passed++;
      else if (result.status === SentinelStatus.BLOCK) this.stats.byCheckType[type].blocked++;
      else this.stats.byCheckType[type].warned++;

      // Update block reason stats
      if (result.reason) {
        this.stats.byBlockReason[result.reason]++;
      }

      // Update pattern category stats
      if (result.patternMatches) {
        for (const match of result.patternMatches) {
          this.stats.byPatternCategory[match.category] = 
            (this.stats.byPatternCategory[match.category] || 0) + 1;
        }
      }
    }

    // Track recent blocks
    if (status === SentinelStatus.BLOCK) {
      const firstBlockReason = Object.values(checks).find(c => c.reason)?.reason;
      if (firstBlockReason) {
        this.stats.recentBlocks.unshift({
          timestamp: new Date().toISOString(),
          reason: firstBlockReason,
          inputHash,
        });
        // Keep only last 100 blocks
        if (this.stats.recentBlocks.length > 100) {
          this.stats.recentBlocks.pop();
        }
      }
    }
  }

  /**
   * Build summary message
   */
  private buildSummary(
    status: SentinelStatus,
    checks: { payloadSize: CheckResult; patterns: CheckResult; structure: CheckResult }
  ): string {
    if (status === SentinelStatus.PASS) {
      return 'All security checks passed';
    }

    const failures = Object.entries(checks)
      .filter(([, result]) => result.status !== SentinelStatus.PASS)
      .map(([type, result]) => `${type}: ${result.reason || result.status}`);

    return `Security check failed: ${failures.join(', ')}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): SentinelConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SentinelConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

/** Default SENTINEL instance */
export const sentinel = new Sentinel();

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Quick check using default sentinel */
export const check = (input: SentinelInput): SentinelResult => sentinel.check(input);

/** Check payload size using default sentinel */
export const checkPayloadSize = (input: SentinelInput): CheckResult => sentinel.checkPayloadSize(input);

/** Check patterns using default sentinel */
export const checkPatterns = (input: SentinelInput): CheckResult => sentinel.checkPatterns(input);

/** Check structure using default sentinel */
export const checkStructure = (input: SentinelInput): CheckResult => sentinel.checkStructure(input);

/** Get report using default sentinel */
export const getReport = (): SentinelReport => sentinel.getReport();
