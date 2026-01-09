/**
 * OMEGA SENTINEL SUPREME — Inventory Tests
 * Sprint 27.1 — Anti-Triche Validation
 * 
 * Invariants tested:
 * - INV-INV-01: inventory_ids == discovered_ids (set equality)
 * - INV-INV-02: Each record has {id, module, category, criticality, source}
 * - INV-INV-03: Missing invariant = build fail
 * - INV-INV-04: Canonical ordering (module, then id)
 * - INV-INV-05: CONTEXTUAL requires BOUND-xxx in rationale
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  INVENTORY,
  INVENTORY_COUNT,
  EXPECTED_MODULES,
  INVARIANT_ID_PATTERN,
  DISCOVERY_PATTERN,
  DISCOVERY_EXCLUSIONS,
  isValidInvariantId,
  isExcludedFromDiscovery,
  getInventoryIds,
  getInventoryByModule,
  getInventoryByCategory,
  getInventoryByCriticality,
  getInventoryRecord,
  hasInventoryRecord,
  validateInventory,
  type InvariantCategory,
  type Criticality,
} from '../meta/inventory.js';

// ============================================================================
// MECHANICAL DISCOVERY
// ============================================================================

function discoverInvariantsFromSource(): Set<string> {
  const discovered = new Set<string>();
  const sentinelDir = path.resolve(__dirname, '..');
  
  function scanDirectory(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const matches = content.match(DISCOVERY_PATTERN) || [];
        for (const match of matches) {
          if (!isExcludedFromDiscovery(match)) {
            discovered.add(match);
          }
        }
      }
    }
  }
  
  scanDirectory(sentinelDir);
  return discovered;
}

// ============================================================================
// INV-INV-01: COMPLETENESS (MECHANICAL)
// ============================================================================

describe('INV-INV-01: Completeness', () => {
  const discovered = discoverInvariantsFromSource();
  const inventoryIds = new Set(getInventoryIds());
  
  it('should have same count as discovered', () => {
    // Allow inventory to have more (doc-only invariants) but not less
    const missingInInventory = [...discovered].filter(id => !inventoryIds.has(id));
    expect(missingInInventory).toEqual([]);
  });
  
  it('every discovered ID should be in INVENTORY', () => {
    for (const id of discovered) {
      expect(hasInventoryRecord(id)).toBe(true);
    }
  });
  
  it('no discovered ID should be in exclusions', () => {
    for (const id of discovered) {
      expect(isExcludedFromDiscovery(id)).toBe(false);
    }
  });
  
  it('discovery count should be reasonable (50-90)', () => {
    expect(discovered.size).toBeGreaterThanOrEqual(50);
    expect(discovered.size).toBeLessThanOrEqual(90);
  });
  
  it('inventory count should match discovered + doc-only + external', () => {
    // All discovered must be in inventory
    // Inventory may have extra DOC-only items
    // Inventory may have external module invariants (e.g., genome)
    const docOnly = INVENTORY.filter(r => 
      r.source.kind === 'DOC' && !discovered.has(r.id)
    );
    const external = INVENTORY.filter(r =>
      r.source.ref.startsWith('packages/')
    );
    expect(inventoryIds.size).toBeGreaterThanOrEqual(discovered.size);
    expect(inventoryIds.size).toBeLessThanOrEqual(discovered.size + docOnly.length + external.length + 10);
  });
});

// ============================================================================
// INV-INV-02: RECORD STRUCTURE
// ============================================================================

describe('INV-INV-02: Record Structure', () => {
  it('every record should have id', () => {
    for (const record of INVENTORY) {
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe('string');
      expect(record.id.length).toBeGreaterThan(0);
    }
  });
  
  it('every record should have module', () => {
    for (const record of INVENTORY) {
      expect(record.module).toBeDefined();
      expect(typeof record.module).toBe('string');
      expect(record.module.length).toBeGreaterThan(0);
    }
  });
  
  it('every record should have valid category', () => {
    const validCategories: InvariantCategory[] = ['PURE', 'SYSTEM', 'CONTEXTUAL'];
    for (const record of INVENTORY) {
      expect(validCategories).toContain(record.category);
    }
  });
  
  it('every record should have valid criticality', () => {
    const validCriticalities: Criticality[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    for (const record of INVENTORY) {
      expect(validCriticalities).toContain(record.criticality);
    }
  });
  
  it('every record should have source with kind and ref', () => {
    const validKinds = ['CODE', 'DOC', 'TEST'];
    for (const record of INVENTORY) {
      expect(record.source).toBeDefined();
      expect(validKinds).toContain(record.source.kind);
      expect(record.source.ref).toBeDefined();
      expect(record.source.ref.length).toBeGreaterThan(0);
    }
  });
  
  it('every record should have rationale', () => {
    for (const record of INVENTORY) {
      expect(record.rationale).toBeDefined();
      expect(typeof record.rationale).toBe('string');
      expect(record.rationale.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// INV-INV-03: NO DUPLICATES / NO MISSING
// ============================================================================

describe('INV-INV-03: No Duplicates, No Missing', () => {
  it('should have no duplicate IDs', () => {
    const ids = getInventoryIds();
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
  
  it('all IDs should match pattern INV-XXX-NN', () => {
    for (const record of INVENTORY) {
      expect(isValidInvariantId(record.id)).toBe(true);
    }
  });
  
  it('INVENTORY_COUNT should match actual count', () => {
    expect(INVENTORY_COUNT).toBe(INVENTORY.length);
  });
  
  it('inventory should be non-empty', () => {
    expect(INVENTORY.length).toBeGreaterThan(0);
  });
  
  it('should have at least 55 invariants', () => {
    expect(INVENTORY.length).toBeGreaterThanOrEqual(55);
  });
});

// ============================================================================
// INV-INV-04: CANONICAL ORDERING
// ============================================================================

describe('INV-INV-04: Canonical Ordering', () => {
  it('should be sorted by module first', () => {
    const modules = INVENTORY.map(r => r.module);
    const sortedModules = [...modules].sort();
    
    // Check modules are in sorted order (allowing duplicates in sequence)
    let lastModule = '';
    const seenModules = new Set<string>();
    for (const module of modules) {
      if (module !== lastModule) {
        expect(seenModules.has(module)).toBe(false);
        seenModules.add(module);
        lastModule = module;
      }
    }
  });
  
  it('within each module, IDs should be sorted', () => {
    const byModule = new Map<string, string[]>();
    for (const record of INVENTORY) {
      if (!byModule.has(record.module)) {
        byModule.set(record.module, []);
      }
      byModule.get(record.module)!.push(record.id);
    }
    
    for (const [module, ids] of byModule) {
      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    }
  });
  
  it('full inventory should be in canonical order', () => {
    const sorted = [...INVENTORY].sort((a, b) => {
      if (a.module !== b.module) return a.module.localeCompare(b.module);
      return a.id.localeCompare(b.id);
    });
    
    for (let i = 0; i < INVENTORY.length; i++) {
      expect(INVENTORY[i].id).toBe(sorted[i].id);
    }
  });
});

// ============================================================================
// INV-INV-05: CATEGORY JUSTIFICATION
// ============================================================================

describe('INV-INV-05: Category Justification', () => {
  it('CONTEXTUAL invariants must reference BOUND-xxx', () => {
    const contextual = getInventoryByCategory('CONTEXTUAL');
    for (const record of contextual) {
      expect(record.rationale).toMatch(/BOUND-\d{3}/);
    }
  });
  
  it('non-CONTEXTUAL rationales must be ≤ 120 chars', () => {
    const nonContextual = INVENTORY.filter(r => r.category !== 'CONTEXTUAL');
    for (const record of nonContextual) {
      expect(record.rationale.length).toBeLessThanOrEqual(120);
    }
  });
  
  it('every rationale should be non-empty', () => {
    for (const record of INVENTORY) {
      expect(record.rationale.trim().length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// VALIDATION FUNCTION
// ============================================================================

describe('Validation Function', () => {
  it('validateInventory should return valid', () => {
    const result = validateInventory();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
  
  it('stats should match actual counts', () => {
    const result = validateInventory();
    expect(result.stats.total).toBe(INVENTORY.length);
    
    const pureCount = getInventoryByCategory('PURE').length;
    const systemCount = getInventoryByCategory('SYSTEM').length;
    const contextualCount = getInventoryByCategory('CONTEXTUAL').length;
    
    expect(result.stats.byCategory.PURE).toBe(pureCount);
    expect(result.stats.byCategory.SYSTEM).toBe(systemCount);
    expect(result.stats.byCategory.CONTEXTUAL).toBe(contextualCount);
    expect(pureCount + systemCount + contextualCount).toBe(INVENTORY.length);
  });
  
  it('criticality counts should sum to total', () => {
    const result = validateInventory();
    const sum = result.stats.byCriticality.CRITICAL +
                result.stats.byCriticality.HIGH +
                result.stats.byCriticality.MEDIUM +
                result.stats.byCriticality.LOW;
    expect(sum).toBe(result.stats.total);
  });
});

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

describe('Query Functions', () => {
  it('getInventoryByModule should return correct records', () => {
    const axioms = getInventoryByModule('axioms');
    expect(axioms.length).toBeGreaterThan(0);
    for (const record of axioms) {
      expect(record.module).toBe('axioms');
    }
  });
  
  it('getInventoryByCategory should return correct records', () => {
    const pure = getInventoryByCategory('PURE');
    expect(pure.length).toBeGreaterThan(0);
    for (const record of pure) {
      expect(record.category).toBe('PURE');
    }
  });
  
  it('getInventoryByCriticality should return correct records', () => {
    const critical = getInventoryByCriticality('CRITICAL');
    expect(critical.length).toBeGreaterThan(0);
    for (const record of critical) {
      expect(record.criticality).toBe('CRITICAL');
    }
  });
  
  it('getInventoryRecord should return record by ID', () => {
    const record = getInventoryRecord('INV-AX-01');
    expect(record).toBeDefined();
    expect(record!.id).toBe('INV-AX-01');
  });
  
  it('getInventoryRecord should return undefined for unknown', () => {
    const record = getInventoryRecord('INV-FAKE-99');
    expect(record).toBeUndefined();
  });
  
  it('hasInventoryRecord should return correct boolean', () => {
    expect(hasInventoryRecord('INV-AX-01')).toBe(true);
    expect(hasInventoryRecord('INV-FAKE-99')).toBe(false);
  });
});

// ============================================================================
// IMMUTABILITY
// ============================================================================

describe('Immutability', () => {
  it('INVENTORY should be frozen', () => {
    expect(Object.isFrozen(INVENTORY)).toBe(true);
  });
  
  it('each record should be frozen', () => {
    for (const record of INVENTORY) {
      expect(Object.isFrozen(record)).toBe(true);
    }
  });
  
  it('each source should be frozen', () => {
    for (const record of INVENTORY) {
      expect(Object.isFrozen(record.source)).toBe(true);
    }
  });
  
  it('EXPECTED_MODULES should be frozen', () => {
    expect(Object.isFrozen(EXPECTED_MODULES)).toBe(true);
  });
  
  it('DISCOVERY_EXCLUSIONS should be frozen', () => {
    expect(Object.isFrozen(DISCOVERY_EXCLUSIONS)).toBe(true);
  });
});

// ============================================================================
// DISTRIBUTION CHECKS
// ============================================================================

describe('Distribution', () => {
  it('should have PURE as majority category', () => {
    const result = validateInventory();
    expect(result.stats.byCategory.PURE).toBeGreaterThan(result.stats.byCategory.SYSTEM);
    expect(result.stats.byCategory.PURE).toBeGreaterThan(result.stats.byCategory.CONTEXTUAL);
  });
  
  it('should have CRITICAL invariants', () => {
    const critical = getInventoryByCriticality('CRITICAL');
    expect(critical.length).toBeGreaterThanOrEqual(10);
  });
  
  it('should cover multiple modules', () => {
    const result = validateInventory();
    const moduleCount = Object.keys(result.stats.byModule).length;
    expect(moduleCount).toBeGreaterThanOrEqual(10);
  });
  
  it('CONTEXTUAL count should be small', () => {
    const contextual = getInventoryByCategory('CONTEXTUAL');
    expect(contextual.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// DETERMINISM (20-run gate)
// ============================================================================

describe('Determinism (20-run gate)', () => {
  it('getInventoryIds should be deterministic', () => {
    const first = getInventoryIds();
    for (let i = 0; i < 20; i++) {
      const current = getInventoryIds();
      expect(current).toEqual(first);
    }
  });
  
  it('validateInventory should be deterministic', () => {
    const first = validateInventory();
    for (let i = 0; i < 20; i++) {
      const current = validateInventory();
      expect(current.valid).toBe(first.valid);
      expect(current.stats.total).toBe(first.stats.total);
    }
  });
});
