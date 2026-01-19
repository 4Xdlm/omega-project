/**
 * Raw Storage Types
 * Standard: NASA-Grade L4
 */

export interface RawEntry {
  readonly key: string;
  readonly value: unknown;
  readonly timestamp: number;
}

export interface StorageOptions {
  readonly persistent?: boolean;
  readonly compressed?: boolean;
}

export interface StorageResult {
  readonly success: boolean;
  readonly error?: string;
}
