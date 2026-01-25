/**
 * OMEGA Canon Kernel — Critical Field Registry
 *
 * Modules define which fields are CRITICAL.
 * Kernel applies the rule: CRITICAL → no auto-resolve, requires gate approval.
 */

import type { SchemaId } from '../types/identifiers';
import type { FieldPath } from '../types/operations';

export interface CriticalFieldDefinition {
  readonly schema_id: SchemaId;
  readonly field_path: FieldPath;
  readonly reason: string;
  readonly registered_by: string;  // Module that registered this
  readonly registered_at: string;  // ISO date
}

export class CriticalFieldRegistry {
  private readonly fields: Map<string, CriticalFieldDefinition> = new Map();

  /**
   * Register a critical field (called by modules).
   */
  register(definition: CriticalFieldDefinition): void {
    const key = this.toKey(definition.schema_id, definition.field_path);
    if (this.fields.has(key)) {
      throw new Error(`Critical field already registered: ${key}`);
    }
    this.fields.set(key, definition);
  }

  /**
   * Unregister a critical field (rare, requires audit).
   */
  unregister(schemaId: SchemaId, fieldPath: FieldPath): boolean {
    const key = this.toKey(schemaId, fieldPath);
    return this.fields.delete(key);
  }

  /**
   * Check if a field is critical (called by kernel).
   */
  isCritical(schemaId: SchemaId, fieldPath: FieldPath): boolean {
    const key = this.toKey(schemaId, fieldPath);
    return this.fields.has(key);
  }

  /**
   * Get the definition for a critical field.
   */
  getDefinition(schemaId: SchemaId, fieldPath: FieldPath): CriticalFieldDefinition | undefined {
    const key = this.toKey(schemaId, fieldPath);
    return this.fields.get(key);
  }

  /**
   * Get reason why field is critical.
   */
  getReason(schemaId: SchemaId, fieldPath: FieldPath): string | undefined {
    return this.getDefinition(schemaId, fieldPath)?.reason;
  }

  /**
   * Get all critical fields for a schema.
   */
  getForSchema(schemaId: SchemaId): readonly CriticalFieldDefinition[] {
    const result: CriticalFieldDefinition[] = [];
    for (const def of this.fields.values()) {
      if (def.schema_id === schemaId) {
        result.push(def);
      }
    }
    return result;
  }

  /**
   * Get all registered critical fields.
   */
  getAll(): readonly CriticalFieldDefinition[] {
    return Array.from(this.fields.values());
  }

  /**
   * Get count of registered critical fields.
   */
  get size(): number {
    return this.fields.size;
  }

  /**
   * Clear all registrations (for testing only).
   */
  clear(): void {
    this.fields.clear();
  }

  private toKey(schemaId: SchemaId, fieldPath: FieldPath): string {
    return `${schemaId}:${fieldPath.join('.')}`;
  }
}

/**
 * Singleton registry instance.
 * Modules register critical fields at initialization.
 */
export const criticalFieldRegistry = new CriticalFieldRegistry();

/**
 * Helper to register a critical field with current timestamp.
 */
export function registerCriticalField(
  schemaId: SchemaId,
  fieldPath: FieldPath,
  reason: string,
  registeredBy: string
): void {
  criticalFieldRegistry.register({
    schema_id: schemaId,
    field_path: fieldPath,
    reason,
    registered_by: registeredBy,
    registered_at: new Date().toISOString(),
  });
}
