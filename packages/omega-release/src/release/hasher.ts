/**
 * OMEGA Release — Hasher
 * Phase G.0 — Generate SHA-256/512 checksums
 *
 * INV-G0-04: CHECKSUM_VALID
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/** Compute SHA-256 of a file */
export function sha256File(filepath: string): string {
  const content = readFileSync(filepath);
  return createHash('sha256').update(content).digest('hex');
}

/** Compute SHA-512 of a file */
export function sha512File(filepath: string): string {
  const content = readFileSync(filepath);
  return createHash('sha512').update(content).digest('hex');
}

/** Compute SHA-256 of a string */
export function sha256String(input: string): string {
  return createHash('sha256').update(input, 'utf-8').digest('hex');
}

/** Generate checksums file for multiple artifacts */
export function generateChecksumFile(
  artifacts: readonly { filename: string; sha256: string }[],
): string {
  return artifacts.map((a) => `${a.sha256}  ${a.filename}`).join('\n') + '\n';
}

/** Write checksums to file */
export function writeChecksumFile(
  outputPath: string,
  artifacts: readonly { filename: string; sha256: string }[],
): void {
  const content = generateChecksumFile(artifacts);
  writeFileSync(outputPath, content, 'utf-8');
}

/** Verify a checksum against expected */
export function verifyChecksum(filepath: string, expectedSha256: string): boolean {
  if (!existsSync(filepath)) return false;
  const actual = sha256File(filepath);
  return actual === expectedSha256;
}

/** Parse checksums file */
export function parseChecksumFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.trim().split('\n')) {
    const match = /^([a-f0-9]{64})\s+(.+)$/.exec(line.trim());
    if (match) {
      map.set(match[2], match[1]);
    }
  }
  return map;
}
