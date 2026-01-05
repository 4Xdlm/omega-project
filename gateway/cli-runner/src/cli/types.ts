/**
 * OMEGA CLI_RUNNER — Type Definitions
 * Phase 16.0 — NASA-Grade
 * 
 * Core type system for the CLI infrastructure.
 */

import type { ExitCode, OutputFormat, ExportFormat, RoutingType } from './constants.js';

// ============================================================================
// COMMAND ARGUMENT DEFINITIONS
// ============================================================================

export interface CLIArg {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

export interface CLIOption {
  short: string;        // e.g., '-o'
  long: string;         // e.g., '--output'
  description: string;
  hasValue: boolean;    // Does option take a value?
  default?: string;
  validator?: (value: string) => boolean;
}

// ============================================================================
// PARSED ARGUMENTS
// ============================================================================

export interface ParsedArgs {
  command: string;
  args: string[];
  options: Record<string, string | boolean>;
  raw: string[];
}

// ============================================================================
// COMMAND RESULT
// ============================================================================

export interface CLIResult {
  success: boolean;
  exitCode: ExitCode;
  output?: string;      // Standard output
  error?: string;       // Standard error
  duration: number;     // Execution time in ms
  artifacts?: string[]; // Created files
  metadata?: Record<string, unknown>;
}

// ============================================================================
// COMMAND DEFINITION
// ============================================================================

export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  args: CLIArg[];
  options: CLIOption[];
  routing: RoutingType;
  execute: (args: ParsedArgs) => Promise<CLIResult>;
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export interface EmotionScore {
  emotion: string;
  intensity: number;    // 0-1
  confidence: number;   // 0-1
}

export interface AnalysisResult {
  text: string;
  wordCount: number;
  sentenceCount: number;
  emotions: EmotionScore[];
  dominantEmotion: string;
  overallIntensity: number;
  timestamp: string;
  seed: number;
}

export interface ComparisonResult {
  file1: AnalysisResult;
  file2: AnalysisResult;
  emotionalDelta: number;
  dominantShift: string;
  similarity: number;   // 0-1
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface OmegaProject {
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  chapters: Chapter[];
  metadata: Record<string, unknown>;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  analysis?: AnalysisResult;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface HealthStatus {
  component: string;
  status: 'OK' | 'WARN' | 'ERROR';
  message?: string;
  latency?: number;
}

export interface HealthReport {
  overall: 'OK' | 'DEGRADED' | 'CRITICAL';
  timestamp: string;
  components: HealthStatus[];
  version: string;
}

// ============================================================================
// BATCH PROCESSING TYPES
// ============================================================================

export interface BatchItem {
  path: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  result?: AnalysisResult;
  error?: string;
}

export interface BatchResult {
  total: number;
  success: number;
  failed: number;
  items: BatchItem[];
  duration: number;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportOptions {
  format: ExportFormat;
  includeAnalysis: boolean;
  outputPath?: string;
}

export interface ExportResult {
  format: ExportFormat;
  path: string;
  size: number;
  chapters: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidOutputFormat(value: string): value is OutputFormat {
  return ['json', 'md', 'docx'].includes(value);
}

export function isValidExportFormat(value: string): value is ExportFormat {
  return ['json', 'md', 'docx'].includes(value);
}

export function isOmegaProject(obj: unknown): obj is OmegaProject {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.version === 'string' &&
    typeof o.name === 'string' &&
    Array.isArray(o.chapters)
  );
}
