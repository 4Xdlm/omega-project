/**
 * nexus/atlas - View Model Store
 * Standard: NASA-Grade L4
 *
 * Phase A: Full implementation with query, index, subscriptions
 *
 * @packageDocumentation
 * @module @omega-private/nexus-atlas
 * @public
 */

/**
 * Atlas module version
 * @public
 */
export const ATLAS_VERSION = '2.0.0' as const;

/**
 * Type definitions
 * @public
 */
export * from './types.js';

/**
 * Error classes
 * @public
 */
export * from './errors.js';

/**
 * Query engine functions
 * @public
 */
export { executeQuery, validateQuery } from './query.js';

/**
 * Index management
 * @public
 */
export { IndexManager } from './indexManager.js';

/**
 * Subscription management
 * @public
 */
export { SubscriptionManager } from './subscriptions.js';

/**
 * Main Atlas store
 * @public
 */
export { AtlasStore } from './store.js';
export type { AtlasStoreConfig } from './store.js';
