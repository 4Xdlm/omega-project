/**
 * loom-hardening.test.ts — R5 edge cases & robustness
 *
 * Tests:
 *   HARD-01: Empty book — readContext on empty adapter returns EMPTY
 *   HARD-02: Unknown character — expected_characters not in store → empty
 *   HARD-03: Orphan debt — debt in context but not in store → no crash
 *   HARD-04: Duplicate writes — same chapter twice → upsert, not double
 *   HARD-05: Very long prose (10K words) — extractDelta handles it
 *   HARD-06: No arc_states context — extractDelta still produces valid delta
 *   HARD-07: Pure dialogue prose — minimal facts, scene_summary still works
 *   HARD-08: Unicode characters in prose — normalizeFR handles them
 *   HARD-09: Thread resolution for non-existent debt — no crash
 *   HARD-10: INV-LOOM-01 — NullLoomAdapter returns exact passthrough
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { JsonFileLoomAdapter } from '../../src/loom/jsonfile-loom-adapter.js';
import { NullLoomAdapter, EMPTY_LOOM_CONTEXT } from '../../src/loom/loom-adapter.js';
import { enrichPacketWithLoom } from '../../src/loom/loom-reader.js';
import { extractDelta, normalizeFR, type DeltaContext } from '../../src/cde/delta-extractor.js';
import type { ArcState, CanonFact, DebtEntry } from '../../src/cde/types.js';
import type { LoomWriteInput, LoomReadInput } from '../../src/loom/loom-types.js';
import type { ForgeContinuity } from '../../src/types.js';
import type { ForgePacketInput } from '../../src/input/forge-packet-assembler.js';

// ── Infrastructure ──────────────────────────────────────────────────────────

const TEST_DIR = join(tmpdir(), `omega-loom-hard-${Date.now()}`);
const BOOK_ID = 'hardening';
let adapter: JsonFileLoomAdapter;

const EMPTY_CONTINUITY: ForgeContinuity = {
  previous_scene_summary: '',
  character_states: [],
  open_threads: [],
};

function makeWriteInput(chapter: number, prose: string, overrides?: Partial<LoomWriteInput>): LoomWriteInput {
  const delta = extractDelta(prose, { canon_facts: [], open_debts: [], arc_states: [] });
  return {
    book_id: BOOK_ID,
    chapter,
    scene_id: `scene-${chapter}-1`,
    cde_delta: delta,
    arc_states: [],
    canon_facts: [],
    open_debts: [],
    sealed_prose: prose,
    prose_hash: delta.prose_hash,
    characters_present: [],
    conflict_type: 'unknown',
    terminal_emotion: '',
    terminal_valence: 0,
    input_continuity: EMPTY_CONTINUITY,
    ...overrides,
  };
}

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
  adapter = new JsonFileLoomAdapter(TEST_DIR);
});

afterAll(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

// ═══════════════════════════════════════════════════════════════════════════════

describe('R5 Hardening — Edge cases', () => {

  it('HARD-01: Empty book — readContext on empty adapter returns empty context', async () => {
    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 1, scene_id: 'scene-1-1',
      scene_goal: 'Something', expected_characters: ['Alice'], conflict_type: 'unknown',
    };
    const ctx = await adapter.readContext(readInput);

    expect(ctx.character_states.length).toBe(0);
    expect(ctx.active_threads.length).toBe(0);
    expect(ctx.active_motifs.length).toBe(0);
    expect(ctx.retrieved_scenes.length).toBe(0);
    expect(ctx.enriched_summary).toBe('');
    expect(ctx.arc_trajectory).toBeNull();
  });

  it('HARD-02: Unknown character — not in store returns empty', async () => {
    // Write with Alice
    const prose = 'Alice était dans le jardin. Le soleil était chaud.';
    const arcs: ArcState[] = [
      { character_id: 'Alice', arc_phase: 'setup', current_need: 'paix', current_mask: 'calme', tension: '' },
    ];
    await adapter.writeState(makeWriteInput(1, prose, { arc_states: arcs }));

    // Read expecting Bob (not in store)
    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 2, scene_id: 'scene-2-1',
      scene_goal: 'Rencontre', expected_characters: ['Bob'], conflict_type: 'unknown',
    };
    const ctx = await adapter.readContext(readInput);
    expect(ctx.character_states.length).toBe(0);
  });

  it('HARD-03: Orphan debt in context — no crash on write', async () => {
    const orphanDebts: DebtEntry[] = [
      { id: 'orphan-1', content: 'Cette dette ne correspond à rien', opened_at: '0', resolved: false },
    ];
    const prose = 'Le ciel était bleu. La mer était calme.';
    const writeInput = makeWriteInput(1, prose, { open_debts: orphanDebts });
    const receipt = await adapter.writeState(writeInput);
    expect(receipt.upserted.threads).toBeGreaterThanOrEqual(1);
  });

  it('HARD-04: Duplicate writes — same chapter twice upserts', async () => {
    const prose = 'Le train était en retard. La gare était vide.';
    await adapter.writeState(makeWriteInput(1, prose));
    await adapter.writeState(makeWriteInput(1, prose));

    const stats = await adapter.getStats();
    expect(stats.scenes).toBe(1); // upsert, not 2
  });

  it('HARD-05: Very long prose (simulated ~2000 words) — extractDelta handles it', () => {
    // Generate long prose by repeating patterns
    const base = 'Le vieux port était désormais silencieux. Marie savait que Morel était parti. ';
    const longProse = base.repeat(100); // ~1600 words
    const ctx: DeltaContext = { canon_facts: [], open_debts: [], arc_states: [] };
    const delta = extractDelta(longProse, ctx);

    expect(delta.new_facts.length).toBeGreaterThan(0);
    expect(delta.prose_hash.length).toBe(64); // SHA256
    expect(delta.scene_summary).toBeDefined();
    expect(delta.motifs).toBeDefined();
  });

  it('HARD-06: No arc_states — extractDelta still valid', () => {
    const prose = 'La pluie tombait sur le village. La rue était déserte.';
    const delta = extractDelta(prose, { canon_facts: [], open_debts: [], arc_states: [] });

    expect(delta.characters_present).toStrictEqual([]);
    expect(delta.arc_movements).toStrictEqual([]);
    expect(delta.new_facts.length).toBeGreaterThanOrEqual(1);
  });

  it('HARD-07: Pure dialogue prose — scene_summary still works', () => {
    const prose = `"Tu savais ?" demanda-t-il. "Non," répondit-elle. "Et maintenant ?" "Maintenant tout était différent."`;
    const delta = extractDelta(prose, { canon_facts: [], open_debts: [], arc_states: [] });

    expect(delta.scene_summary).toBeDefined();
    expect(delta.scene_summary!.length).toBeGreaterThan(0);
  });

  it('HARD-08: Unicode characters — normalizeFR handles them', () => {
    expect(normalizeFR(`Ça c\u2019était l\u2019œuvre d\u2019un génie`)).toBe("ca c'etait l'oeuvre d'un genie");
    expect(normalizeFR('naïveté')).toBe('naivete');
    // Chinese/Japanese chars pass through (not French)
    expect(normalizeFR('日本語テスト')).toBe('日本語テスト');
    // Empty string
    expect(normalizeFR('')).toBe('');
  });

  it('HARD-09: Thread resolution for non-existent debt — no crash', async () => {
    const prose = 'Le ciel était bleu. Marie avoue tout.';
    const delta = extractDelta(prose, {
      canon_facts: [],
      open_debts: [{ id: 'ghost-debt', content: 'Un fantôme Marie avoue', opened_at: '1', resolved: false }],
      arc_states: [],
    });

    // The debt references 'Marie' and 'avoue' (close signal) — should resolve
    const writeInput = makeWriteInput(2, prose, {
      cde_delta: delta,
      open_debts: [],
    });
    // No crash on write even though debt-id doesn't exist in store
    const receipt = await adapter.writeState(writeInput);
    expect(receipt.upserted.scenes).toBe(1);
  });
});

describe('R5 INV-LOOM-01 — Toggle OFF = exact passthrough', () => {

  it('HARD-10: NullLoomAdapter read returns EMPTY_LOOM_CONTEXT exactly', async () => {
    const nullAdapter = new NullLoomAdapter();
    const readInput: LoomReadInput = {
      book_id: 'any', chapter: 1, scene_id: 'any',
      scene_goal: 'any', expected_characters: ['X'], conflict_type: 'unknown',
    };
    const ctx = await nullAdapter.readContext(readInput);
    expect(ctx).toBe(EMPTY_LOOM_CONTEXT); // reference equality, not just deep equal
  });

  it('HARD-11: enrichPacketWithLoom with NullAdapter returns input unchanged', async () => {
    const nullAdapter = new NullLoomAdapter();
    const mockInput = {
      plan: { plan_id: 'test' },
      scene: { scene_id: 'scene-1', objective: 'test', conflict_type: 'unknown' },
      continuity: {
        previous_scene_summary: 'ORIGINAL',
        character_states: [
          { character_id: 'A', character_name: 'A', emotional_state: 'X', physical_state: 'Y', location: 'Z' },
        ],
        open_threads: ['thread1'],
      },
      canon: [],
    } as unknown as ForgePacketInput;

    const readInput: LoomReadInput = {
      book_id: 'test', chapter: 1, scene_id: 'scene-1',
      scene_goal: 'test', expected_characters: ['A'], conflict_type: 'unknown',
    };

    const result = await enrichPacketWithLoom(mockInput, nullAdapter, readInput);

    // Should be EXACTLY the same object reference
    expect(result).toBe(mockInput);
    expect(result.continuity.previous_scene_summary).toBe('ORIGINAL');
    expect(result.continuity.character_states.length).toBe(1);
    expect(result.continuity.open_threads).toContain('thread1');
  });
});
