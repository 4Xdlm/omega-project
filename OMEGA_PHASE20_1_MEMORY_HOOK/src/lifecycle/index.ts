/**
 * OMEGA Memory Hook — Lifecycle Index
 * Phase 20.1 — v3.20.1
 */

export { onStart, isLoadAllowed, type StartupResult, type StartupOptions } from './onStart.js';
export { onShutdown, isSaveAllowed, type ShutdownResult, type ShutdownOptions } from './onShutdown.js';
export { SafeModeManager, createSafeModeManager, type SafeModeSession, type SafeModeOptions } from './safeMode.js';
