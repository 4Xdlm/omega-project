/**
 * OMEGA Phase C — JSON Schema Loader
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Purpose:
 * - Load JSON schemas from docs/phase-c/schema/
 * - Cache schemas for performance
 * - Provide typed access to schemas
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SentinelJudgeError, ERROR_CODES } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA PATHS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema identifiers matching files in docs/phase-c/schema/
 */
export type SchemaId =
  | 'decision_request'
  | 'evidence_pack'
  | 'judgement'
  | 'policy_ref';

/**
 * Map schema ID to filename
 */
const SCHEMA_FILES: Record<SchemaId, string> = {
  decision_request: 'decision_request.schema.json',
  evidence_pack: 'evidence_pack.schema.json',
  judgement: 'judgement.schema.json',
  policy_ref: 'policy_ref.schema.json',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA CACHE
// ═══════════════════════════════════════════════════════════════════════════════

const schemaCache: Map<SchemaId, object> = new Map();

/**
 * Resolves the path to the schema directory.
 * Works from packages/sentinel-judge/src/ → docs/phase-c/schema/
 * Handles both monorepo (packages/sentinel-judge/) and standalone execution.
 */
function getSchemaDir(): string {
  // Start from current working directory
  let currentDir = process.cwd();
  
  // If we're in packages/sentinel-judge, go up to repo root
  if (currentDir.includes('packages') && currentDir.includes('sentinel-judge')) {
    // Navigate up: packages/sentinel-judge/ → omega-project/
    currentDir = join(currentDir, '..', '..');
  }
  
  return join(currentDir, 'docs', 'phase-c', 'schema');
}

/**
 * Loads a schema from disk.
 * 
 * @param schemaId - Schema identifier
 * @returns Parsed JSON schema object
 * @throws SentinelJudgeError if schema not found or invalid
 */
export function loadSchema(schemaId: SchemaId): object {
  // Check cache first
  const cached = schemaCache.get(schemaId);
  if (cached) {
    return cached;
  }
  
  const filename = SCHEMA_FILES[schemaId];
  if (!filename) {
    throw new SentinelJudgeError(
      ERROR_CODES.SCHEMA_02,
      `Unknown schema ID: ${schemaId}`,
      { schemaId, validIds: Object.keys(SCHEMA_FILES) }
    );
  }
  
  const schemaDir = getSchemaDir();
  const schemaPath = join(schemaDir, filename);
  
  try {
    const content = readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(content);
    
    // Validate it's an object
    if (typeof schema !== 'object' || schema === null) {
      throw new SentinelJudgeError(
        ERROR_CODES.SCHEMA_03,
        `Schema is not an object: ${schemaId}`,
        { schemaId, type: typeof schema }
      );
    }
    
    // Cache and return
    schemaCache.set(schemaId, schema);
    return schema;
  } catch (error) {
    if (error instanceof SentinelJudgeError) {
      throw error;
    }
    
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      throw new SentinelJudgeError(
        ERROR_CODES.SCHEMA_02,
        `Schema file not found: ${filename}`,
        { schemaId, path: schemaPath }
      );
    }
    
    throw new SentinelJudgeError(
      ERROR_CODES.SCHEMA_03,
      `Failed to load schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { schemaId, originalError: String(error) }
    );
  }
}

/**
 * Loads all schemas into cache.
 * Call this at startup for eager loading.
 */
export function loadAllSchemas(): void {
  for (const schemaId of Object.keys(SCHEMA_FILES) as SchemaId[]) {
    loadSchema(schemaId);
  }
}

/**
 * Clears the schema cache.
 * Useful for testing.
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}

/**
 * Gets all loaded schema IDs.
 */
export function getLoadedSchemaIds(): SchemaId[] {
  return Array.from(schemaCache.keys());
}

/**
 * Checks if a schema is loaded in cache.
 */
export function isSchemaLoaded(schemaId: SchemaId): boolean {
  return schemaCache.has(schemaId);
}
