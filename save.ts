// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — SAVE (Atomic Persistence)
// Version: 1.3 (any types corrected)
// Date: 04 février 2026
// ═══════════════════════════════════════════════════════════════════════════

import { ioError, invalidSchema } from './errors';
import type { NodeIO } from './node_io';
import { attachIntegrity } from './integrity';
import { acquireLock, releaseLock } from './lock_manager';
import { OmegaProjectSchema } from './types';
import type { OmegaProject } from './types';

const PROJECT_FILE = 'omega.json';
const LOCK_TTL_MS = 5000; // 5 secondes

interface SaveProjectOptions {
  validateBeforeSave?: boolean;
}

/**
 * Sauvegarde un projet OMEGA de manière atomique
 * 
 * DUAL SIGNATURE:
 * - saveProject(io, projectRoot, project) → mode standard
 * - saveProject(io, project, options) → mode avec validation
 */
export async function saveProject(
  io: NodeIO,
  projectRootOrProject: string | OmegaProject,
  projectOrOptions?: OmegaProject | SaveProjectOptions
): Promise<void> {
  // Déterminer la signature
  let projectRoot: string;
  let data: OmegaProject;
  let options: SaveProjectOptions = {};
  
  if (typeof projectRootOrProject === 'string') {
    // Signature standard: (io, projectRoot, project)
    projectRoot = projectRootOrProject;
    data = projectOrOptions as OmegaProject;
  } else {
    // Signature avec options: (io, project, options)
    data = projectRootOrProject;
    options = (projectOrOptions as SaveProjectOptions) || {};
    
    // Extraire projectRoot depuis io
    if ('baseRoot' in io && typeof (io as Record<string, unknown>).baseRoot === 'string') {
      projectRoot = (io as Record<string, unknown>).baseRoot as string;
    } else {
      projectRoot = '.';
    }
  }
  
  // Validation si demandée
  if (options.validateBeforeSave) {
    try {
      OmegaProjectSchema.parse(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw invalidSchema(message);
    }
  }
  
  let lockId: string | null = null;

  try {
    // 1. Verrouillage
    try {
      await acquireLock(projectRoot, { ttlMs: LOCK_TTL_MS, stealStale: true });
      lockId = 'acquired'; // Flag pour indiquer que le lock a été acquis
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message && (message.includes('LOCKED') || message.includes('EXISTS'))) {
         throw ioError("Cannot save: System is locked by another operation.");
      }
      throw err;
    }

    if (!lockId) {
       throw ioError("Cannot save: System is locked by another operation.");
    }

    // 2. Calcul intégrité + Écriture atomique
    // Retirer l'ancienne integrity (si présente) pour recalculer proprement
    const { integrity, ...dataWithoutIntegrity } = data as OmegaProject & { integrity?: unknown };
    
    // Calculer nouvelle integrity
    const dataWithIntegrity = attachIntegrity(dataWithoutIntegrity);
    
    // Écriture atomique avec fichier temp UNIQUE (évite race conditions)
    const jsonContent = JSON.stringify(dataWithIntegrity, null, 2);
    const { randomUUID } = await import('crypto');
    const tempFile = `${PROJECT_FILE}.${randomUUID()}.tmp`; // Unique par opération
    
    try {
      await io.writeFile(projectRoot, tempFile, jsonContent);
      await io.rename(projectRoot, tempFile, PROJECT_FILE);
    } catch (err) {
      // Cleanup du temp file en cas d'erreur
      try {
        await io.remove(projectRoot, tempFile);
      } catch {}
      throw err;
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message && message.includes("System is locked")) throw err;
    
    const code = (err as { code?: string }).code;
    if (code) throw err;
    
    throw ioError(`Failed to save project: ${message}`, err instanceof Error ? err : new Error(String(err)));
  } finally {
    // 4. Nettoyage
    if (lockId) {
      try {
        await releaseLock(projectRoot);
      } catch {
        // Ignore
      }
    }
  }
}
