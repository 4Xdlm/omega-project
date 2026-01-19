/**
 * EventStore Tests - NASA-Grade brutal
 * CORRECTION #3: Uses __clearForTests()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as EventStore from '../src/events/eventStore.js';
import type { Event } from '../src/types.js';

describe('EventStore', () => {
  beforeEach(() => {
    EventStore.__clearForTests();
  });

  describe('append', () => {
    it('should append valid event', () => {
      // Arrange
      const event: Event = {
        type: 'CREATED',
        payload: { id: '1' },
        timestamp: 1000,
      };

      // Act
      EventStore.append(event);

      // Assert
      expect(EventStore.getCount()).toBe(1);
      expect(EventStore.getAll()[0]).toEqual(event);
    });

    it('should be append-only (no modification)', () => {
      // Arrange
      const event: Event = {
        type: 'CREATED',
        payload: { id: '1' },
        timestamp: 1000,
      };

      // Act
      EventStore.append(event);
      const retrieved = EventStore.getAll()[0];

      // Assert - event is frozen
      expect(() => {
        (retrieved as { type: string }).type = 'UPDATED';
      }).toThrow();
    });

    it('should preserve order (determinism)', () => {
      // Arrange
      const e1: Event = { type: 'CREATED', payload: {}, timestamp: 1 };
      const e2: Event = { type: 'UPDATED', payload: {}, timestamp: 2 };
      const e3: Event = { type: 'DELETED', payload: {}, timestamp: 3 };

      // Act
      EventStore.append(e1);
      EventStore.append(e2);
      EventStore.append(e3);

      // Assert
      const all = EventStore.getAll();
      expect(all[0]).toEqual(e1);
      expect(all[1]).toEqual(e2);
      expect(all[2]).toEqual(e3);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no events', () => {
      expect(EventStore.getAll()).toEqual([]);
    });

    it('should return frozen copy', () => {
      const event: Event = { type: 'CREATED', payload: {}, timestamp: 1 };
      EventStore.append(event);

      const all = EventStore.getAll();
      expect(() => {
        (all as Event[]).push({ type: 'CREATED', payload: {}, timestamp: 2 });
      }).toThrow();
    });
  });

  describe('getCount', () => {
    it('should return 0 initially', () => {
      expect(EventStore.getCount()).toBe(0);
    });

    it('should return correct count', () => {
      EventStore.append({ type: 'CREATED', payload: {}, timestamp: 1 });
      EventStore.append({ type: 'CREATED', payload: {}, timestamp: 2 });
      expect(EventStore.getCount()).toBe(2);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle 1000 events', () => {
      for (let i = 0; i < 1000; i++) {
        EventStore.append({
          type: 'CREATED',
          payload: { id: i.toString() },
          timestamp: i,
        });
      }
      expect(EventStore.getCount()).toBe(1000);
    });
  });
});
