/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — ATLAS MODULE
 * Deterministic View Generation Engine
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module atlas
 * @version 1.0.0
 * @description
 * Atlas generates deterministic views from the Nexus ledger:
 * - TIMELINE.md: Chronological view of all entities and events
 * - museum/index.json: Archived/deprecated entities
 * - visions/index.json: Future plans and concepts
 * - lessons/index.json: Lessons learned from failures
 * - ATLAS-META.json: Deterministic metadata (no timestamps)
 * - ATLAS-RUN.json: Debug info with timestamps
 * 
 * Key invariant: ATLAS-META.json must be reproducible given same source files
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import YAML from 'yaml';
import canonicalize from 'canonicalize';
import { createHash } from 'node:crypto';
import { parseFile, computeHash, computeFileHash, getCanonicalPath } from './hash.js';
import { buildMerkleRoot, getFilesInScope } from './merkle.js';
import { getTimestamp } from './registry.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Atlas version */
export const ATLAS_VERSION = '1.0.0';

/** Entity lifecycle classifications */
export const LIFECYCLE_MUSEUM = ['DEPRECATED', 'ARCHIVED'];
export const LIFECYCLE_LESSONS = ['ABANDONED', 'FAILED'];
export const LIFECYCLE_VISIONS = ['DRAFT', 'PROPOSED'];
export const LIFECYCLE_ACTIVE = ['ACTIVE', 'CERTIFIED'];

/** Atlas output paths (relative to nexus root) */
export const ATLAS_PATHS = {
  timeline: 'nexus/atlas/TIMELINE.md',
  museum: 'nexus/atlas/museum/index.json',
  visions: 'nexus/atlas/visions/index.json',
  lessons: 'nexus/atlas/lessons/index.json',
  meta: 'nexus/atlas/ATLAS-META.json',
  run: 'nexus/atlas/ATLAS-RUN.json'
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER LOADING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load all entities from ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {object[]} Array of entity objects with path
 */
export function loadEntities(baseDir) {
  const entitiesDir = join(baseDir, 'nexus', 'ledger', 'entities');
  
  if (!existsSync(entitiesDir)) {
    return [];
  }
  
  const files = readdirSync(entitiesDir)
    .filter(f => f.endsWith('.yaml') && f.startsWith('ENT-'))
    .sort();
  
  return files.map(f => {
    const path = join(entitiesDir, f);
    const data = parseFile(path);
    return { ...data, _path: path, _file: f };
  });
}

/**
 * Load all events from ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {object[]} Array of event objects with path
 */
export function loadEvents(baseDir) {
  const eventsDir = join(baseDir, 'nexus', 'ledger', 'events');
  
  if (!existsSync(eventsDir)) {
    return [];
  }
  
  const files = readdirSync(eventsDir)
    .filter(f => f.endsWith('.yaml') && f.startsWith('EVT-'))
    .sort();
  
  return files.map(f => {
    const path = join(eventsDir, f);
    const data = parseFile(path);
    return { ...data, _path: path, _file: f };
  });
}

/**
 * Load all links from ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {object[]} Array of link objects with path
 */
export function loadLinks(baseDir) {
  const linksDir = join(baseDir, 'nexus', 'ledger', 'links');
  
  if (!existsSync(linksDir)) {
    return [];
  }
  
  const files = readdirSync(linksDir)
    .filter(f => f.endsWith('.yaml') && f.startsWith('LINK-'))
    .sort();
  
  return files.map(f => {
    const path = join(linksDir, f);
    const data = parseFile(path);
    return { ...data, _path: path, _file: f };
  });
}

/**
 * Load all seals from proof directory
 * @param {string} baseDir - Nexus root directory
 * @returns {object[]} Array of seal objects with path
 */
export function loadSeals(baseDir) {
  const sealsDir = join(baseDir, 'nexus', 'proof', 'seals');
  
  if (!existsSync(sealsDir)) {
    return [];
  }
  
  const files = readdirSync(sealsDir)
    .filter(f => f.endsWith('.yaml') && f.startsWith('SEAL-'))
    .sort();
  
  return files.map(f => {
    const path = join(sealsDir, f);
    const data = parseFile(path);
    return { ...data, _path: path, _file: f };
  });
}

/**
 * Load complete ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {object} { entities, events, links, seals }
 */
export function loadLedger(baseDir) {
  return {
    entities: loadEntities(baseDir),
    events: loadEvents(baseDir),
    links: loadLinks(baseDir),
    seals: loadSeals(baseDir)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMELINE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build timeline markdown from ledger
 * @param {object} ledger - Loaded ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {string} Timeline markdown content
 */
export function buildTimeline(ledger, baseDir) {
  const { entities, events, seals } = ledger;
  
  // Combine all items with timestamps
  const items = [];
  
  for (const ent of entities) {
    items.push({
      timestamp: ent.created_at || ent.timestamp,
      type: 'ENTITY',
      id: ent.id,
      title: ent.title,
      entityType: ent.type,
      lifecycle: ent.lifecycle
    });
  }
  
  for (const evt of events) {
    items.push({
      timestamp: evt.timestamp,
      type: 'EVENT',
      id: evt.id,
      eventType: evt.type,
      target: evt.target
    });
  }
  
  for (const seal of seals) {
    items.push({
      timestamp: seal.timestamp,
      type: 'SEAL',
      id: seal.id,
      rootHash: seal.rootHash,
      fileCount: seal.fileCount
    });
  }
  
  // Sort by timestamp (oldest first)
  items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  
  // Generate markdown
  const lines = [
    '# OMEGA NEXUS — TIMELINE',
    '',
    `Generated by Atlas v${ATLAS_VERSION}`,
    '',
    '---',
    ''
  ];
  
  // Group by date
  const byDate = new Map();
  for (const item of items) {
    const date = item.timestamp.slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date).push(item);
  }
  
  for (const [date, dateItems] of byDate) {
    lines.push(`## ${date}`);
    lines.push('');
    
    for (const item of dateItems) {
      const time = item.timestamp.slice(11, 19);
      
      if (item.type === 'ENTITY') {
        lines.push(`- **${time}** 📦 \`${item.id}\` — ${item.title} [${item.entityType}/${item.lifecycle}]`);
      } else if (item.type === 'EVENT') {
        lines.push(`- **${time}** ⚡ \`${item.id}\` — ${item.eventType} → ${item.target}`);
      } else if (item.type === 'SEAL') {
        lines.push(`- **${time}** 🔐 \`${item.id}\` — Sealed ${item.fileCount || '?'} files`);
      }
    }
    
    lines.push('');
  }
  
  if (items.length === 0) {
    lines.push('*No items in ledger yet.*');
    lines.push('');
  }
  
  lines.push('---');
  lines.push('');
  lines.push('*This file is auto-generated. Do not edit manually.*');
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build museum view (archived/deprecated entities)
 * @param {object} ledger - Loaded ledger
 * @returns {object} Museum index
 */
export function buildMuseum(ledger) {
  const { entities, links } = ledger;
  
  const museumEntities = entities
    .filter(e => LIFECYCLE_MUSEUM.includes(e.lifecycle))
    .map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      lifecycle: e.lifecycle,
      created_at: e.created_at,
      tags: e.tags || []
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  
  return {
    view: 'museum',
    version: ATLAS_VERSION,
    description: 'Archived and deprecated entities',
    count: museumEntities.length,
    entities: museumEntities
  };
}

/**
 * Build visions view (draft/proposed entities)
 * @param {object} ledger - Loaded ledger
 * @returns {object} Visions index
 */
export function buildVisions(ledger) {
  const { entities } = ledger;
  
  const visionEntities = entities
    .filter(e => LIFECYCLE_VISIONS.includes(e.lifecycle))
    .map(e => ({
      id: e.id,
      type: e.type,
      title: e.title,
      lifecycle: e.lifecycle,
      created_at: e.created_at,
      tags: e.tags || []
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  
  return {
    view: 'visions',
    version: ATLAS_VERSION,
    description: 'Draft and proposed entities (future plans)',
    count: visionEntities.length,
    entities: visionEntities
  };
}

/**
 * Build lessons view (abandoned/failed entities with lessons)
 * @param {object} ledger - Loaded ledger
 * @returns {object} Lessons index
 */
export function buildLessons(ledger) {
  const { entities, links } = ledger;
  
  // Find entities that are ABANDONED or FAILED
  const failedEntities = entities
    .filter(e => LIFECYCLE_LESSONS.includes(e.lifecycle));
  
  // Find LESSON_FROM links
  const lessonLinks = links.filter(l => l.type === 'LESSON_FROM');
  
  // Build lessons array
  const lessons = failedEntities.map(e => {
    const relatedLessons = lessonLinks
      .filter(l => l.target === e.id)
      .map(l => l.source);
    
    return {
      id: e.id,
      type: e.type,
      title: e.title,
      lifecycle: e.lifecycle,
      created_at: e.created_at,
      tags: e.tags || [],
      lesson_entities: relatedLessons
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  
  return {
    view: 'lessons',
    version: ATLAS_VERSION,
    description: 'Lessons learned from abandoned and failed entities',
    count: lessons.length,
    entities: lessons
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATLAS METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate deterministic ATLAS-META.json
 * CRITICAL: Must not contain any timestamps or non-deterministic data
 * @param {object} ledger - Loaded ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {object} Atlas metadata
 */
export function generateAtlasMeta(ledger, baseDir) {
  const { entities, events, links, seals } = ledger;
  
  // Get source root hash (from last seal or compute fresh)
  let sourceRootHash;
  if (seals.length > 0) {
    const lastSeal = seals[seals.length - 1];
    sourceRootHash = lastSeal.rootHash;
  } else {
    // Compute fresh from files (excluding atlas)
    const files = getFilesInScope(baseDir, ['nexus/atlas/']);
    sourceRootHash = buildMerkleRoot(files, baseDir);
  }
  
  // Count by lifecycle
  const lifecycleCounts = {};
  for (const e of entities) {
    const lc = e.lifecycle || 'UNKNOWN';
    lifecycleCounts[lc] = (lifecycleCounts[lc] || 0) + 1;
  }
  
  // Count by entity type
  const typeCounts = {};
  for (const e of entities) {
    const t = e.type || 'UNKNOWN';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  
  // Build deterministic meta (sorted keys, no timestamps)
  const meta = {
    atlas_version: ATLAS_VERSION,
    source_root_hash: sourceRootHash,
    counts: {
      entities: entities.length,
      events: events.length,
      links: links.length,
      seals: seals.length
    },
    entity_types: sortObject(typeCounts),
    lifecycle_distribution: sortObject(lifecycleCounts),
    views: {
      museum: entities.filter(e => LIFECYCLE_MUSEUM.includes(e.lifecycle)).length,
      visions: entities.filter(e => LIFECYCLE_VISIONS.includes(e.lifecycle)).length,
      lessons: entities.filter(e => LIFECYCLE_LESSONS.includes(e.lifecycle)).length,
      active: entities.filter(e => LIFECYCLE_ACTIVE.includes(e.lifecycle)).length
    }
  };
  
  return meta;
}

/**
 * Generate ATLAS-RUN.json with debug info (includes timestamps)
 * @param {object} ledger - Loaded ledger
 * @param {string} baseDir - Nexus root directory
 * @returns {object} Atlas run info
 */
export function generateAtlasRun(ledger, baseDir) {
  return {
    atlas_version: ATLAS_VERSION,
    generated_at: getTimestamp(),
    base_dir: baseDir,
    ledger_summary: {
      entities: ledger.entities.length,
      events: ledger.events.length,
      links: ledger.links.length,
      seals: ledger.seals.length
    },
    entity_ids: ledger.entities.map(e => e.id).sort(),
    seal_ids: ledger.seals.map(s => s.id).sort()
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL BUILD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build all atlas outputs
 * @param {string} baseDir - Nexus root directory
 * @param {object} [options] - Build options
 * @returns {object} Build result
 */
export function buildAll(baseDir, options = {}) {
  const { dryRun = false } = options;
  
  // Ensure atlas directories exist
  const atlasDir = join(baseDir, 'nexus', 'atlas');
  if (!existsSync(atlasDir)) {
    mkdirSync(atlasDir, { recursive: true });
  }
  
  for (const subdir of ['museum', 'visions', 'lessons']) {
    const path = join(atlasDir, subdir);
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }
  
  // Load ledger
  const ledger = loadLedger(baseDir);
  
  // Build all views
  const timeline = buildTimeline(ledger, baseDir);
  const museum = buildMuseum(ledger);
  const visions = buildVisions(ledger);
  const lessons = buildLessons(ledger);
  const meta = generateAtlasMeta(ledger, baseDir);
  const run = generateAtlasRun(ledger, baseDir);
  
  const outputs = {
    timeline: { path: join(baseDir, ATLAS_PATHS.timeline), content: timeline },
    museum: { path: join(baseDir, ATLAS_PATHS.museum), content: JSON.stringify(museum, null, 2) },
    visions: { path: join(baseDir, ATLAS_PATHS.visions), content: JSON.stringify(visions, null, 2) },
    lessons: { path: join(baseDir, ATLAS_PATHS.lessons), content: JSON.stringify(lessons, null, 2) },
    meta: { path: join(baseDir, ATLAS_PATHS.meta), content: JSON.stringify(meta, null, 2) },
    run: { path: join(baseDir, ATLAS_PATHS.run), content: JSON.stringify(run, null, 2) }
  };
  
  // Write files (unless dry run)
  if (!dryRun) {
    for (const [name, output] of Object.entries(outputs)) {
      writeFileSync(output.path, output.content, 'utf-8');
    }
  }
  
  // Compute meta hash (canonicalize first for determinism)
  const metaHash = computeHash(canonicalize(meta));
  
  return {
    success: true,
    ledger: {
      entities: ledger.entities.length,
      events: ledger.events.length,
      links: ledger.links.length,
      seals: ledger.seals.length
    },
    outputs: Object.fromEntries(
      Object.entries(outputs).map(([k, v]) => [k, v.path])
    ),
    meta_hash: metaHash,
    dry_run: dryRun
  };
}

/**
 * Verify atlas is up-to-date
 * @param {string} baseDir - Nexus root directory
 * @returns {object} Verification result
 */
export function verifyAtlas(baseDir) {
  const metaPath = join(baseDir, ATLAS_PATHS.meta);
  
  if (!existsSync(metaPath)) {
    return {
      valid: false,
      reason: 'ATLAS-META.json not found'
    };
  }
  
  // Load existing meta
  const existingMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
  
  // Regenerate meta
  const ledger = loadLedger(baseDir);
  const freshMeta = generateAtlasMeta(ledger, baseDir);
  
  // Compare canonical forms
  const existingCanon = canonicalize(existingMeta);
  const freshCanon = canonicalize(freshMeta);
  
  if (existingCanon === freshCanon) {
    return {
      valid: true,
      meta_hash: computeHash(canonicalize(freshMeta))
    };
  } else {
    return {
      valid: false,
      reason: 'ATLAS-META.json is outdated',
      existing_hash: computeHash(canonicalize(existingMeta)),
      expected_hash: computeHash(canonicalize(freshMeta))
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sort object keys deterministically
 * @param {object} obj - Object to sort
 * @returns {object} Object with sorted keys
 */
function sortObject(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Constants
  ATLAS_VERSION,
  ATLAS_PATHS,
  LIFECYCLE_MUSEUM,
  LIFECYCLE_LESSONS,
  LIFECYCLE_VISIONS,
  LIFECYCLE_ACTIVE,
  
  // Ledger loading
  loadEntities,
  loadEvents,
  loadLinks,
  loadSeals,
  loadLedger,
  
  // View generation
  buildTimeline,
  buildMuseum,
  buildVisions,
  buildLessons,
  
  // Metadata
  generateAtlasMeta,
  generateAtlasRun,
  
  // Full build
  buildAll,
  verifyAtlas
};
