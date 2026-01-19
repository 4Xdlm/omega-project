/**
 * Validation Tests - NASA-Grade brutal
 */

import { describe, it, expect } from 'vitest';
import { validateEvent } from '../src/validation/validation.js';
import type { Event } from '../src/types.js';

describe('validateEvent', () => {
  it('should accept valid event', () => {
    // Arrange
    const event: Event = {
      type: 'CREATED',
      payload: { id: '1' },
      timestamp: 1000,
    };

    // Act
    const result = validateEvent(event);

    // Assert
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject missing type', () => {
    const event = {
      payload: {},
      timestamp: 1000,
    } as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing event type');
  });

  it('should reject invalid type', () => {
    const event = {
      type: 'INVALID',
      payload: {},
      timestamp: 1000,
    } as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid event type'))).toBe(
      true
    );
  });

  it('should reject missing payload', () => {
    const event = {
      type: 'CREATED',
      timestamp: 1000,
    } as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('payload'))).toBe(true);
  });

  it('should reject invalid payload', () => {
    const event = {
      type: 'CREATED',
      payload: 'not-an-object',
      timestamp: 1000,
    } as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
  });

  it('should reject missing timestamp', () => {
    const event = {
      type: 'CREATED',
      payload: {},
    } as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('timestamp'))).toBe(true);
  });

  it('should reject invalid timestamp', () => {
    const event = {
      type: 'CREATED',
      payload: {},
      timestamp: -1,
    } as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
  });

  it('should accumulate multiple errors', () => {
    const event = {} as unknown as Event;

    const result = validateEvent(event);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should freeze result', () => {
    const event: Event = {
      type: 'CREATED',
      payload: {},
      timestamp: 1,
    };

    const result = validateEvent(event);

    expect(() => {
      (result as { valid: boolean }).valid = false;
    }).toThrow();
  });

  // Edge cases
  describe('edge cases', () => {
    it('should handle empty payload', () => {
      const event: Event = {
        type: 'CREATED',
        payload: {},
        timestamp: 1,
      };

      const result = validateEvent(event);
      expect(result.valid).toBe(true);
    });

    it('should handle sourceId optional', () => {
      const event: Event = {
        type: 'CREATED',
        payload: {},
        timestamp: 1,
        sourceId: 'src-1',
      };

      const result = validateEvent(event);
      expect(result.valid).toBe(true);
    });
  });
});
