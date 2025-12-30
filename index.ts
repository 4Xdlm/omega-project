// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — PUBLIC API
// Version: 1.0
// Date: 21 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

// ─── TYPES ───
export * from './types';
export * from './OMEGA_TYPES_UI';

// ─── ERRORS ───
export * from './errors';

// ─── INTEGRITY ───
export * from './integrity';

// ─── IO ───
export type { OmegaIO } from './io';
export { NodeIO } from './node_io';

// ─── PROJECT LIFECYCLE ───
export { createProject, projectExists } from './create_project';
export { loadProject } from './load';
export { saveProject } from './save';

// ─── VERSIONING ───
export { migrateProject, needsMigration } from './migration';

// ─── LOCKING ───
export { acquireLock, releaseLock, forceReleaseLock } from './lock_manager';

// ─── QUARANTINE ───
export {
  quarantineFile,
  getQuarantineFile,
  listQuarantineFiles,
  countQuarantineFiles,
  cleanOldQuarantineFiles,
  restoreQuarantineFile
} from './quarantine';

// ─── VALIDATION ───
export { validateInvariants, validateProject } from './invariants';

// ─── STORE (Mock version pour tests) ───
export { Store } from './store_mock';

// ─── FACTORY ───
import { NodeIO } from './node_io';
import { Store } from './store_mock';

export function createOmega(projectRoot: string): Store {
  const io = new NodeIO();
  return new Store(io, projectRoot);
}
