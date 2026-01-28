/**
 * OMEGA Capsule Extractor
 * Phase M - Secure extraction to temp directory
 */
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';

export interface ExtractionResult {
  success: boolean;
  extractedPath: string | null;
  error: string | null;
}

/**
 * Creates a secure temp directory for extraction.
 */
export function createSecureTempDir(): string {
  const randomSuffix = randomBytes(8).toString('hex');
  const tempDir = join(tmpdir(), `omega-verify-${randomSuffix}`);

  mkdirSync(tempDir, { recursive: true });

  return tempDir;
}

/**
 * Cleans up temp directory.
 */
export function cleanupTempDir(tempDir: string): void {
  if (existsSync(tempDir) && tempDir.includes('omega-verify-')) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Extracts a capsule zip to temp directory.
 * Uses system unzip or PowerShell for extraction.
 */
export async function extractCapsule(
  zipPath: string,
  targetDir: string
): Promise<ExtractionResult> {
  try {
    if (!existsSync(zipPath)) {
      return { success: false, extractedPath: null, error: 'Zip file not found' };
    }

    // Use PowerShell on Windows, unzip on Unix
    if (process.platform === 'win32') {
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`,
        { stdio: 'pipe' }
      );
    } else {
      execSync(`unzip -q "${zipPath}" -d "${targetDir}"`, { stdio: 'pipe' });
    }

    return {
      success: true,
      extractedPath: targetDir,
      error: null,
    };
  } catch (e) {
    return {
      success: false,
      extractedPath: null,
      error: (e as Error).message,
    };
  }
}
