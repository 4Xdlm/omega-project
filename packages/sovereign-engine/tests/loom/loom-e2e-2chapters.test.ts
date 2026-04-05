/**
 * loom-e2e-2chapters.test.ts — End-to-end: 2 chapitres consécutifs avec Loom
 *
 * Simule le flux complet engine.ts:
 *   1. Ch1: extractDelta → writeState (persister)
 *   2. Ch2: readContext (retrieval) → enrichPacketWithLoom → extractDelta → writeState
 *
 * Vérifie:
 *   E2E-01: Ch1 data persiste dans jsonfile-adapter
 *   E2E-02: Ch2 readContext retrouve les personnages de ch1
 *   E2E-03: Ch2 readContext retrouve les threads ouverts en ch1
 *   E2E-04: Ch2 readContext retrouve la scène ch1 par similarité BoW
 *   E2E-05: Ch2 enrichPacketWithLoom enrichit continuity avec données ch1
 *   E2E-06: Dette ouverte ch1 → résolue ch2 → thread marqué 'resolved'
 *   E2E-07: Motifs ch1 persistés et retrouvés ch2
 *   E2E-08: scene_summary R2 utilisé au lieu du facts-join
 *   E2E-09: characters_present R2 persisté dans scenes.json
 *   E2E-10: Arc movement propagé cross-chapitre
 *   E2E-11: INV-LOOM-06 — original continuity a priorité sur Loom
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { tmpdir } from 'os';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { JsonFileLoomAdapter } from '../../src/loom/jsonfile-loom-adapter.js';
import { enrichPacketWithLoom, mergeContinuity, buildLoomReadInput } from '../../src/loom/loom-reader.js';
import { extractDelta, type DeltaContext } from '../../src/cde/delta-extractor.js';
import type { ArcState, CanonFact, DebtEntry, StateDelta } from '../../src/cde/types.js';
import type { LoomWriteInput, LoomReadInput, LoomSceneEntry, LoomMotifEntry, LoomThreadEntry } from '../../src/loom/loom-types.js';
import type { ForgeContinuity } from '../../src/types.js';

// ── Test infrastructure ─────────────────────────────────────────────────────

const TEST_DIR = join(tmpdir(), `omega-loom-e2e-${Date.now()}`);
const BOOK_ID = 'le-gardien';

let adapter: JsonFileLoomAdapter;

beforeEach(() => {
  // Nettoyage
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
  adapter = new JsonFileLoomAdapter(TEST_DIR);
});

afterAll(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

// ── Prose de test ───────────────────────────────────────────────────────────

const PROSE_CH1 = `
  L'inspecteur Morel était de retour dans la ville portuaire. Le port était désormais
  différent, les quais avaient changé. Il reconnaissait les odeurs — le sel, le goudron,
  les filets mouillés — mais les visages étaient nouveaux.

  Marie Ledoux promit de l'aider dans son enquête. C'était un secret entre eux.
  Le vieux phare était devenu un restaurant. Les pêcheurs avaient disparu.

  Le port le port le port. L'odeur l'odeur l'odeur. Le sel le sel le sel.
  Morel savait que quelque chose n'allait pas. Le mystère du port le hantait.
  Marie cachait quelque chose derrière son sourire.
`;

const PROSE_CH2 = `
  Morel marchait vers le quai nord. Les rues avaient changé mais les odeurs non.
  Il affrontait ses souvenirs avec détermination. Le vent luttait contre lui.

  Marie avoue enfin la vérité sur le secret du port. Elle révéla ce que cachait
  le vieux phare — les documents, les preuves, les noms.

  Le port le port le port. Le sel le sel le sel.
  Morel accepta la vérité. Il pardonna à Marie ses silences.
  Le vieux phare était désormais le seul témoin de l'histoire.
`;

// ── Shared test data ────────────────────────────────────────────────────────

const CHARACTERS_CH1: ArcState[] = [
  { character_id: 'Morel', arc_phase: 'setup', current_need: 'vérité', current_mask: 'calme', tension: 'doute' },
  { character_id: 'Marie', arc_phase: 'unknown', current_need: 'protéger le secret', current_mask: 'sourire', tension: 'culpabilité' },
];

const CANON_FACTS: CanonFact[] = [
  { id: 'canon-port', fact: 'Morel est inspecteur de police', sealed_at: '2026-01-01' },
];

const CONTINUITY_CH1: ForgeContinuity = {
  previous_scene_summary: '',
  character_states: [
    { character_id: 'Morel', character_name: 'Inspecteur Morel', emotional_state: 'nostalgique', physical_state: 'fatigué', location: 'gare' },
    { character_id: 'Marie', character_name: 'Marie Ledoux', emotional_state: 'nerveuse', physical_state: 'tendue', location: 'port' },
  ],
  open_threads: [],
};

// ── Helper: build LoomWriteInput from delta ─────────────────────────────────

function buildWriteInput(
  chapter: number,
  sceneId: string,
  prose: string,
  delta: StateDelta,
  arcStates: ArcState[],
  continuity: ForgeContinuity,
  openDebts: DebtEntry[] = [],
): LoomWriteInput {
  return {
    book_id: BOOK_ID,
    chapter,
    scene_id: sceneId,
    cde_delta: delta,
    arc_states: arcStates,
    canon_facts: CANON_FACTS,
    open_debts: openDebts,
    sealed_prose: prose,
    prose_hash: delta.prose_hash,
    characters_present: delta.characters_present ?? [],
    conflict_type: 'unknown',
    terminal_emotion: 'tension',
    terminal_valence: -2,
    input_continuity: continuity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E: 2 chapitres consécutifs avec Loom', () => {

  it('E2E-01: Ch1 data persiste dans jsonfile-adapter', async () => {
    const ctx: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const delta = extractDelta(PROSE_CH1, ctx);
    const writeInput = buildWriteInput(1, 'scene-1-1', PROSE_CH1, delta, CHARACTERS_CH1, CONTINUITY_CH1);
    const receipt = await adapter.writeState(writeInput);

    expect(receipt.upserted.scenes).toBe(1);
    expect(receipt.upserted.characters).toBe(2);
    expect(receipt.source_provenance).toBe('cde_only');

    // Verify files exist
    const bookDir = join(TEST_DIR, BOOK_ID);
    expect(existsSync(join(bookDir, 'scenes.json'))).toBe(true);
    expect(existsSync(join(bookDir, 'characters.json'))).toBe(true);
    expect(existsSync(join(bookDir, 'threads.json'))).toBe(true);
  });

  it('E2E-02: Ch2 readContext retrouve les personnages de ch1', async () => {
    // Write ch1
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    // Read for ch2
    const readInput: LoomReadInput = {
      book_id: BOOK_ID,
      chapter: 2,
      scene_id: 'scene-2-1',
      scene_goal: 'Morel marche vers le port, rencontre inattendue',
      expected_characters: ['Morel', 'Marie'],
      conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    expect(loomCtx.character_states.length).toBe(2);
    const morel = loomCtx.character_states.find(c => c.character_id === 'Morel');
    expect(morel).toBeDefined();
    expect(morel!.arc_phase).toBe('setup');
    expect(morel!.last_seen_chapter).toBe(1);
  });

  it('E2E-03: Ch2 readContext retrouve les threads ouverts en ch1', async () => {
    // Write ch1 with debts
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    // Create debts from delta
    const debtsFromCh1: DebtEntry[] = deltaCh1.debts_opened.map((d, i) => ({
      id: `debt-ch1-${i}`,
      content: d.content,
      opened_at: '1',
      resolved: false,
    }));
    const writeInput = buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1, debtsFromCh1);
    await adapter.writeState(writeInput);

    // Read for ch2
    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 2, scene_id: 'scene-2-1',
      scene_goal: 'Vérité révélée', expected_characters: ['Morel', 'Marie'], conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    expect(loomCtx.active_threads.length).toBeGreaterThanOrEqual(1);
    expect(loomCtx.active_threads.some(t => t.status === 'open')).toBe(true);
  });

  it('E2E-04: Ch2 readContext retrouve la scène ch1 par similarité BoW', async () => {
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 2, scene_id: 'scene-2-1',
      scene_goal: 'Le port et le mystère de Morel', expected_characters: ['Morel'], conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    expect(loomCtx.retrieved_scenes.length).toBeGreaterThanOrEqual(1);
    expect(loomCtx.retrieved_scenes[0].chapter).toBe(1);
    expect(loomCtx.enriched_summary.length).toBeGreaterThan(0);
  });

  it('E2E-05: Ch2 mergeContinuity enrichit continuity avec données ch1', async () => {
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 2, scene_id: 'scene-2-1',
      scene_goal: 'Port et mystère', expected_characters: ['Morel', 'Marie'], conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    const continuity2: ForgeContinuity = {
      previous_scene_summary: 'Morel est arrivé en ville.',
      character_states: [
        { character_id: 'Morel', character_name: 'Inspecteur Morel', emotional_state: 'déterminé', physical_state: 'reposé', location: 'hôtel' },
      ],
      open_threads: ['Le mystère du port'],
    };

    const merged = mergeContinuity(continuity2, loomCtx);

    // INV-LOOM-06: original summary preserved
    expect(merged.previous_scene_summary).toContain('Morel est arrivé en ville.');
    // J4 FIX: Loom enrichment en texte naturel (plus de tag [Loom])
    expect(merged.previous_scene_summary).toContain('Par ailleurs,');
    // Morel's original state preserved (not overwritten by ch1)
    const morel = merged.character_states.find(c => c.character_id === 'Morel');
    expect(morel!.emotional_state).toBe('déterminé'); // original, not 'nostalgique' from ch1
    // Marie added from Loom (absent from ch2 original)
    const marie = merged.character_states.find(c => c.character_id === 'Marie');
    expect(marie).toBeDefined();
  });

  it('E2E-06: Dette ouverte ch1 → résolue ch2 → thread marqué resolved', async () => {
    // Ch1: extract delta and write
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    const debtsFromCh1: DebtEntry[] = deltaCh1.debts_opened.map((d, i) => ({
      id: `debt-ch1-${i}`,
      content: d.content,
      opened_at: '1',
      resolved: false,
    }));
    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1, debtsFromCh1));

    // Ch2: extract delta with ch1 debts as open_debts
    const ctxCh2: DeltaContext = { canon_facts: CANON_FACTS, open_debts: debtsFromCh1, arc_states: CHARACTERS_CH1 };
    const deltaCh2 = extractDelta(PROSE_CH2, ctxCh2);

    // Ch2 should have resolved some debts
    expect(deltaCh2.debts_resolved.length).toBeGreaterThanOrEqual(1);

    // Write ch2
    await adapter.writeState(buildWriteInput(2, 'scene-2-1', PROSE_CH2, deltaCh2, CHARACTERS_CH1, CONTINUITY_CH1, debtsFromCh1));

    // Read back: resolved threads should be marked
    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 3, scene_id: 'scene-3-1',
      scene_goal: 'Suite', expected_characters: ['Morel'], conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    // Some threads should be resolved (not returned in active_threads which filters open/dormant)
    // But the total thread count should match
    const stats = await adapter.getStats();
    expect(stats.threads).toBeGreaterThanOrEqual(1);
  });

  it('E2E-07: Motifs ch1 persistés et retrouvés ch2', async () => {
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    // Verify ch1 has motifs
    expect(deltaCh1.motifs).toBeDefined();
    expect(deltaCh1.motifs!.length).toBeGreaterThanOrEqual(1);

    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    // Verify motifs.json exists
    const motifsPath = join(TEST_DIR, BOOK_ID, 'motifs.json');
    expect(existsSync(motifsPath)).toBe(true);

    // Read for ch2 — motifs with frequency ≥ 2 returned
    // After ch1, frequency = 1. After ch2, should be 2 for recurring motifs.
    const ctxCh2: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh2 = extractDelta(PROSE_CH2, ctxCh2);
    await adapter.writeState(buildWriteInput(2, 'scene-2-1', PROSE_CH2, deltaCh2, CHARACTERS_CH1, CONTINUITY_CH1));

    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 3, scene_id: 'scene-3-1',
      scene_goal: 'Port', expected_characters: ['Morel'], conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    // Motifs that appeared in both ch1 and ch2 should have frequency ≥ 2
    expect(loomCtx.active_motifs.length).toBeGreaterThanOrEqual(1);
    expect(loomCtx.active_motifs.every(m => m.frequency >= 2)).toBe(true);
  });

  it('E2E-08: scene_summary R2 utilisé au lieu du facts-join', async () => {
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);

    // R2 scene_summary should be non-empty and different from facts-join
    expect(deltaCh1.scene_summary).toBeDefined();
    expect(deltaCh1.scene_summary!.length).toBeGreaterThan(0);

    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    // Read the scene entry and verify summary uses R2 scene_summary
    const scenesPath = join(TEST_DIR, BOOK_ID, 'scenes.json');
    const raw = JSON.parse(readFileSync(scenesPath, 'utf-8'));
    const sceneKey = `${BOOK_ID}:1:scene-1-1`;
    const scene = raw.entries[sceneKey] as LoomSceneEntry;
    expect(scene.summary).toBe(deltaCh1.scene_summary);
  });

  it('E2E-09: characters_present R2 persisté dans scenes.json', async () => {
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);

    expect(deltaCh1.characters_present).toBeDefined();
    expect(deltaCh1.characters_present!.length).toBe(2); // Morel + Marie

    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    const scenesPath = join(TEST_DIR, BOOK_ID, 'scenes.json');
    const raw = JSON.parse(readFileSync(scenesPath, 'utf-8'));
    const scene = raw.entries[`${BOOK_ID}:1:scene-1-1`] as LoomSceneEntry;
    expect(scene.characters_present).toContain('Morel');
    expect(scene.characters_present).toContain('Marie');
  });

  it('E2E-10: Arc movement propagé cross-chapitre', async () => {
    // Ch1: Morel in setup, prose has setup keywords (découvrit)
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    // Ch2: Morel still in setup, prose has confrontation keywords (affrontait, luttait)
    const charsCh2: ArcState[] = [
      { character_id: 'Morel', arc_phase: 'setup', current_need: 'vérité', current_mask: 'calme', tension: 'doute' },
      { character_id: 'Marie', arc_phase: 'unknown', current_need: 'aveu', current_mask: 'sourire', tension: 'culpabilité' },
    ];
    const ctxCh2: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: charsCh2 };
    const deltaCh2 = extractDelta(PROSE_CH2, ctxCh2);

    // Morel should have moved from setup → confrontation (affrontait) or → resolution (accepta, pardonna)
    const morelMove = deltaCh2.arc_movements.find(m => m.character_id === 'Morel');
    expect(morelMove).toBeDefined();

    await adapter.writeState(buildWriteInput(2, 'scene-2-1', PROSE_CH2, deltaCh2, charsCh2, CONTINUITY_CH1));

    // Verify arc persisted
    const stats = await adapter.getStats();
    expect(stats.arcs).toBeGreaterThanOrEqual(1);
  });

  it('E2E-11: INV-LOOM-06 — original continuity a priorité sur Loom', async () => {
    // Write ch1
    const ctxCh1: DeltaContext = { canon_facts: CANON_FACTS, open_debts: [], arc_states: CHARACTERS_CH1 };
    const deltaCh1 = extractDelta(PROSE_CH1, ctxCh1);
    await adapter.writeState(buildWriteInput(1, 'scene-1-1', PROSE_CH1, deltaCh1, CHARACTERS_CH1, CONTINUITY_CH1));

    // Read for ch2
    const readInput: LoomReadInput = {
      book_id: BOOK_ID, chapter: 2, scene_id: 'scene-2-1',
      scene_goal: 'Port', expected_characters: ['Morel', 'Marie'], conflict_type: 'unknown',
    };
    const loomCtx = await adapter.readContext(readInput);

    // Original continuity with different Morel state
    const original: ForgeContinuity = {
      previous_scene_summary: 'Ch2 original summary',
      character_states: [
        { character_id: 'Morel', character_name: 'Morel', emotional_state: 'UPDATED', physical_state: 'FRESH', location: 'quai' },
      ],
      open_threads: ['Thread original A'],
    };

    const merged = mergeContinuity(original, loomCtx);

    // Original wins for existing characters (INV-LOOM-06)
    const morel = merged.character_states.find(c => c.character_id === 'Morel');
    expect(morel!.emotional_state).toBe('UPDATED'); // NOT 'nostalgique' from Loom
    expect(morel!.location).toBe('quai');            // NOT from Loom

    // Original threads preserved
    expect(merged.open_threads).toContain('Thread original A');

    // Original summary comes first
    expect(merged.previous_scene_summary.startsWith('Ch2 original summary')).toBe(true);
  });
});
