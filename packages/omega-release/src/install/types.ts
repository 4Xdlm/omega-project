/**
 * OMEGA Release — Install Types
 * Phase G.0
 */

export interface InstallConfig {
  readonly archivePath: string;
  readonly installDir: string;
  readonly skipVerify: boolean;
  readonly addToPath: boolean;
}

export interface InstallResult {
  readonly success: boolean;
  readonly installDir: string;
  readonly version: string;
  readonly checks: readonly InstallCheck[];
}

export interface InstallCheck {
  readonly name: string;
  readonly status: 'PASS' | 'FAIL' | 'SKIP';
  readonly message: string;
}
