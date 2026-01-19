/**
 * Atlas Module Entry Point Tests - NASA-Grade
 * Phase A: Updated for new implementation
 */

import { describe, it, expect } from 'vitest';
import * as Atlas from '../src/index.js';

describe('nexus/atlas', () => {
  it('should export version constant', () => {
    expect(Atlas.ATLAS_VERSION).toBe('2.0.0');
  });

  it('should export AtlasStore class', () => {
    expect(Atlas.AtlasStore).toBeDefined();
    expect(typeof Atlas.AtlasStore).toBe('function');
  });

  it('should export IndexManager class', () => {
    expect(Atlas.IndexManager).toBeDefined();
    expect(typeof Atlas.IndexManager).toBe('function');
  });

  it('should export SubscriptionManager class', () => {
    expect(Atlas.SubscriptionManager).toBeDefined();
    expect(typeof Atlas.SubscriptionManager).toBe('function');
  });

  it('should export query functions', () => {
    expect(Atlas.executeQuery).toBeDefined();
    expect(Atlas.validateQuery).toBeDefined();
    expect(typeof Atlas.executeQuery).toBe('function');
    expect(typeof Atlas.validateQuery).toBe('function');
  });

  it('should export error classes', () => {
    expect(Atlas.AtlasViewNotFoundError).toBeDefined();
    expect(Atlas.AtlasViewAlreadyExistsError).toBeDefined();
    expect(Atlas.AtlasQueryError).toBeDefined();
    expect(Atlas.AtlasIndexError).toBeDefined();
    expect(Atlas.AtlasSubscriptionError).toBeDefined();
  });

  it('should export utility functions', () => {
    expect(Atlas.seededRNG).toBeDefined();
    expect(typeof Atlas.seededRNG).toBe('function');
  });

  it('should export clock constants', () => {
    expect(Atlas.systemClock).toBeDefined();
    expect(typeof Atlas.systemClock.now).toBe('function');
  });

  it('should have valid AtlasView type', () => {
    const view: Atlas.AtlasView = {
      id: '1',
      data: { name: 'test' },
      timestamp: 1000,
      version: 1,
    };
    expect(view.id).toBe('1');
    expect(view.timestamp).toBe(1000);
    expect(view.version).toBe(1);
  });

  it('should have valid AtlasQuery type', () => {
    const query: Atlas.AtlasQuery = {
      filter: { field: 'status', operator: 'eq', value: 'active' },
      limit: 10,
      offset: 0,
    };
    expect(query.limit).toBe(10);
  });

  it('should have valid AtlasResult type', () => {
    const result: Atlas.AtlasResult = {
      views: [],
      total: 0,
      hasMore: false,
    };
    expect(result.views.length).toBe(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
