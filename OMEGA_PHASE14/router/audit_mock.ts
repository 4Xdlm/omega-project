/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Audit Mock
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Mock implementation of RouterAudit for testing.
 * 
 * @module router/audit_mock
 * @version 3.14.0
 */

import type { RouterAudit, RouterAuditEvent } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK AUDIT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class MockAudit implements RouterAudit {
  private events: RouterAuditEvent[] = [];
  
  /**
   * Append an audit event
   */
  append(event: RouterAuditEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
  
  /**
   * Get all events
   */
  getEvents(): RouterAuditEvent[] {
    return [...this.events];
  }
  
  /**
   * Get events by action
   */
  getEventsByAction(action: RouterAuditEvent['action']): RouterAuditEvent[] {
    return this.events.filter(e => e.action === action);
  }
  
  /**
   * Get last event
   */
  getLastEvent(): RouterAuditEvent | undefined {
    return this.events[this.events.length - 1];
  }
  
  /**
   * Get event count
   */
  count(): number {
    return this.events.length;
  }
  
  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

/**
 * Create a new mock audit instance
 */
export function createMockAudit(): MockAudit {
  return new MockAudit();
}
