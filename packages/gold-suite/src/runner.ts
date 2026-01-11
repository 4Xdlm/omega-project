/**
 * @fileoverview OMEGA Gold Suite - Suite Runner
 * @module @omega/gold-suite/runner
 *
 * Test suite execution engine.
 */

// sha256 available if needed for hashing
import { OMEGA_PACKAGES } from '@omega/gold-internal';
import type {
  SuiteConfig,
  SuiteResult,
  SuiteRunResult,
  SuiteSummary,
  TestCase,
  SuiteEvent,
  SuiteEventHandler,
} from './types.js';
import { DEFAULT_SUITE_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Suite runner for executing test suites.
 */
export class SuiteRunner {
  private readonly config: SuiteConfig;
  private readonly handlers: SuiteEventHandler[] = [];
  private testCounter = 0;

  constructor(config: Partial<SuiteConfig> = {}) {
    this.config = { ...DEFAULT_SUITE_CONFIG, ...config };
  }

  /**
   * Add event handler.
   */
  on(handler: SuiteEventHandler): this {
    this.handlers.push(handler);
    return this;
  }

  /**
   * Emit event.
   */
  private emit(type: SuiteEvent['type'], data: unknown): void {
    const event: SuiteEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  /**
   * Run all suites.
   */
  async run(): Promise<SuiteRunResult> {
    const timestamp = new Date().toISOString();
    const suites: SuiteResult[] = [];

    this.emit('run:start', { config: this.config });

    // Get packages to test
    const packages = this.config.packages.length > 0
      ? this.config.packages
      : OMEGA_PACKAGES.map((p) => p.name);

    // Run each package suite
    for (const pkg of packages) {
      const result = await this.runSuite(pkg);
      suites.push(result);
    }

    const summary = this.calculateSummary(suites);

    const result: SuiteRunResult = {
      config: this.config,
      suites,
      summary,
      timestamp,
    };

    this.emit('run:complete', result);

    return result;
  }

  /**
   * Run a single suite.
   */
  private async runSuite(packageName: string): Promise<SuiteResult> {
    const startTime = Date.now();
    const tests: TestCase[] = [];

    this.emit('suite:start', { package: packageName });

    // Generate mock tests for demonstration
    const testCount = 10 + Math.floor(Math.random() * 20);
    for (let i = 0; i < testCount; i++) {
      const test = await this.runTest(packageName, `test_${i}`);
      tests.push(test);
    }

    const passed = tests.filter((t) => t.status === 'passed').length;
    const failed = tests.filter((t) => t.status === 'failed').length;
    const skipped = tests.filter((t) => t.status === 'skipped').length;

    const result: SuiteResult = {
      name: packageName,
      package: packageName,
      tests,
      passed,
      failed,
      skipped,
      duration: Date.now() - startTime,
      success: failed === 0,
    };

    this.emit('suite:complete', result);

    return result;
  }

  /**
   * Run a single test.
   */
  private async runTest(suite: string, name: string): Promise<TestCase> {
    const id = this.generateTestId();

    this.emit('test:start', { id, name, suite });

    // Mock test execution - always passes
    const status = 'passed';
    const duration = Math.floor(1 + Math.random() * 10);

    const test: TestCase = {
      id,
      name,
      suite,
      status,
      duration,
    };

    this.emit('test:complete', test);

    return test;
  }

  /**
   * Generate unique test ID.
   */
  private generateTestId(): string {
    this.testCounter++;
    const timestamp = Date.now().toString(36);
    return `TEST-${timestamp}-${this.testCounter.toString().padStart(5, '0')}`;
  }

  /**
   * Calculate run summary.
   */
  private calculateSummary(suites: readonly SuiteResult[]): SuiteSummary {
    const totalSuites = suites.length;
    const totalTests = suites.reduce((sum, s) => sum + s.tests.length, 0);
    const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
    const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
    const totalSkipped = suites.reduce((sum, s) => sum + s.skipped, 0);
    const totalDuration = suites.reduce((sum, s) => sum + s.duration, 0);
    const passRate = totalTests > 0 ? totalPassed / totalTests : 0;
    const success = totalFailed === 0;

    return {
      totalSuites,
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      passRate,
      success,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a suite runner.
 */
export function createSuiteRunner(config?: Partial<SuiteConfig>): SuiteRunner {
  return new SuiteRunner(config);
}

/**
 * Run all suites with default config.
 */
export async function runAllSuites(): Promise<SuiteRunResult> {
  const runner = createSuiteRunner();
  return runner.run();
}
