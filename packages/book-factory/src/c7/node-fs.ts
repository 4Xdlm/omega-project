/**
 * OMEGA Book-Factory — C7 — Adaptateur FsPort node:fs (couche SCRIPT uniquement).
 * Le moteur n'importe jamais node:fs (BF-08) — seul ce point d'entrée C7 le fait.
 */
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';

import type { FsPort } from '../loop/persistence.js';

export class NodeFs implements FsPort {
  writeFile(path: string, content: string): void {
    writeFileSync(path, content, { encoding: 'utf8' });
  }
  mkdirp(dir: string): void {
    mkdirSync(dir, { recursive: true });
  }
}

export function appendLine(path: string, line: string): void {
  appendFileSync(path, `${line}\n`, { encoding: 'utf8' });
}
