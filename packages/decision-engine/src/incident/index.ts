/**
 * @fileoverview INCIDENT module public exports.
 * @module @omega/decision-engine/incident
 */

export type {
  IncidentLog,
  IncidentLogOptions,
  IncidentStorage,
} from './types.js';

export {
  DefaultIncidentLog,
  createIncidentLog,
} from './incident-log.js';

export {
  InMemoryIncidentStorage,
  createInMemoryStorage,
  validateStorageIntegrity,
} from './storage.js';
