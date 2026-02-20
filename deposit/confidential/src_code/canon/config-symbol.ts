/**
 * OMEGA Canon Config Symbol v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-CONFIG-01: Toute valeur calibrable = ConfigSymbol
 * - INV-E-CONFIG-02: Résolution déterministe et testable
 *
 * RÈGLE INT-E-02: 0 constante magique
 */

/**
 * Branded type for config key references.
 * Ensures type-safety when referencing config values.
 */
export type ConfigSymbol<K extends string = string> = K & { readonly __configSymbol: unique symbol };

/**
 * Creates a typed config symbol from a string key.
 */
export function configSymbol<K extends string>(key: K): ConfigSymbol<K> {
  return key as ConfigSymbol<K>;
}

/**
 * Resolver interface for config values.
 * All numeric/string constants MUST come from a resolver.
 */
export interface ConfigResolver {
  /**
   * Resolve a config value as unknown (for type checking).
   * @throws ConfigResolutionError if key not found
   */
  resolve<K extends string>(key: ConfigSymbol<K>): unknown;

  /**
   * Resolve a config value as number.
   * @throws ConfigResolutionError if key not found or not a number
   */
  resolveNumber<K extends string>(key: ConfigSymbol<K>): number;

  /**
   * Resolve a config value as string.
   * @throws ConfigResolutionError if key not found or not a string
   */
  resolveString<K extends string>(key: ConfigSymbol<K>): string;

  /**
   * Check if a config key exists.
   */
  has<K extends string>(key: ConfigSymbol<K>): boolean;
}

/**
 * Error thrown when config resolution fails.
 */
export class ConfigResolutionError extends Error {
  constructor(
    public readonly key: string,
    public readonly reason: 'NOT_FOUND' | 'TYPE_MISMATCH',
    public readonly expectedType?: string,
    public readonly actualType?: string
  ) {
    const msg =
      reason === 'NOT_FOUND'
        ? `Config key not found: ${key}`
        : `Config type mismatch for ${key}: expected ${expectedType}, got ${actualType}`;
    super(msg);
    this.name = 'ConfigResolutionError';
  }
}

/**
 * JSON file-based config resolver.
 * Loads config from a JSON file at construction time.
 */
export class JsonConfigResolver implements ConfigResolver {
  private readonly config: Record<string, unknown>;

  constructor(configData: Record<string, unknown>) {
    this.config = { ...configData };
  }

  resolve<K extends string>(key: ConfigSymbol<K>): unknown {
    if (!(key in this.config)) {
      throw new ConfigResolutionError(key, 'NOT_FOUND');
    }
    return this.config[key];
  }

  resolveNumber<K extends string>(key: ConfigSymbol<K>): number {
    const value = this.resolve(key);
    if (typeof value !== 'number') {
      throw new ConfigResolutionError(key, 'TYPE_MISMATCH', 'number', typeof value);
    }
    return value;
  }

  resolveString<K extends string>(key: ConfigSymbol<K>): string {
    const value = this.resolve(key);
    if (typeof value !== 'string') {
      throw new ConfigResolutionError(key, 'TYPE_MISMATCH', 'string', typeof value);
    }
    return value;
  }

  has<K extends string>(key: ConfigSymbol<K>): boolean {
    return key in this.config;
  }
}

/**
 * Creates a test config resolver with inline values.
 * Used in tests for deterministic configuration.
 */
export function createTestConfigResolver(values: Record<string, unknown>): ConfigResolver {
  return new JsonConfigResolver(values);
}

/**
 * Loads config from a JSON file path.
 * @param filePath - Absolute path to JSON config file
 */
export async function loadJsonConfig(filePath: string): Promise<ConfigResolver> {
  const { readFile } = await import('fs/promises');
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content) as Record<string, unknown>;
  return new JsonConfigResolver(data);
}

/**
 * Loads config synchronously from a JSON file path.
 * @param filePath - Absolute path to JSON config file
 */
export function loadJsonConfigSync(filePath: string): ConfigResolver {
  const { readFileSync } = require('fs') as typeof import('fs');
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as Record<string, unknown>;
  return new JsonConfigResolver(data);
}

/**
 * Merges multiple config resolvers into one.
 * Later resolvers override earlier ones for the same key.
 */
export function mergeConfigResolvers(...resolvers: ConfigResolver[]): ConfigResolver {
  const merged: Record<string, unknown> = {};

  for (const resolver of resolvers) {
    // Try to extract internal config if JsonConfigResolver
    if (resolver instanceof JsonConfigResolver) {
      const internalConfig = (resolver as unknown as { config: Record<string, unknown> }).config;
      Object.assign(merged, internalConfig);
    }
  }

  return new JsonConfigResolver(merged);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANON CONFIG SYMBOLS (Phase E)
// ═══════════════════════════════════════════════════════════════════════════════

/** ID generation config symbols */
export const ID_RNG_HEX_LEN = configSymbol('ID_RNG_HEX_LEN');
export const ID_FORMAT_REGEX_CLM = configSymbol('ID_FORMAT_REGEX_CLM');
export const ID_FORMAT_REGEX_ENT = configSymbol('ID_FORMAT_REGEX_ENT');
export const ID_FORMAT_REGEX_EVD = configSymbol('ID_FORMAT_REGEX_EVD');

/** Segment config symbols */
export const SEGMENT_MAX_BYTES = configSymbol('SEGMENT_MAX_BYTES');
export const SEGMENT_TARGET_BYTES = configSymbol('SEGMENT_TARGET_BYTES');
export const SEGMENT_ROTATE_STRATEGY = configSymbol('SEGMENT_ROTATE_STRATEGY');
export const SEGMENT_PREFIX = configSymbol('SEGMENT_PREFIX');
export const SEGMENT_EXTENSION = configSymbol('SEGMENT_EXTENSION');

/** Performance config symbols */
export const P95_GETBYID_TARGET_MS = configSymbol('P95_GETBYID_TARGET_MS');
export const P95_QUERY_TARGET_MS = configSymbol('P95_QUERY_TARGET_MS');
export const PERF_SEED_CLAIMS_COUNT = configSymbol('PERF_SEED_CLAIMS_COUNT');
