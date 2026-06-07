/**
 * OMEGA — C19 : EXPERIMENT_LEDGER (CONCEPT-OMEGA-EXPERIMENT-LEDGER-001).
 * Mandat ChatGPT 2026-06-07 : « EMP-16 ne doit pas être un rapport isolé.
 * Chaque run devient une expérience comparable — sans ça, on refait des
 * débats à la louche. » La mémoire SCIENTIFIQUE du logiciel : chaque run y
 * écrit ses hash, ses mesures, ses échecs et ses décisions ; toute future
 * promotion de levier devra citer ses lignes (famille EMP-19/METRIC_HONESTY).
 *
 * Append-only par runId (un run = UNE ligne, immuable une fois écrite —
 * corriger = écrire une ligne v2 avec supersedes, jamais réécrire l'histoire).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export interface ExperimentRow {
  readonly runId: string;
  readonly date: string;
  readonly model: string;
  readonly planHash: string | null;
  readonly outputHash: string;
  readonly words: number;
  readonly chapters: number;
  readonly cleanliness: { readonly SYNTAX: boolean; readonly SEAM: boolean; readonly SEMANTIC: boolean; readonly NARRATIVE: boolean };
  readonly maxTicPer1000w: number;
  readonly incipitUnique: number;
  readonly incipitClones: number;
  readonly incipitWeather: number;
  readonly transitionRatioRealized: number | null;
  readonly revelationsRealized: number | null;
  readonly pacingCvMean: number | null;
  readonly selectorEntropyRatio: number | null;
  readonly genomeHash: string | null;
  readonly failures: readonly string[];
  readonly decisions: readonly string[];
  /** Ligne corrigée par une plus récente (append-only : jamais de réécriture). */
  readonly supersedes?: string;
}

export type LedgerError =
  | { readonly code: 'DUPLICATE_RUN_ID'; readonly detail: string }
  | { readonly code: 'BAD_ROW'; readonly detail: string }
  | { readonly code: 'IO'; readonly detail: string };

export interface ExperimentLedgerFile { readonly version: 1; readonly rows: readonly ExperimentRow[] }

export function loadLedger(path: string): ExperimentLedgerFile {
  if (!existsSync(path)) return { version: 1, rows: [] };
  return JSON.parse(readFileSync(path, 'utf8')) as ExperimentLedgerFile;
}

/** Append STRICT : runId unique, champs requis présents, jamais de mutation. */
export function appendExperiment(path: string, row: ExperimentRow): Result<ExperimentLedgerFile, LedgerError> {
  if (row.runId.trim().length === 0 || row.outputHash.trim().length === 0) {
    return err({ code: 'BAD_ROW', detail: 'runId et outputHash sont obligatoires' });
  }
  if (!Number.isFinite(row.words) || row.words <= 0 || !Number.isInteger(row.chapters) || row.chapters <= 0) {
    return err({ code: 'BAD_ROW', detail: 'words/chapters invalides' });
  }
  const ledger = loadLedger(path);
  if (ledger.rows.some((r) => r.runId === row.runId)) {
    return err({ code: 'DUPLICATE_RUN_ID', detail: `runId déjà consigné : ${row.runId} (écrire une ligne v2 avec supersedes)` });
  }
  const next: ExperimentLedgerFile = { version: 1, rows: [...ledger.rows, row] };
  writeFileSync(path, JSON.stringify(next, null, 2), 'utf8');
  return ok(next);
}

/** Lignes COURANTES (les lignes supersédées sont masquées, jamais effacées). */
export function currentRows(ledger: ExperimentLedgerFile): readonly ExperimentRow[] {
  const superseded = new Set(ledger.rows.map((r) => r.supersedes).filter((s): s is string => s !== undefined));
  return ledger.rows.filter((r) => !superseded.has(r.runId));
}
