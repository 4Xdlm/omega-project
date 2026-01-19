/**
 * Event sourcing types
 * Standard: NASA-Grade L4
 */

export type EventType =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'VALIDATED';

export interface Event {
  readonly type: EventType;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
  readonly sourceId?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface SourceMetadata {
  readonly sourceId: string;
  readonly name: string;
  readonly version: string;
}

export interface Entity {
  readonly id: string;
  readonly state: Record<string, unknown>;
  readonly version: number;
}
