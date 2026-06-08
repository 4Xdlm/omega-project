/**
 * OMEGA — S0 mesureur de marqueurs dramatiques. Réutilise les RE EXPORTÉES
 * d'arc-coherence (SSOT — jamais re-dérivées) et la formule dialogueRatio
 * EXACTE du classifieur, pour que « succès S0 » et « label runtime C17 »
 * regardent le même signal.
 */

import { ACTION_RE, CONFRONT_RE, REVELATION_RE } from '../coherence/arc-coherence.js';

export type MarkerFn = 'REVELATION' | 'CONFRONTATION' | 'ACTION' | 'TRANSITION';

export interface MarkerProfile {
  readonly revelationHits: number;
  readonly confrontHits: number;
  readonly actionHits: number;
  readonly dialogueRatio: number;
  readonly words: number;
  /** Fonction dominante (argmax des 3 marqueurs positifs ; TRANSITION si tous < floor). */
  readonly argmax: MarkerFn;
}

const FLOOR = 2; // plancher absolu du classifieur (max(2, quantile)) — directive-attribuable

/** dialogueRatio IDENTIQUE à arc-coherence (ligne 164-166) — même définition. */
function dialogueRatio(prose: string): number {
  const sentences = prose.split(/(?<=[.!?…])\s+/u).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const dialogueLines = sentences.filter((s) => /^[«"—-]|»\s*$/u.test(s.trim())).length;
  return dialogueLines / sentences.length;
}

export function measureMarkers(prose: string): MarkerProfile {
  const words = prose.split(/\s+/u).filter((w) => w.length > 0).length;
  const revelationHits = (prose.match(new RegExp(REVELATION_RE.source, 'giu')) ?? []).length;
  const confrontHits = (prose.match(new RegExp(CONFRONT_RE.source, 'gu')) ?? []).length;
  const actionHits = (prose.match(new RegExp(ACTION_RE.source, 'gu')) ?? []).length;
  const dia = dialogueRatio(prose);

  /* argmax : la CONFRONTATION exige aussi du dialogue (comme le classifieur :
   * confrontHits >= floor ET dialogueRatio >= médiane ≈ 0.3 proxy absolu). */
  const confrontEffective = dia >= 0.3 ? confrontHits : confrontHits * 0.5;
  const scores: ReadonlyArray<readonly [MarkerFn, number]> = [
    ['REVELATION', revelationHits],
    ['CONFRONTATION', confrontEffective],
    ['ACTION', actionHits],
  ];
  const top = [...scores].sort((a, b) => b[1] - a[1])[0] ?? (['TRANSITION', 0] as const);
  const argmax: MarkerFn = top[1] >= FLOOR ? top[0] : 'TRANSITION';

  return { revelationHits, confrontHits, actionHits, dialogueRatio: Number(dia.toFixed(3)), words, argmax };
}

/** Succès S0 = la prose a penché vers la fonction CIBLE (mécanisme, absolu). */
export function isSuccess(profile: MarkerProfile, target: MarkerFn): boolean {
  return profile.argmax === target;
}

/* ── effets collatéraux (INTERDIT de promouvoir une directive qui salit) ── */

const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];

export interface Collateral {
  readonly maxTicPer1000w: number;
  readonly trigramRepeatRate: number; // part de trigrammes de contenu répétés
}

export function measureCollateral(prose: string): Collateral {
  const words = prose.split(/\s+/u).filter((w) => w.length > 0).length || 1;
  const maxTic = Math.max(...TICS.map((t) => (((prose.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / words)));
  const toks = prose.toLowerCase().normalize('NFC').match(/[a-zà-ÿ]{4,}/giu) ?? [];
  const grams = new Map<string, number>();
  for (let i = 0; i + 2 < toks.length; i += 1) {
    const g = `${toks[i]} ${toks[i + 1]} ${toks[i + 2]}`;
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  const repeated = [...grams.values()].filter((n) => n >= 2).length;
  return { maxTicPer1000w: Number(maxTic.toFixed(2)), trigramRepeatRate: Number((repeated / Math.max(1, grams.size)).toFixed(4)) };
}
