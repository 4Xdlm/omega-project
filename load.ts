// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — LOAD PIPELINE
// Version: 1.1
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { OmegaIO } from './io';
import { OmegaProject, OmegaProjectSchema, PROJECT_FILENAME, BACKUP_SUFFIX } from './types';
import { verifyIntegrity } from './integrity';
import { validateInvariants } from './invariants';
import { projectNotFound, corruptedData, integrityCheckFailed } from './errors';

/**
 * Options de chargement
 */
export interface LoadOptions {
  /**
   * Si true, vérifie l'integrity SHA-256
   * Défaut: true
   */
  verifyIntegrity?: boolean;
  
  /**
   * Si true, valide les invariants métier
   * Défaut: true
   */
  validateInvariants?: boolean;
  
  /**
   * Si true, tente de charger la backup si le fichier principal est corrompu
   * Défaut: true
   */
  tryBackupOnFailure?: boolean;
}

/**
 * Résultat de chargement
 */
export interface LoadResult {
  project: OmegaProject;
  fromBackup: boolean;
  integrityValid: boolean;
}

/**
 * Charge un projet avec le pipeline blindé 11 étapes.
 * 
 * PIPELINE :
 * 1. Vérifier que le fichier existe
 * 2. Lire le contenu
 * 3. Parser le JSON
 * 4. Valider la structure (Zod)
 * 5. Valider les invariants métier
 * 6. Vérifier l'integrity SHA-256
 * 7. Si échec et backup disponible : tenter backup
 * 8. Valider le projet chargé
 * 9. Retourner le projet
 * 
 * @param io Interface IO
 * @param projectRoot Racine du projet
 * @param options Options de chargement
 * @returns Résultat de chargement
 */
export async function loadProject(
  io: OmegaIO,
  projectRoot: string,
  options: LoadOptions = {}
): Promise<LoadResult> {
  const {
    verifyIntegrity: shouldVerifyIntegrity = true,
    validateInvariants: shouldValidateInvariants = true,
    tryBackupOnFailure = true
  } = options;
  
  const filePath = PROJECT_FILENAME;
  const backupPath = PROJECT_FILENAME + BACKUP_SUFFIX;
  
  // ─── TENTATIVE DE CHARGEMENT PRINCIPAL ───
  try {
    return await loadFromPath(
      io, 
      projectRoot, 
      filePath, 
      shouldVerifyIntegrity, 
      shouldValidateInvariants
    );
  } catch (primaryError: any) {
    // ─── ÉCHEC : Tenter backup si disponible ───
    if (tryBackupOnFailure) {
      const backupExists = await io.exists(projectRoot, backupPath);
      if (backupExists) {
        try {
          const result = await loadFromPath(
            io,
            projectRoot,
            backupPath,
            shouldVerifyIntegrity,
            shouldValidateInvariants
          );
          return {
            ...result,
            fromBackup: true
          };
        } catch (backupError) {
          // Backup aussi corrompue, relancer l'erreur principale
          throw primaryError;
        }
      }
    }
    
    // Pas de backup ou backup désactivée, relancer l'erreur
    throw primaryError;
  }
}

/**
 * Charge un projet depuis un chemin spécifique.
 * 
 * @param io Interface IO
 * @param projectRoot Racine du projet
 * @param filePath Chemin du fichier à charger
 * @param shouldVerifyIntegrity Si true, vérifie SHA-256
 * @param shouldValidateInvariants Si true, valide les invariants
 * @returns Résultat de chargement
 */
async function loadFromPath(
  io: OmegaIO,
  projectRoot: string,
  filePath: string,
  shouldVerifyIntegrity: boolean,
  shouldValidateInvariants: boolean
): Promise<LoadResult> {
  // ─── ÉTAPE 1: Vérifier que le fichier existe ───
  const exists = await io.exists(projectRoot, filePath);
  if (!exists) {
    throw projectNotFound(projectRoot);
  }
  
  // ─── ÉTAPE 2: Lire le contenu ───
  const content = await io.readFile(projectRoot, filePath);
  
  // ─── ÉTAPE 3: Parser le JSON ───
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (error: any) {
    throw corruptedData(`Invalid JSON in ${filePath}: ${error.message}`);
  }
  
  // ─── ÉTAPE 4: Valider la structure (Zod) ───
  let project: OmegaProject;
  try {
    project = OmegaProjectSchema.parse(parsed);
  } catch (error: any) {
    throw corruptedData(`Invalid project structure in ${filePath}: ${error.message}`);
  }
  
  // ─── ÉTAPE 5: Valider les invariants ───
  if (shouldValidateInvariants) {
    try {
      validateInvariants(project);
    } catch (error: any) {
      throw corruptedData(`Invariant violation in ${filePath}: ${error.message}`);
    }
  }
  
  // ─── ÉTAPE 6: Vérifier l'integrity ───
  let integrityValid = true;
  if (shouldVerifyIntegrity) {
    integrityValid = verifyIntegrity(project);
    if (!integrityValid) {
      throw integrityCheckFailed('SHA-256 hash mismatch');
    }
  }
  
  // ─── ÉTAPE 7-9: Retourner le projet ───
  return {
    project,
    fromBackup: false,
    integrityValid
  };
}

/**
 * Charge un projet rapidement (avec toutes les vérifications).
 * 
 * @param io Interface IO
 * @param projectRoot Racine du projet
 * @returns Le projet chargé
 */
export async function quickLoad(
  io: OmegaIO,
  projectRoot: string
): Promise<OmegaProject> {
  const result = await loadProject(io, projectRoot);
  return result.project;
}

/**
 * Charge un projet sans vérifications (DANGEREUX - pour debug uniquement).
 * 
 * @param io Interface IO
 * @param projectRoot Racine du projet
 * @returns Le projet chargé
 */
export async function unsafeLoad(
  io: OmegaIO,
  projectRoot: string
): Promise<OmegaProject> {
  const result = await loadProject(io, projectRoot, {
    verifyIntegrity: false,
    validateInvariants: false,
    tryBackupOnFailure: false
  });
  return result.project;
}
