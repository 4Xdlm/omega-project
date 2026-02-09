/**
 * OMEGA Release — Self-Test Types
 * Phase G.0
 */

export type CheckId = 'VERSION' | 'HASH_ENGINE' | 'MODULES' | 'CLI' | 'INTEGRITY';

export type CheckStatus = 'PASS' | 'FAIL' | 'SKIP' | 'WARN';

export interface TestCheck {
  readonly id: CheckId;
  readonly name: string;
  readonly status: CheckStatus;
  readonly message?: string;
  readonly duration_ms: number;
  readonly details?: Record<string, unknown>;
}

export interface SelfTestResult {
  readonly timestamp: string;
  readonly version: string;
  readonly platform: string;
  readonly checks: readonly TestCheck[];
  readonly verdict: 'PASS' | 'FAIL';
  readonly duration_ms: number;
}
