/**
 * OMEGA — CANDIDATE_PACK : le gel intégral des candidats de génération.
 *
 * POURQUOI (doctrine DETERMINISTIC_REPLAY_FROM_FROZEN_CANDIDATE_PACK, A3) :
 * le seed n'assure PAS la reproductibilité à température > 0 — c'est MESURÉ
 * (STOCHASTIC_REGENERATION_DETERMINISM = FAIL). La seule reproductibilité
 * possible est le REJEU : geler chaque candidat brut au moment de sa
 * génération, puis faire rejouer le même pack par des sélecteurs différents
 * (words / scribe-v2 / forme / anti-recap / composite). Zéro nouvelle
 * génération, causalité forte : tout écart entre deux sélections est
 * attribuable au sélecteur, jamais au bruit du modèle.
 *
 * C'est le prérequis du chantier P0 « contenu des périodes » (tour de table
 * 2026-08-03 : travailler sur Candidate Packs gelés, pas sur des générations
 * fraîches) et de la preuve de gain de `rankByShape`.
 *
 * ARCHITECTURE : le module est PUR (aucun accès disque) — le pack se
 * construit en mémoire et un « sink » injecté le persiste. `jsonlFileSink`
 * est le sink de production (append JSONL, un candidat par ligne, hashé).
 */
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface FrozenCandidate {
  /** Identité du run (un pack = un livre ou une campagne). */
  readonly packId: string;
  readonly chapterIndex: number;
  readonly attempt: number;
  readonly candidateIndex: number;
  /** Prose BRUTE, avant tout scellement — c'est elle qu'on rejoue. */
  readonly prose: string;
  readonly sha256: string;
  readonly words: number;
  /** Le seed demandé (indicatif : ne garantit rien à T > 0, cf. A3). */
  readonly seed: number | undefined;
  readonly model: string;
  readonly generatedAt: string;
}

export interface PackSink {
  (candidate: FrozenCandidate): void;
}

export function sha256OfProse(prose: string): string {
  return createHash('sha256').update(prose, 'utf8').digest('hex');
}

export function freezeCandidate(
  fields: Omit<FrozenCandidate, 'sha256' | 'words' | 'generatedAt'>,
): FrozenCandidate {
  return {
    ...fields,
    sha256: sha256OfProse(fields.prose),
    words: fields.prose.split(/\s+/u).filter((w) => w.length > 0).length,
    generatedAt: new Date().toISOString(),
  };
}

/** Sink de production : un fichier JSONL par pack, un candidat par ligne.
 *  Append-only — un pack ne se réécrit jamais, il s'étend ou il se recrée. */
export function jsonlFileSink(dir: string): PackSink {
  mkdirSync(dir, { recursive: true });
  return (c: FrozenCandidate): void => {
    appendFileSync(join(dir, `${c.packId}.jsonl`), `${JSON.stringify(c)}\n`, 'utf8');
  };
}

/** Collecteur mémoire pour les tests et le rejeu in-process. */
export class MemoryPack {
  private readonly items: FrozenCandidate[] = [];

  get sink(): PackSink {
    return (c) => {
      this.items.push(c);
    };
  }

  all(): readonly FrozenCandidate[] {
    return [...this.items];
  }

  /** Les candidats d'un chapitre, dans l'ordre de génération. */
  ofChapter(chapterIndex: number): readonly FrozenCandidate[] {
    return this.items.filter((c) => c.chapterIndex === chapterIndex);
  }
}
