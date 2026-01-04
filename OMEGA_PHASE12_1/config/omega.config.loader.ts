// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA PROJECT — CONFIGURATION LOADER
// Phase 12 — Industrial Deployment
// Standard: NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS COVERED:
// - INV-CFG-01: Validation stricte au démarrage
// - INV-CFG-02: Config invalide = refus démarrage (throws)
// - INV-CFG-03: Zéro valeur par défaut implicite
// - INV-CFG-04: Config Object.freeze()
//
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from "node:fs";
import { 
  validateOmegaConfig, 
  type OmegaConfig, 
  type ConfigValidationResult 
} from "./omega.config.schema.js";

/**
 * Error codes for configuration failures
 * Supports INV-HARD-04 (explicit states)
 */
export const CONFIG_ERROR_CODES = Object.freeze({
  FILE_NOT_FOUND: "OMEGA_CONFIG_FILE_NOT_FOUND",
  FILE_READ_ERROR: "OMEGA_CONFIG_FILE_READ_ERROR",
  JSON_PARSE_ERROR: "OMEGA_CONFIG_JSON_PARSE_ERROR",
  VALIDATION_ERROR: "OMEGA_CONFIG_VALIDATION_ERROR",
  ENCODING_ERROR: "OMEGA_CONFIG_ENCODING_ERROR",
} as const);

export type ConfigErrorCode = typeof CONFIG_ERROR_CODES[keyof typeof CONFIG_ERROR_CODES];

/**
 * Configuration load error with structured information
 * Supports forensic audit (INV-TRACE-05)
 */
export class OmegaConfigError extends Error {
  public readonly code: ConfigErrorCode;
  public readonly details: readonly string[];
  public readonly path: string;
  public readonly timestamp: string;
  
  constructor(code: ConfigErrorCode, message: string, path: string, details: string[] = []) {
    super(message);
    this.name = "OmegaConfigError";
    this.code = code;
    this.path = path;
    this.details = Object.freeze(details);
    this.timestamp = new Date().toISOString();
    
    // Ensure prototype chain is correct
    Object.setPrototypeOf(this, OmegaConfigError.prototype);
    
    // Freeze the error object
    Object.freeze(this);
  }
  
  /**
   * Format error for logging/display
   */
  toLogEntry(): string {
    const lines = [
      `[${this.timestamp}] ${this.code}`,
      `  Path: ${this.path}`,
      `  Message: ${this.message}`,
    ];
    
    if (this.details.length > 0) {
      lines.push("  Details:");
      for (const detail of this.details) {
        lines.push(`    - ${detail}`);
      }
    }
    
    return lines.join("\n");
  }
}

/**
 * Detect and reject files with BOM or non-UTF8 encoding
 * Supports INV-DEP-02 (Merkle stability - no encoding issues)
 */
function checkEncoding(buffer: Buffer, path: string): void {
  // Check for UTF-8 BOM (0xEF 0xBB 0xBF)
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.ENCODING_ERROR,
      "File contains UTF-8 BOM - remove BOM for deterministic parsing",
      path
    );
  }
  
  // Check for UTF-16 LE BOM (0xFF 0xFE)
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.ENCODING_ERROR,
      "File is UTF-16 LE encoded - must be UTF-8 without BOM",
      path
    );
  }
  
  // Check for UTF-16 BE BOM (0xFE 0xFF)
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.ENCODING_ERROR,
      "File is UTF-16 BE encoded - must be UTF-8 without BOM",
      path
    );
  }
}

/**
 * Normalize line endings for deterministic parsing
 * CRLF -> LF to ensure Merkle stability across platforms
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Load and validate OMEGA configuration from file
 * 
 * This function:
 * 1. Checks file existence
 * 2. Reads file as buffer (for encoding check)
 * 3. Validates encoding (no BOM, UTF-8 only)
 * 4. Parses JSON
 * 5. Validates against schema
 * 6. Returns frozen config or throws
 * 
 * @param path - Path to configuration JSON file
 * @returns Validated and frozen OmegaConfig
 * @throws OmegaConfigError on any failure (INV-CFG-02)
 * 
 * INVARIANTS:
 * - INV-CFG-01: Full validation performed
 * - INV-CFG-02: Throws on invalid (never returns partial/default)
 * - INV-CFG-03: No defaults applied
 * - INV-CFG-04: Returns frozen object
 */
export function loadOmegaConfig(path: string): OmegaConfig {
  // Step 1: Check file existence
  if (!existsSync(path)) {
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.FILE_NOT_FOUND,
      `Configuration file not found: ${path}`,
      path
    );
  }
  
  // Step 2: Read file as buffer
  let buffer: Buffer;
  try {
    buffer = readFileSync(path);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.FILE_READ_ERROR,
      `Failed to read configuration file: ${message}`,
      path
    );
  }
  
  // Step 3: Check encoding
  checkEncoding(buffer, path);
  
  // Step 4: Convert to string and normalize
  const rawContent = buffer.toString("utf8");
  const normalizedContent = normalizeLineEndings(rawContent);
  
  // Step 5: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.JSON_PARSE_ERROR,
      `Invalid JSON in configuration file: ${message}`,
      path
    );
  }
  
  // Step 6: Validate against schema
  const result: ConfigValidationResult = validateOmegaConfig(parsed);
  
  if (!result.ok) {
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.VALIDATION_ERROR,
      "Configuration validation failed",
      path,
      [...result.errors]
    );
  }
  
  // Return frozen config (already frozen by validateOmegaConfig)
  return result.config;
}

/**
 * Load configuration from string (for testing/programmatic use)
 * 
 * @param content - JSON string content
 * @param sourceName - Name for error reporting (default: "<string>")
 * @returns Validated and frozen OmegaConfig
 * @throws OmegaConfigError on any failure
 */
export function loadOmegaConfigFromString(content: string, sourceName = "<string>"): OmegaConfig {
  // Normalize line endings
  const normalizedContent = normalizeLineEndings(content);
  
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.JSON_PARSE_ERROR,
      `Invalid JSON: ${message}`,
      sourceName
    );
  }
  
  // Validate
  const result = validateOmegaConfig(parsed);
  
  if (!result.ok) {
    throw new OmegaConfigError(
      CONFIG_ERROR_CODES.VALIDATION_ERROR,
      "Configuration validation failed",
      sourceName,
      [...result.errors]
    );
  }
  
  return result.config;
}

/**
 * Validate configuration without loading from file
 * Useful for pre-flight checks
 * 
 * @param config - Configuration object to validate
 * @returns ConfigValidationResult
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  return validateOmegaConfig(config);
}

/**
 * Check if error is an OmegaConfigError
 */
export function isConfigError(error: unknown): error is OmegaConfigError {
  return error instanceof OmegaConfigError;
}
