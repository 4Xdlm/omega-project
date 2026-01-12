/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — GUARDIAN MODULE
 * Validation Engine with 14 Mechanical Rules
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module guardian
 * @version 1.0.0
 * @description
 * Guardian validates all Nexus artifacts against 14 strict rules:
 * 
 * BLOC A — Schemas & Structure
 *   1. SCHEMA_YAML: Each YAML validates against its JSON schema
 *   2. UTC_ONLY: Main timestamps end with 'Z'
 *   3. ID_DATE_UTC: YYYYMMDD in ID matches UTC date of timestamp
 * 
 * BLOC B — IDs & Paths
 *   4. CANONICAL_PATH: File path matches getCanonicalPath(id)
 *   5. NO_COLLISION: Target file doesn't exist before creation
 *   6. ID_FORMAT: TYPE-YYYYMMDD-NNNN strict format
 * 
 * BLOC C — Relations
 *   7. LINKS_VALID: source/target entities exist
 *   8. EVIDENCE_EXISTS: Referenced files exist
 * 
 * BLOC D — Lifecycle & Tags
 *   9. CERTIFIED_PROOF: CERTIFIED requires evidence
 *   10. TAGS_REQUIRED: Non-empty tags for certain lifecycles
 *   11. ABANDONED_HAS_LESSON: ABANDONED/FAILED needs LESSON link
 * 
 * BLOC E — Tooling Scope
 *   12. TOOLING_EXT_ALLOWLIST: Only allowed extensions
 *   13. TOOLING_FORBIDDEN_DIRS: No src/, packages/, etc.
 *   14. TOOLING_NO_PACKAGES_IMPORT: No imports from packages/
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { parseFile, getCanonicalPath, computeFileHash } from './hash.js';
import { isValidId, parseId, VALID_TYPES } from './registry.js';
import { ENTITY_TYPES, LIFECYCLES, EVENT_TYPES, LINK_TYPES, TAGS_REQUIRED_LIFECYCLES } from './seal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Rule status values */
export const RULE_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
  WARN: 'WARN'
};

/** All 14 Guardian rules */
export const RULES = {
  // Bloc A — Schemas & Structure
  SCHEMA_YAML: 'SCHEMA_YAML',
  UTC_ONLY: 'UTC_ONLY',
  ID_DATE_UTC: 'ID_DATE_UTC',
  
  // Bloc B — IDs & Paths
  CANONICAL_PATH: 'CANONICAL_PATH',
  NO_COLLISION: 'NO_COLLISION',
  ID_FORMAT: 'ID_FORMAT',
  
  // Bloc C — Relations
  LINKS_VALID: 'LINKS_VALID',
  EVIDENCE_EXISTS: 'EVIDENCE_EXISTS',
  
  // Bloc D — Lifecycle & Tags
  CERTIFIED_PROOF: 'CERTIFIED_PROOF',
  TAGS_REQUIRED: 'TAGS_REQUIRED',
  ABANDONED_HAS_LESSON: 'ABANDONED_HAS_LESSON',
  
  // Bloc E — Tooling Scope
  TOOLING_EXT_ALLOWLIST: 'TOOLING_EXT_ALLOWLIST',
  TOOLING_FORBIDDEN_DIRS: 'TOOLING_FORBIDDEN_DIRS',
  TOOLING_NO_PACKAGES_IMPORT: 'TOOLING_NO_PACKAGES_IMPORT'
};

/** Rule definitions with metadata */
export const RULE_DEFINITIONS = {
  [RULES.SCHEMA_YAML]: {
    id: RULES.SCHEMA_YAML,
    name: 'Schema Validation',
    description: 'Each YAML must validate against its JSON schema',
    bloc: 'A'
  },
  [RULES.UTC_ONLY]: {
    id: RULES.UTC_ONLY,
    name: 'UTC Timestamps',
    description: 'Main timestamps must end with Z (UTC)',
    bloc: 'A'
  },
  [RULES.ID_DATE_UTC]: {
    id: RULES.ID_DATE_UTC,
    name: 'ID Date Matches Timestamp',
    description: 'YYYYMMDD in ID must match UTC date of timestamp',
    bloc: 'A'
  },
  [RULES.CANONICAL_PATH]: {
    id: RULES.CANONICAL_PATH,
    name: 'Canonical Path',
    description: 'File path must match getCanonicalPath(id)',
    bloc: 'B'
  },
  [RULES.NO_COLLISION]: {
    id: RULES.NO_COLLISION,
    name: 'No Collision',
    description: 'Target file must not exist before creation',
    bloc: 'B'
  },
  [RULES.ID_FORMAT]: {
    id: RULES.ID_FORMAT,
    name: 'ID Format',
    description: 'ID must be TYPE-YYYYMMDD-NNNN format',
    bloc: 'B'
  },
  [RULES.LINKS_VALID]: {
    id: RULES.LINKS_VALID,
    name: 'Links Valid',
    description: 'Link source/target must exist',
    bloc: 'C'
  },
  [RULES.EVIDENCE_EXISTS]: {
    id: RULES.EVIDENCE_EXISTS,
    name: 'Evidence Exists',
    description: 'Referenced evidence files must exist',
    bloc: 'C'
  },
  [RULES.CERTIFIED_PROOF]: {
    id: RULES.CERTIFIED_PROOF,
    name: 'Certified Proof',
    description: 'CERTIFIED lifecycle requires evidence',
    bloc: 'D'
  },
  [RULES.TAGS_REQUIRED]: {
    id: RULES.TAGS_REQUIRED,
    name: 'Tags Required',
    description: 'Certain lifecycles require non-empty tags',
    bloc: 'D'
  },
  [RULES.ABANDONED_HAS_LESSON]: {
    id: RULES.ABANDONED_HAS_LESSON,
    name: 'Abandoned Has Lesson',
    description: 'ABANDONED/FAILED requires linked LESSON',
    bloc: 'D'
  },
  [RULES.TOOLING_EXT_ALLOWLIST]: {
    id: RULES.TOOLING_EXT_ALLOWLIST,
    name: 'Extension Allowlist',
    description: 'Only allowed file extensions',
    bloc: 'E'
  },
  [RULES.TOOLING_FORBIDDEN_DIRS]: {
    id: RULES.TOOLING_FORBIDDEN_DIRS,
    name: 'Forbidden Directories',
    description: 'No src/, packages/, dist/, build/, etc.',
    bloc: 'E'
  },
  [RULES.TOOLING_NO_PACKAGES_IMPORT]: {
    id: RULES.TOOLING_NO_PACKAGES_IMPORT,
    name: 'No Packages Import',
    description: 'No imports from packages/',
    bloc: 'E'
  }
};

/** Allowed extensions in nexus/ */
export const ALLOWED_EXTENSIONS = new Set([
  '.yaml', '.yml', '.json', '.jsonl', '.md', '.txt'
]);

/** Forbidden directories in nexus/ */
export const FORBIDDEN_DIRS = new Set([
  'src', 'packages', 'ui', 'app', 'dist', 'build', 'node_modules', '.git'
]);

/** Lifecycles requiring evidence for certification */
export const CERTIFIED_EVIDENCE_REQUIRED = ['state', 'manifest'];

// ═══════════════════════════════════════════════════════════════════════════════
// AJV SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const ajv = new Ajv({ allErrors: true, strict: false });

// Schema cache
const schemaCache = new Map();

/**
 * Load a JSON schema
 * @param {string} schemaName - Schema name without extension
 * @returns {object} Schema object
 */
export function loadSchema(schemaName) {
  if (schemaCache.has(schemaName)) {
    return schemaCache.get(schemaName);
  }
  
  const schemaPath = join(__dirname, '..', 'schemas', `${schemaName}.schema.json`);
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaName}`);
  }
  
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  schemaCache.set(schemaName, schema);
  return schema;
}

/**
 * Get schema name for a type
 * @param {string} type - Type prefix (ENT, EVT, etc.)
 * @returns {string|null} Schema name or null
 */
export function getSchemaForType(type) {
  const schemaMap = {
    'ENT': 'ENT',
    'EVT': 'EVT',
    'LINK': 'LINK',
    'SEAL': 'SEAL',
    'MANIFEST': 'MANIFEST',
    'COMP': 'COMP'
  };
  return schemaMap[type] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a rule result
 * @param {string} ruleId - Rule ID
 * @param {string} status - PASS/FAIL/SKIP/WARN
 * @param {string} message - Result message
 * @param {object} [details] - Additional details
 * @returns {object} Rule result
 */
function createResult(ruleId, status, message, details = {}) {
  return {
    id: ruleId,
    name: RULE_DEFINITIONS[ruleId]?.name || ruleId,
    status,
    message,
    details
  };
}

/**
 * Rule 1: SCHEMA_YAML - Validate YAML against JSON schema
 * @param {object} data - Parsed data
 * @param {string} type - Type prefix
 * @param {string} filePath - File path for error messages
 * @returns {object} Rule result
 */
export function validateSchemaYaml(data, type, filePath) {
  const schemaName = getSchemaForType(type);
  
  if (!schemaName) {
    return createResult(RULES.SCHEMA_YAML, RULE_STATUS.SKIP, 
      `No schema for type: ${type}`);
  }
  
  try {
    const schema = loadSchema(schemaName);
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    if (valid) {
      return createResult(RULES.SCHEMA_YAML, RULE_STATUS.PASS, 
        `Schema validation passed for ${type}`);
    } else {
      return createResult(RULES.SCHEMA_YAML, RULE_STATUS.FAIL, 
        `Schema validation failed`, { 
          errors: validate.errors,
          file: filePath 
        });
    }
  } catch (err) {
    return createResult(RULES.SCHEMA_YAML, RULE_STATUS.FAIL, 
      `Schema error: ${err.message}`, { file: filePath });
  }
}

/**
 * Rule 2: UTC_ONLY - Check timestamps end with Z
 * @param {object} data - Parsed data
 * @param {string} filePath - File path
 * @returns {object} Rule result
 */
export function validateUtcOnly(data, filePath) {
  const timestampFields = ['timestamp', 'created_at', 'updated_at', 'acquiredAt', 'expiresAt'];
  const failures = [];
  
  for (const field of timestampFields) {
    if (data[field]) {
      if (!data[field].endsWith('Z')) {
        failures.push(`${field}: ${data[field]}`);
      }
    }
  }
  
  if (failures.length === 0) {
    return createResult(RULES.UTC_ONLY, RULE_STATUS.PASS, 
      'All timestamps are UTC');
  } else {
    return createResult(RULES.UTC_ONLY, RULE_STATUS.FAIL, 
      `Non-UTC timestamps found`, { fields: failures, file: filePath });
  }
}

/**
 * Rule 3: ID_DATE_UTC - Check ID date matches timestamp date
 * @param {object} data - Parsed data
 * @param {string} filePath - File path
 * @returns {object} Rule result
 */
export function validateIdDateUtc(data, filePath) {
  if (!data.id) {
    return createResult(RULES.ID_DATE_UTC, RULE_STATUS.SKIP, 'No ID field');
  }
  
  const idMatch = data.id.match(/^[A-Z]+-(\d{8})-\d{4}$/);
  if (!idMatch) {
    return createResult(RULES.ID_DATE_UTC, RULE_STATUS.SKIP, 'ID not in standard format');
  }
  
  const idDate = idMatch[1];
  const timestamp = data.timestamp || data.created_at;
  
  if (!timestamp) {
    return createResult(RULES.ID_DATE_UTC, RULE_STATUS.SKIP, 'No timestamp field');
  }
  
  // Extract date from timestamp (YYYY-MM-DD -> YYYYMMDD)
  const tsDate = timestamp.slice(0, 10).replace(/-/g, '');
  
  if (idDate === tsDate) {
    return createResult(RULES.ID_DATE_UTC, RULE_STATUS.PASS, 
      `ID date ${idDate} matches timestamp`);
  } else {
    return createResult(RULES.ID_DATE_UTC, RULE_STATUS.FAIL, 
      `ID date ${idDate} != timestamp date ${tsDate}`, { file: filePath });
  }
}

/**
 * Rule 4: CANONICAL_PATH - Check file is at expected path
 * @param {string} id - Entity ID
 * @param {string} actualPath - Actual file path
 * @param {string} nexusRoot - Nexus root directory
 * @returns {object} Rule result
 */
export function validateCanonicalPath(id, actualPath, nexusRoot) {
  try {
    const expectedPath = getCanonicalPath(id, nexusRoot);
    // Normalize paths for comparison (handle Windows vs POSIX)
    const normalizedExpected = expectedPath.replace(/\\/g, '/');
    const normalizedActual = actualPath.replace(/\\/g, '/');
    
    // Compare relative paths
    const relExpected = relative(nexusRoot, normalizedExpected).replace(/\\/g, '/');
    const relActual = relative(nexusRoot, normalizedActual).replace(/\\/g, '/');
    
    if (relExpected === relActual) {
      return createResult(RULES.CANONICAL_PATH, RULE_STATUS.PASS, 
        `Path matches canonical location`);
    } else {
      return createResult(RULES.CANONICAL_PATH, RULE_STATUS.FAIL, 
        `Path mismatch: expected ${relExpected}, got ${relActual}`);
    }
  } catch (err) {
    return createResult(RULES.CANONICAL_PATH, RULE_STATUS.FAIL, 
      `Path validation error: ${err.message}`);
  }
}

/**
 * Rule 5: NO_COLLISION - Check file doesn't exist before creation
 * @param {string} targetPath - Target file path
 * @returns {object} Rule result
 */
export function validateNoCollision(targetPath) {
  if (existsSync(targetPath)) {
    return createResult(RULES.NO_COLLISION, RULE_STATUS.FAIL, 
      `File already exists: ${targetPath}`);
  }
  return createResult(RULES.NO_COLLISION, RULE_STATUS.PASS, 
    'No collision detected');
}

/**
 * Rule 6: ID_FORMAT - Validate ID format
 * @param {string} id - ID to validate
 * @returns {object} Rule result
 */
export function validateIdFormat(id) {
  if (!id) {
    return createResult(RULES.ID_FORMAT, RULE_STATUS.FAIL, 'No ID provided');
  }
  
  if (isValidId(id)) {
    return createResult(RULES.ID_FORMAT, RULE_STATUS.PASS, 
      `ID format valid: ${id}`);
  } else {
    return createResult(RULES.ID_FORMAT, RULE_STATUS.FAIL, 
      `Invalid ID format: ${id}`);
  }
}

/**
 * Rule 7: LINKS_VALID - Check link source/target exist
 * @param {object} linkData - Link data with source/target
 * @param {string} nexusRoot - Nexus root directory
 * @returns {object} Rule result
 */
export function validateLinksValid(linkData, nexusRoot) {
  if (!linkData.source || !linkData.target) {
    return createResult(RULES.LINKS_VALID, RULE_STATUS.FAIL, 
      'Link missing source or target');
  }
  
  const failures = [];
  
  // Check source exists
  try {
    const sourcePath = getCanonicalPath(linkData.source, nexusRoot);
    if (!existsSync(sourcePath)) {
      failures.push(`source ${linkData.source} not found`);
    }
  } catch (err) {
    failures.push(`source ${linkData.source}: ${err.message}`);
  }
  
  // Check target exists
  try {
    const targetPath = getCanonicalPath(linkData.target, nexusRoot);
    if (!existsSync(targetPath)) {
      failures.push(`target ${linkData.target} not found`);
    }
  } catch (err) {
    failures.push(`target ${linkData.target}: ${err.message}`);
  }
  
  if (failures.length === 0) {
    return createResult(RULES.LINKS_VALID, RULE_STATUS.PASS, 
      'Link source and target exist');
  } else {
    return createResult(RULES.LINKS_VALID, RULE_STATUS.FAIL, 
      `Invalid links`, { failures });
  }
}

/**
 * Rule 8: EVIDENCE_EXISTS - Check evidence files exist
 * @param {object} data - Data with evidence references
 * @param {string} nexusRoot - Nexus root directory
 * @returns {object} Rule result
 */
export function validateEvidenceExists(data, nexusRoot) {
  if (!data.evidence) {
    return createResult(RULES.EVIDENCE_EXISTS, RULE_STATUS.SKIP, 
      'No evidence field');
  }
  
  const failures = [];
  const evidence = data.evidence;
  
  // Check state reference
  if (evidence.state) {
    try {
      const statePath = getCanonicalPath(evidence.state, nexusRoot);
      if (!existsSync(statePath)) {
        failures.push(`state ${evidence.state} not found`);
      }
    } catch (err) {
      failures.push(`state: ${err.message}`);
    }
  }
  
  // Check manifest reference
  if (evidence.manifest) {
    try {
      const manifestPath = getCanonicalPath(evidence.manifest, nexusRoot);
      if (!existsSync(manifestPath)) {
        failures.push(`manifest ${evidence.manifest} not found`);
      }
    } catch (err) {
      failures.push(`manifest: ${err.message}`);
    }
  }
  
  // Check tests references
  if (evidence.tests && Array.isArray(evidence.tests)) {
    for (const testRef of evidence.tests) {
      try {
        const testPath = getCanonicalPath(testRef, nexusRoot);
        if (!existsSync(testPath)) {
          failures.push(`test ${testRef} not found`);
        }
      } catch (err) {
        // Tests might be external references, just warn
      }
    }
  }
  
  if (failures.length === 0) {
    return createResult(RULES.EVIDENCE_EXISTS, RULE_STATUS.PASS, 
      'All evidence files exist');
  } else {
    return createResult(RULES.EVIDENCE_EXISTS, RULE_STATUS.FAIL, 
      'Missing evidence files', { failures });
  }
}

/**
 * Rule 9: CERTIFIED_PROOF - Check CERTIFIED has required evidence
 * @param {object} data - Entity data
 * @returns {object} Rule result
 */
export function validateCertifiedProof(data) {
  if (data.lifecycle !== 'CERTIFIED') {
    return createResult(RULES.CERTIFIED_PROOF, RULE_STATUS.SKIP, 
      'Not a CERTIFIED entity');
  }
  
  if (!data.evidence) {
    return createResult(RULES.CERTIFIED_PROOF, RULE_STATUS.FAIL, 
      'CERTIFIED entity missing evidence object');
  }
  
  const missing = [];
  for (const field of CERTIFIED_EVIDENCE_REQUIRED) {
    if (!data.evidence[field]) {
      missing.push(field);
    }
  }
  
  if (missing.length === 0) {
    return createResult(RULES.CERTIFIED_PROOF, RULE_STATUS.PASS, 
      'CERTIFIED entity has required evidence');
  } else {
    return createResult(RULES.CERTIFIED_PROOF, RULE_STATUS.FAIL, 
      `CERTIFIED missing evidence: ${missing.join(', ')}`);
  }
}

/**
 * Rule 10: TAGS_REQUIRED - Check tags for certain lifecycles
 * @param {object} data - Entity data
 * @returns {object} Rule result
 */
export function validateTagsRequired(data) {
  if (!data.lifecycle) {
    return createResult(RULES.TAGS_REQUIRED, RULE_STATUS.SKIP, 
      'No lifecycle field');
  }
  
  if (!TAGS_REQUIRED_LIFECYCLES.includes(data.lifecycle)) {
    return createResult(RULES.TAGS_REQUIRED, RULE_STATUS.SKIP, 
      `Lifecycle ${data.lifecycle} does not require tags`);
  }
  
  if (!data.tags || !Array.isArray(data.tags) || data.tags.length === 0) {
    return createResult(RULES.TAGS_REQUIRED, RULE_STATUS.FAIL, 
      `Lifecycle ${data.lifecycle} requires non-empty tags`);
  }
  
  return createResult(RULES.TAGS_REQUIRED, RULE_STATUS.PASS, 
    `Tags present for ${data.lifecycle}`);
}

/**
 * Rule 11: ABANDONED_HAS_LESSON - Check ABANDONED/FAILED has lesson
 * @param {object} data - Entity data
 * @param {string} entityId - Entity ID
 * @param {string} nexusRoot - Nexus root
 * @returns {object} Rule result
 */
export function validateAbandonedHasLesson(data, entityId, nexusRoot) {
  if (!data.lifecycle || !['ABANDONED', 'FAILED'].includes(data.lifecycle)) {
    return createResult(RULES.ABANDONED_HAS_LESSON, RULE_STATUS.SKIP, 
      'Not an ABANDONED/FAILED entity');
  }
  
  // Look for a LESSON link targeting this entity
  const linksDir = join(nexusRoot, 'nexus', 'ledger', 'links');
  if (!existsSync(linksDir)) {
    return createResult(RULES.ABANDONED_HAS_LESSON, RULE_STATUS.WARN, 
      'Links directory not found');
  }
  
  try {
    const linkFiles = readdirSync(linksDir).filter(f => f.endsWith('.yaml'));
    
    for (const linkFile of linkFiles) {
      const linkPath = join(linksDir, linkFile);
      const linkData = parseFile(linkPath);
      
      if (linkData.type === 'LESSON_FROM' && linkData.target === entityId) {
        return createResult(RULES.ABANDONED_HAS_LESSON, RULE_STATUS.PASS, 
          `Found LESSON_FROM link: ${linkData.id}`);
      }
    }
    
    return createResult(RULES.ABANDONED_HAS_LESSON, RULE_STATUS.FAIL, 
      `${data.lifecycle} entity ${entityId} needs a LESSON_FROM link`);
  } catch (err) {
    return createResult(RULES.ABANDONED_HAS_LESSON, RULE_STATUS.WARN, 
      `Could not check lessons: ${err.message}`);
  }
}

/**
 * Rule 12: TOOLING_EXT_ALLOWLIST - Check allowed extensions
 * @param {string} filePath - File path
 * @returns {object} Rule result
 */
export function validateToolingExtAllowlist(filePath) {
  const ext = extname(filePath).toLowerCase();
  
  // Skip if no extension (directories)
  if (!ext) {
    return createResult(RULES.TOOLING_EXT_ALLOWLIST, RULE_STATUS.SKIP, 
      'No extension');
  }
  
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return createResult(RULES.TOOLING_EXT_ALLOWLIST, RULE_STATUS.PASS, 
      `Extension ${ext} is allowed`);
  } else {
    return createResult(RULES.TOOLING_EXT_ALLOWLIST, RULE_STATUS.FAIL, 
      `Extension ${ext} not allowed`, { allowed: [...ALLOWED_EXTENSIONS] });
  }
}

/**
 * Rule 13: TOOLING_FORBIDDEN_DIRS - Check no forbidden directories
 * @param {string} filePath - File path relative to nexus root
 * @returns {object} Rule result
 */
export function validateToolingForbiddenDirs(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  
  for (const part of parts) {
    if (FORBIDDEN_DIRS.has(part)) {
      return createResult(RULES.TOOLING_FORBIDDEN_DIRS, RULE_STATUS.FAIL, 
        `Forbidden directory: ${part}`, { path: filePath });
    }
  }
  
  return createResult(RULES.TOOLING_FORBIDDEN_DIRS, RULE_STATUS.PASS, 
    'No forbidden directories');
}

/**
 * Rule 14: TOOLING_NO_PACKAGES_IMPORT - Check no packages imports
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {object} Rule result
 */
export function validateToolingNoPackagesImport(content, filePath) {
  // Only check JS/TS files
  const ext = extname(filePath).toLowerCase();
  if (!['.js', '.ts', '.mjs', '.cjs'].includes(ext)) {
    return createResult(RULES.TOOLING_NO_PACKAGES_IMPORT, RULE_STATUS.SKIP, 
      'Not a JS/TS file');
  }
  
  // Check for imports from packages/
  const importPatterns = [
    /from\s+['"].*packages\//,
    /require\s*\(\s*['"].*packages\//,
    /import\s*\(\s*['"].*packages\//
  ];
  
  for (const pattern of importPatterns) {
    if (pattern.test(content)) {
      return createResult(RULES.TOOLING_NO_PACKAGES_IMPORT, RULE_STATUS.FAIL, 
        'Contains import from packages/', { file: filePath });
    }
  }
  
  return createResult(RULES.TOOLING_NO_PACKAGES_IMPORT, RULE_STATUS.PASS, 
    'No packages imports');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single file against all applicable rules
 * @param {string} filePath - Absolute path to file
 * @param {string} nexusRoot - Nexus root directory
 * @param {object} [options] - Validation options
 * @returns {object} Validation result with all rule results
 */
export function validateFile(filePath, nexusRoot, options = {}) {
  const results = [];
  const ext = extname(filePath).toLowerCase();
  
  // Rule 12: Extension allowlist (for nexus/ content files only)
  const relPath = relative(nexusRoot, filePath).replace(/\\/g, '/');
  if (relPath.startsWith('nexus/') && !relPath.includes('tooling/')) {
    results.push(validateToolingExtAllowlist(filePath));
  }
  
  // Rule 13: Forbidden directories
  results.push(validateToolingForbiddenDirs(relPath));
  
  // Parse file if YAML/JSON
  let data = null;
  let type = null;
  
  if (['.yaml', '.yml', '.json'].includes(ext)) {
    try {
      data = parseFile(filePath);
      
      // Extract type from ID if present
      if (data.id) {
        const idMatch = data.id.match(/^([A-Z]+)-/);
        if (idMatch) {
          type = idMatch[1];
        }
      }
    } catch (err) {
      results.push(createResult(RULES.SCHEMA_YAML, RULE_STATUS.FAIL, 
        `Parse error: ${err.message}`, { file: filePath }));
      return { file: filePath, results, valid: false };
    }
    
    // Rule 1: Schema validation
    if (type) {
      results.push(validateSchemaYaml(data, type, filePath));
    }
    
    // Rule 2: UTC timestamps
    results.push(validateUtcOnly(data, filePath));
    
    // Rule 3: ID date matches timestamp
    results.push(validateIdDateUtc(data, filePath));
    
    // Rule 6: ID format
    if (data.id) {
      results.push(validateIdFormat(data.id));
    }
    
    // Rule 4: Canonical path
    if (data.id && type) {
      results.push(validateCanonicalPath(data.id, filePath, nexusRoot));
    }
    
    // Type-specific rules
    if (type === 'LINK') {
      // Rule 7: Links valid
      results.push(validateLinksValid(data, nexusRoot));
    }
    
    if (type === 'ENT') {
      // Rule 8: Evidence exists
      results.push(validateEvidenceExists(data, nexusRoot));
      
      // Rule 9: Certified proof
      results.push(validateCertifiedProof(data));
      
      // Rule 10: Tags required
      results.push(validateTagsRequired(data));
      
      // Rule 11: Abandoned has lesson
      results.push(validateAbandonedHasLesson(data, data.id, nexusRoot));
    }
  }
  
  // Rule 14: No packages import (for JS files)
  if (['.js', '.ts', '.mjs', '.cjs'].includes(ext)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      results.push(validateToolingNoPackagesImport(content, filePath));
    } catch (err) {
      results.push(createResult(RULES.TOOLING_NO_PACKAGES_IMPORT, RULE_STATUS.WARN, 
        `Could not read file: ${err.message}`));
    }
  }
  
  // Determine overall validity
  const valid = results.every(r => r.status !== RULE_STATUS.FAIL);
  
  return { file: filePath, results, valid };
}

/**
 * Validate entire nexus directory
 * @param {string} nexusRoot - Nexus root directory
 * @param {object} [options] - Validation options
 * @returns {object} Full validation report
 */
export function validateNexus(nexusRoot, options = {}) {
  const report = {
    timestamp: new Date().toISOString(),
    nexusRoot,
    files: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      warnings: 0
    },
    rules: {},
    status: RULE_STATUS.PASS
  };
  
  // Initialize rule counters
  for (const ruleId of Object.values(RULES)) {
    report.rules[ruleId] = { pass: 0, fail: 0, skip: 0, warn: 0 };
  }
  
  // Collect all files
  const nexusDir = join(nexusRoot, 'nexus');
  if (!existsSync(nexusDir)) {
    report.status = RULE_STATUS.FAIL;
    report.error = 'Nexus directory not found';
    return report;
  }
  
  const files = collectFiles(nexusDir, nexusRoot, options.exclude || []);
  
  for (const filePath of files) {
    const fileResult = validateFile(filePath, nexusRoot, options);
    report.files.push(fileResult);
    report.summary.total++;
    
    if (fileResult.valid) {
      report.summary.passed++;
    } else {
      report.summary.failed++;
      report.status = RULE_STATUS.FAIL;
    }
    
    // Aggregate rule results
    for (const result of fileResult.results) {
      if (report.rules[result.id]) {
        switch (result.status) {
          case RULE_STATUS.PASS:
            report.rules[result.id].pass++;
            break;
          case RULE_STATUS.FAIL:
            report.rules[result.id].fail++;
            break;
          case RULE_STATUS.SKIP:
            report.rules[result.id].skip++;
            report.summary.skipped++;
            break;
          case RULE_STATUS.WARN:
            report.rules[result.id].warn++;
            report.summary.warnings++;
            break;
        }
      }
    }
  }
  
  return report;
}

/**
 * Validate before creating a seal
 * @param {string} nexusRoot - Nexus root directory
 * @returns {object} Validation result suitable for seal
 */
export function validateBeforeSeal(nexusRoot) {
  const report = validateNexus(nexusRoot);
  
  return {
    valid: report.status === RULE_STATUS.PASS,
    timestamp: report.timestamp,
    summary: report.summary,
    failures: report.files
      .filter(f => !f.valid)
      .map(f => ({
        file: f.file,
        errors: f.results.filter(r => r.status === RULE_STATUS.FAIL)
      }))
  };
}

/**
 * Collect all files recursively
 * @param {string} dir - Directory to scan
 * @param {string} nexusRoot - Nexus root for relative paths
 * @param {string[]} exclude - Patterns to exclude
 * @returns {string[]} Array of file paths
 */
function collectFiles(dir, nexusRoot, exclude = []) {
  const files = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(nexusRoot, fullPath).replace(/\\/g, '/');
    
    // Skip excluded patterns
    if (exclude.some(pattern => relPath.includes(pattern))) {
      continue;
    }
    
    // Skip forbidden directories
    if (FORBIDDEN_DIRS.has(entry)) {
      continue;
    }
    
    // Skip lock files
    if (entry.endsWith('.LOCK')) {
      continue;
    }
    
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...collectFiles(fullPath, nexusRoot, exclude));
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Constants
  RULE_STATUS,
  RULES,
  RULE_DEFINITIONS,
  ALLOWED_EXTENSIONS,
  FORBIDDEN_DIRS,
  
  // Schema functions
  loadSchema,
  getSchemaForType,
  
  // Individual rule validators
  validateSchemaYaml,
  validateUtcOnly,
  validateIdDateUtc,
  validateCanonicalPath,
  validateNoCollision,
  validateIdFormat,
  validateLinksValid,
  validateEvidenceExists,
  validateCertifiedProof,
  validateTagsRequired,
  validateAbandonedHasLesson,
  validateToolingExtAllowlist,
  validateToolingForbiddenDirs,
  validateToolingNoPackagesImport,
  
  // High-level functions
  validateFile,
  validateNexus,
  validateBeforeSeal
};
