// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — INVARIANTS VALIDATION
// Version: 1.1
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { OmegaProject, CURRENT_SCHEMA_VERSION, EVENTS_DIR } from './types';
import { invariantViolated, versionMismatch } from './errors';

/**
 * Valide les invariants métier d'un projet.
 * Au-delà de la validation Zod (structure), vérifie la cohérence logique.
 * 
 * INVARIANTS :
 * I1: Schema version doit être 1.0.0
 * I2: meta.updated_at >= meta.created_at (temporalité)
 * I3: Tous les run_id sont uniques
 * I4: Tous les events_path commencent par "events/"
 * I5: Pas de path traversal dans events_path
 * I6: Tous les timestamps sont valides (peuvent être parsés)
 * 
 * @param project Le projet à valider
 * @throws CanonError si un invariant est violé
 */
export function validateInvariants(project: OmegaProject): void {
  const errors: string[] = [];
  
  // ─── I1: SCHEMA VERSION ───
  if (project.schema_version !== CURRENT_SCHEMA_VERSION) {
    throw versionMismatch(project.schema_version, CURRENT_SCHEMA_VERSION);
  }
  
  // ─── I2: TEMPORALITÉ ───
  // Comparer en epoch (millisecondes) pour éviter les problèmes de comparaison de strings
  const createdAt = Date.parse(project.meta.created_at);
  const updatedAt = Date.parse(project.meta.updated_at);
  
  if (isNaN(createdAt)) {
    errors.push(`Invalid meta.created_at: ${project.meta.created_at}`);
  }
  if (isNaN(updatedAt)) {
    errors.push(`Invalid meta.updated_at: ${project.meta.updated_at}`);
  }
  
  if (!isNaN(createdAt) && !isNaN(updatedAt) && updatedAt < createdAt) {
    errors.push(`meta.updated_at (${project.meta.updated_at}) is before meta.created_at (${project.meta.created_at})`);
  }
  
  // ─── I3, I4, I5, I6: RUNS ───
  const runIds = new Set<string>();
  
  for (const run of project.runs) {
    // I3: Run IDs uniques
    if (runIds.has(run.run_id)) {
      errors.push(`Duplicate run_id: ${run.run_id}`);
    }
    runIds.add(run.run_id);
    
    // I4: events_path commence par "events/"
    if (!run.events_path.startsWith(EVENTS_DIR + '/')) {
      errors.push(`Invalid events_path "${run.events_path}" - must start with "${EVENTS_DIR}/"`);
    }
    
    // I5: Pas de path traversal
    if (run.events_path.includes('..')) {
      errors.push(`Path traversal detected in events_path: ${run.events_path}`);
    }
    
    // I6: Timestamp valide
    const runTs = Date.parse(run.timestamp);
    if (isNaN(runTs)) {
      errors.push(`Invalid timestamp for run ${run.run_id}: ${run.timestamp}`);
    }
  }
  
  // ─── LANCER L'ERREUR SI VIOLATIONS ───
  if (errors.length > 0) {
    throw invariantViolated(`Project invariants violated (${errors.length} issues): ${errors.join('; ')}`);
  }
}

/**
 * Valide un projet complet (Zod + invariants + integrity).
 * 
 * @param project Le projet à valider
 * @param verifyIntegrity Si true, vérifie aussi le hash SHA-256
 * @throws CanonError si la validation échoue
 */
export async function validateProject(
  project: OmegaProject,
  verifyIntegrity: boolean = true
): Promise<void> {
  // 1. Validation Zod (structure)
  const { OmegaProjectSchema } = await import('./types');
  OmegaProjectSchema.parse(project);
  
  // 2. Validation invariants (logique métier)
  validateInvariants(project);
  
  // 3. Validation integrity (optionnel)
  if (verifyIntegrity) {
    const { verifyIntegrity: verify } = await import('./integrity');
    const valid = verify(project);
    if (!valid) {
      throw invariantViolated('Integrity check failed: SHA-256 hash mismatch');
    }
  }
}
