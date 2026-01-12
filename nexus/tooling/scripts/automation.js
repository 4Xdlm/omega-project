/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — AUTOMATION MODULE
 * Git hooks, file watcher, auto-seal capabilities
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module automation
 * @version 1.0.0
 */

import { existsSync, writeFileSync, readFileSync, mkdirSync, watch, chmodSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

import { getTimestamp, getDate } from './registry.js';
import { buildMerkleRoot, getFilesInScope } from './merkle.js';
import { validateBeforeSeal } from './guardian.js';
import { createSession, closeSession, createManifest, createSeal } from './seal.js';
import { verifyAtlas } from './atlas.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTOMATION_VERSION = '1.0.0';

export const HOOK_TYPES = {
  PRE_COMMIT: 'pre-commit',
  POST_COMMIT: 'post-commit',
  PRE_PUSH: 'pre-push'
};

export const WATCHER_EVENTS = {
  CHANGE: 'change',
  RENAME: 'rename'
};

// Debounce delay for watcher (ms)
export const WATCHER_DEBOUNCE = 2000;

// Auto-seal threshold (number of changes before auto-seal)
export const AUTO_SEAL_THRESHOLD = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// GIT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate pre-commit hook script
 * @param {string} baseDir - Base directory
 * @returns {string} Hook script content
 */
export function generatePreCommitHook(baseDir) {
  const toolingPath = join(baseDir, 'nexus', 'tooling');
  
  return `#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA NEXUS — Pre-commit Hook
# Validates nexus integrity before commit
# ═══════════════════════════════════════════════════════════════════════════════

echo "🔍 OMEGA NEXUS: Running pre-commit validation..."

# Run Guardian validation
cd "${toolingPath}"
node -e "
const { validateBeforeSeal } = require('./scripts/guardian.js');
const result = validateBeforeSeal('${baseDir}');
if (!result.valid) {
  console.error('❌ Guardian validation failed:');
  result.failures.slice(0, 5).forEach(f => {
    console.error('  File:', f.file);
    f.errors.forEach(e => console.error('    -', e.name + ':', e.message));
  });
  process.exit(1);
}
console.log('✅ Guardian validation passed:', result.summary.passed, 'checks');
"

if [ $? -ne 0 ]; then
  echo "❌ OMEGA NEXUS: Pre-commit validation failed"
  exit 1
fi

echo "✅ OMEGA NEXUS: Pre-commit validation passed"
exit 0
`;
}

/**
 * Generate post-commit hook script
 * @param {string} baseDir - Base directory
 * @returns {string} Hook script content
 */
export function generatePostCommitHook(baseDir) {
  return `#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA NEXUS — Post-commit Hook
# Creates seal after successful commit
# ═══════════════════════════════════════════════════════════════════════════════

echo "📦 OMEGA NEXUS: Creating post-commit seal..."

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

# Create seal via CLI
cd "${baseDir}"
node nexus/tooling/scripts/cli.js seal -m "Auto-seal: $COMMIT_MSG (commit: $COMMIT_HASH)"

if [ $? -eq 0 ]; then
  echo "✅ OMEGA NEXUS: Seal created successfully"
else
  echo "⚠️ OMEGA NEXUS: Seal creation failed (non-blocking)"
fi

exit 0
`;
}

/**
 * Generate pre-push hook script
 * @param {string} baseDir - Base directory
 * @returns {string} Hook script content
 */
export function generatePrePushHook(baseDir) {
  return `#!/bin/sh
# ═══════════════════════════════════════════════════════════════════════════════
# OMEGA NEXUS — Pre-push Hook
# Verifies integrity before push
# ═══════════════════════════════════════════════════════════════════════════════

echo "🔐 OMEGA NEXUS: Running pre-push verification..."

cd "${baseDir}"
node nexus/tooling/scripts/cli.js verify

if [ $? -ne 0 ]; then
  echo "❌ OMEGA NEXUS: Verification failed - push blocked"
  exit 1
fi

echo "✅ OMEGA NEXUS: Pre-push verification passed"
exit 0
`;
}

/**
 * Install git hooks
 * @param {string} baseDir - Base directory
 * @param {object} options - Options
 * @returns {object} Installation result
 */
export function installGitHooks(baseDir, options = {}) {
  const gitDir = join(baseDir, '.git');
  const hooksDir = join(gitDir, 'hooks');
  
  // Check if git repo exists
  if (!existsSync(gitDir)) {
    return {
      success: false,
      error: 'Not a git repository',
      installed: []
    };
  }
  
  // Create hooks directory if needed
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }
  
  const installed = [];
  const errors = [];
  
  // Install pre-commit
  if (options.preCommit !== false) {
    try {
      const hookPath = join(hooksDir, 'pre-commit');
      writeFileSync(hookPath, generatePreCommitHook(baseDir));
      try {
        chmodSync(hookPath, '755');
      } catch (e) {
        // Windows doesn't support chmod, ignore
      }
      installed.push('pre-commit');
    } catch (e) {
      errors.push({ hook: 'pre-commit', error: e.message });
    }
  }
  
  // Install post-commit
  if (options.postCommit !== false) {
    try {
      const hookPath = join(hooksDir, 'post-commit');
      writeFileSync(hookPath, generatePostCommitHook(baseDir));
      try {
        chmodSync(hookPath, '755');
      } catch (e) {
        // Windows doesn't support chmod, ignore
      }
      installed.push('post-commit');
    } catch (e) {
      errors.push({ hook: 'post-commit', error: e.message });
    }
  }
  
  // Install pre-push
  if (options.prePush !== false) {
    try {
      const hookPath = join(hooksDir, 'pre-push');
      writeFileSync(hookPath, generatePrePushHook(baseDir));
      try {
        chmodSync(hookPath, '755');
      } catch (e) {
        // Windows doesn't support chmod, ignore
      }
      installed.push('pre-push');
    } catch (e) {
      errors.push({ hook: 'pre-push', error: e.message });
    }
  }
  
  return {
    success: errors.length === 0,
    installed,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Uninstall git hooks
 * @param {string} baseDir - Base directory
 * @returns {object} Uninstallation result
 */
export function uninstallGitHooks(baseDir) {
  const hooksDir = join(baseDir, '.git', 'hooks');
  
  const removed = [];
  const hookNames = ['pre-commit', 'post-commit', 'pre-push'];
  
  for (const hook of hookNames) {
    const hookPath = join(hooksDir, hook);
    if (existsSync(hookPath)) {
      try {
        unlinkSync(hookPath);
        removed.push(hook);
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  return { removed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE WATCHER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a debounced function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Watcher state
 */
class WatcherState {
  constructor() {
    this.changes = [];
    this.lastSeal = null;
    this.isRunning = false;
    this.controller = null;
  }
  
  addChange(file, type) {
    this.changes.push({
      file,
      type,
      timestamp: getTimestamp()
    });
  }
  
  clearChanges() {
    this.changes = [];
  }
  
  getChangeCount() {
    return this.changes.length;
  }
}

/**
 * Create nexus watcher
 * @param {string} baseDir - Base directory
 * @param {object} options - Watcher options
 * @returns {object} Watcher control object
 */
export function createWatcher(baseDir, options = {}) {
  const nexusPath = join(baseDir, 'nexus');
  const state = new WatcherState();
  
  const threshold = options.threshold || AUTO_SEAL_THRESHOLD;
  const debounceDelay = options.debounce || WATCHER_DEBOUNCE;
  const onSeal = options.onSeal || (() => {});
  const onError = options.onError || console.error;
  
  // Auto-seal function
  const performAutoSeal = async () => {
    if (state.getChangeCount() === 0) return;
    
    try {
      // Validate first
      const validation = validateBeforeSeal(baseDir);
      if (!validation.valid) {
        onError('Auto-seal skipped: validation failed');
        return;
      }
      
      // Create seal
      const files = getFilesInScope(baseDir, ['*.LOCK', 'ATLAS-RUN.json']);
      const session = createSession({ baseDir, actor: 'watcher' });
      const manifest = createManifest({
        baseDir,
        session_id: session.id,
        files_in_scope: files
      });
      const rootHash = buildMerkleRoot(files, baseDir);
      const seal = createSeal({
        baseDir,
        manifest_id: manifest.id,
        session_id: session.id,
        root_hash: rootHash,
        sealed_by: 'auto-watcher',
        notes: `Auto-seal: ${state.getChangeCount()} changes detected`
      });
      closeSession(session.path, session.id);
      
      state.lastSeal = seal.id;
      state.clearChanges();
      
      onSeal(seal);
    } catch (e) {
      onError(`Auto-seal failed: ${e.message}`);
    }
  };
  
  // Debounced handler
  const handleChange = debounce((eventType, filename) => {
    if (!filename) return;
    
    // Ignore lock files and atlas run
    if (filename.includes('.LOCK') || filename.includes('ATLAS-RUN')) {
      return;
    }
    
    state.addChange(filename, eventType);
    
    // Check threshold
    if (state.getChangeCount() >= threshold) {
      performAutoSeal();
    }
  }, debounceDelay);
  
  // Create watcher
  let watcher = null;
  
  const start = () => {
    if (state.isRunning) return;
    
    try {
      watcher = watch(nexusPath, { recursive: true }, handleChange);
      state.isRunning = true;
    } catch (e) {
      onError(`Watcher start failed: ${e.message}`);
    }
  };
  
  const stop = () => {
    if (!state.isRunning || !watcher) return;
    
    watcher.close();
    state.isRunning = false;
  };
  
  const forceSeal = () => {
    performAutoSeal();
  };
  
  const getStatus = () => ({
    running: state.isRunning,
    pendingChanges: state.getChangeCount(),
    lastSeal: state.lastSeal,
    threshold
  });
  
  return {
    start,
    stop,
    forceSeal,
    getStatus
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED SEALING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schedule configuration
 */
export const SCHEDULE_INTERVALS = {
  HOURLY: 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000
};

/**
 * Create scheduled sealer
 * @param {string} baseDir - Base directory
 * @param {object} options - Schedule options
 * @returns {object} Scheduler control
 */
export function createScheduler(baseDir, options = {}) {
  const interval = options.interval || SCHEDULE_INTERVALS.DAILY;
  const onSeal = options.onSeal || (() => {});
  const onError = options.onError || console.error;
  const skipIfUnchanged = options.skipIfUnchanged !== false;
  
  let timerId = null;
  let lastRootHash = null;
  
  const performScheduledSeal = async () => {
    try {
      const files = getFilesInScope(baseDir, ['*.LOCK', 'ATLAS-RUN.json']);
      const currentHash = buildMerkleRoot(files, baseDir);
      
      // Skip if unchanged
      if (skipIfUnchanged && lastRootHash === currentHash) {
        return;
      }
      
      // Validate
      const validation = validateBeforeSeal(baseDir);
      if (!validation.valid) {
        onError('Scheduled seal skipped: validation failed');
        return;
      }
      
      // Create seal
      const session = createSession({ baseDir, actor: 'scheduler' });
      const manifest = createManifest({
        baseDir,
        session_id: session.id,
        files_in_scope: files
      });
      const seal = createSeal({
        baseDir,
        manifest_id: manifest.id,
        session_id: session.id,
        root_hash: currentHash,
        sealed_by: 'scheduler',
        notes: `Scheduled seal (interval: ${interval}ms)`
      });
      closeSession(session.path, session.id);
      
      lastRootHash = currentHash;
      onSeal(seal);
    } catch (e) {
      onError(`Scheduled seal failed: ${e.message}`);
    }
  };
  
  const start = () => {
    if (timerId) return;
    timerId = setInterval(performScheduledSeal, interval);
    // Run immediately on start
    performScheduledSeal();
  };
  
  const stop = () => {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
  };
  
  const forceRun = () => {
    lastRootHash = null; // Force seal even if unchanged
    performScheduledSeal();
  };
  
  return {
    start,
    stop,
    forceRun
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKUP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create nexus backup
 * @param {string} baseDir - Base directory
 * @param {string} backupDir - Backup directory
 * @returns {object} Backup result
 */
export function createBackup(baseDir, backupDir) {
  const timestamp = getTimestamp().replace(/[:-]/g, '').replace('T', '-').replace('Z', '');
  const backupName = `nexus-backup-${timestamp}`;
  const backupPath = join(backupDir, backupName);
  
  // Create backup directory
  mkdirSync(backupPath, { recursive: true });
  
  // Copy nexus directory
  const nexusPath = join(baseDir, 'nexus');
  
  try {
    // Use platform-appropriate copy command
    if (process.platform === 'win32') {
      execSync(`xcopy "${nexusPath}" "${backupPath}\\nexus" /E /I /H /Y`, { stdio: 'pipe' });
    } else {
      execSync(`cp -r "${nexusPath}" "${backupPath}/nexus"`, { stdio: 'pipe' });
    }
    
    // Create backup manifest
    const files = getFilesInScope(baseDir, ['*.LOCK']);
    const rootHash = buildMerkleRoot(files, baseDir);
    
    const manifest = {
      backup_version: '1.0.0',
      created_at: getTimestamp(),
      source: baseDir,
      root_hash: rootHash,
      file_count: files.length
    };
    
    writeFileSync(join(backupPath, 'BACKUP-MANIFEST.json'), JSON.stringify(manifest, null, 2));
    
    return {
      success: true,
      path: backupPath,
      manifest
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Verify backup integrity
 * @param {string} backupPath - Backup path
 * @returns {object} Verification result
 */
export function verifyBackup(backupPath) {
  const manifestPath = join(backupPath, 'BACKUP-MANIFEST.json');
  
  if (!existsSync(manifestPath)) {
    return {
      valid: false,
      error: 'Backup manifest not found'
    };
  }
  
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const nexusPath = join(backupPath, 'nexus');
    
    if (!existsSync(nexusPath)) {
      return {
        valid: false,
        error: 'Nexus directory not found in backup'
      };
    }
    
    // Recompute root hash
    const files = getFilesInScope(backupPath, ['*.LOCK']);
    const currentHash = buildMerkleRoot(files, backupPath);
    
    if (currentHash !== manifest.root_hash) {
      return {
        valid: false,
        error: 'Root hash mismatch',
        expected: manifest.root_hash,
        actual: currentHash
      };
    }
    
    return {
      valid: true,
      manifest
    };
  } catch (e) {
    return {
      valid: false,
      error: e.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  AUTOMATION_VERSION,
  HOOK_TYPES,
  WATCHER_EVENTS,
  SCHEDULE_INTERVALS,
  
  // Git hooks
  generatePreCommitHook,
  generatePostCommitHook,
  generatePrePushHook,
  installGitHooks,
  uninstallGitHooks,
  
  // Watcher
  createWatcher,
  
  // Scheduler
  createScheduler,
  
  // Backup
  createBackup,
  verifyBackup
};
