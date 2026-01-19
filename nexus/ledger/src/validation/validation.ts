/**
 * Event Validation - Runtime strict
 * Standard: NASA-Grade L4
 */

import type { Event, ValidationResult } from '../types.js';
import { isValidEventType } from '../events/eventTypes.js';

export function validateEvent(event: Event): ValidationResult {
  const errors: string[] = [];

  if (!event.type) {
    errors.push('Missing event type');
  } else if (!isValidEventType(event.type)) {
    errors.push(`Invalid event type: ${event.type}`);
  }

  if (!event.payload || typeof event.payload !== 'object') {
    errors.push('Missing or invalid payload');
  }

  if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
    errors.push('Missing or invalid timestamp');
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
