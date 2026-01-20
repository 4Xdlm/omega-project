/**
 * nexus/ledger - Event sourcing ledger
 * Standard: NASA-Grade L4
 *
 * @packageDocumentation
 * @module @omega-private/nexus-ledger
 * @public
 */

/**
 * Ledger module version
 * @public
 */
export const LEDGER_VERSION = '2.0.0' as const;

/**
 * Type definitions
 * @public
 */
export * from './types.js';

/**
 * Event type definitions
 * @public
 */
export * from './events/eventTypes.js';

/**
 * Event store functionality
 * @public
 */
export * as EventStore from './events/eventStore.js';

/**
 * Registry functionality
 * @public
 */
export * as Registry from './registry/registry.js';

/**
 * Entity store functionality
 * @public
 */
export * as EntityStore from './entities/entityStore.js';

/**
 * Validation utilities
 * @public
 */
export * from './validation/validation.js';
