// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CANON V1 — IO ABSTRACTION
// Version: 1.1
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { pathTraversal, pathUnsafe } from './errors';

/**
 * Interface d'abstraction IO pour Node.js et Tauri
 * Toutes les opérations fichier passent par cette interface
 */
export interface OmegaIO {
  // ─── Read Operations ───
  readFile(root: string, relativePath: string): Promise<string>;
  exists(root: string, relativePath: string): Promise<boolean>;
  readDir(root: string, relativePath: string): Promise<string[]>;
  
  // ─── Write Operations ───
  writeFile(root: string, relativePath: string, content: string): Promise<void>;
  mkdir(root: string, relativePath: string, recursive?: boolean): Promise<void>;
  
  // ─── Modify Operations ───
  rename(root: string, oldPath: string, newPath: string): Promise<void>;
  delete(root: string, relativePath: string): Promise<void>;
  
  // ─── Aliases (optional, for compatibility) ───
  remove?(root: string, relativePath: string): Promise<void>;  // Alias for delete
  move?(oldPath: string, newPath: string): Promise<void>;      // Direct path move
  
  // ─── Utility ───
  join(...parts: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH SECURITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patterns dangereux à détecter
 */
const DANGEROUS_PATTERNS = [
  /\.\./,                           // Parent directory traversal
  /^[a-zA-Z]:[\\\/]/,               // Windows absolute (C:\, D:/)
  /^[\\\/]/,                        // Unix absolute or UNC
  /\x00/,                           // Null byte
  /%2f/i,                           // URL-encoded / (pas %2e%2e car pas de decode)
  /%5c/i,                           // URL-encoded \
];

/**
 * Valide qu'un chemin est relatif et sûr
 * 
 * RÈGLES :
 * 1. Pas de traversée (.., ../, ..\)
 * 2. Pas de chemin absolu (/, C:\, \\server)
 * 3. Pas de caractères nuls
 * 4. Pas d'encodage URL malicieux (mais PAS de decode, on check juste la présence)
 * 
 * @param path Le chemin à valider
 * @throws CanonError si le chemin est dangereux
 */
export function validateRelativePath(path: string): void {
  // Check 1: Empty or whitespace only
  if (!path || path.trim() === '') {
    throw pathUnsafe(path, 'Path is empty or whitespace only');
  }
  
  // Check 2: Dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(path)) {
      const reason = pattern.source.includes('..') ? 'Path traversal detected' :
                     pattern.source.includes('[a-zA-Z]') ? 'Absolute path detected (Windows)' :
                     pattern.source.includes('^[\\\\') ? 'Absolute path detected (Unix/UNC)' :
                     pattern.source.includes('\\x00') ? 'Null byte detected' :
                     'URL-encoded characters detected';
      
      throw pattern.source.includes('..') 
        ? pathTraversal(path) 
        : pathUnsafe(path, reason);
    }
  }
  
  // Check 3: Normalized check (path shouldn't change after normalization)
  // Note: This is defensive programming, actual implementation would use path.normalize()
  // from Node.js or equivalent in Tauri
  if (path.includes('//') || path.includes('\\\\')) {
    throw pathUnsafe(path, 'Double slashes detected');
  }
  
  // Check 4: Special names (Windows reserved)
  const basename = path.split(/[/\\]/).pop() || '';
  const RESERVED_NAMES = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                          'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                          'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  
  if (RESERVED_NAMES.includes(basename.toUpperCase())) {
    throw pathUnsafe(path, `Reserved filename: ${basename}`);
  }
}
