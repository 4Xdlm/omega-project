/**
 * OMEGA Genesis Planner — Prompt Builder Tests
 * Sprint S-HARDEN H2-PROMPT
 */

import { describe, it, expect } from 'vitest';
import { buildArcPrompt, buildScenePrompt, buildBeatPrompt, parseWithRepair } from '../../src/providers/prompt-builder.js';
import {
  SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS,
  SCENARIO_A_EMOTION,
} from '../fixtures.js';
import { createDefaultConfig } from '../../src/config.js';
import type { Arc, Scene } from '../../src/types.js';

const config = createDefaultConfig();

// ═══════════════════════ GROUP 1 — Arc Prompt ═══════════════════════

describe('buildArcPrompt', () => {
  it('should include intent title', () => {
    const prompt = buildArcPrompt(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(prompt).toContain('Le Gardien');
  });

  it('should include all canon entries', () => {
    const prompt = buildArcPrompt(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(prompt).toContain('CANON-001');
    expect(prompt).toContain('CANON-005');
    expect(prompt).toContain('Lighthouse on remote island');
  });

  it('should include scene count constraints', () => {
    const prompt = buildArcPrompt(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(prompt).toContain('4');  // min_scenes
    expect(prompt).toContain('8');  // max_scenes
  });

  it('should include output schema with arc_id pattern', () => {
    const prompt = buildArcPrompt(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(prompt).toContain('ARC-001');
    expect(prompt).toContain('"scenes": []');
  });

  it('should include banned topics', () => {
    const prompt = buildArcPrompt(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(prompt).toContain('Banned topics');
  });

  it('should include forbidden cliches', () => {
    const prompt = buildArcPrompt(SCENARIO_A_INTENT, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS);
    expect(prompt).toContain('dark and stormy night');
  });
});

// ═══════════════════════ GROUP 2 — Scene Prompt ═══════════════════════

describe('buildScenePrompt', () => {
  const mockArc: Arc = {
    arc_id: 'ARC-001',
    theme: 'isolation',
    progression: 'Building dread',
    scenes: [],
    justification: 'Test arc',
  };

  it('should include arc context', () => {
    const prompt = buildScenePrompt(mockArc, 0, 2, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    expect(prompt).toContain('ARC-001');
    expect(prompt).toContain('isolation');
  });

  it('should include emotion waypoints', () => {
    const prompt = buildScenePrompt(mockArc, 0, 2, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    expect(prompt).toContain('fear');
    expect(prompt).toContain('sadness');
  });

  it('should include scene schema with all required fields', () => {
    const prompt = buildScenePrompt(mockArc, 0, 2, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    expect(prompt).toContain('scene_id');
    expect(prompt).toContain('conflict_type');
    expect(prompt).toContain('emotion_intensity');
    expect(prompt).toContain('sensory_anchor');
    expect(prompt).toContain('subtext');
    expect(prompt).toContain('target_word_count');
  });

  it('should include scene count limits per arc', () => {
    const prompt = buildScenePrompt(mockArc, 0, 2, SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_EMOTION);
    expect(prompt).toContain('Scenes for this arc');
  });
});

// ═══════════════════════ GROUP 3 — Beat Prompt ═══════════════════════

describe('buildBeatPrompt', () => {
  const mockScene: Scene = {
    scene_id: 'SCN-ARC-001-001',
    arc_id: 'ARC-001',
    objective: 'Introduce the lighthouse',
    conflict: 'Strange sounds from the deep',
    conflict_type: 'external',
    emotion_target: 'fear',
    emotion_intensity: 0.6,
    seeds_planted: [],
    seeds_bloomed: [],
    subtext: {
      character_thinks: 'test',
      reader_knows: 'test',
      tension_type: 'test',
      implied_emotion: 'test',
    },
    sensory_anchor: 'salt spray',
    constraints: [],
    beats: [],
    target_word_count: 500,
    justification: 'Test scene',
  };

  it('should include scene context', () => {
    const prompt = buildBeatPrompt(mockScene, 0, config);
    expect(prompt).toContain('SCN-ARC-001-001');
    expect(prompt).toContain('Strange sounds from the deep');
  });

  it('should include beat schema', () => {
    const prompt = buildBeatPrompt(mockScene, 0, config);
    expect(prompt).toContain('beat_id');
    expect(prompt).toContain('tension_delta');
    expect(prompt).toContain('pivot');
  });

  it('should include beat count limits from config', () => {
    const prompt = buildBeatPrompt(mockScene, 0, config);
    const minBeats = String(config.MIN_BEATS_PER_SCENE.value);
    const maxBeats = String(config.MAX_BEATS_PER_SCENE.value);
    expect(prompt).toContain(minBeats);
    expect(prompt).toContain(maxBeats);
  });
});

// ═══════════════════════ GROUP 4 — parseWithRepair ═══════════════════════

describe('parseWithRepair', () => {
  it('should parse valid JSON directly', () => {
    const result = parseWithRepair('[{"arc_id":"ARC-001"}]');
    expect(result).toEqual([{ arc_id: 'ARC-001' }]);
  });

  it('should parse JSON wrapped in markdown fences', () => {
    const result = parseWithRepair('```json\n[{"arc_id":"ARC-001"}]\n```');
    expect(result).toEqual([{ arc_id: 'ARC-001' }]);
  });

  it('should parse JSON wrapped in plain fences', () => {
    const result = parseWithRepair('```\n{"key":"val"}\n```');
    expect(result).toEqual({ key: 'val' });
  });

  it('should extract JSON from surrounding text', () => {
    const result = parseWithRepair('Here is the result:\n[{"id":1}]\nDone.');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should return null for completely invalid input', () => {
    const result = parseWithRepair('This is not JSON at all');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseWithRepair('');
    expect(result).toBeNull();
  });

  it('should handle multiline JSON in fences', () => {
    const input = '```json\n[\n  {"id": 1},\n  {"id": 2}\n]\n```';
    const result = parseWithRepair(input);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
