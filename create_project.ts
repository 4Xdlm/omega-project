// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — CREATE PROJECT
// Version: 1.1
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { OmegaIO } from './io';
import { NodeIO } from './node_io';
import { 
  OmegaProject, 
  CreateProjectOptions, 
  CURRENT_SCHEMA_VERSION,
  PROJECT_FILENAME,
  EVENTS_DIR,
  QUARANTINE_DIR,
  JOURNAL_DIR
} from './types';
import { attachIntegrity } from './integrity';
import { projectAlreadyExists } from './errors';

/**
 * Crée un nouveau projet OMEGA (surcharge sans IO).
 */
export async function createProject(projectRoot: string): Promise<OmegaProject>;
export async function createProject(
  io: OmegaIO,
  projectRoot: string,
  options: CreateProjectOptions
): Promise<OmegaProject>;
export async function createProject(
  ioOrRoot: OmegaIO | string,
  projectRootOrUndef?: string,
  options?: CreateProjectOptions
): Promise<OmegaProject> {
  // Déterminer la signature
  if (typeof ioOrRoot === 'string') {
    // Signature: (projectRoot)
    const io = new NodeIO();
    const projectRoot = ioOrRoot;
    const defaultOptions = { name: 'Omega Project', author: 'User' };
    return createProjectImpl(io, projectRoot, defaultOptions);
  } else {
    // Signature: (io, projectRoot, options)
    return createProjectImpl(ioOrRoot, projectRootOrUndef!, options!);
  }
}

/**
 * Implémentation réelle de createProject
 */
async function createProjectImpl(
  io: OmegaIO,
  projectRoot: string,
  options: CreateProjectOptions
): Promise<OmegaProject> {
  // ─── ÉTAPE 1: Vérifier que le projet n'existe pas ───
  const exists = await io.exists(projectRoot, PROJECT_FILENAME);
  if (exists) {
    throw projectAlreadyExists(projectRoot);
  }
  
  // ─── ÉTAPE 2: Créer les répertoires ───
  // Créer le répertoire racine (chemin absolu)
  await fs.promises.mkdir(projectRoot, { recursive: true });
  
  // Créer les sous-répertoires
  await io.mkdir(projectRoot, EVENTS_DIR, true);
  await io.mkdir(projectRoot, QUARANTINE_DIR, true);
  await io.mkdir(projectRoot, JOURNAL_DIR, true);
  
  // ─── ÉTAPE 3: Générer les métadonnées ───
  const now = new Date().toISOString();
  
  const projectWithoutIntegrity = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      id: randomUUID(),
      name: options.name,
      author: options.author,
      description: options.description,
      created_at: now,
      updated_at: now
    },
    state: options.initialState ?? {},
    runs: []
  };
  
  // ─── ÉTAPE 4: Calculer l'integrity ───
  const project = attachIntegrity(projectWithoutIntegrity);
  
  // ─── ÉTAPE 5: Écrire le fichier ───
  const content = JSON.stringify(project, null, 2);
  await io.writeFile(projectRoot, PROJECT_FILENAME, content);
  
  return project;
}

/**
 * Vérifie si un projet existe déjà.
 * 
 * @param io Interface IO
 * @param projectRoot Racine du projet
 * @returns true si le fichier project.omega.json existe
 */
export async function projectExists(
  io: OmegaIO,
  projectRoot: string
): Promise<boolean> {
  return io.exists(projectRoot, PROJECT_FILENAME);
}
