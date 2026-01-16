#!/usr/bin/env node
/**
 * OMEGA Atlas Auto-Regeneration
 * @description Regenerates atlas metadata and computes canonical hashes
 * @version 3.93.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  version: '3.93.0',
  projectRoot: process.cwd(),
  atlasDir: 'nexus/atlas',
  atlasMetaFile: 'ATLAS-META.json',
  entitiesDir: 'nexus/entities',
  eventsDir: 'nexus/events'
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} AtlasMeta
 * @property {string} atlas_version
 * @property {Object} counts
 * @property {Object} entity_types
 * @property {Object} lifecycle_distribution
 * @property {Object} views
 */

/**
 * @typedef {Object} HashResult
 * @property {string} merkleRoot - Hash of all entity hashes
 * @property {string} atlasMetaHash - Hash of atlas-meta.json
 * @property {string[]} fileHashes - Individual file hashes
 */

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate SHA-256 hash of file
 * @param {string} filePath
 * @returns {string}
 */
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Calculate SHA-256 hash of string
 * @param {string} data
 * @returns {string}
 */
function hashString(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Calculate Merkle root from list of hashes
 * @param {string[]} hashes
 * @returns {string}
 */
function calculateMerkleRoot(hashes) {
  if (hashes.length === 0) {
    return hashString('');
  }
  if (hashes.length === 1) {
    return hashes[0];
  }

  // Sort for determinism
  const sortedHashes = [...hashes].sort();

  // Combine all hashes
  const combined = sortedHashes.join('');
  return hashString(combined);
}

/**
 * Recursively get all files in directory
 * @param {string} dir
 * @param {string[]} extensions
 * @returns {string[]}
 */
function getAllFiles(dir, extensions = ['.json', '.yaml', '.yml']) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      results.push(...getAllFiles(fullPath, extensions));
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Log message with timestamp
 * @param {string} message
 * @param {'info'|'success'|'error'|'warn'} level
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[37m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[level]}[${timestamp}] [ATLAS] ${message}${colors.reset}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS REGENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count entities by type from entities directory
 * @returns {Object}
 */
function countEntities() {
  const entitiesPath = path.join(CONFIG.projectRoot, CONFIG.entitiesDir);
  const files = getAllFiles(entitiesPath, ['.json']);

  const counts = {
    total: files.length,
    byType: {}
  };

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      const type = content.type || 'UNKNOWN';
      counts.byType[type] = (counts.byType[type] || 0) + 1;
    } catch {
      // Skip invalid files
    }
  }

  return counts;
}

/**
 * Count events from events directory
 * @returns {number}
 */
function countEvents() {
  const eventsPath = path.join(CONFIG.projectRoot, CONFIG.eventsDir);
  return getAllFiles(eventsPath, ['.json', '.yaml', '.yml']).length;
}

/**
 * Count seals from proof directory
 * @returns {number}
 */
function countSeals() {
  const sealsPath = path.join(CONFIG.projectRoot, 'nexus/proof/seals');
  return getAllFiles(sealsPath, ['.yaml', '.yml']).length;
}

/**
 * Regenerate atlas metadata
 * @returns {AtlasMeta}
 */
function regenerateAtlasMeta() {
  const entities = countEntities();
  const events = countEvents();
  const seals = countSeals();

  return {
    atlas_version: CONFIG.version,
    generated_at: new Date().toISOString(),
    counts: {
      entities: entities.total,
      events: events,
      links: 0, // Would need link counting logic
      seals: seals
    },
    entity_types: entities.byType,
    lifecycle_distribution: {
      ACTIVE: entities.total
    },
    views: {
      museum: 0,
      visions: 0,
      lessons: 0,
      active: entities.total
    },
    script: {
      version: CONFIG.version,
      name: 'auto-regen.cjs'
    }
  };
}

/**
 * Calculate all hashes for the atlas
 * @returns {HashResult}
 */
function calculateHashes() {
  const atlasPath = path.join(CONFIG.projectRoot, CONFIG.atlasDir);
  const entitiesPath = path.join(CONFIG.projectRoot, CONFIG.entitiesDir);

  // Collect all file hashes
  const fileHashes = [];

  // Hash atlas files
  const atlasFiles = getAllFiles(atlasPath);
  for (const file of atlasFiles) {
    fileHashes.push(hashFile(file));
  }

  // Hash entity files
  const entityFiles = getAllFiles(entitiesPath);
  for (const file of entityFiles) {
    fileHashes.push(hashFile(file));
  }

  // Calculate merkle root
  const merkleRoot = calculateMerkleRoot(fileHashes);

  // Calculate atlas meta hash
  const atlasMetaPath = path.join(atlasPath, CONFIG.atlasMetaFile);
  const atlasMetaHash = fs.existsSync(atlasMetaPath)
    ? hashFile(atlasMetaPath)
    : hashString('');

  return {
    merkleRoot,
    atlasMetaHash,
    fileHashes
  };
}

/**
 * Run atlas auto-regeneration
 * @param {Object} options
 * @returns {Object}
 */
function autoRegen(options = {}) {
  const { dryRun = false, verbose = false } = options;

  log(`Atlas Auto-Regen v${CONFIG.version}`, 'info');
  log('═══════════════════════════════════════════════════════════════', 'info');

  const result = {
    success: false,
    atlasMetaPath: null,
    hashes: null,
    error: null
  };

  try {
    // Step 1: Regenerate metadata
    log('Regenerating atlas metadata...', 'info');
    const newMeta = regenerateAtlasMeta();

    if (verbose) {
      log(`Entities: ${newMeta.counts.entities}`, 'info');
      log(`Events: ${newMeta.counts.events}`, 'info');
      log(`Seals: ${newMeta.counts.seals}`, 'info');
    }

    // Step 2: Write atlas meta
    const atlasMetaPath = path.join(CONFIG.projectRoot, CONFIG.atlasDir, CONFIG.atlasMetaFile);

    if (!dryRun) {
      // Ensure directory exists
      const atlasDir = path.dirname(atlasMetaPath);
      if (!fs.existsSync(atlasDir)) {
        fs.mkdirSync(atlasDir, { recursive: true });
      }

      fs.writeFileSync(atlasMetaPath, JSON.stringify(newMeta, null, 2), 'utf8');
      log(`Atlas meta written to: ${atlasMetaPath}`, 'success');
    } else {
      log('[DRY-RUN] Would write atlas meta', 'warn');
    }

    // Step 3: Calculate hashes
    log('Calculating hashes...', 'info');
    const hashes = calculateHashes();

    log(`Merkle Root: ${hashes.merkleRoot}`, 'success');
    log(`Atlas Meta Hash: ${hashes.atlasMetaHash}`, 'success');
    log(`Total files hashed: ${hashes.fileHashes.length}`, 'info');

    result.success = true;
    result.atlasMetaPath = atlasMetaPath;
    result.hashes = hashes;
    result.meta = newMeta;

    log('═══════════════════════════════════════════════════════════════', 'info');
    log('Atlas regeneration complete', 'success');

  } catch (error) {
    result.error = error.message;
    log(`Error: ${error.message}`, 'error');
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonOutput = args.includes('--json');

  const result = autoRegen({ dryRun, verbose });

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(result.success ? 0 : 1);
}

// Export for testing
module.exports = {
  autoRegen,
  calculateHashes,
  calculateMerkleRoot,
  hashFile,
  hashString,
  regenerateAtlasMeta,
  CONFIG
};
