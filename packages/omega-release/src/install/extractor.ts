/**
 * OMEGA Release — Extractor
 * Phase G.0 — Extract archive
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ExtractResult {
  readonly success: boolean;
  readonly outputDir: string;
  readonly fileCount: number;
  readonly message: string;
}

/** Extract archive content (simulated — reads JSON manifest-based package) */
export function extractArchive(archivePath: string, outputDir: string): ExtractResult {
  if (!existsSync(archivePath)) {
    return { success: false, outputDir, fileCount: 0, message: `Archive not found: ${archivePath}` };
  }

  mkdirSync(outputDir, { recursive: true });

  const content = readFileSync(archivePath, 'utf-8');
  let parsed: { omega_version: string; files: string[] };

  try {
    parsed = JSON.parse(content);
  } catch {
    return { success: false, outputDir, fileCount: 0, message: 'Invalid archive format' };
  }

  // Write manifest to output dir
  writeFileSync(join(outputDir, 'MANIFEST.json'), content, 'utf-8');

  return {
    success: true,
    outputDir,
    fileCount: parsed.files?.length ?? 0,
    message: `Extracted ${parsed.omega_version} (${parsed.files?.length ?? 0} files)`,
  };
}
