// tests/prose-directive/lot2-instructions.test.ts
// LOT 2 — 4 tests
// W2 — Phase T

import { describe, it, expect } from 'vitest';
import { LOT2_INSTRUCTIONS, getLot2AsPromptBlock } from '../../src/prose-directive/lot2-instructions.js';
import { LOT1_INSTRUCTIONS } from '../../src/prose-directive/lot1-instructions.js';
import { INSTRUCTION_TOGGLE_TABLE } from '../../src/prose-directive/instruction-toggle-table.js';

describe('LOT 2 — PDB instructions', () => {

  // Test 1: LOT2_INSTRUCTIONS a exactement 3 entrées
  it('LOT2_INSTRUCTIONS a exactement 3 entrées', () => {
    expect(LOT2_INSTRUCTIONS).toHaveLength(3);
    expect(LOT2_INSTRUCTIONS[0].id).toBe('LOT2-01');
    expect(LOT2_INSTRUCTIONS[1].id).toBe('LOT2-02');
    expect(LOT2_INSTRUCTIONS[2].id).toBe('LOT2-03');
  });

  // Test 2: IDs uniques dans l'ensemble LOT1+LOT2
  it('IDs uniques dans LOT1+LOT2', () => {
    const allIds = [
      ...LOT1_INSTRUCTIONS.map(i => i.id),
      ...LOT2_INSTRUCTIONS.map(i => i.id),
    ];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  // Test 3: getLot2AsPromptBlock() retourne les 3 instructions (aucune shape conflict)
  it('getLot2AsPromptBlock() retourne les 3 instructions', () => {
    const block = getLot2AsPromptBlock();
    expect(block).toContain('[LOT2-01]');
    expect(block).toContain('[LOT2-02]');
    expect(block).toContain('[LOT2-03]');
  });

  // Test 4: LOT2 dans INSTRUCTION_TOGGLE_TABLE: 3 entrées enabled_by_default=true
  it('LOT2 dans toggle table: 3 entrées enabled_by_default=true', () => {
    const lot2Entries = INSTRUCTION_TOGGLE_TABLE.filter(e => e.lot === 'LOT2');
    expect(lot2Entries).toHaveLength(3);
    for (const entry of lot2Entries) {
      expect(entry.enabled_by_default).toBe(true);
    }
  });
});
