/**
 * OMEGA CLI_RUNNER — Schema Command
 * Phase 23.0 — NASA-Grade
 *
 * Export JSON Schema for NDJSON streaming format.
 * Routing: DIRECT (pure info, no audit)
 */

import type { CLICommand, CLIResult, ParsedArgs } from '../types.js';
import { EXIT_CODES, ROUTING } from '../constants.js';
import { resolveOption } from '../parser.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// ============================================================================
// JSON SCHEMA FOR NDJSON EVENTS
// ============================================================================

/**
 * JSON Schema v1.2.0 for OMEGA NDJSON streaming format.
 * Each NDJSON line conforms to one of the event schemas.
 */
const NDJSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://omega.example.com/ndjson-schema/v1.2.0',
  title: 'OMEGA NDJSON Streaming Schema',
  description: 'JSON Schema for OMEGA emotion analysis NDJSON streaming output',
  version: '1.2.0',
  oneOf: [
    { $ref: '#/$defs/SchemaEvent' },
    { $ref: '#/$defs/StartEvent' },
    { $ref: '#/$defs/InputEvent' },
    { $ref: '#/$defs/ProgressEvent' },
    { $ref: '#/$defs/StatsEvent' },
    { $ref: '#/$defs/ExcerptEvent' },
    { $ref: '#/$defs/SummaryEvent' },
    { $ref: '#/$defs/EmotionEvent' },
    { $ref: '#/$defs/ArtifactsEvent' },
    { $ref: '#/$defs/WarningEvent' },
    { $ref: '#/$defs/MetadataEvent' },
    { $ref: '#/$defs/CompleteEvent' },
  ],
  $defs: {
    SchemaEvent: {
      type: 'object',
      description: 'First event in stream, declares schema version and runtime context',
      properties: {
        type: { const: 'schema' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        tool: { const: 'omega' },
        format: { const: 'ndjson' },
        headCommit: { type: 'string', description: 'Git HEAD commit hash or UNKNOWN' },
        tagRef: { type: 'string', description: 'Git tag reference (refs/tags/...) or UNKNOWN' },
        tagExact: { type: 'boolean', description: 'True if tagRef is an exact match, false if nearest' },
        t: { type: 'integer', description: 'Unix timestamp in milliseconds' },
      },
      required: ['type', 'version', 'tool', 'format', 'headCommit', 'tagRef', 'tagExact', 't'],
      additionalProperties: false,
    },
    StartEvent: {
      type: 'object',
      description: 'Analysis start marker',
      properties: {
        type: { const: 'start' },
        timestamp: { type: 'string', format: 'date-time' },
      },
      required: ['type', 'timestamp'],
      additionalProperties: false,
    },
    InputEvent: {
      type: 'object',
      description: 'Input file metadata',
      properties: {
        type: { const: 'input' },
        path: { type: 'string' },
        absolutePath: { type: 'string' },
        bytes: { type: 'integer', minimum: 0 },
        sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      },
      required: ['type', 'path', 'absolutePath', 'bytes', 'sha256'],
      additionalProperties: false,
    },
    ProgressEvent: {
      type: 'object',
      description: 'Analysis progress marker',
      properties: {
        type: { const: 'progress' },
        phase: { enum: ['start', 'done'] },
        message: { type: 'string' },
        t: { type: 'integer', description: 'Unix timestamp in milliseconds' },
      },
      required: ['type', 'phase', 'message', 't'],
      additionalProperties: false,
    },
    StatsEvent: {
      type: 'object',
      description: 'Text statistics',
      properties: {
        type: { const: 'stats' },
        bytes: { type: 'integer', minimum: 0 },
        chars: { type: 'integer', minimum: 0 },
        lines: { type: 'integer', minimum: 0 },
        words: { type: 'integer', minimum: 0 },
      },
      required: ['type', 'bytes', 'chars', 'lines', 'words'],
      additionalProperties: false,
    },
    ExcerptEvent: {
      type: 'object',
      description: 'Cleaned text sample (max 150 chars)',
      properties: {
        type: { const: 'excerpt' },
        text: { type: 'string', maxLength: 153 },
      },
      required: ['type', 'text'],
      additionalProperties: false,
    },
    SummaryEvent: {
      type: 'object',
      description: 'Analysis summary with quality metrics',
      properties: {
        type: { const: 'summary' },
        wordCount: { type: 'integer', minimum: 0 },
        sentenceCount: { type: 'integer', minimum: 0 },
        dominantEmotion: { type: 'string' },
        overallIntensity: { type: 'number', minimum: 0, maximum: 1 },
        keywordsFound: { type: 'integer', minimum: 0 },
        keywordDensity: { type: 'number', minimum: 0, maximum: 1 },
        intensityMethod: { enum: ['v1', 'v2'] },
        qualityScore: { type: 'number', minimum: 0, maximum: 1 },
        warnings: {
          type: 'array',
          items: {
            enum: ['LOW_TEXT', 'HIGH_KEYWORD_DENSITY', 'SATURATED_INTENSITY', 'LANG_MISMATCH'],
          },
        },
      },
      required: [
        'type', 'wordCount', 'sentenceCount', 'dominantEmotion',
        'overallIntensity', 'keywordsFound', 'keywordDensity',
        'intensityMethod', 'qualityScore', 'warnings',
      ],
      additionalProperties: false,
    },
    EmotionEvent: {
      type: 'object',
      description: 'Individual emotion score (8 Plutchik emotions)',
      properties: {
        type: { const: 'emotion' },
        emotion: {
          enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'],
        },
        intensity: { type: 'number', minimum: 0, maximum: 1 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['type', 'emotion', 'intensity', 'confidence'],
      additionalProperties: false,
    },
    ArtifactsEvent: {
      type: 'object',
      description: 'Paths to written artifact files',
      properties: {
        type: { const: 'artifacts' },
        jsonPath: { type: 'string' },
        mdPath: { type: 'string' },
      },
      required: ['type', 'jsonPath', 'mdPath'],
      additionalProperties: false,
    },
    WarningEvent: {
      type: 'object',
      description: 'Runtime warning (e.g., missing artifacts dir)',
      properties: {
        type: { const: 'warning' },
        code: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['type', 'code', 'message'],
      additionalProperties: false,
    },
    MetadataEvent: {
      type: 'object',
      description: 'Analysis metadata',
      properties: {
        type: { const: 'metadata' },
        timestamp: { type: 'string', format: 'date-time' },
        seed: { type: 'integer' },
        version: { type: 'string' },
        lang: { type: 'string', pattern: '^[a-z]{2}$' },
        langName: { type: 'string' },
      },
      required: ['type', 'timestamp', 'seed', 'version', 'lang', 'langName'],
      additionalProperties: false,
    },
    CompleteEvent: {
      type: 'object',
      description: 'Analysis completion marker',
      properties: {
        type: { const: 'complete' },
        success: { type: 'boolean' },
      },
      required: ['type', 'success'],
      additionalProperties: false,
    },
  },
};

// ============================================================================
// SCHEMA COMMAND DEFINITION
// ============================================================================

export const schemaCommand: CLICommand = {
  name: 'schema',
  description: 'Exporte le JSON Schema du format NDJSON',
  usage: 'schema [--format ndjson] [--out <file>]',
  args: [],
  options: [
    {
      short: '-f',
      long: '--format',
      description: 'Format du schéma (ndjson)',
      hasValue: true,
      default: 'ndjson',
      validator: (v: string) => v === 'ndjson',
    },
    {
      short: '-o',
      long: '--out',
      description: 'Fichier de sortie (optionnel)',
      hasValue: true,
    },
  ],
  routing: ROUTING.DIRECT,
  execute: executeSchema,
};

// ============================================================================
// EXECUTE FUNCTION
// ============================================================================

async function executeSchema(args: ParsedArgs): Promise<CLIResult> {
  const startTime = performance.now();

  const formatOptionDef = schemaCommand.options[0];
  const outOptionDef = schemaCommand.options[1];

  const formatOption = formatOptionDef ? resolveOption(args, formatOptionDef) : 'ndjson';
  const format = typeof formatOption === 'string' ? formatOption : 'ndjson';

  const outOption = outOptionDef ? resolveOption(args, outOptionDef) : undefined;
  const outPath = typeof outOption === 'string' ? outOption : undefined;

  // Currently only ndjson format is supported
  if (format !== 'ndjson') {
    return {
      success: false,
      exitCode: EXIT_CODES.USAGE,
      error: `Error: Unsupported format '${format}'. Only 'ndjson' is supported.`,
      duration: performance.now() - startTime,
    };
  }

  const output = JSON.stringify(NDJSON_SCHEMA, null, 2);

  // Write to file if requested
  if (outPath) {
    try {
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, output, 'utf-8');
      return {
        success: true,
        exitCode: EXIT_CODES.SUCCESS,
        output: `Schema written to: ${outPath}`,
        artifacts: [outPath],
        duration: performance.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        exitCode: EXIT_CODES.ERROR,
        error: `Error: Failed to write schema - ${errorMessage}`,
        duration: performance.now() - startTime,
      };
    }
  }

  return {
    success: true,
    exitCode: EXIT_CODES.SUCCESS,
    output,
    duration: performance.now() - startTime,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { NDJSON_SCHEMA };
