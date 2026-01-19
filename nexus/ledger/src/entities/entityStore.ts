/**
 * Entity Store - Projection via replay
 * Standard: NASA-Grade L4
 */

import type { Entity, Event } from '../types.js';
import * as EventStore from '../events/eventStore.js';

export function project(entityId: string): Entity | undefined {
  const events = EventStore.getAll();
  const relevantEvents = events.filter(
    (e) => e.payload['id'] === entityId
  );

  if (relevantEvents.length === 0) {
    return undefined;
  }

  let state: Record<string, unknown> = {};
  let version = 0;

  for (const event of relevantEvents) {
    switch (event.type) {
      case 'CREATED':
        state = { ...event.payload };
        version = 1;
        break;
      case 'UPDATED':
        state = { ...state, ...event.payload };
        version += 1;
        break;
      case 'DELETED':
        return undefined;
      default:
        // Ignore VALIDATED and future types
    }
  }

  return Object.freeze({ id: entityId, state, version });
}
