/**
 * OMEGA Book-Factory — C12 MYCELIUM EXPORT — GÉNOME NARRATIF (BF-08, BF-13).
 *
 * FOUND_EXISTING : CONCEPT-MYCELIUM-DNA-001 — « Le Mycelium est l'ADN d'une
 * œuvre… identité ADN d'un livre, signature mesurable et comparable »
 * (VISION_FINALE_SCELLEE §5, PILIER ACTÉ). Le génome ÉMOTIONNEL existe
 * (packages/genome SEALED, Emotion14) ; CE module exporte la moitié manquante :
 * la CARTE NARRATIVE — cast, graines/payoffs, fonctions de chapitres, tics,
 * empreintes de contenu et chaîne d'admissions.
 *
 * LOI BF-13 (MYCELIUM_DETERMINISTIC_DNA, ancêtre INV-GEN-01) :
 *   même roman + même config ⇒ même génome ⇒ même hash ;
 *   roman modifié ⇒ hash différent.
 * MÉCANISME : payload canonicalisé par canon-kernel (épine unique, BF-04 —
 * `canonicalize` trie les clés ; les TABLEAUX sont triés ICI par compareStrings/
 * numérique pour que l'ordre d'entrée soit indifférent) puis sha256.
 * packages/mycelium et packages/genome (FROZEN/SEALED) ne sont PAS touchés —
 * extension par couche. La projection vers leur format binaire = V2 (documenté).
 *
 * CE QUI CASSERAIT : changer le schéma sans bump de version (le champ `schema`
 * fait partie du hash — deux versions ne collisionnent jamais silencieusement).
 */

import { sha256, canonicalize } from '@omega/canon-kernel';

import type { SeedLedgerRow, ChapterFunctionRow, TicRow } from '../coherence/coherence-types.js';
import type { CastEntry } from '../doctor/doctor-types.js';
import { err, ok, compareStrings } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export const NARRATIVE_GENOME_SCHEMA = 'NARRATIVE_GENOME_V1' as const;

export interface GenomeChapterRow {
  readonly chapter: number;
  readonly words: number;
  /** Empreinte du TEXTE du chapitre (NFC, espaces normalisés) — l'ADN textuel. */
  readonly contentHash: string;
  readonly fn: string; // fonction dramatique (proxy CALC, EXPERIMENTAL)
}

export interface NarrativeGenome {
  readonly schema: typeof NARRATIVE_GENOME_SCHEMA;
  readonly book: { readonly title: string; readonly chapters: number; readonly words: number };
  readonly cast: readonly { readonly name: string; readonly occurrences: number; readonly firstChapter: number }[];
  readonly seedLedger: readonly { readonly seed: string; readonly planted: string; readonly payoff: string; readonly recalls: number }[];
  readonly chapterMap: readonly GenomeChapterRow[];
  readonly ticsSignature: readonly { readonly gram: string; readonly occurrences: number }[];
  /** Chaîne de preuve de génération (50 admissions hashées) — vide pour un
   *  manuscrit importé sans provenance OMEGA. */
  readonly admissionHashes: readonly string[];
  /** LE hash d'identité de l'œuvre — sha256(canonicalize(tout le reste)). */
  readonly genomeHash: string;
}

export interface GenomeInput {
  readonly title: string;
  readonly chapters: readonly { readonly chapter: number; readonly prose: string }[];
  readonly cast: readonly CastEntry[];
  readonly seedLedger: readonly SeedLedgerRow[];
  readonly chapterFunctions: readonly ChapterFunctionRow[];
  readonly tics: readonly TicRow[];
  readonly admissionHashes?: readonly string[];
}

export type GenomeErrorCode = 'EMPTY_BOOK';
export type GenomeResult<T> = Result<T, { readonly code: GenomeErrorCode; readonly detail: string }>;

function normalizeForHash(prose: string): string {
  return prose.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function countWords(s: string): number {
  const t = s.trim();
  return t.length === 0 ? 0 : t.split(/\s+/u).length;
}

/** Construit le génome narratif déterministe d'un livre. Pur. */
export function buildNarrativeGenome(input: GenomeInput): GenomeResult<NarrativeGenome> {
  if (input.chapters.length === 0) return err({ code: 'EMPTY_BOOK', detail: 'aucun chapitre' });

  const fnByChapter = new Map(input.chapterFunctions.map((f) => [f.chapter, f.fn] as const));
  const chapterMap: GenomeChapterRow[] = [...input.chapters]
    .sort((a, b) => a.chapter - b.chapter)
    .map((c) => ({
      chapter: c.chapter,
      words: countWords(c.prose),
      contentHash: String(sha256(normalizeForHash(c.prose))),
      fn: fnByChapter.get(c.chapter) ?? 'UNKNOWN',
    }));

  const payload = {
    schema: NARRATIVE_GENOME_SCHEMA,
    book: {
      title: input.title.normalize('NFC'),
      chapters: chapterMap.length,
      words: chapterMap.reduce((s, c) => s + c.words, 0),
    },
    cast: [...input.cast]
      .map((c) => ({ name: c.name, occurrences: c.occurrences, firstChapter: c.firstChapter }))
      .sort((a, b) => compareStrings(a.name, b.name)),
    seedLedger: [...input.seedLedger]
      .map((s) => ({ seed: s.seed, planted: String(s.plantedChapter), payoff: String(s.payoffChapter), recalls: s.recallChapters.length }))
      .sort((a, b) => compareStrings(a.seed, b.seed)),
    chapterMap,
    ticsSignature: [...input.tics]
      .map((t) => ({ gram: t.gram, occurrences: t.occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences || compareStrings(a.gram, b.gram))
      .slice(0, 20),
    admissionHashes: [...(input.admissionHashes ?? [])].sort(compareStrings),
  };

  const genomeHash = String(sha256(canonicalize(payload)));
  return ok({ ...payload, genomeHash });
}

/** Comparaison d'identité : deux œuvres sont LE MÊME roman ssi hashes égaux. */
export function sameWork(a: NarrativeGenome, b: NarrativeGenome): boolean {
  return a.genomeHash === b.genomeHash;
}
