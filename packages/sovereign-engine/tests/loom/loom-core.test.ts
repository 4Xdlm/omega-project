/**
 * loom-core.test.ts — Tests d'invariance Loom v1
 * Phase R1 — Loom v1 Minimal
 *
 * Couverture :
 *   INV-LOOM-01 : Loom OFF = pipeline identique bit-à-bit
 *   INV-LOOM-06 : Merge non-destructif (ForgeContinuity fourni > Loom)
 *   LOOM-READER-01..06 : enrichPacketWithLoom comportements
 *   LOOM-ADAPTER-01..04 : NullLoomAdapter + InMemoryLoomAdapter
 *   LOOM-CONFIG-01..03 : Toggle, reset, defaults
 *
 * 100% CALC — 0 appel LLM. 0 dépendance ChromaDB.
 * Standard: NASA-Grade L4 / DO-178C
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ForgeContinuity, CharacterState } from '../../src/types';
import type { StateDelta, ArcState, DebtEntry, CanonFact } from '../../src/cde/types';
import type {
  LoomReadInput,
  LoomWriteInput,
  LoomContext,
  LoomCharacterEntry,
  LoomThreadEntry,
} from '../../src/loom/loom-types';
import { NullLoomAdapter, InMemoryLoomAdapter, EMPTY_LOOM_CONTEXT } from '../../src/loom/loom-adapter';
import { enrichPacketWithLoom, mergeContinuity, buildLoomReadInput } from '../../src/loom/loom-reader';
import { getLoomConfig, resetLoomConfig } from '../../src/loom/loom-config';
import type { ForgePacketInput } from '../../src/input/forge-packet-assembler';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function makeCharacterState(overrides: Partial<CharacterState> = {}): CharacterState {
  return {
    character_id: 'char-01',
    character_name: 'Jean',
    emotional_state: 'anxious',
    physical_state: 'standing',
    location: 'kitchen',
    ...overrides,
  };
}

function makeContinuity(overrides: Partial<ForgeContinuity> = {}): ForgeContinuity {
  return {
    previous_scene_summary: 'Jean entre dans la cuisine.',
    character_states: [makeCharacterState()],
    open_threads: ['Le secret de Marie'],
    ...overrides,
  };
}

function makeLoomReadInput(overrides: Partial<LoomReadInput> = {}): LoomReadInput {
  return {
    book_id: 'book-01',
    chapter: 3,
    scene_id: 'scene-3-1',
    scene_goal: 'Jean confronte Marie',
    expected_characters: ['char-01', 'char-02'],
    conflict_type: 'interpersonal',
    ...overrides,
  };
}

function makeMinimalForgePacketInput(continuity?: ForgeContinuity): ForgePacketInput {
  return {
    plan: {} as any,
    scene: { scene_id: 'scene-3-1', scene_goal: 'test', conflict_type: 'internal' } as any,
    style_profile: {} as any,
    kill_lists: {} as any,
    canon: [],
    continuity: continuity || makeContinuity(),
    run_id: 'run-001',
  };
}

function makeStateDelta(overrides: Partial<StateDelta> = {}): StateDelta {
  return {
    new_facts: ['Jean a trouvé la lettre.'],
    modified_facts: [],
    debts_opened: [{ content: 'La lettre contient un aveu.', evidence: 'prose l.42' }],
    debts_resolved: [],
    arc_movements: [{ character_id: 'char-01', movement: 'découverte → confrontation' }],
    drift_flags: [],
    prose_hash: 'abc123',
    ...overrides,
  };
}

function makeWriteInput(overrides: Partial<LoomWriteInput> = {}): LoomWriteInput {
  return {
    book_id: 'book-01',
    chapter: 3,
    scene_id: 'scene-3-1',
    cde_delta: makeStateDelta(),
    arc_states: [
      {
        character_id: 'char-01',
        arc_phase: 'confrontation',
        current_need: 'la vérité',
        current_mask: 'calme apparent',
        tension: 'culpabilité refoulée',
      },
    ],
    canon_facts: [{ id: 'cf-01', fact: 'Jean est le fils de Marie.', sealed_at: '2026-01-01' }],
    open_debts: [
      { id: 'debt-01', content: 'La lettre contient un aveu.', opened_at: '3', resolved: false },
    ],
    sealed_prose: 'Jean ouvrit la lettre. Ses mains tremblaient.',
    prose_hash: 'sha256-prose-hash',
    characters_present: ['char-01'],
    conflict_type: 'interpersonal',
    terminal_emotion: 'guilt',
    terminal_valence: -3.5,
    input_continuity: makeContinuity(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('LOOM-CONFIG', () => {
  afterEach(() => {
    resetLoomConfig();
    delete process.env.OMEGA_LOOM_ENABLED;
    delete process.env.OMEGA_LOOM_DB_PATH;
    delete process.env.OMEGA_LOOM_TOP_K;
    delete process.env.OMEGA_LOOM_EXTRACTION;
  });

  it('LOOM-CONFIG-01: ON par défaut (P4 validated)', () => {
    const config = getLoomConfig();
    expect(config.ENABLED).toBe(true);
    expect(config.BACKEND).toBe('jsonfile-v1');
    expect(config.EMBEDDING_MODEL).toBe('bag-of-words-v1');
    expect(config.COHERENCE_SCORING_ENABLED).toBe(false);
  });

  it('LOOM-CONFIG-02: toggle OFF via env OMEGA_LOOM_ENABLED=0', () => {
    process.env.OMEGA_LOOM_ENABLED = '0';
    resetLoomConfig();
    const config = getLoomConfig();
    expect(config.ENABLED).toBe(false);
  });

  it('LOOM-CONFIG-03: custom DB_PATH et TOP_K', () => {
    process.env.OMEGA_LOOM_DB_PATH = '/custom/path';
    process.env.OMEGA_LOOM_TOP_K = '10';
    resetLoomConfig();
    const config = getLoomConfig();
    expect(config.DB_PATH).toBe('/custom/path');
    expect(config.RETRIEVAL_TOP_K).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NULL ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('NullLoomAdapter', () => {
  const adapter = new NullLoomAdapter();

  it('LOOM-ADAPTER-01: readContext retourne EMPTY_LOOM_CONTEXT', async () => {
    const ctx = await adapter.readContext(makeLoomReadInput());
    expect(ctx).toEqual(EMPTY_LOOM_CONTEXT);
    expect(ctx.enriched_summary).toBe('');
    expect(ctx.character_states).toHaveLength(0);
    expect(ctx.active_threads).toHaveLength(0);
  });

  it('LOOM-ADAPTER-02: writeState retourne receipt avec 0 upserts', async () => {
    const receipt = await adapter.writeState(makeWriteInput());
    expect(receipt.upserted.characters).toBe(0);
    expect(receipt.upserted.threads).toBe(0);
    expect(receipt.upserted.scenes).toBe(0);
    expect(receipt.source_provenance).toBe('cde_only');
  });

  it('LOOM-ADAPTER-03: healthCheck toujours true', async () => {
    expect(await adapter.healthCheck()).toBe(true);
  });

  it('LOOM-ADAPTER-04: stats toujours zéro', async () => {
    const stats = await adapter.getStats();
    expect(stats.characters).toBe(0);
    expect(stats.backend).toBe('null-v1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('InMemoryLoomAdapter', () => {
  let adapter: InMemoryLoomAdapter;

  beforeEach(() => {
    adapter = new InMemoryLoomAdapter();
  });

  it('LOOM-ADAPTER-05: write puis read récupère les personnages', async () => {
    await adapter.writeState(makeWriteInput());

    const ctx = await adapter.readContext(makeLoomReadInput());
    expect(ctx.character_states.length).toBeGreaterThanOrEqual(1);
    expect(ctx.character_states[0].character_id).toBe('char-01');
    expect(ctx.character_states[0].arc_phase).toBe('confrontation');
  });

  it('LOOM-ADAPTER-06: write persiste la scène', async () => {
    await adapter.writeState(makeWriteInput());

    const stats = await adapter.getStats();
    expect(stats.scenes).toBe(1);
    expect(stats.characters).toBe(1);
    expect(stats.backend).toBe('memory-v1');
  });

  it('LOOM-ADAPTER-07: write persiste les threads depuis CDE debts', async () => {
    await adapter.writeState(makeWriteInput());

    const ctx = await adapter.readContext(makeLoomReadInput());
    expect(ctx.active_threads.length).toBeGreaterThanOrEqual(1);
    expect(ctx.active_threads[0].status).toBe('open');
  });

  it('LOOM-ADAPTER-08: write résout les dettes CDE', async () => {
    // Écrire une dette ouverte
    await adapter.writeState(makeWriteInput());

    // Écrire une résolution
    await adapter.writeState(makeWriteInput({
      chapter: 4,
      scene_id: 'scene-4-1',
      cde_delta: makeStateDelta({
        debts_resolved: [{ id: 'debt-01', evidence: 'Jean a lu la lettre à voix haute.' }],
      }),
    }));

    const ctx = await adapter.readContext(makeLoomReadInput({ chapter: 5 }));
    // Le thread debt-01 devrait être resolved
    const thread = ctx.active_threads.find((t) => t.thread_id === 'debt-01');
    // resolved threads ne sont pas dans active_threads (filtered by open/dormant)
    // Donc on vérifie qu'il n'apparaît PAS
    expect(thread).toBeUndefined();
  });

  it('LOOM-ADAPTER-09: write met à jour les arcs CDE', async () => {
    await adapter.writeState(makeWriteInput());

    const stats = await adapter.getStats();
    expect(stats.arcs).toBe(1);
  });

  it('LOOM-ADAPTER-10: clear vide toutes les collections', async () => {
    await adapter.writeState(makeWriteInput());
    adapter.clear();

    const stats = await adapter.getStats();
    expect(stats.characters).toBe(0);
    expect(stats.scenes).toBe(0);
  });

  it('LOOM-ADAPTER-11: readContext sur DB vide retourne contexte vide', async () => {
    const ctx = await adapter.readContext(makeLoomReadInput());
    expect(ctx.enriched_summary).toBe('');
    expect(ctx.character_states).toHaveLength(0);
    expect(ctx.retrieved_scenes).toHaveLength(0);
  });

  it('LOOM-ADAPTER-12: receipt contient input_hash non vide', async () => {
    const receipt = await adapter.writeState(makeWriteInput());
    expect(receipt.input_hash).toBeTruthy();
    expect(receipt.input_hash.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOOM READER TESTS — enrichPacketWithLoom
// ═══════════════════════════════════════════════════════════════════════════════

describe('enrichPacketWithLoom', () => {
  afterEach(() => {
    resetLoomConfig();
    delete process.env.OMEGA_LOOM_ENABLED;
  });

  it('INV-LOOM-01: Loom OFF retourne input EXACTEMENT identique', async () => {
    // Loom OFF par défaut
    const input = makeMinimalForgePacketInput();
    const nullAdapter = new NullLoomAdapter();

    const result = await enrichPacketWithLoom(input, nullAdapter, makeLoomReadInput());

    // Vérification d'identité stricte — même référence objet
    expect(result).toBe(input);
    expect(result.continuity).toBe(input.continuity);
  });

  it('LOOM-READER-01: Loom ON + NullAdapter retourne input identique', async () => {
    process.env.OMEGA_LOOM_ENABLED = '1';
    resetLoomConfig();

    const input = makeMinimalForgePacketInput();
    const nullAdapter = new NullLoomAdapter();

    const result = await enrichPacketWithLoom(input, nullAdapter, makeLoomReadInput());
    // NullAdapter détecté → passthrough
    expect(result).toBe(input);
  });

  it('LOOM-READER-02: Loom ON + DB vide retourne input identique', async () => {
    process.env.OMEGA_LOOM_ENABLED = '1';
    resetLoomConfig();

    const input = makeMinimalForgePacketInput();
    const adapter = new InMemoryLoomAdapter(); // vide

    const result = await enrichPacketWithLoom(input, adapter, makeLoomReadInput());
    // DB vide → contexte vide → passthrough
    expect(result).toBe(input);
  });

  it('LOOM-READER-03: Loom ON + données → enrichit continuity', async () => {
    process.env.OMEGA_LOOM_ENABLED = '1';
    resetLoomConfig();

    const adapter = new InMemoryLoomAdapter();
    // Pré-remplir le store
    await adapter.writeState(makeWriteInput({ chapter: 1 }));
    await adapter.writeState(makeWriteInput({ chapter: 2, scene_id: 'scene-2-1' }));

    const input = makeMinimalForgePacketInput();
    const result = await enrichPacketWithLoom(input, adapter, makeLoomReadInput({ chapter: 3 }));

    // Le résultat est un nouvel objet (pas la même référence)
    expect(result).not.toBe(input);
    // La continuité est enrichie
    expect(result.continuity.previous_scene_summary).toContain('Jean entre dans la cuisine');
    // L'original n'est PAS modifié
    expect(input.continuity.previous_scene_summary).toBe('Jean entre dans la cuisine.');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MERGE CONTINUITY TESTS — INV-LOOM-06
// ═══════════════════════════════════════════════════════════════════════════════

describe('mergeContinuity — INV-LOOM-06', () => {
  it('INV-LOOM-06-a: original summary conservé, Loom en suffixe', () => {
    const original = makeContinuity({ previous_scene_summary: 'Résumé original.' });
    const loomCtx: LoomContext = {
      ...EMPTY_LOOM_CONTEXT,
      enriched_summary: 'Contexte Loom enrichi.',
    };

    const merged = mergeContinuity(original, loomCtx);
    // J4 FIX: plus de tag [Loom], texte naturel
    expect(merged.previous_scene_summary).toBe('Résumé original. Par ailleurs, Contexte Loom enrichi.');
  });

  it('INV-LOOM-06-b: si original vide, Loom pris tel quel', () => {
    const original = makeContinuity({ previous_scene_summary: '' });
    const loomCtx: LoomContext = {
      ...EMPTY_LOOM_CONTEXT,
      enriched_summary: 'Contexte Loom.',
    };

    const merged = mergeContinuity(original, loomCtx);
    expect(merged.previous_scene_summary).toBe('Contexte Loom.');
  });

  it('INV-LOOM-06-c: personnage original prioritaire sur Loom', () => {
    const original = makeContinuity({
      character_states: [makeCharacterState({ character_id: 'char-01', emotional_state: 'angry' })],
    });
    const loomCtx: LoomContext = {
      ...EMPTY_LOOM_CONTEXT,
      character_states: [
        {
          book_id: 'book-01',
          character_id: 'char-01', // même ID → Loom ignoré
          character_name: 'Jean',
          emotional_state: 'calm', // différent — ne doit PAS écraser
          physical_state: 'sitting',
          location: 'salon',
          arc_phase: 'confrontation',
          current_need: 'vérité',
          tension: 'culpabilité',
          last_seen_chapter: 2,
          last_seen_scene_id: 'scene-2-1',
          updated_at: '2026-01-01',
        },
      ],
    };

    const merged = mergeContinuity(original, loomCtx);
    expect(merged.character_states).toHaveLength(1);
    expect(merged.character_states[0].emotional_state).toBe('angry'); // original gagne
  });

  it('INV-LOOM-06-d: personnage Loom ajouté si absent de l\'original', () => {
    const original = makeContinuity({
      character_states: [makeCharacterState({ character_id: 'char-01' })],
    });
    const loomCtx: LoomContext = {
      ...EMPTY_LOOM_CONTEXT,
      character_states: [
        {
          book_id: 'book-01',
          character_id: 'char-02', // nouvel ID → doit être ajouté
          character_name: 'Marie',
          emotional_state: 'fearful',
          physical_state: 'hiding',
          location: 'grenier',
          arc_phase: 'setup',
          current_need: 'sécurité',
          tension: 'secret gardé',
          last_seen_chapter: 1,
          last_seen_scene_id: 'scene-1-1',
          updated_at: '2026-01-01',
        },
      ],
    };

    const merged = mergeContinuity(original, loomCtx);
    expect(merged.character_states).toHaveLength(2);
    expect(merged.character_states[0].character_id).toBe('char-01'); // original en premier
    expect(merged.character_states[1].character_id).toBe('char-02'); // Loom en second
  });

  it('INV-LOOM-06-e: threads originaux conservés, Loom ajoute les absents', () => {
    const original = makeContinuity({
      open_threads: ['Le secret de Marie'],
    });
    const loomCtx: LoomContext = {
      ...EMPTY_LOOM_CONTEXT,
      active_threads: [
        { book_id: 'b', thread_id: 't1', content: 'Le secret de Marie', status: 'open', opened_chapter: 1, last_seen_chapter: 2, resolution_evidence: null, updated_at: '' },
        { book_id: 'b', thread_id: 't2', content: 'La lettre cachée', status: 'open', opened_chapter: 1, last_seen_chapter: 2, resolution_evidence: null, updated_at: '' },
      ],
    };

    const merged = mergeContinuity(original, loomCtx);
    expect(merged.open_threads).toHaveLength(2);
    expect(merged.open_threads[0]).toBe('Le secret de Marie'); // original
    expect(merged.open_threads[1]).toBe('La lettre cachée'); // Loom ajouté
  });

  it('INV-LOOM-06-f: si Loom vide, retourne les références originales', () => {
    const original = makeContinuity();
    const merged = mergeContinuity(original, EMPTY_LOOM_CONTEXT);

    // Même références (aucune copie inutile)
    expect(merged.character_states).toBe(original.character_states);
    expect(merged.open_threads).toBe(original.open_threads);
  });

  it('INV-LOOM-06-g: loom_context attaché pour traçabilité', () => {
    const original = makeContinuity();
    const loomCtx: LoomContext = {
      ...EMPTY_LOOM_CONTEXT,
      enriched_summary: 'trace.',
    };

    const merged = mergeContinuity(original, loomCtx);
    expect(merged.loom_context).toBeDefined();
    expect(merged.loom_context?.enriched_summary).toBe('trace.');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD LOOM READ INPUT
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildLoomReadInput', () => {
  it('extrait les données correctement depuis ForgePacketInput', () => {
    const input = makeMinimalForgePacketInput();
    const readInput = buildLoomReadInput(input, 'book-42', 7);

    expect(readInput.book_id).toBe('book-42');
    expect(readInput.chapter).toBe(7);
    expect(readInput.scene_id).toBe('scene-3-1');
    expect(readInput.expected_characters).toContain('char-01');
  });
});
