/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Seal Manager
 * Création d'entités, événements et scellement cryptographique
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / RFC 8785
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import YAML from 'yaml';

import {
  getDate,
  getTimestamp,
  getNextId,
  acquireLock,
  releaseLock,
  readRegistry,
  incrementCounter,
  formatSeq,
  parseId
} from './registry.js';

import {
  getCanonicalPath,
  computeFileHash,
  canonicalizeObject,
  computeHash
} from './hash.js';

import { buildMerkleRoot, getFilesInScope } from './merkle.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types d'entités valides
 */
export const ENTITY_TYPES = [
  'DECISION',
  'INVARIANT',
  'LESSON',
  'VISION',
  'MODULE',
  'PHASE',
  'MILESTONE',
  'ARTIFACT'
];

/**
 * Lifecycles valides
 */
export const LIFECYCLES = [
  'VISION',
  'PROPOSED',
  'PLANNED',
  'ACTIVE',
  'CERTIFIED',
  'PAUSED',
  'DEPRECATED',
  'ABANDONED',
  'FAILED',
  'MYTH'
];

/**
 * Lifecycles nécessitant des tags
 */
export const TAGS_REQUIRED_LIFECYCLES = [
  'CERTIFIED',
  'ABANDONED',
  'FAILED',
  'DEPRECATED',
  'PAUSED'
];

// ═══════════════════════════════════════════════════════════════════════════════
// FILE CREATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Écrire un fichier YAML
 * @param {string} filepath - Chemin du fichier
 * @param {object} data - Données à écrire
 */
function writeYAML(filepath, data) {
  const dir = dirname(filepath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const content = YAML.stringify(data);
  writeFileSync(filepath, content, 'utf8');
}

/**
 * Écrire un fichier JSON
 * @param {string} filepath - Chemin du fichier
 * @param {object} data - Données à écrire
 */
function writeJSON(filepath, data) {
  const dir = dirname(filepath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const content = JSON.stringify(data, null, 2);
  writeFileSync(filepath, content, 'utf8');
}

/**
 * Ajouter une ligne à un fichier JSONL
 * @param {string} filepath - Chemin du fichier
 * @param {object} data - Données à ajouter
 */
function appendJSONL(filepath, data) {
  const dir = dirname(filepath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const line = JSON.stringify(data) + '\n';
  appendFileSync(filepath, line, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Créer une nouvelle session
 * @param {object} options - Options de session
 * @param {string} options.baseDir - Répertoire de base
 * @param {string} [options.purpose] - Raison de la session
 * @param {string} [options.initiator] - Qui a initié
 * @returns {object} { id, path }
 */
export function createSession({ baseDir, purpose = 'seal', initiator = 'system' }) {
  const date = getDate();
  const seq = incrementCounter(date, 'SES', baseDir);
  const id = `SES-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  
  const sessionStart = {
    type: 'SESSION_START',
    session_id: id,
    timestamp: getTimestamp(),
    purpose: purpose,
    initiator: initiator
  };
  
  appendJSONL(path, sessionStart);
  
  return { id, path };
}

/**
 * Ajouter une entrée à une session
 * @param {string} sessionPath - Chemin du fichier session
 * @param {string} type - Type d'entrée
 * @param {object} data - Données
 */
export function appendToSession(sessionPath, type, data) {
  const entry = {
    type: type,
    timestamp: getTimestamp(),
    ...data
  };
  appendJSONL(sessionPath, entry);
}

/**
 * Clôturer une session
 * @param {string} sessionPath - Chemin du fichier session
 * @param {object} summary - Résumé de la session
 */
export function closeSession(sessionPath, summary) {
  const sessionEnd = {
    type: 'SESSION_END',
    timestamp: getTimestamp(),
    summary: summary
  };
  appendJSONL(sessionPath, sessionEnd);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY (ENT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Créer une nouvelle entité
 * @param {object} options - Options de l'entité
 * @returns {object} { id, path, entity }
 */
export function createEntity({
  baseDir,
  type,
  title,
  summary,
  lifecycle = 'PROPOSED',
  created_by = 'system',
  tags = [],
  content = {},
  refs = [],
  anchors = {}
}) {
  // Validations
  if (!ENTITY_TYPES.includes(type)) {
    throw new Error(`Invalid entity type: ${type}. Valid: ${ENTITY_TYPES.join(', ')}`);
  }
  
  if (!LIFECYCLES.includes(lifecycle)) {
    throw new Error(`Invalid lifecycle: ${lifecycle}. Valid: ${LIFECYCLES.join(', ')}`);
  }
  
  if (TAGS_REQUIRED_LIFECYCLES.includes(lifecycle) && tags.length === 0) {
    throw new Error(`Tags required for lifecycle: ${lifecycle}`);
  }
  
  if (!title || title.length > 100) {
    throw new Error('Title required and must be <= 100 characters');
  }
  
  if (!summary || summary.length > 200) {
    throw new Error('Summary required and must be <= 200 characters');
  }
  
  const date = getDate();
  const seq = incrementCounter(date, 'ENT', baseDir);
  const id = `ENT-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  const entity = {
    id: id,
    type: type,
    lifecycle: lifecycle,
    version: 1,
    
    created: timestamp,
    created_by: created_by,
    updated: timestamp,
    
    title: title,
    summary: summary,
    tags: tags,
    
    content: content,
    refs: refs,
    anchors: anchors
  };
  
  writeYAML(path, entity);
  
  return { id, path, entity };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT (EVT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types d'événements valides
 */
export const EVENT_TYPES = [
  'CREATED',
  'LIFECYCLE_CHANGE',
  'UPDATED',
  'LINKED',
  'SEALED',
  'CERTIFIED',
  'ARCHIVED',
  'IMPORTED'
];

/**
 * Créer un nouvel événement
 * @param {object} options - Options de l'événement
 * @returns {object} { id, path, event }
 */
export function createEvent({
  baseDir,
  event_type,
  target,
  actor = 'system',
  description = '',
  payload = {},
  anchors = {}
}) {
  if (!EVENT_TYPES.includes(event_type)) {
    throw new Error(`Invalid event type: ${event_type}. Valid: ${EVENT_TYPES.join(', ')}`);
  }
  
  if (!target) {
    throw new Error('Target ID required for event');
  }
  
  const date = getDate();
  const seq = incrementCounter(date, 'EVT', baseDir);
  const id = `EVT-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  const event = {
    id: id,
    event_type: event_type,
    timestamp: timestamp,
    
    target: target,
    actor: actor,
    description: description,
    
    payload: payload,
    anchors: anchors
  };
  
  writeYAML(path, event);
  
  return { id, path, event };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Types de liens valides
 */
export const LINK_TYPES = [
  'DEPENDS_ON',
  'SUPERSEDES',
  'RELATES_TO',
  'IMPLEMENTS',
  'GENERATES',
  'VALIDATES'
];

/**
 * Créer un nouveau lien
 * @param {object} options - Options du lien
 * @returns {object} { id, path, link }
 */
export function createLink({
  baseDir,
  link_type,
  source,
  target,
  metadata = {}
}) {
  if (!LINK_TYPES.includes(link_type)) {
    throw new Error(`Invalid link type: ${link_type}. Valid: ${LINK_TYPES.join(', ')}`);
  }
  
  if (!source || !target) {
    throw new Error('Source and target IDs required for link');
  }
  
  const date = getDate();
  const seq = incrementCounter(date, 'LINK', baseDir);
  const id = `LINK-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  const link = {
    id: id,
    link_type: link_type,
    created: timestamp,
    
    source: source,
    target: target,
    metadata: metadata
  };
  
  writeYAML(path, link);
  
  return { id, path, link };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Créer un manifest
 * @param {object} options - Options du manifest
 * @returns {object} { id, path, manifest }
 */
export function createManifest({
  baseDir,
  session_id,
  files_in_scope,
  excludeCurrentSeal = null,
  excludeCurrentManifest = null
}) {
  const date = getDate();
  const seq = incrementCounter(date, 'MANIFEST', baseDir);
  const id = `MANIFEST-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  // Filtrer les fichiers à exclure
  let filteredFiles = [...files_in_scope];
  
  if (excludeCurrentSeal) {
    const sealPath = getCanonicalPath(excludeCurrentSeal, baseDir);
    filteredFiles = filteredFiles.filter(f => f !== sealPath && f !== relative(baseDir, sealPath));
  }
  
  if (excludeCurrentManifest) {
    filteredFiles = filteredFiles.filter(f => !f.includes(excludeCurrentManifest));
  }
  
  // Également exclure le manifest lui-même
  const manifestRelPath = relative(baseDir, path);
  filteredFiles = filteredFiles.filter(f => f !== path && f !== manifestRelPath);
  
  // Calculer les hashes des fichiers
  const file_hashes = {};
  for (const file of filteredFiles) {
    const fullPath = file.startsWith(baseDir) ? file : join(baseDir, file);
    if (existsSync(fullPath)) {
      file_hashes[file] = computeFileHash(fullPath);
    }
  }
  
  const manifest = {
    id: id,
    created: timestamp,
    session_id: session_id,
    
    files_in_scope: filteredFiles.sort(),
    file_hashes: file_hashes,
    file_count: filteredFiles.length
  };
  
  writeJSON(path, manifest);
  
  return { id, path, manifest };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Créer un seal
 * @param {object} options - Options du seal
 * @returns {object} { id, path, seal }
 */
export function createSeal({
  baseDir,
  session_id,
  manifest_id,
  root_hash,
  entities_created = [],
  events_created = [],
  links_created = [],
  sealed_by = 'Francky',
  notes = ''
}) {
  const date = getDate();
  const seq = incrementCounter(date, 'SEAL', baseDir);
  const id = `SEAL-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  const seal = {
    id: id,
    timestamp: timestamp,
    
    session_id: session_id,
    manifest_id: manifest_id,
    root_hash: root_hash,
    
    entities_created: entities_created,
    events_created: events_created,
    links_created: links_created,
    
    sealed_by: sealed_by,
    notes: notes,
    
    verification: {
      algorithm: 'merkle-sha256-domain-separated',
      spec_version: '2.2.3'
    }
  };
  
  writeYAML(path, seal);
  
  return { id, path, seal };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Créer un state (snapshot d'état)
 * @param {object} options - Options du state
 * @returns {object} { id, path, state }
 */
export function createState({
  baseDir,
  entity_id,
  lifecycle,
  tests_passed = null,
  tests_total = null,
  coverage = null,
  evidence = []
}) {
  const date = getDate();
  const seq = incrementCounter(date, 'STATE', baseDir);
  const id = `STATE-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  const state = {
    id: id,
    timestamp: timestamp,
    
    entity_id: entity_id,
    lifecycle: lifecycle,
    
    metrics: {
      tests_passed: tests_passed,
      tests_total: tests_total,
      coverage: coverage
    },
    
    evidence: evidence
  };
  
  writeYAML(path, state);
  
  return { id, path, state };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Créer un rapport de complétude
 * @param {object} options - Options du rapport
 * @returns {object} { id, path, completeness }
 */
export function createCompleteness({
  baseDir,
  seal_id,
  rules_checked,
  rules_passed,
  rules_failed,
  details = []
}) {
  const date = getDate();
  const seq = incrementCounter(date, 'COMP', baseDir);
  const id = `COMP-${date}-${formatSeq(seq)}`;
  const path = getCanonicalPath(id, baseDir);
  const timestamp = getTimestamp();
  
  const completeness = {
    id: id,
    timestamp: timestamp,
    
    seal_id: seal_id,
    
    summary: {
      rules_checked: rules_checked,
      rules_passed: rules_passed,
      rules_failed: rules_failed,
      status: rules_failed === 0 ? 'PASS' : 'FAIL'
    },
    
    details: details
  };
  
  writeYAML(path, completeness);
  
  return { id, path, completeness };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE SEAL PROCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Processus complet de scellement
 * @param {object} options - Options du seal
 * @returns {object} Résultat du seal
 */
export async function seal({
  baseDir,
  entities = [],
  events = [],
  links = [],
  sealed_by = 'Francky',
  purpose = 'seal',
  notes = ''
}) {
  const date = getDate();
  
  // 1. Acquérir le lock
  const lockAcquired = await acquireLock(date, baseDir, purpose);
  if (!lockAcquired) {
    throw new Error('Failed to acquire lock. Another process may be sealing.');
  }
  
  try {
    // 2. Créer la session
    const session = createSession({ baseDir, purpose, initiator: sealed_by });
    
    const createdEntities = [];
    const createdEvents = [];
    const createdLinks = [];
    
    // 3. Créer les entités
    for (const entData of entities) {
      const ent = createEntity({
        baseDir,
        ...entData,
        anchors: { ...entData.anchors, session: session.id }
      });
      createdEntities.push(ent.id);
      
      // Créer l'événement CREATED
      const evt = createEvent({
        baseDir,
        event_type: 'CREATED',
        target: ent.id,
        actor: sealed_by,
        description: `Created entity: ${entData.title}`,
        anchors: { session: session.id }
      });
      createdEvents.push(evt.id);
      
      appendToSession(session.path, 'ENTITY_CREATED', { id: ent.id, type: entData.type });
    }
    
    // 4. Créer les événements additionnels
    for (const evtData of events) {
      const evt = createEvent({
        baseDir,
        ...evtData,
        anchors: { ...evtData.anchors, session: session.id }
      });
      createdEvents.push(evt.id);
      appendToSession(session.path, 'EVENT_CREATED', { id: evt.id, type: evtData.event_type });
    }
    
    // 5. Créer les liens
    for (const linkData of links) {
      const link = createLink({ baseDir, ...linkData });
      createdLinks.push(link.id);
      appendToSession(session.path, 'LINK_CREATED', { id: link.id, type: linkData.link_type });
    }
    
    // 6. Collecter les fichiers dans le scope
    const filesInScope = getFilesInScope(baseDir);
    
    // 7. Créer le manifest (sans le seal courant qui n'existe pas encore)
    const manifest = createManifest({
      baseDir,
      session_id: session.id,
      files_in_scope: filesInScope
    });
    
    // 8. Calculer le root hash
    const rootHash = buildMerkleRoot(filesInScope, baseDir);
    
    // 9. Créer le seal
    const sealResult = createSeal({
      baseDir,
      session_id: session.id,
      manifest_id: manifest.id,
      root_hash: rootHash,
      entities_created: createdEntities,
      events_created: createdEvents,
      links_created: createdLinks,
      sealed_by,
      notes
    });
    
    // 10. Créer l'événement SEALED
    const sealedEvent = createEvent({
      baseDir,
      event_type: 'SEALED',
      target: sealResult.id,
      actor: sealed_by,
      description: `Seal created with ${createdEntities.length} entities`,
      payload: {
        entities_count: createdEntities.length,
        events_count: createdEvents.length,
        links_count: createdLinks.length,
        root_hash: rootHash
      },
      anchors: { session: session.id }
    });
    
    // 11. Clôturer la session
    closeSession(session.path, {
      entities_created: createdEntities.length,
      events_created: createdEvents.length + 1, // +1 pour SEALED
      links_created: createdLinks.length,
      seal_id: sealResult.id,
      manifest_id: manifest.id,
      root_hash: rootHash
    });
    
    return {
      success: true,
      session_id: session.id,
      seal_id: sealResult.id,
      manifest_id: manifest.id,
      root_hash: rootHash,
      entities_created: createdEntities,
      events_created: [...createdEvents, sealedEvent.id],
      links_created: createdLinks
    };
    
  } finally {
    // Toujours libérer le lock
    releaseLock(date, baseDir);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Types
  ENTITY_TYPES,
  LIFECYCLES,
  TAGS_REQUIRED_LIFECYCLES,
  EVENT_TYPES,
  LINK_TYPES,
  
  // Session
  createSession,
  appendToSession,
  closeSession,
  
  // Creation
  createEntity,
  createEvent,
  createLink,
  createManifest,
  createSeal,
  createState,
  createCompleteness,
  
  // Complete process
  seal
};
