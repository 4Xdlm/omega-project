import type { EventType } from '../types.js';

export const EVENT_TYPES: readonly EventType[] = [
  'CREATED',
  'UPDATED',
  'DELETED',
  'VALIDATED',
] as const;

export function isValidEventType(type: string): type is EventType {
  return EVENT_TYPES.includes(type as EventType);
}
