// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — INTEGRITY VERIFICATION
// Version: 1.2
// Date: 28 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { OmegaProject, ProjectWithoutIntegrity, Integrity } from './types';

/**
 * Calcule le hash SHA-256 d'un projet (sans le bloc integrity).
 */
export function computeHash(project: OmegaProject | ProjectWithoutIntegrity): string {
  const projectWithoutIntegrity: ProjectWithoutIntegrity =
    'integrity' in project
      ? { ...project, integrity: undefined } as any
      : project;

  const clean: ProjectWithoutIntegrity = {
    schema_version: projectWithoutIntegrity.schema_version,
    meta: projectWithoutIntegrity.meta,
    state: projectWithoutIntegrity.state,
    runs: projectWithoutIntegrity.runs
  };

  const canonical = stringify(clean);
  const hash = createHash('sha256');
  hash.update(canonical, 'utf-8');
  return hash.digest('hex');
}

/**
 * Calcule le bloc integrity complet.
 */
export function computeIntegrity(project: ProjectWithoutIntegrity): Integrity {
  return {
    sha256: computeHash(project),
    computed_at: new Date().toISOString()
  };
}

/**
 * Verifie l'integrite d'un projet.
 */
export function verifyIntegrity(project: OmegaProject): boolean {
  const expectedHash = project.integrity.sha256;
  const actualHash = computeHash(project);
  return expectedHash === actualHash;
}

/**
 * Verifie l'integrite et retourne les details.
 */
export function verifyIntegrityDetailed(project: OmegaProject): {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
} {
  const expectedHash = project.integrity.sha256;
  const actualHash = computeHash(project);
  return {
    valid: expectedHash === actualHash,
    expectedHash,
    actualHash
  };
}

/**
 * Attache un bloc integrity a un projet.
 */
export function attachIntegrity(project: ProjectWithoutIntegrity): OmegaProject {
  const integrity = computeIntegrity(project);
  return {
    ...project,
    integrity
  } as OmegaProject;
}

// ═══════════════════════════════════════════════════════════════════
// FILE-BASED HELPERS (for tests and CLI) - Uses fs/promises directly
// ═══════════════════════════════════════════════════════════════════

/**
 * Lit un projet, calcule son integrite, et le reecrit signe.
 * Utilise fs/promises directement (pas NodeIO).
 */
export async function updateIntegrity(_io: unknown, projectRoot: string): Promise<void> {
  const filePath = join(projectRoot, 'omega.json');
  const raw = await readFile(filePath, 'utf-8');
  const project = JSON.parse(raw);
  const signed = attachIntegrity(project);
  await writeFile(filePath, JSON.stringify(signed, null, 2), 'utf-8');
}

/**
 * Lit un projet et verifie son integrite.
 * Utilise fs/promises directement (pas NodeIO).
 */
export async function verifyProjectIntegrity(_io: unknown, projectRoot: string): Promise<boolean> {
  const filePath = join(projectRoot, 'omega.json');
  const raw = await readFile(filePath, 'utf-8');
  const project = JSON.parse(raw);
  return verifyIntegrity(project);
}
