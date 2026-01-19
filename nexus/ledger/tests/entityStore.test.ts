/**
 * EntityStore Tests - NASA-Grade brutal
 * CORRECTION #3: Uses __clearForTests()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as EventStore from '../src/events/eventStore.js';
import * as EntityStore from '../src/entities/entityStore.js';
import type { Event } from '../src/types.js';

describe('EntityStore', () => {
  beforeEach(() => {
    EventStore.__clearForTests();
  });

  describe('project', () => {
    it('should return undefined for unknown entity', () => {
      expect(EntityStore.project('unknown')).toBeUndefined();
    });

    it('should project CREATED event', () => {
      // Arrange
      const event: Event = {
        type: 'CREATED',
        payload: { id: '1', name: 'Test' },
        timestamp: 1000,
      };

      // Act
      EventStore.append(event);
      const entity = EntityStore.project('1');

      // Assert
      expect(entity).toEqual({
        id: '1',
        state: { id: '1', name: 'Test' },
        version: 1,
      });
    });

    it('should project UPDATED event', () => {
      // Arrange
      EventStore.append({
        type: 'CREATED',
        payload: { id: '1', name: 'Original' },
        timestamp: 1000,
      });
      EventStore.append({
        type: 'UPDATED',
        payload: { id: '1', name: 'Updated' },
        timestamp: 2000,
      });

      // Act
      const entity = EntityStore.project('1');

      // Assert
      expect(entity?.state['name']).toBe('Updated');
      expect(entity?.version).toBe(2);
    });

    it('should return undefined after DELETE', () => {
      // Arrange
      EventStore.append({
        type: 'CREATED',
        payload: { id: '1' },
        timestamp: 1000,
      });
      EventStore.append({
        type: 'DELETED',
        payload: { id: '1' },
        timestamp: 2000,
      });

      // Act
      const entity = EntityStore.project('1');

      // Assert
      expect(entity).toBeUndefined();
    });

    it('should replay events in order (determinism)', () => {
      // Arrange
      EventStore.append({
        type: 'CREATED',
        payload: { id: '1', value: 0 },
        timestamp: 1,
      });
      EventStore.append({
        type: 'UPDATED',
        payload: { id: '1', value: 10 },
        timestamp: 2,
      });
      EventStore.append({
        type: 'UPDATED',
        payload: { id: '1', value: 20 },
        timestamp: 3,
      });

      // Act
      const entity = EntityStore.project('1');

      // Assert
      expect(entity?.state['value']).toBe(20);
      expect(entity?.version).toBe(3);
    });

    it('should freeze result', () => {
      EventStore.append({
        type: 'CREATED',
        payload: { id: '1' },
        timestamp: 1,
      });

      const entity = EntityStore.project('1')!;

      expect(() => {
        (entity as { version: number }).version = 999;
      }).toThrow();
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle 100 events for same entity', () => {
      for (let i = 0; i < 100; i++) {
        EventStore.append({
          type: i === 0 ? 'CREATED' : 'UPDATED',
          payload: { id: '1', iteration: i },
          timestamp: i,
        });
      }

      const entity = EntityStore.project('1');
      expect(entity?.version).toBe(100);
    });
  });
});
