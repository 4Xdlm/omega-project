/**
 * Atlas Tests - NASA-Grade
 * CORRECTION #1: Tests freeze removed (TS types are not runtime-frozen)
 */

import { describe, it, expect } from 'vitest';
import * as Atlas from '../src/index.js';

describe('nexus/atlas', () => {
  it('should export version constant', () => {
    expect(Atlas.ATLAS_VERSION).toBe('1.0.0');
  });

  it('should have valid AtlasView type', () => {
    const view: Atlas.AtlasView = {
      id: '1',
      data: {},
      timestamp: 1000,
    };
    expect(view.id).toBe('1');
    expect(view.timestamp).toBe(1000);
  });

  it('should have valid AtlasQuery type', () => {
    const query: Atlas.AtlasQuery = {
      filter: { status: 'active' },
      limit: 10,
      offset: 0,
    };
    expect(query.limit).toBe(10);
  });

  it('should have valid AtlasResult type', () => {
    const result: Atlas.AtlasResult = {
      views: [],
      total: 0,
    };
    expect(result.views.length).toBe(0);
    expect(result.total).toBe(0);
  });
});
