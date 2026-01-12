/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Tooling Index
 * Point d'entrée pour tous les modules
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Registry Management
export * from './registry.js';
export { default as registry } from './registry.js';

// Hash Management
export * from './hash.js';
export { default as hash } from './hash.js';

// Merkle Tree
export * from './merkle.js';
export { default as merkle } from './merkle.js';

// Seal Management
export * from './seal.js';
export { default as seal } from './seal.js';

// Verification
export * from './verify.js';
export * from './guardian.js';
export * from './atlas.js';
export * from './automation.js';
export * from './templates.js';
export { default as verify } from './verify.js';

// Version info
export const VERSION = '1.0.0';
export const SPEC_VERSION = '2.2.3';
