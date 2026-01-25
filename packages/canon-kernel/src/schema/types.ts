/**
 * OMEGA Canon Kernel — Schema Types
 *
 * Schemas define the structure of entities in the Canon.
 */

import type { SchemaId } from '../types/identifiers';

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'reference'  // Reference to another entity
  | 'enum';

export interface FieldDefinition {
  readonly name: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly description?: string;
  readonly default_value?: unknown;
  readonly enum_values?: readonly string[];  // For enum type
  readonly reference_schema?: SchemaId;       // For reference type
  readonly array_item_type?: FieldType;       // For array type
  readonly is_critical?: boolean;             // Critical fields require gate approval
}

export interface RelationDefinition {
  readonly name: string;
  readonly target_schema: SchemaId;
  readonly cardinality: 'one' | 'many';
  readonly inverse_name?: string;
  readonly description?: string;
}

export interface Schema {
  readonly id: SchemaId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly fields: readonly FieldDefinition[];
  readonly relations: readonly RelationDefinition[];
  readonly created_at: string;  // ISO date
  readonly deprecated?: boolean;
  readonly successor?: SchemaId;  // If deprecated, which schema replaces it
}

/**
 * Create a field definition with defaults.
 */
export function createField(
  name: string,
  type: FieldType,
  options?: Partial<Omit<FieldDefinition, 'name' | 'type'>>
): FieldDefinition {
  return {
    name,
    type,
    required: options?.required ?? false,
    ...(options?.description !== undefined && { description: options.description }),
    ...(options?.default_value !== undefined && { default_value: options.default_value }),
    ...(options?.enum_values !== undefined && { enum_values: options.enum_values }),
    ...(options?.reference_schema !== undefined && { reference_schema: options.reference_schema }),
    ...(options?.array_item_type !== undefined && { array_item_type: options.array_item_type }),
    ...(options?.is_critical !== undefined && { is_critical: options.is_critical }),
  };
}

/**
 * Create a relation definition.
 */
export function createRelation(
  name: string,
  target_schema: SchemaId,
  cardinality: 'one' | 'many',
  options?: Partial<Omit<RelationDefinition, 'name' | 'target_schema' | 'cardinality'>>
): RelationDefinition {
  return {
    name,
    target_schema,
    cardinality,
    ...(options?.inverse_name !== undefined && { inverse_name: options.inverse_name }),
    ...(options?.description !== undefined && { description: options.description }),
  };
}

/**
 * Get all critical fields from a schema.
 */
export function getCriticalFields(schema: Schema): readonly FieldDefinition[] {
  return schema.fields.filter(f => f.is_critical === true);
}

/**
 * Check if a field is defined in schema.
 */
export function hasField(schema: Schema, fieldName: string): boolean {
  return schema.fields.some(f => f.name === fieldName);
}
