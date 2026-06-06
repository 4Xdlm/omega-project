/**
 * OMEGA Book-Factory — C4 MAPPROJECTION (BF-08) — « la Bible sort une carte et la compare ».
 * INV-DIFF-004 : LA MÊME projection s'applique aux deux Bibles (symétrie par construction
 * — une seule fonction, appelée deux fois). Diff de graphes = signaux, advisory d'abord.
 *
 * MÉCANISME : projection déterministe de StoryState en 3 couches : SPATIALE
 * (personnage→lieu), RELATIONNELLE (arêtes typées valencées), GRAINES (seed→chapitres).
 * Tris compareStrings (cross-machine). Le diff détecte : lieu fantôme, occupant
 * divergent, relation oubliée/inventée, graine déplacée.
 * LIMITES : carte V1 = état FINAL projeté (pas trajectoire par chapitre — V2) ;
 * advisory (gate seulement sur high-conf structurel via bible-diff, pas ici).
 */

import { compareStrings } from '../identity/identity-types.js';
import type { StoryState } from '../story-state.js';

export interface MapProjection {
  readonly spatial: readonly { readonly charId: string; readonly location: string }[];
  readonly relational: readonly { readonly from: string; readonly to: string; readonly type: string }[];
  readonly seeds: readonly { readonly seedId: string; readonly planted: number; readonly bloomTarget: number; readonly status: string }[];
}

export interface MapDiffItem {
  readonly layer: 'spatial' | 'relational' | 'seeds';
  readonly subject: string;
  readonly detail: string;
  readonly expected?: string;
  readonly observed?: string;
}

/** Projection UNIQUE — appliquée à la RÉELLE et à l'EXTRAITE (symétrie garantie). */
export function projectMap(state: StoryState): MapProjection {
  return {
    spatial: state.characters
      .filter((c) => c.location !== undefined)
      .map((c) => ({ charId: c.id, location: c.location ?? '' }))
      .sort((a, b) => compareStrings(a.charId, b.charId)),
    relational: state.characters
      .flatMap((c) => c.relationships.map((r) => ({ from: c.id, to: r.to, type: r.type })))
      .sort((a, b) => compareStrings(`${a.from}→${a.to}`, `${b.from}→${b.to}`)),
    seeds: state.payoff_graph
      .map((p) => ({ seedId: p.seed_id, planted: p.planted_chapter, bloomTarget: p.bloom_target_chapter, status: p.status }))
      .sort((a, b) => compareStrings(a.seedId, b.seedId)),
  };
}

export function diffMaps(real: MapProjection, extracted: MapProjection): readonly MapDiffItem[] {
  const out: MapDiffItem[] = [];

  const realLoc = new Map(real.spatial.map((s) => [s.charId, s.location]));
  for (const e of extracted.spatial) {
    const expected = realLoc.get(e.charId);
    if (expected === undefined)
      out.push({ layer: 'spatial', subject: e.charId, detail: 'présence spatiale inconnue du plan', observed: e.location });
    else if (expected !== e.location)
      out.push({ layer: 'spatial', subject: e.charId, detail: 'occupant divergent', expected, observed: e.location });
  }

  const realRel = new Set(real.relational.map((r) => `${r.from}→${r.to}:${r.type}`));
  const extRel = new Set(extracted.relational.map((r) => `${r.from}→${r.to}:${r.type}`));
  for (const r of real.relational) {
    if (!extRel.has(`${r.from}→${r.to}:${r.type}`))
      out.push({ layer: 'relational', subject: `${r.from}→${r.to}`, detail: 'relation du plan absente de la prose', expected: r.type });
  }
  for (const r of extracted.relational) {
    if (!realRel.has(`${r.from}→${r.to}:${r.type}`))
      out.push({ layer: 'relational', subject: `${r.from}→${r.to}`, detail: 'relation inventée par la prose', observed: r.type });
  }

  const realSeed = new Map(real.seeds.map((s) => [s.seedId, s]));
  for (const s of extracted.seeds) {
    const rs = realSeed.get(s.seedId);
    if (rs === undefined)
      out.push({ layer: 'seeds', subject: s.seedId, detail: 'graine hors plan', observed: s.status });
    else if (rs.bloomTarget !== s.bloomTarget)
      out.push({ layer: 'seeds', subject: s.seedId, detail: 'cible d’éclosion déplacée', expected: String(rs.bloomTarget), observed: String(s.bloomTarget) });
  }

  return out;
}
