// tests/prose-directive/lot3-instructions.test.ts
// LOT 3 — 4 tests
// W3a — Phase T

import { describe, it, expect } from 'vitest';
import { LOT3_INSTRUCTIONS, getLot3AsPromptBlock } from '../../src/prose-directive/lot3-instructions.js';
import { LOT1_INSTRUCTIONS } from '../../src/prose-directive/lot1-instructions.js';
import { LOT2_INSTRUCTIONS } from '../../src/prose-directive/lot2-instructions.js';
import { INSTRUCTION_TOGGLE_TABLE } from '../../src/prose-directive/instruction-toggle-table.js';

describe('LOT 3 — PDB instructions (Genesis v2)', () => {

  // Test 1: LOT3_INSTRUCTIONS a exactement 4 entrées
  it('LOT3_INSTRUCTIONS a exactement 4 entrées', () => {
    expect(LOT3_INSTRUCTIONS).toHaveLength(4);
    expect(LOT3_INSTRUCTIONS[0].id).toBe('LOT3-01');
    expect(LOT3_INSTRUCTIONS[1].id).toBe('LOT3-02');
    expect(LOT3_INSTRUCTIONS[2].id).toBe('LOT3-03');
    expect(LOT3_INSTRUCTIONS[3].id).toBe('LOT3-04');
  });

  // Test 2: IDs uniques dans l'ensemble LOT1+LOT2+LOT3
  it('IDs uniques dans LOT1+LOT2+LOT3', () => {
    const allIds = [
      ...LOT1_INSTRUCTIONS.map(i => i.id),
      ...LOT2_INSTRUCTIONS.map(i => i.id),
      ...LOT3_INSTRUCTIONS.map(i => i.id),
    ];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  // Test 3: getLot3AsPromptBlock() retourne les 4 instructions
  it('getLot3AsPromptBlock() retourne les 4 instructions', () => {
    const block = getLot3AsPromptBlock();
    expect(block).toContain('[LOT3-01]');
    expect(block).toContain('[LOT3-02]');
    expect(block).toContain('[LOT3-03]');
    expect(block).toContain('[LOT3-04]');
  });

  // Test 4: LOT3 dans INSTRUCTION_TOGGLE_TABLE: 4 entrées enabled_by_default=true, total 11
  it('LOT3 dans toggle table: 4 entrées enabled + total 11 entrées', () => {
    const lot3Entries = INSTRUCTION_TOGGLE_TABLE.filter(e => e.lot === 'LOT3');
    expect(lot3Entries).toHaveLength(4);
    for (const entry of lot3Entries) {
      expect(entry.enabled_by_default).toBe(true);
      expect(entry.risk_class).toBe('MEDIUM');
    }
    // Total: 4 LOT1 + 3 LOT2 + 4 LOT3 = 11
    expect(INSTRUCTION_TOGGLE_TABLE).toHaveLength(11);
  });
});
