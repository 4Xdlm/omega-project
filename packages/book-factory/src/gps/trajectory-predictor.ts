/**
 * OMEGA Book-Factory — C14 TRAJECTORY PREDICTOR (BF-08, BF-11) — « les chemins
 * possibles » du GPS : 3-5 dérivations TYPÉES depuis la position mesurée.
 *
 * MÉCANISME (CALC, zéro LLM) : gabarits STRUCTURELS figés par type de route,
 * paramétrés par les ENTITÉS RÉELLES de la position (personnages en scène,
 * graines vieillissantes, météo émotionnelle). Une trajectoire dit QUOI mobiliser
 * (structure), jamais COMMENT l'écrire (la prose reste à l'écrivain — BF-11).
 *
 * BF-11 PAR CONSTRUCTION : sortie = LISTE NON ORDONNÉE PAR PRÉFÉRENCE (tri
 * alphabétique de type — aucun « meilleur choix ») ; chaque trajectoire expose
 * coûts ET bénéfices ; aucune n'est marquée recommandée. Le predictor REFUSE
 * de produire moins de 2 routes (une seule route = une décision déguisée).
 *
 * LIMITES (honnêtes) : prémisses = gabarits structurels FR — la formulation
 * littéraire fine = V2 (LLM gated par le router, jamais en mode GPS).
 */

import type { GpsPosition } from './gps-radar.js';
import { err, ok, compareStrings } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

/** Les 5 types de route (exemple canonique du mode 2, mandat produit). */
export type TrajectoryType = 'EMOTION' | 'ENQUETE' | 'NOIR' | 'TENSION' | 'THRILLER';

export interface Trajectory {
  readonly type: TrajectoryType;
  /** Prémisse STRUCTURELLE paramétrée par les entités réelles (pas de la prose). */
  readonly premise: string;
  /** Ce que la route MOBILISE (entités/graines) — bénéfice structurel. */
  readonly mobilizes: readonly string[];
  /** Ce que la route COÛTE/risque (jamais caché — anti-décision). */
  readonly risks: readonly string[];
  /** Direction émotionnelle attendue (potards, informatif — pas une consigne). */
  readonly knobTendency: Readonly<Partial<Record<'TENSION' | 'MYSTERE' | 'ESPOIR' | 'ROMANCE' | 'VIOLENCE', 1 | -1>>>;
}

export type PredictorError =
  | { readonly code: 'NO_MATERIAL'; readonly detail: string }
  | { readonly code: 'SINGLE_ROUTE_FORBIDDEN'; readonly detail: string };

/** Gabarits figés — STRUCTURE uniquement. Audités anti-coaching (pas de qualité). */
const TEMPLATES: Readonly<Record<TrajectoryType, (who: string, other: string, seed: string) => { premise: string; mobilizes: string[]; risks: string[]; knobTendency: Trajectory['knobTendency'] }>> = {
  ENQUETE: (who, _other, seed) => ({
    premise: `${who} découvre un élément matériel lié à « ${seed} » et choisit de le dissimuler pour l'instant.`,
    mobilizes: [who, `graine « ${seed} » (rappel)`],
    risks: ['retarde le payoff', 'ajoute une dissimulation à résoudre'],
    knobTendency: { MYSTERE: 1 },
  }),
  TENSION: (who, other, _seed) => ({
    premise: `${other} surprend ${who} en pleine action — confrontation immédiate, à voix contenue.`,
    mobilizes: [who, other],
    risks: ['consomme une confrontation (rare)', 'expose une information avant son heure'],
    knobTendency: { TENSION: 1 },
  }),
  EMOTION: (who, other, _seed) => ({
    premise: `${who} baisse la garde devant ${other} : un souvenir personnel remonte, la scène ralentit.`,
    mobilizes: [who, other, 'intériorité'],
    risks: ['casse le rythme si la scène précédente était lente', 'demande un ancrage mémoire cohérent'],
    knobTendency: { ESPOIR: 1, TENSION: -1 },
  }),
  THRILLER: (who, _other, seed) => ({
    premise: `Quelqu'un d'autre connaît « ${seed} » : ${who} trouve la preuve qu'un tiers est passé avant.`,
    mobilizes: [who, `graine « ${seed} » (escalade)`],
    risks: ['introduit un antagoniste actif à assumer ensuite', 'accélère la chronologie'],
    knobTendency: { TENSION: 1, MYSTERE: 1 },
  }),
  NOIR: (who, _other, seed) => ({
    premise: `${who} détruit ou compromet volontairement un élément lié à « ${seed} » pour protéger quelqu'un.`,
    mobilizes: [who, `graine « ${seed} » (bascule morale)`],
    risks: ['acte irréversible', 'déplace la sympathie du lecteur'],
    knobTendency: { TENSION: 1, ESPOIR: -1 },
  }),
};

const TYPES_SORTED: readonly TrajectoryType[] = ['EMOTION', 'ENQUETE', 'NOIR', 'TENSION', 'THRILLER'];

/**
 * Propose 3-5 routes depuis la position. Pur, déterministe.
 * REFUS si la matière ne permet pas ≥2 routes distinctes (anti-décision).
 */
export function predictTrajectories(position: GpsPosition, seeds: readonly string[]): Result<readonly Trajectory[], PredictorError> {
  const inScene = [...position.charactersInScene].sort((a, b) => b.lastSeenSentence - a.lastSeenSentence || compareStrings(a.name, b.name));
  const who = inScene[0]?.name;
  if (who === undefined) {
    return err({ code: 'NO_MATERIAL', detail: 'aucun personnage en scène — le GPS ne peut pas proposer de routes sans matière' });
  }
  const other = inScene.find((c) => c.name !== who)?.name ?? 'un témoin imprévu';
  // Graine prioritaire : la plus VIEILLISSANTE (NARRATIVE_FLOW : relancer les
  // branches mourantes) ; sinon la première du plan ; sinon pas de routes à graine.
  const seed = position.agingSeeds[0]?.seed ?? seeds[0];

  const out: Trajectory[] = [];
  for (const t of TYPES_SORTED) {
    // Routes à graine impossibles sans graine — on saute (jamais d'invention).
    if ((t === 'ENQUETE' || t === 'THRILLER' || t === 'NOIR') && seed === undefined) continue;
    const built = TEMPLATES[t](who, other, seed ?? '');
    out.push({ type: t, ...built });
  }
  if (out.length < 2) {
    return err({ code: 'SINGLE_ROUTE_FORBIDDEN', detail: `une seule route possible (${out[0]?.type ?? 'aucune'}) — une route unique est une décision déguisée (BF-11)` });
  }
  return ok(out);
}
