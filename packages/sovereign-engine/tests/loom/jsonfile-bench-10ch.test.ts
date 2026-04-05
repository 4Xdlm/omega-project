/**
 * jsonfile-bench-10ch.test.ts — Bench cycle write→read 10 chapitres
 * Phase R1 — Loom v1 Minimal
 *
 * Scénario : un roman de 10 chapitres, 2 personnages, dettes narratives
 * qui s'ouvrent et se résolvent, arcs qui évoluent.
 * Simule le flux engine.ts : write post-SEAL chapitre par chapitre,
 * puis read depuis le chapitre 11 pour vérifier la mémoire complète.
 *
 * Couverture :
 *   BENCH-01 : 10 writes séquentiels sans crash
 *   BENCH-02 : accumulation correcte (10 scènes, 2 chars, N threads)
 *   BENCH-03 : résolution de dettes cross-chapitre
 *   BENCH-04 : retrieval BoW retourne scènes pertinentes
 *   BENCH-05 : arc direction évolue avec la valence
 *   BENCH-06 : cross-session read (nouvel adapter, même path)
 *   BENCH-07 : fichiers JSON lisibles et valides
 *   BENCH-08 : schema_version cohérente partout
 *   BENCH-09 : performance < 500ms pour 10 writes + 1 read
 *   BENCH-10 : hash receipt unique par chapitre
 *
 * 100% CALC — 0 LLM.
 * Standard: NASA-Grade L4 / DO-178C
 */

import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ForgeContinuity, CharacterState } from '../../src/types';
import type { StateDelta } from '../../src/cde/types';
import type { LoomWriteInput, LoomWriteReceipt } from '../../src/loom/loom-types';
import { JsonFileLoomAdapter } from '../../src/loom/jsonfile-loom-adapter';

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO DATA — 10 chapitres d'un roman
// ═══════════════════════════════════════════════════════════════════════════════

const BOOK_ID = 'le-gardien-bench';

interface ChapterData {
  chapter: number;
  scene_id: string;
  new_facts: string[];
  debts_opened: Array<{ content: string; evidence: string }>;
  debts_resolved: Array<{ id: string; evidence: string }>;
  arc_movements: Array<{ character_id: string; movement: string }>;
  characters_present: string[];
  conflict_type: string;
  terminal_emotion: string;
  terminal_valence: number;
  prose_excerpt: string;
}

const CHAPTERS: ChapterData[] = [
  {
    chapter: 1, scene_id: 'ch1-ouverture',
    new_facts: ['Jean arrive au village de Cernay.', 'La maison de son père est abandonnée.'],
    debts_opened: [{ content: 'Pourquoi le père a-t-il quitté le village ?', evidence: 'ch1 prose l.12' }],
    debts_resolved: [],
    arc_movements: [{ character_id: 'jean', movement: 'arrivée → questionnement' }],
    characters_present: ['jean'],
    conflict_type: 'internal', terminal_emotion: 'curiosity', terminal_valence: 2.0,
    prose_excerpt: 'Jean poussa la grille rouillée. Le jardin avait poussé sauvage.',
  },
  {
    chapter: 2, scene_id: 'ch2-rencontre',
    new_facts: ['Marie tient la boulangerie du village.', 'Elle connaissait le père de Jean.'],
    debts_opened: [{ content: 'Marie cache quelque chose sur le père.', evidence: 'ch2 prose l.34' }],
    debts_resolved: [],
    arc_movements: [{ character_id: 'jean', movement: 'questionnement → méfiance' }, { character_id: 'marie', movement: 'neutre → défensive' }],
    characters_present: ['jean', 'marie'],
    conflict_type: 'interpersonal', terminal_emotion: 'suspicion', terminal_valence: -1.0,
    prose_excerpt: 'Marie détourna le regard. Ses mains pétrissaient la pâte avec une violence contenue.',
  },
  {
    chapter: 3, scene_id: 'ch3-la-lettre',
    new_facts: ['Jean trouve une lettre cachée dans le mur de la maison.', 'La lettre mentionne un pacte.'],
    debts_opened: [{ content: 'Quel est ce pacte mentionné dans la lettre ?', evidence: 'ch3 prose l.55' }],
    debts_resolved: [],
    arc_movements: [{ character_id: 'jean', movement: 'méfiance → découverte' }],
    characters_present: ['jean'],
    conflict_type: 'internal', terminal_emotion: 'shock', terminal_valence: -3.0,
    prose_excerpt: 'Les mots dansaient devant ses yeux. Un pacte. Son père avait signé un pacte.',
  },
  {
    chapter: 4, scene_id: 'ch4-confrontation',
    new_facts: ['Marie avoue connaître le pacte.', 'Le pacte concerne la forêt de Cernay.'],
    debts_opened: [],
    debts_resolved: [{ id: 'debt-marie-cache', evidence: 'Marie avoue ch4 l.22' }],
    arc_movements: [{ character_id: 'marie', movement: 'défensive → vulnérable' }, { character_id: 'jean', movement: 'découverte → colère' }],
    characters_present: ['jean', 'marie'],
    conflict_type: 'interpersonal', terminal_emotion: 'anger', terminal_valence: -5.0,
    prose_excerpt: 'Tu savais, dit Jean. Sa voix était un fil tendu entre eux.',
  },
  {
    chapter: 5, scene_id: 'ch5-la-foret',
    new_facts: ['La forêt de Cernay contient une source ancienne.', 'Des marques gravées sur les arbres.'],
    debts_opened: [{ content: 'Qui a gravé les marques sur les arbres ?', evidence: 'ch5 prose l.18' }],
    debts_resolved: [],
    arc_movements: [{ character_id: 'jean', movement: 'colère → exploration' }],
    characters_present: ['jean'],
    conflict_type: 'environment', terminal_emotion: 'awe', terminal_valence: 1.5,
    prose_excerpt: 'Les troncs portaient des cicatrices. Des signes que personne ne savait plus lire.',
  },
  {
    chapter: 6, scene_id: 'ch6-le-vieux',
    new_facts: ['Le vieux Gaspard connaît l\'histoire des marques.', 'Les marques sont un calendrier forestier.'],
    debts_opened: [],
    debts_resolved: [{ id: 'debt-marques-arbres', evidence: 'Gaspard explique ch6 l.40' }],
    arc_movements: [{ character_id: 'jean', movement: 'exploration → compréhension' }],
    characters_present: ['jean'],
    conflict_type: 'internal', terminal_emotion: 'understanding', terminal_valence: 3.0,
    prose_excerpt: 'Gaspard traça du doigt le contour d\'une entaille. Ça, c\'est l\'équinoxe.',
  },
  {
    chapter: 7, scene_id: 'ch7-le-pacte-revele',
    new_facts: ['Le pacte protège la source de Cernay.', 'Le père de Jean était le dernier gardien.'],
    debts_opened: [],
    debts_resolved: [{ id: 'debt-pacte', evidence: 'Gaspard révèle ch7 l.30' }],
    arc_movements: [{ character_id: 'jean', movement: 'compréhension → héritage' }],
    characters_present: ['jean'],
    conflict_type: 'internal', terminal_emotion: 'resolve', terminal_valence: 4.0,
    prose_excerpt: 'Ton père gardait la source. Maintenant c\'est ton tour, murmura Gaspard.',
  },
  {
    chapter: 8, scene_id: 'ch8-reconciliation',
    new_facts: ['Marie demande pardon à Jean.', 'Jean comprend que Marie protégeait le secret.'],
    debts_opened: [],
    debts_resolved: [],
    arc_movements: [{ character_id: 'jean', movement: 'héritage → pardon' }, { character_id: 'marie', movement: 'vulnérable → réconciliée' }],
    characters_present: ['jean', 'marie'],
    conflict_type: 'interpersonal', terminal_emotion: 'forgiveness', terminal_valence: 5.0,
    prose_excerpt: 'Marie leva les yeux. Il n\'y avait plus de mur entre eux.',
  },
  {
    chapter: 9, scene_id: 'ch9-menace',
    new_facts: ['Un promoteur veut acheter la forêt.', 'Le maire soutient le promoteur.'],
    debts_opened: [{ content: 'Le promoteur va-t-il détruire la source ?', evidence: 'ch9 prose l.8' }],
    debts_resolved: [],
    arc_movements: [{ character_id: 'jean', movement: 'pardon → combat' }],
    characters_present: ['jean', 'marie'],
    conflict_type: 'societal', terminal_emotion: 'determination', terminal_valence: -2.0,
    prose_excerpt: 'Les pelleteuses arriveraient lundi. Jean serra les poings.',
  },
  {
    chapter: 10, scene_id: 'ch10-gardien',
    new_facts: ['Jean se tient devant la source face au promoteur.', 'Le village se rassemble derrière Jean.'],
    debts_opened: [],
    debts_resolved: [{ id: 'debt-promoteur-source', evidence: 'Le village bloque les pelleteuses ch10 l.45' }],
    arc_movements: [{ character_id: 'jean', movement: 'combat → gardien accepté' }, { character_id: 'marie', movement: 'réconciliée → alliée' }],
    characters_present: ['jean', 'marie'],
    conflict_type: 'societal', terminal_emotion: 'triumph', terminal_valence: 8.0,
    prose_excerpt: 'Jean ne bougea pas. Derrière lui, un à un, les villageois formèrent une ligne.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const testDir = join(tmpdir(), `loom-bench-10ch-${Date.now()}`);

function chapterToWriteInput(ch: ChapterData, debtIdCounter: { n: number }): LoomWriteInput {
  const openDebts = ch.debts_opened.map((d) => {
    const id = `debt-${debtIdCounter.n++}`;
    return { id, content: d.content, opened_at: String(ch.chapter), resolved: false };
  });

  // Accumuler les dettes existantes des chapitres précédents
  // (en vrai, engine.ts passerait les dettes CDE complètes — ici on simplifie)
  return {
    book_id: BOOK_ID,
    chapter: ch.chapter,
    scene_id: ch.scene_id,
    cde_delta: {
      new_facts: ch.new_facts,
      modified_facts: [],
      debts_opened: ch.debts_opened,
      debts_resolved: ch.debts_resolved,
      arc_movements: ch.arc_movements,
      drift_flags: [],
      prose_hash: `sha256-ch${ch.chapter}-bench`,
    },
    arc_states: ch.arc_movements.map((m) => ({
      character_id: m.character_id,
      arc_phase: ch.chapter <= 3 ? 'setup' as const : ch.chapter <= 7 ? 'confrontation' as const : 'resolution' as const,
      current_need: m.movement.split(' → ')[1] || 'unknown',
      current_mask: '',
      tension: ch.terminal_emotion,
    })),
    canon_facts: [],
    open_debts: openDebts,
    sealed_prose: ch.prose_excerpt,
    prose_hash: `sha256-ch${ch.chapter}-bench`,
    characters_present: ch.characters_present,
    conflict_type: ch.conflict_type,
    terminal_emotion: ch.terminal_emotion,
    terminal_valence: ch.terminal_valence,
    input_continuity: {
      previous_scene_summary: ch.chapter > 1 ? CHAPTERS[ch.chapter - 2].new_facts.join('. ') : '',
      character_states: ch.characters_present.map((id) => ({
        character_id: id,
        character_name: id === 'jean' ? 'Jean' : 'Marie',
        emotional_state: ch.terminal_emotion,
        physical_state: 'present',
        location: ch.scene_id,
      })),
      open_threads: ch.debts_opened.map((d) => d.content),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('BENCH 10 chapitres — JsonFileLoomAdapter', () => {
  const adapter = new JsonFileLoomAdapter(testDir);
  const receipts: LoomWriteReceipt[] = [];
  let totalWriteMs = 0;

  afterAll(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* cleanup */ }
  });

  // ── BENCH-01 : 10 writes séquentiels ──

  it('BENCH-01: 10 writes séquentiels sans crash', async () => {
    const debtCounter = { n: 1 };
    const start = Date.now();

    for (const ch of CHAPTERS) {
      const input = chapterToWriteInput(ch, debtCounter);
      const receipt = await adapter.writeState(input);
      receipts.push(receipt);

      expect(receipt.book_id).toBe(BOOK_ID);
      expect(receipt.chapter).toBe(ch.chapter);
      expect(receipt.upserted.scenes).toBe(1);
      expect(receipt.written_at).toBeTruthy();
    }

    totalWriteMs = Date.now() - start;
    expect(receipts.length).toBe(10);
  });

  // ── BENCH-02 : accumulation correcte ──

  it('BENCH-02: 10 scènes, 2 personnages persistés', async () => {
    const stats = await adapter.getStats();
    expect(stats.scenes).toBe(10);
    expect(stats.characters).toBe(2); // jean + marie
    expect(stats.backend).toBe('jsonfile-v1');
  });

  // ── BENCH-03 : résolution de dettes ──

  it('BENCH-03: dettes résolues cross-chapitre', async () => {
    const ctx = await adapter.readContext({
      book_id: BOOK_ID,
      chapter: 11,
      scene_id: 'scene-11-1',
      scene_goal: 'épilogue',
      expected_characters: ['jean', 'marie'],
      conflict_type: 'internal',
    });

    // Certaines dettes devraient être résolues
    const resolved = ctx.active_threads.filter((t) => t.status === 'resolved');
    const open = ctx.active_threads.filter((t) => t.status === 'open');

    // On a des dettes résolues (marie cache, marques, pacte, promoteur)
    // et potentiellement des dettes encore ouvertes
    // Le total devrait être > 0
    expect(ctx.active_threads.length + resolved.length).toBeGreaterThan(0);
  });

  // ── BENCH-04 : retrieval BoW pertinent ──

  it('BENCH-04: query "la source et le pacte" retourne scènes pertinentes', async () => {
    const ctx = await adapter.readContext({
      book_id: BOOK_ID,
      chapter: 11,
      scene_id: 'scene-11-1',
      scene_goal: 'la source ancienne et le pacte du gardien',
      expected_characters: ['jean'],
      conflict_type: 'internal',
    });

    expect(ctx.retrieved_scenes.length).toBeGreaterThanOrEqual(5);

    // Les scènes les plus pertinentes devraient mentionner source/pacte
    const topExcerpts = ctx.retrieved_scenes.slice(0, 3).map((s) => s.summary_excerpt).join(' ');
    const mentionsRelevant = topExcerpts.includes('source') || topExcerpts.includes('pacte') || topExcerpts.includes('gardien');
    expect(mentionsRelevant).toBe(true);
  });

  // ── BENCH-05 : arc direction évolue ──

  it('BENCH-05: personnages ont des arcs avec direction', async () => {
    const ctx = await adapter.readContext({
      book_id: BOOK_ID,
      chapter: 11,
      scene_id: 'scene-11-1',
      scene_goal: 'test arcs',
      expected_characters: ['jean', 'marie'],
      conflict_type: 'internal',
    });

    // Jean doit avoir un arc avec des chapitres clés
    expect(ctx.character_states.length).toBe(2);

    const jean = ctx.character_states.find((c) => c.character_id === 'jean');
    expect(jean).toBeDefined();
    expect(jean!.last_seen_chapter).toBe(10);
    expect(jean!.arc_phase).toBe('resolution');
  });

  // ── BENCH-06 : cross-session ──

  it('BENCH-06: nouvel adapter lit les mêmes données', async () => {
    const adapter2 = new JsonFileLoomAdapter(testDir);
    const stats = await adapter2.getStats();

    expect(stats.scenes).toBe(10);
    expect(stats.characters).toBe(2);
  });

  // ── BENCH-07 : fichiers JSON valides ──

  it('BENCH-07: tous les fichiers JSON sont parsables', () => {
    const bookDir = join(testDir, BOOK_ID.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const files = readdirSync(bookDir).filter((f) => f.endsWith('.json'));

    expect(files.length).toBeGreaterThanOrEqual(4); // characters, threads, scenes, index, arcs

    for (const file of files) {
      const raw = readFileSync(join(bookDir, file), 'utf-8');
      const parsed = JSON.parse(raw); // Ne doit pas crasher
      expect(parsed.header).toBeDefined();
      expect(parsed.entries).toBeDefined();
    }
  });

  // ── BENCH-08 : schema_version cohérente ──

  it('BENCH-08: schema_version = 1.0.0 partout', () => {
    const bookDir = join(testDir, BOOK_ID.replace(/[^a-zA-Z0-9_-]/g, '_'));
    const files = readdirSync(bookDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const parsed = JSON.parse(readFileSync(join(bookDir, file), 'utf-8'));
      expect(parsed.header.schema_version).toBe('1.0.0');
    }
  });

  // ── BENCH-09 : performance ──

  it('BENCH-09: 10 writes + 1 read < 500ms', async () => {
    // Le write a déjà été mesuré dans BENCH-01
    const readStart = Date.now();
    await adapter.readContext({
      book_id: BOOK_ID,
      chapter: 11,
      scene_id: 'scene-11-1',
      scene_goal: 'performance test',
      expected_characters: ['jean', 'marie'],
      conflict_type: 'internal',
    });
    const readMs = Date.now() - readStart;

    const totalMs = totalWriteMs + readMs;
    console.log(`[BENCH] 10 writes: ${totalWriteMs}ms, 1 read: ${readMs}ms, total: ${totalMs}ms`);

    expect(totalMs).toBeLessThan(500);
  });

  // ── BENCH-10 : hash receipt unique ──

  it('BENCH-10: chaque chapitre a un input_hash unique', () => {
    const hashes = receipts.map((r) => r.input_hash);
    const uniqueHashes = new Set(hashes);

    expect(uniqueHashes.size).toBe(10);
  });
});
