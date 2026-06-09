/**
 * OMEGA — EXÉCUTEUR PATCH V3 (GO 3-IA 2026-06-09 : « construire l'exécuteur
 * d'abord, le tester AVANT toute génération, puis patcher item par item »).
 *
 * Le chaînon manquant : guardRegen JUGE une candidate, mais rien ne l'APPLIQUE en
 * sûreté. applyPatch ferme la boucle : splice → guardRegen (REPLACE) → re-certif
 * buildCanonical(enforceAuthorRules) → ACCEPT ou REVERT AUTOMATIQUE → INTEGRITY.
 *
 * FILET DE SÛRETÉ (mandat Gemini/ChatGPT) : aucune génération aveugle. Une candidate
 * n'entre dans le manuscrit QUE si (1) guardRegen ACCEPT (défaut corrigé, casting
 * intact, zéro mort ressuscité, longueur en bande) ET (2) le build re-certifie sans
 * violation de vitalité. Sinon REVERT : le manuscrit ressort IDENTIQUE (hash égal).
 *
 * INV-PATCH-001 : REVERT ⇒ manuscrit d'entrée inchangé bit-à-bit (rollback prouvé).
 * INV-PATCH-002 : le splice ne touche QUE le chapitre cible (voisins intacts).
 * INV-PATCH-003 : ACCEPT ⇒ le manuscrit sortant re-certifie (buildCanonical ok).
 *
 * LIMITES : la re-certif fait tourner tout le pipeline Doctor — coûteux mais
 * déterministe. La candidate vient d'ailleurs (LLM gemma4) ; cet exécuteur ne
 * génère pas (séparation : génération ≠ admission, doctrine ADR-003).
 */

import { sha256 } from '@omega/canon-kernel';

import { buildCanonical } from './build-canonical.js';
import type { BuildCanonicalOptions } from './build-canonical.js';
import { guardRegen } from '../polish/targeted-regen-guard.js';
import type { GuardResult } from '../polish/targeted-regen-guard.js';

export interface PatchOp {
  readonly chapter: number;
  /** Nouvelle prose du chapitre (générée ailleurs — LLM). */
  readonly candidate: string;
  /** Défaut visé (pour guardRegen). */
  readonly defect: 'mover' | 'soft_transition' | 'tic';
  readonly label: string;
}

export interface PatchContext {
  readonly cast: readonly string[];
  readonly deadCanon: readonly string[];
  readonly build?: BuildCanonicalOptions;
}

export interface IntegrityReport {
  readonly chapter: number;
  readonly label: string;
  readonly accepted: boolean;
  readonly reason: string;
  readonly guard: GuardResult | null;
  readonly certifiedAfter: boolean;
  readonly vitalityViolationsAfter: number;
  readonly hashBefore: string;
  readonly hashAfter: string;
  readonly wordsBefore: number;
  readonly wordsAfter: number;
}

const words = (s: string): number => s.split(/\s+/u).filter((w) => w.length > 0).length;
const hash = (s: string): string => String(sha256(s.normalize('NFC')));

/** Remplace le CORPS du chapitre `chapter` par `candidate`, en préservant la ligne
 *  de titre et TOUT le reste du manuscrit (INV-PATCH-002). null si chapitre absent. */
export function spliceChapter(manuscript: string, chapter: number, candidate: string): { readonly text: string; readonly originalProse: string } | null {
  const headRe = new RegExp(`^## Chapitre ${chapter}\\b.*$`, 'mu');
  const m = headRe.exec(manuscript);
  if (m === null) return null;
  const headEnd = m.index + m[0].length;
  const rest = manuscript.slice(headEnd);
  const nextM = /\n## Chapitre \d+\b/u.exec(rest);
  const bodyEnd = nextM === null ? manuscript.length : headEnd + nextM.index;
  const originalProse = manuscript.slice(headEnd, bodyEnd).trim();
  const tail = manuscript.slice(bodyEnd).replace(/^\n+/u, '\n\n');
  const text = `${manuscript.slice(0, headEnd)}\n\n${candidate.trim()}${nextM === null ? '\n' : `\n${tail}`}`;
  return { text, originalProse };
}

/**
 * Applique UN patch en sûreté. Renvoie le manuscrit (patché si ACCEPT, identique
 * si REVERT) + l'INTEGRITY_REPORT. Async (re-certif buildCanonical).
 */
export async function applyPatch(manuscript: string, op: PatchOp, ctx: PatchContext): Promise<{ readonly manuscript: string; readonly report: IntegrityReport }> {
  const hashBefore = hash(manuscript);
  const wordsBefore = words(manuscript);
  const base = (reason: string, extra: Partial<IntegrityReport> = {}): { manuscript: string; report: IntegrityReport } => ({
    manuscript, // INV-PATCH-001 : REVERT = entrée inchangée
    report: { chapter: op.chapter, label: op.label, accepted: false, reason, guard: null, certifiedAfter: false, vitalityViolationsAfter: -1, hashBefore, hashAfter: hashBefore, wordsBefore, wordsAfter: wordsBefore, ...extra },
  });

  const spliced = spliceChapter(manuscript, op.chapter, op.candidate);
  if (spliced === null) return base(`REVERT : chapitre ${op.chapter} introuvable`);

  /* 1. Garde de régression (douanier ADR-003). */
  const guard = guardRegen({ original: spliced.originalProse, candidate: op.candidate, cast: ctx.cast, deadCanon: ctx.deadCanon, defect: op.defect });
  if (guard.verdict === 'REJECT') return base(`REVERT : guardRegen REJECT [${guard.reasons.join(', ')}]`, { guard });

  /* 2. Re-certification : tout le pipeline + règles auteur opposables (vitalité). */
  const built = await buildCanonical(spliced.text, { ...ctx.build, enforceAuthorRules: true });
  if (!built.ok) {
    const vio = built.error.code === 'AUTHOR_RULE_VIOLATION' ? built.error.violations.length : -1;
    return base(`REVERT : re-certif FAIL [${built.error.code}]`, { guard, vitalityViolationsAfter: vio });
  }

  /* 3. ACCEPT — le manuscrit PATCHÉ (brut splicé) avance ; sa version canonique certifie. */
  return {
    manuscript: spliced.text,
    report: { chapter: op.chapter, label: op.label, accepted: true, reason: 'ACCEPT : guard ok + re-certif ok', guard, certifiedAfter: true, vitalityViolationsAfter: 0, hashBefore, hashAfter: hash(spliced.text), wordsBefore, wordsAfter: words(spliced.text) },
  };
}
