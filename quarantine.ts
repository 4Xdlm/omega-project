// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — QUARANTINE
// Version: 1.3 (Dual-mode: memory + disk)
// Date: 21 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import type { OmegaIO } from './io';
import { CanonError, CanonErrorCode } from './errors';
import { QUARANTINE_DIR } from './types';

interface QuarantineMetadata {
  quarantineId: string;
  originalPath: string;
  timestamp?: number;
  quarantinedAt?: number;
  reason?: string;
}

// Stockage en mémoire pour mode simple (scopé par root)
const memoryStores = new Map<string, Map<string, QuarantineMetadata>>();

function getMemoryStore(root: string): Map<string, QuarantineMetadata> {
  if (!memoryStores.has(root)) {
    memoryStores.set(root, new Map());
  }
  return memoryStores.get(root)!;
}

/**
 * Déplace un fichier en quarantaine
 * 
 * DUAL MODE:
 * - Mode simple (root, file, reason) → stockage mémoire, retourne ID
 * - Mode IO (io, projectRoot, file) → stockage disque, retourne metadata
 */
export async function quarantineFile(
  ioOrRoot: OmegaIO | string,
  projectRootOrPath: string,
  filePathOrReason?: string
): Promise<QuarantineMetadata | string> {
  const isSimpleMode = typeof ioOrRoot === 'string';
  
  if (isSimpleMode) {
    // ─── MODE SIMPLE (mémoire) ───
    const root = ioOrRoot as string;
    const filePath = projectRootOrPath;
    const reason = filePathOrReason;
    
    const store = getMemoryStore(root);
    const id = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: QuarantineMetadata = {
      quarantineId: id,
      originalPath: filePath,
      timestamp: Date.now(),
      quarantinedAt: Date.now(),
      reason
    };
    
    store.set(id, metadata);
    return id;
    
  } else {
    // ─── MODE IO (disque) ───
    const io = ioOrRoot as OmegaIO;
    const projectRoot = projectRootOrPath;
    const filePath = filePathOrReason!;
    
    const id = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: QuarantineMetadata = {
      quarantineId: id,
      originalPath: filePath,
      timestamp: Date.now(),
      quarantinedAt: Date.now()
    };
    
    // Créer répertoire quarantine
    try {
      await io.mkdir(projectRoot, QUARANTINE_DIR, true);
    } catch (e) {
      // Existe déjà
    }
    
    // Écrire meta.json
    const metaFilename = `${id}.meta.json`;
    await io.writeFile(
      projectRoot, 
      `${QUARANTINE_DIR}/${metaFilename}`, 
      JSON.stringify(metadata, null, 2)
    );
    
    return metadata;
  }
}

/**
 * Récupère les metadata d'un fichier en quarantaine
 * 
 * DUAL MODE:
 * - (root, id) → mémoire
 * - (io, projectRoot, id) → disque
 */
export async function getQuarantineFile(
  ioOrRoot: OmegaIO | string,
  projectRootOrId: string,
  id?: string
): Promise<QuarantineMetadata | null> {
  if (id) {
    // ─── MODE IO (disque) ───
    const io = ioOrRoot as OmegaIO;
    const projectRoot = projectRootOrId;
    
    try {
      const metaFilename = `${id}.meta.json`;
      const content = await io.readFile(projectRoot, `${QUARANTINE_DIR}/${metaFilename}`);
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
    
  } else {
    // ─── MODE SIMPLE (mémoire) ───
    const root = typeof ioOrRoot === 'string' ? ioOrRoot : '';
    const actualId = projectRootOrId;
    
    if (!root) return null;
    
    const store = getMemoryStore(root);
    return store.get(actualId) || null;
  }
}

/**
 * Liste tous les fichiers en quarantaine
 * 
 * DUAL MODE:
 * - (root) → mémoire
 * - (io, projectRoot) → disque
 */
export async function listQuarantineFiles(
  ioOrRoot?: OmegaIO | string,
  projectRoot?: string
): Promise<string[]> {
  if (typeof ioOrRoot === 'string') {
    // ─── MODE SIMPLE (mémoire) ───
    const root = ioOrRoot;
    const store = getMemoryStore(root);
    return Array.from(store.keys());
    
  } else if (ioOrRoot && projectRoot) {
    // ─── MODE IO (disque) ───
    const io = ioOrRoot;
    
    try {
      const files = await io.readDir(projectRoot, QUARANTINE_DIR);
      return files
        .filter(f => f.endsWith('.meta.json'))
        .map(f => f.replace('.meta.json', ''));
    } catch (e) {
      return [];
    }
  }
  
  return [];
}

/**
 * Compte les fichiers en quarantaine
 */
export async function countQuarantineFiles(
  ioOrRoot?: OmegaIO | string,
  projectRoot?: string
): Promise<number> {
  const list = await listQuarantineFiles(ioOrRoot, projectRoot);
  return list.length;
}

/**
 * Nettoie les anciens fichiers en quarantaine
 * 
 * DUAL MODE:
 * - (root, olderThanMs) → mémoire
 * - (io, projectRoot, olderThanMs) → disque
 */
export async function cleanOldQuarantineFiles(
  ioOrRoot?: OmegaIO | string,
  projectRootOrOlderThan?: string | number,
  olderThanMs?: number
): Promise<number> {
  if (typeof ioOrRoot === 'string') {
    // ─── MODE SIMPLE (mémoire) ───
    const root = ioOrRoot;
    const cutoffMs = typeof projectRootOrOlderThan === 'number' ? projectRootOrOlderThan : 24 * 60 * 60 * 1000;
    
    const store = getMemoryStore(root);
    const cutoff = Date.now() - cutoffMs;
    let cleaned = 0;
    
    for (const [id, metadata] of store.entries()) {
      const timestamp = metadata.quarantinedAt || metadata.timestamp || 0;
      const shouldClean = cutoffMs === 0 ? true : timestamp < cutoff;
      
      if (shouldClean) {
        store.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
    
  } else if (ioOrRoot && typeof projectRootOrOlderThan === 'string') {
    // ─── MODE IO (disque) ───
    const io = ioOrRoot;
    const projectRoot = projectRootOrOlderThan;
    const cutoffMs = typeof olderThanMs === 'number' ? olderThanMs : 24 * 60 * 60 * 1000;
    
    let files: string[];
    try {
      files = await io.readDir(projectRoot, QUARANTINE_DIR);
    } catch (e) {
      return 0;
    }
    
    const cutoff = Date.now() - cutoffMs;
    let cleaned = 0;
    
    for (const file of files) {
      if (!file.endsWith('.meta.json')) continue;
      
      try {
        const content = await io.readFile(projectRoot, `${QUARANTINE_DIR}/${file}`);
        const metadata = JSON.parse(content);
        const timestamp = metadata.quarantinedAt || metadata.timestamp || 0;
        
        if (timestamp < cutoff) {
          await io.delete(projectRoot, `${QUARANTINE_DIR}/${file}`);
          cleaned++;
        }
      } catch (e) {
        continue;
      }
    }
    
    return cleaned;
  }
  
  return 0;
}

/**
 * Restaure un fichier depuis la quarantaine
 */
export async function restoreQuarantineFile(
  io: OmegaIO,
  projectRoot: string,
  quarantineId: string
): Promise<void> {
  const metadata = await getQuarantineFile(io, projectRoot, quarantineId);
  if (!metadata) {
    throw new CanonError(
      CanonErrorCode.FILE_NOT_FOUND,
      `Quarantine file not found: ${quarantineId}`
    );
  }
  
  await io.delete(projectRoot, `${QUARANTINE_DIR}/${quarantineId}.meta.json`);
}

