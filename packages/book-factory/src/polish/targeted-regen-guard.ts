/**
 * OMEGA — PE-3 : REGRESSION-GUARD de régénération ciblée (pur CALC, testable
 * sans LLM). Le CALC = douanier (doctrine ADR-003) : une régénération de
 * chapitre n'est ADMISE que si elle CORRIGE le défaut SANS rien casser.
 *
 * LOI PE-3 : le créatif n'est JAMAIS auto-réparé. Ce module ne génère pas — il
 * JUGE une candidate (déjà produite ailleurs) contre l'originale. L'exécution
 * de la régénération attend le feu vert 3-IA. Ici, on garantit la SÛRETÉ.
 */

import { ACTION_RE, CONFRONT_RE, REVELATION_RE } from '../coherence/arc-coherence.js';
import { scanPassiveCharacters } from './editorial-scanners.js';

export type RegenReject =
  | 'NO_MOVER_GAINED' | 'TIC_INCREASED' | 'NEW_SEMANTIC_RESIDUE' | 'CANON_CHARACTER_REMOVED'
  | 'DEAD_CHARACTER_RESURRECTED' | 'LENGTH_OUT_OF_BAND';

export interface GuardInput {
  readonly original: string;
  readonly candidate: string;
  readonly cast: readonly string[];
  /** Personnages morts au canon (ne doivent JAMAIS agir/parler après). */
  readonly deadCanon: readonly string[];
  /** Le défaut visé : 'mover' = le chapitre manquait de personnage moteur. */
  readonly defect: 'mover' | 'soft_transition' | 'tic';
}

export interface GuardResult {
  readonly verdict: 'ACCEPT' | 'REJECT';
  readonly reasons: readonly RegenReject[];
  readonly metrics: { readonly moversBefore: number; readonly moversAfter: number; readonly ticBefore: number; readonly ticAfter: number; readonly wordsAfter: number };
}

const TICS = ['le gardien', 'le silence', 'il y a', 'la pluie', 'le village', 'la peur', 'la mer', 'le vent'];
function ticDensity(prose: string): number {
  const w = prose.split(/\s+/u).filter((x) => x.length > 0).length || 1;
  return Math.max(...TICS.map((t) => (((prose.toLowerCase().match(new RegExp(t.replace(/ /gu, '\\s+'), 'gu')) ?? []).length * 1000) / w)));
}
/** AGENCE ÉLARGIE (EMP-16 movers, 2026-06-09, GO 3-IA). Dans un polar, l'agence
 *  passe aussi par l'INTERROGATION, la CONFRONTATION, le REGARD intense et la
 *  DÉCISION — pas seulement l'action physique. Finding ch.27 : « Garcia fixa Yvon »
 *  = agence réelle que le lexique physique étroit ratait (faux-négatif noMover).
 *  SPÉCIFIQUE : exclut regarda/observa/posa/resta (agence faible) → un chapitre
 *  mort reste à 0 (prouvé par contrôle). */
const AGENCY_RE = /\b(?:court|courut|frappa|frappe|saisit|brisa|jeta|bondit|s'élança|se dressa|serra|arracha|empoigna|repoussa|dit|demanda|répondit|répliqua|rétorqua|riposta|cria|hurla|murmura|souffla|lança|coupa|accusa|menaça|exigea|somma|pressa|interrogea|questionna|ordonna|réclama|insista|reprocha|défia|avoua|confessa|admit|révéla|comprit|décida|résolut|trancha|choisit|refusa|désigna|scruta|dévisagea|toisa|jaugea|fixa)\b/iu;
const SPEECH_INV_RE = /\b(?:dit|demanda|répondit|répliqua|rétorqua|riposta|cria|murmura|lança|souffla|insista|reprit)\b/iu;

/** c est-il AGENT ? sujet d'un verbe d'agence (c…verbe) OU inversion de dialogue
 *  (verbe…c, « demanda Garcia »). N'attribue jamais l'OBJET d'un verbe transitif. */
function isAgent(prose: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`\\b${esc}\\b[^.!?…»]{0,40}?(?:${AGENCY_RE.source})`, 'iu').test(prose)
    || new RegExp(`(?:${SPEECH_INV_RE.source})[^.!?…»]{0,20}?\\b${esc}\\b`, 'iu').test(prose);
}

function movers(prose: string, cast: readonly string[]): number {
  return cast.filter((c) => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u').test(prose) && isAgent(prose, c)).length;
}

/** Ventilation de l'agence (EMP-16) : PHYSIQUE (verbe vivant LIVE_VERB) vs
 *  CONFRONTATION (agence sans verbe physique — interrogation/regard/décision).
 *  Distingue NO_MOVER_PHYSICAL de AGENCY_BY_CONFRONTATION (mandat ChatGPT). */
export function moverBreakdown(prose: string, cast: readonly string[]): { readonly physical: number; readonly confrontation: number; readonly total: number } {
  let physical = 0; let confrontation = 0;
  for (const c of cast) {
    if (!new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u').test(prose) || !isAgent(prose, c)) continue;
    if (scanPassiveCharacters(prose, [c]).includes(c)) confrontation += 1; else physical += 1;
  }
  return { physical, confrontation, total: physical + confrontation };
}
const SPEAKS_RE = /\b(dit|demanda|répondit|cria|murmura|avoua|lança|souffla)\b/iu;
function acts(prose: string, name: string): boolean {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`\\b${esc}\\b[^.!?…»]{0,40}?(?:${SPEAKS_RE.source}|${ACTION_RE.source})`, 'iu').test(prose)
    || new RegExp(`(?:${SPEAKS_RE.source})[^.!?…»]{0,20}?\\b${esc}\\b`, 'iu').test(prose);
}

/** JUGE une candidate de régénération. Pur, déterministe, zéro réseau. */
export function guardRegen(input: GuardInput): GuardResult {
  const reasons: RegenReject[] = [];
  const moversBefore = movers(input.original, input.cast);
  const moversAfter = movers(input.candidate, input.cast);
  const ticBefore = Number(ticDensity(input.original).toFixed(2));
  const ticAfter = Number(ticDensity(input.candidate).toFixed(2));
  const wordsAfter = input.candidate.split(/\s+/u).filter((w) => w.length > 0).length;

  /* 1. Le défaut visé doit être corrigé. */
  if (input.defect === 'mover' && moversAfter <= moversBefore) reasons.push('NO_MOVER_GAINED');

  /* 2. Ne rien SALIR : tics non augmentés (marge 0.1 tolérance bruit). */
  if (ticAfter > ticBefore + 0.1) reasons.push('TIC_INCREASED');

  /* 3. Pas de nouveau résidu sémantique grossier (guillemet orphelin, stem nu). */
  const openClose = (input.candidate.match(/«/gu) ?? []).length - (input.candidate.match(/»/gu) ?? []).length;
  if (openClose !== 0) reasons.push('NEW_SEMANTIC_RESIDUE');

  /* 4. CANON : aucun personnage du casting présent dans l'original ne disparaît. */
  for (const c of input.cast) {
    const inOrig = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u').test(input.original);
    const inCand = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u').test(input.candidate);
    if (inOrig && !inCand) { reasons.push('CANON_CHARACTER_REMOVED'); break; }
  }

  /* 5. CANON : un mort ne ressuscite pas (n'agit/parle pas) — leçon mistral ch.50. */
  for (const d of input.deadCanon) if (acts(input.candidate, d)) { reasons.push('DEAD_CHARACTER_RESURRECTED'); break; }

  /* 6. Longueur dans une bande raisonnable vs original (±40%). */
  const wo = input.original.split(/\s+/u).filter((w) => w.length > 0).length || 1;
  if (wordsAfter < wo * 0.6 || wordsAfter > wo * 1.4) reasons.push('LENGTH_OUT_OF_BAND');

  return { verdict: reasons.length === 0 ? 'ACCEPT' : 'REJECT', reasons, metrics: { moversBefore, moversAfter, ticBefore, ticAfter, wordsAfter } };
}

/** Marqueurs dramatiques (réexport pour le bon de travail). */
export function dramaticHits(prose: string): { rev: number; conf: number; act: number } {
  return {
    rev: (prose.match(new RegExp(REVELATION_RE.source, 'giu')) ?? []).length,
    conf: (prose.match(new RegExp(CONFRONT_RE.source, 'gu')) ?? []).length,
    act: (prose.match(new RegExp(ACTION_RE.source, 'gu')) ?? []).length,
  };
}
