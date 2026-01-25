/**
 * OMEGA Canon Kernel — Schema Module Index
 */

export {
  type FieldType,
  type FieldDefinition,
  type RelationDefinition,
  type Schema,
  createField,
  createRelation,
  getCriticalFields,
  hasField,
} from './types';

export {
  type CriticalFieldDefinition,
  CriticalFieldRegistry,
  criticalFieldRegistry,
  registerCriticalField,
} from './critical';
