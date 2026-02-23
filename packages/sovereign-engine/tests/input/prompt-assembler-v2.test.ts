/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROMPT ASSEMBLER V2 — Tests Sprint S0-A
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Invariants couverts:
 * - INV-S-PROMPT-01: 12+ sections obligatoires dans le prompt souverain
 * - INV-S-PROMPT-02: sections CRITICAL présentes (mission, emotion_contract, beats)
 * - INV-S-PROMPT-03: prompt_hash déterministe (même packet → même hash)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { buildSovereignPrompt } from '../../src/input/prompt-assembler-v2.js';
import type { SovereignPrompt, PromptSection } from '../../src/types.js';
import { MINIMAL_FORGE_PACKET } from './__fixtures__/minimal-forge-packet.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Prompt Assembler V2 — INV-S-PROMPT-01/02/03', () => {

  // ─── T01: retourne SovereignPrompt structuré ─────────────────────────────
  it('T01: returns valid SovereignPrompt with sections, total_length, prompt_hash', () => {
    const prompt: SovereignPrompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    expect(Array.isArray(prompt.sections)).toBe(true);
    expect(typeof prompt.total_length).toBe('number');
    expect(prompt.total_length).toBeGreaterThan(0);
    expect(typeof prompt.prompt_hash).toBe('string');
    expect(prompt.prompt_hash).toHaveLength(64);
  });

  // ─── T02: minimum 12 sections [INV-S-PROMPT-01] ─────────────────────────
  it('T02: at least 12 sections in sovereign prompt [INV-S-PROMPT-01]', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    expect(prompt.sections.length).toBeGreaterThanOrEqual(12);
  });

  // ─── T03: sections CRITICAL obligatoires [INV-S-PROMPT-02] ──────────────
  it('T03: mission, emotion_contract, beats are CRITICAL sections [INV-S-PROMPT-02]', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    const criticalIds = ['mission', 'emotion_contract', 'beats'];
    for (const id of criticalIds) {
      const section = prompt.sections.find(s => s.section_id === id);
      expect(section).toBeDefined();
      expect(section!.priority).toBe('critical');
    }
  });

  // ─── T04: hash déterministe [INV-S-PROMPT-03] ───────────────────────────
  it('T04: same packet → identical prompt_hash (determinism) [INV-S-PROMPT-03]', () => {
    const p1 = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const p2 = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    expect(p1.prompt_hash).toBe(p2.prompt_hash);
    expect(p1.total_length).toBe(p2.total_length);
    expect(p1.sections).toHaveLength(p2.sections.length);
  });

  // ─── T05: total_length = somme des content.length ────────────────────────
  it('T05: total_length equals sum of all section content lengths', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    const expected = prompt.sections.reduce((sum, s) => sum + s.content.length, 0);
    expect(prompt.total_length).toBe(expected);
  });

  // ─── T06: schema PromptSection complet ──────────────────────────────────
  it('T06: each section has section_id, title, content, priority', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const validPriorities = ['critical', 'high', 'medium', 'low'];

    for (const section of prompt.sections) {
      expect(typeof section.section_id).toBe('string');
      expect(section.section_id.length).toBeGreaterThan(0);
      expect(typeof section.title).toBe('string');
      expect(typeof section.content).toBe('string');
      expect(section.content.length).toBeGreaterThan(0);
      expect(validPriorities).toContain(section.priority);
    }
  });

  // ─── T07: section_ids uniques ────────────────────────────────────────────
  it('T07: section_ids are unique within the prompt', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const ids = prompt.sections.map(s => s.section_id);
    const unique = new Set(ids);

    expect(unique.size).toBe(ids.length);
  });

  // ─── T08: mission contient scene_id et quality_tier ─────────────────────
  it('T08: mission section contains scene_id and quality_tier', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const mission = prompt.sections.find(s => s.section_id === 'mission');

    expect(mission).toBeDefined();
    expect(mission!.content).toContain(MINIMAL_FORGE_PACKET.scene_id);
    expect(mission!.content).toContain(MINIMAL_FORGE_PACKET.quality_tier.toUpperCase());
  });

  // ─── T09: emotion_contract contient les 4 quartiles ─────────────────────
  it('T09: emotion_contract section mentions Q1, Q2, Q3, Q4', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const ec = prompt.sections.find(s => s.section_id === 'emotion_contract');

    expect(ec).toBeDefined();
    expect(ec!.content).toContain('Q1');
    expect(ec!.content).toContain('Q2');
    expect(ec!.content).toContain('Q3');
    expect(ec!.content).toContain('Q4');
  });

  // ─── T10: beats section contient les actions ─────────────────────────────
  it('T10: beats section contains beat actions', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const beats = prompt.sections.find(s => s.section_id === 'beats');

    expect(beats).toBeDefined();
    for (const beat of MINIMAL_FORGE_PACKET.beats) {
      expect(beats!.content).toContain(beat.action);
    }
  });

  // ─── T11: kill_lists section référence les counts ────────────────────────
  it('T11: kill_lists section present and priority=high', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const kl = prompt.sections.find(s => s.section_id === 'kill_lists');

    expect(kl).toBeDefined();
    expect(kl!.priority).toBe('high');
  });

  // ─── T12: langue française obligatoire dans mission ──────────────────────
  it('T12: mission section enforces French language (fr packet)', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const mission = prompt.sections.find(s => s.section_id === 'mission');

    // FR enforcement text must be present
    expect(mission!.content).toContain('français');
  });

  // ─── T13: rhythm_prescription présent (section HIGH) ────────────────────
  it('T13: rhythm_prescription section present with priority=high', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const rhythm = prompt.sections.find(s => s.section_id === 'rhythm_prescription');

    expect(rhythm).toBeDefined();
    expect(rhythm!.priority).toBe('high');
  });

  // ─── T14: corporeal_anchoring présent (section HIGH) ────────────────────
  it('T14: corporeal_anchoring section present with priority=high', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const corp = prompt.sections.find(s => s.section_id === 'corporeal_anchoring');

    expect(corp).toBeDefined();
    expect(corp!.priority).toBe('high');
  });

  // ─── T15: sections de priorité HIGH/MEDIUM/LOW présentes ─────────────────
  it('T15: at least 1 section for each priority level', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);

    const priorities = new Set(prompt.sections.map(s => s.priority));
    expect(priorities.has('critical')).toBe(true);
    expect(priorities.has('high')).toBe(true);
    expect(priorities.has('medium')).toBe(true);
    expect(priorities.has('low')).toBe(true);
  });

  // ─── T16: section intent contient target_word_count ─────────────────────
  it('T16: intent section contains target_word_count', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const intent = prompt.sections.find(s => s.section_id === 'intent');

    expect(intent).toBeDefined();
    expect(intent!.content).toContain(String(MINIMAL_FORGE_PACKET.intent.target_word_count));
  });

  // ─── T17: canon section contient les statements ──────────────────────────
  it('T17: canon section contains canon statements', () => {
    const prompt = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const canon = prompt.sections.find(s => s.section_id === 'canon');

    expect(canon).toBeDefined();
    for (const entry of MINIMAL_FORGE_PACKET.canon) {
      expect(canon!.content).toContain(entry.statement);
    }
  });

  // ─── T18: hash différent si packet différent ────────────────────────────
  it('T18: different packets → different prompt_hash', () => {
    const p1 = buildSovereignPrompt(MINIMAL_FORGE_PACKET);
    const p2 = buildSovereignPrompt({
      ...MINIMAL_FORGE_PACKET,
      scene_id: 'scene_DIFFERENT',
      packet_id: 'FORGE_scene_DIFFERENT_run_test_001',
    });

    expect(p1.prompt_hash).not.toBe(p2.prompt_hash);
  });
});
