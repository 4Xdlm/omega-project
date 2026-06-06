/**
 * OMEGA Book-Factory — C4 DIFF DOUBLE-BIBLE (BF-03, BF-08) — le cœur du contrôle.
 * « La cohérence d'un manuscrit se prouve par DIFF mécanique entre Bible-RÉELLE et
 * Bible-EXTRAITE » — même type StoryState des deux côtés ⇒ comparaison champ à champ.
 *
 * INVARIANTS : INV-DIFF-001 exhaustivité (toute mutation d'un champ comparé produit
 * ≥1 item — testé par property) · INV-DIFF-002 FORBID-011 (confiance < τ ⇒
 * gateEligible=false, JAMAIS de rejet dur) · INV-DIFF-003 le diff ne réécrit RIEN
 * (sortie = signaux typés) · INV-DIFF-004 symétrie MapProjection (même projection
 * appliquée aux deux Bibles).
 *
 * MÉCANISME : la Bible-EXTRAITE est projetée par le MÊME fold que la RÉELLE
 * (projectStoryState — zéro nouveau modèle) à partir des événements candidats
 * haute-confiance ; les revendications (Temporal/Epistemic) se confrontent à part.
 * τ (seuil high-confidence) = EXPERIMENTAL_DEFAULT 0.8 — non scellé (EMP-16).
 * LIMITES : le rappel dépend des passes (un fait absent de l'extraction est invisible
 * au diff EXTRA/MUTATED mais le MISSING attendu-du-plan reste détecté côté RÉEL) ;
 * l'épistémique exige un vérificateur knows() injecté (adapter P0.6b) — absent ⇒
 * claims classées UNCERTAIN, jamais ignorées.
 */

import type { CharacterId, Confidence01 } from '../identity/identity-types.js';
import { asConfidence01 } from '../identity/identity-types.js';
import type { StoryState } from '../story-state.js';
import type { EpistemicClaim, ExtractedEvent, TemporalClaim } from '../extraction/extraction-types.js';

/** Constantes via smart-constructor (revue C6 P4 : zéro cast nu, même pour les constantes). */
function c01(n: number): Confidence01 {
  const r = asConfidence01(n);
  if (!r.ok) throw new Error(`constante de confiance invalide: ${n}`);
  return r.value;
}

export const TAU_HIGH_CONFIDENCE = c01(0.8); // EXPERIMENTAL_DEFAULT — non scellé

export type DiffKind = 'MISSING' | 'EXTRA' | 'MUTATED' | 'TEMPORAL' | 'EPISTEMIC';

export interface DiffItem {
  readonly kind: DiffKind;
  readonly subject: string; // clé lisible (char id, seed id, marqueur…)
  readonly field: string;
  readonly expected?: string;
  readonly observed?: string;
  readonly confidence: Confidence01;
  readonly gateEligible: boolean; // INV-DIFF-002 : conf ≥ τ ET kind dur
  readonly detail: string;
}

export interface BibleDiff {
  readonly items: readonly DiffItem[];
  readonly hardViolations: readonly DiffItem[]; // gateEligible === true
  readonly uncertain: readonly DiffItem[]; // conf < τ — signaux, jamais gate (FORBID-011)
}

export interface EpistemicChecker {
  /** vrai si l'acteur SAIT le sujet (JTB — adapter P0.6b). */
  readonly actorKnows: (actor: CharacterId, subject: string) => boolean;
}

function item(
  kind: DiffKind,
  subject: string,
  field: string,
  detail: string,
  confidence: Confidence01,
  expected?: string,
  observed?: string,
): DiffItem {
  return {
    kind,
    subject,
    field,
    expected,
    observed,
    confidence,
    gateEligible: Number(confidence) >= Number(TAU_HIGH_CONFIDENCE),
    detail,
  };
}

const FULL = c01(0.95); // structurel (Bible vs Bible) — déterministe

/**
 * Diff principal. `real` = plan/canon validé ; `extractedState` = fold des candidats
 * HAUTE confiance ; `claims` = revendications (temporal/epistemic) TOUTES confiances.
 */
export function diffBibles(
  real: StoryState,
  extractedState: StoryState,
  claims: readonly ExtractedEvent[],
  realWeekdayByChapter: ReadonlyMap<number, string>,
  epistemic?: EpistemicChecker,
): BibleDiff {
  const items: DiffItem[] = [];

  /* ── personnages : MUTATED (statut/lieu) + EXTRA (fantôme) + MISSING (attendu absent) ── */
  const realChars = new Map(real.characters.map((c) => [c.id, c]));
  const extChars = new Map(extractedState.characters.map((c) => [c.id, c]));
  for (const [id, rc] of realChars) {
    const ec = extChars.get(id);
    if (ec === undefined) {
      items.push(item('MISSING', id, 'character', `personnage attendu absent de la prose : ${rc.name}`, FULL, rc.name));
      continue;
    }
    if (ec.status !== rc.status)
      items.push(item('MUTATED', id, 'status', `statut divergent pour ${rc.name}`, FULL, rc.status, ec.status));
    if (ec.location !== undefined && rc.location !== undefined && ec.location !== rc.location)
      items.push(item('MUTATED', id, 'location', `lieu divergent pour ${rc.name}`, FULL, rc.location, ec.location));
  }
  for (const [id, ec] of extChars) {
    if (!realChars.has(id))
      items.push(item('EXTRA', id, 'character', `personnage fantôme dans la prose : ${ec.name} (hallucination candidate)`, FULL, undefined, ec.name));
  }

  /* ── graines : MISSING (bloom prévu non advenu) + EXTRA (bloom non prévu) ───────────── */
  const realSeeds = new Map(real.payoff_graph.map((p) => [p.seed_id, p]));
  const extSeeds = new Map(extractedState.payoff_graph.map((p) => [p.seed_id, p]));
  for (const [sid, rp] of realSeeds) {
    const ep = extSeeds.get(sid);
    if (rp.status === 'bloomed' && (ep === undefined || ep.status !== 'bloomed'))
      items.push(item('MISSING', sid, 'seed_bloom', `payoff prévu non retrouvé en prose : ${rp.desc}`, FULL, 'bloomed', ep?.status));
  }
  for (const [sid, ep] of extSeeds) {
    if (!realSeeds.has(sid))
      items.push(item('EXTRA', sid, 'seed', `graine inconnue du plan retrouvée en prose`, FULL, undefined, ep.desc));
  }

  /* ── fils : MISSING (résolution prévue absente) ─────────────────────────────────────── */
  const extThreads = new Map(extractedState.threads.map((t) => [t.id, t]));
  for (const rt of real.threads) {
    if (rt.status === 'resolved') {
      const et = extThreads.get(rt.id);
      if (et === undefined || et.status !== 'resolved')
        items.push(item('MISSING', rt.id, 'thread_resolution', `résolution prévue non retrouvée : ${rt.question}`, FULL, 'resolved', et?.status));
    }
  }

  /* ── revendications TEMPORELLES : confrontées au calendrier RÉEL ───────────────────── */
  for (const c of claims) {
    if (c.payload.kind !== 'TEMPORAL_CLAIM') continue;
    const tc: TemporalClaim = c.payload;
    if (tc.category === 'weekday') {
      const expected = realWeekdayByChapter.get(tc.chapter);
      if (expected !== undefined && expected !== tc.marker) {
        items.push(item('TEMPORAL', `ch.${tc.chapter}`, 'weekday', `jour divergent au chapitre ${tc.chapter}`, c.confidence, expected, tc.marker));
      }
    }
  }

  /* ── revendications ÉPISTÉMIQUES : « révèle ce qu'il ne sait pas » ─────────────────── */
  for (const c of claims) {
    if (c.payload.kind !== 'REVEAL_CLAIM') continue;
    const ec: EpistemicClaim = c.payload;
    if (epistemic === undefined) {
      items.push(item('EPISTEMIC', String(ec.actorId), 'reveal_unverified', `révélation non vérifiable (pas de knows() injecté) : « ${ec.subject} »`, c01(0.5), undefined, ec.subject));
    } else if (!epistemic.actorKnows(ec.actorId, ec.subject)) {
      items.push(item('EPISTEMIC', String(ec.actorId), 'reveal_without_knowledge', `l'acteur révèle ce qu'il ne SAIT pas : « ${ec.subject} »`, c.confidence, 'knows=true', 'knows=false'));
    }
  }

  const hardViolations = items.filter((i) => i.gateEligible);
  const uncertain = items.filter((i) => !i.gateEligible);
  return { items, hardViolations, uncertain };
}

/** Fold des candidats HAUTE confiance vers une Bible-EXTRAITE (réutilise le fold P1.A). */
export function highConfidenceEvents(
  extracted: readonly ExtractedEvent[],
): readonly import('../story-state.js').NarrativeEvent[] {
  return extracted.flatMap((e) =>
    Number(e.confidence) >= Number(TAU_HIGH_CONFIDENCE) &&
    e.payload.kind !== 'TEMPORAL_CLAIM' &&
    e.payload.kind !== 'REVEAL_CLAIM'
      ? [e.payload]
      : [],
  );
}
