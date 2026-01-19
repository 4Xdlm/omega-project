/**
 * nexus/atlas - View Model Store
 * Standard: NASA-Grade L4
 *
 * Phase A: Full implementation with query, index, subscriptions
 */

// Version
export const ATLAS_VERSION = '2.0.0' as const;

// Types
export * from './types.js';

// Errors
export * from './errors.js';

// Query Engine
export { executeQuery, validateQuery } from './query.js';

// Index Manager
export { IndexManager } from './indexManager.js';

// Subscription Manager
export { SubscriptionManager } from './subscriptions.js';

// Main Store
export { AtlasStore } from './store.js';
export type { AtlasStoreConfig } from './store.js';
