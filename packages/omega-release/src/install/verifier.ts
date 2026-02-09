/**
 * OMEGA Release — Install Verifier
 * Phase G.0 — Verify checksum before install
 */

import { existsSync, readFileSync } from 'node:fs';
import { sha256File, parseChecksumFile } from '../release/hasher.js';
import { basename } from 'node:path';

export interface VerifyResult {
  readonly verified: boolean;
  readonly expected: string;
  readonly actual: string;
  readonly filename: string;
}

/** Verify archive checksum against checksums file */
export function verifyArchive(archivePath: string, checksumFilePath: string): VerifyResult {
  const filename = basename(archivePath);

  if (!existsSync(archivePath)) {
    return { verified: false, expected: '', actual: '', filename };
  }

  if (!existsSync(checksumFilePath)) {
    return { verified: false, expected: 'NO_CHECKSUM_FILE', actual: '', filename };
  }

  const checksumContent = readFileSync(checksumFilePath, 'utf-8');
  const checksums = parseChecksumFile(checksumContent);
  const expected = checksums.get(filename);

  if (!expected) {
    return { verified: false, expected: 'NOT_IN_CHECKSUMS', actual: '', filename };
  }

  const actual = sha256File(archivePath);
  return { verified: expected === actual, expected, actual, filename };
}

/** Verify a single file's hash */
export function verifySingleFile(filepath: string, expectedHash: string): VerifyResult {
  const filename = basename(filepath);
  if (!existsSync(filepath)) {
    return { verified: false, expected: expectedHash, actual: '', filename };
  }
  const actual = sha256File(filepath);
  return { verified: expectedHash === actual, expected: expectedHash, actual, filename };
}
