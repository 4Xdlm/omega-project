/**
 * OMEGA Book-Factory — C5 PERSISTANCE DES RUNS (BF-08, FORBID-007)
 * « Aucun run R6 sans persistance de TOUS les candidats, y compris rejetés. »
 *
 * MÉCANISME : port FS INJECTÉ (testable en mémoire, adaptable node:fs côté script) —
 * le runner n'importe JAMAIS node:fs (déterminisme et testabilité par construction).
 * Arborescence : <root>/chap_<n>/candidate_<profile>/{prose.txt, meta.json, gates.json}
 * + <root>/chap_<n>/result.json. Tous les JSON via canonicalize (stable cross-machine).
 */

import { canonicalize } from '@omega/canon-kernel';
import type { LiteChapterResult } from './r6-lite.js';

export interface FsPort {
  writeFile(path: string, content: string): void;
  mkdirp(dir: string): void;
}

/** Adaptateur mémoire pour tests + evidence (lecture par les assertions). */
export class MemFs implements FsPort {
  readonly files = new Map<string, string>();
  readonly dirs = new Set<string>();
  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }
  mkdirp(dir: string): void {
    this.dirs.add(dir);
  }
}

/**
 * HYPOTHÈSE OPÉRATOIRE (revue C6 P6, documentée) : un chapitre = UN run par <root>.
 * L'orchestrateur DOIT inclure un run-id dans <root> (ex: runs/r6lite/<book>/<runId>) —
 * re-persister le même chapitre sous le même root écraserait result.json (FORBID-007
 * exige la persistance de TOUS les candidats DU run, pas l'historique multi-runs ici).
 */
export function persistLiteResult(root: string, result: LiteChapterResult, fs: FsPort): readonly string[] {
  const written: string[] = [];
  const chapDir = `${root}/chap_${String(result.chapter).padStart(3, '0')}`;
  fs.mkdirp(chapDir);
  for (const c of result.candidates) {
    const dir = `${chapDir}/candidate_${c.profile}`;
    fs.mkdirp(dir);
    fs.writeFile(`${dir}/prose.txt`, c.prose);
    fs.writeFile(
      `${dir}/meta.json`,
      canonicalize({ profile: c.profile, words: c.words, model: c.model, proseHash: String(c.proseHash), eligible: c.eligible, score: c.score }),
    );
    fs.writeFile(`${dir}/gates.json`, canonicalize({ gates: c.gates, recallViolations: c.recall.violations }));
    written.push(`${dir}/prose.txt`, `${dir}/meta.json`, `${dir}/gates.json`);
  }
  fs.writeFile(`${chapDir}/result.json`, canonicalize({ chapter: result.chapter, winner: result.winner }));
  written.push(`${chapDir}/result.json`);
  return written;
}
