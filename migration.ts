import { ioError } from './errors';
import type { NodeIO } from './node_io';

export const CURRENT_OMEGA_VERSION = 1;
const PROJECT_FILE = 'omega.json';

export interface MigrationResult {
  success: boolean;
  initialVersion: number;
  finalVersion: number;
  migrated: boolean;
}

export interface ProjectData {
  version: number;
  name?: string;
  [key: string]: any;
}

/**
 * VÃƒÆ’Ã‚Â©rifie si une migration est nÃƒÆ’Ã‚Â©cessaire.
 */
export async function checkMigrationNeeded(
  io: NodeIO,
  projectRoot: string
): Promise<boolean> {
  try {
    // CORRECTION SIGNATURE : exists(root, relative)
    // On ne joint plus le chemin manuellement.
    if (!(await io.exists(projectRoot, PROJECT_FILE))) return false;

    // CORRECTION SIGNATURE : readFile(root, relative)
    const content = await io.readFile(projectRoot, PROJECT_FILE);
    const data = JSON.parse(content) as ProjectData;
    const version = data.version || 0;

    return version < CURRENT_OMEGA_VERSION;
  } catch (err) {
    // Si illisible ou erreur, on assume pas de migration auto possible
    return false;
  }
}

/**
 * ExÃƒÆ’Ã‚Â©cute la migration du projet vers la version actuelle.
 */
export async function migrateProject(
  io: NodeIO,
  projectRoot: string
): Promise<MigrationResult> {
  try {
    // 1. Lecture
    // CORRECTION SIGNATURE : exists(root, relative)
    if (!(await io.exists(projectRoot, PROJECT_FILE))) {
      throw ioError(`Project file missing: ${PROJECT_FILE}`);
    }
    
    // CORRECTION SIGNATURE : readFile(root, relative)
    const content = await io.readFile(projectRoot, PROJECT_FILE);
    let data: ProjectData;
    try {
      data = JSON.parse(content);
    } catch (e) {
      throw ioError("Invalid project file (JSON parse error)", e as Error);
    }

    const initialVersion = data.version || 0;

    // 2. Garde-fous Downgrade
    if (initialVersion > CURRENT_OMEGA_VERSION) {
      throw ioError(`Cannot migrate project from future version ${initialVersion} to current ${CURRENT_OMEGA_VERSION}`);
    }

    if (initialVersion === CURRENT_OMEGA_VERSION) {
      return {
        success: true,
        initialVersion,
        finalVersion: initialVersion,
        migrated: false
      };
    }

    // 3. Logique de migration v0 -> v1
    if (initialVersion < 1) {
       // Logique de patch future ici
    }

    // 4. Finalisation
    data.version = CURRENT_OMEGA_VERSION;

    // 5. ÃƒÆ’Ã¢â‚¬Â°criture Atomique
    // CORRECTION SIGNATURE : writeFile(root, relative, content)
    await io.writeFile(projectRoot, PROJECT_FILE, JSON.stringify(data, null, 2));

    return {
      success: true,
      initialVersion,
      finalVersion: CURRENT_OMEGA_VERSION,
      migrated: true
    };

  } catch (err: any) {
    if (err.code) throw err;
    throw ioError(`Migration failed: ${err.message}`, err);
  }
}