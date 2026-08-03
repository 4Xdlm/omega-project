/**
 * OMEGA — SCRIBE_GATE : la composition de tout ce que la nuit du 2 août a établi.
 *
 * CE QUE CE MODULE FAIT — ET CE QU'IL NE FAIT PAS
 * ═══════════════════════════════════════════════
 * Il DÉCIDE de l'admissibilité d'un candidat et il CHOISIT parmi des candidats.
 * Il ne réécrit rien, ne génère rien, ne conseille rien au générateur.
 * Conforme ADR-003 : CALC contrôle la SÉLECTION, pas la génération.
 *
 * DEUX ÉTAGES, DANS CET ORDRE
 * ═══════════════════════════
 *   1. ÉLIGIBILITÉ — des vetos DURS, chacun adossé à un fait mesuré, jamais à un
 *      jugement de goût. Un candidat inéligible ne gagne jamais, quel que soit
 *      son score par ailleurs (étage A inviolable, doctrine R6).
 *   2. RÉPULSION — parmi les éligibles, refuser ce qui répète le livre déjà écrit.
 *
 * LES VETOS ET LEUR JUSTIFICATION EMPIRIQUE
 * ═════════════════════════════════════════
 *   LANG_RESIDUAL   mot-outil anglais dans la prose française.
 *                   Mesuré : 9,5 % des sorties en contiennent au moins un, soit
 *                   ~5 chapitres par livre de 50. « Il resta ainsi, immobile,
 *                   during un long moment » se lit comme un mot manquant, pas
 *                   comme un anglicisme — piste du retour lecteur n°1.
 *                   Ce n'est pas du coaching esthétique : c'est une
 *                   non-conformité linguistique objective.
 *
 *   PLOT_RECAP      période longue à ≥2 connecteurs de récapitulation causale.
 *                   Mesuré : ZÉRO période sur 1384 dans le corpus publié.
 *                   OMEGA sans garde : 57 % des périodes.
 *
 *   GENERATION_COLLAPSE  effondrement de génération (boucle du modèle).
 *                   Mesuré : 9/20 chapitres du run de juin dégénérés, dont un à
 *                   593 phrases identiques consécutives — c'est LUI qui gonflait
 *                   le z=−10,4 de LEGION. Seuils dérivés de 41 romans publiés
 *                   (runMax max 3, dupRatio max 0,035) : veto à runMax ≥ 5,
 *                   dupRatio ≥ 0,15, domShare ≥ 0,10. Là où aucun auteur ne va.
 *
 * CE QUI N'EST PAS UN VETO, ET POURQUOI
 * ═════════════════════════════════════
 *   Le gabarit d'ouverture n'est pas un veto : il n'a de sens que RELATIVEMENT
 *   au livre en cours. Une tête n'est fautive que si elle a déjà servi. C'est le
 *   rôle de l'étage 2, pas d'un seuil absolu.
 *
 *   L'absence de période longue n'est pas un veto non plus. Le PLAN ouvre une
 *   OPPORTUNITÉ (FORBID-006 v2 clause 5) ; exiger la période à chaque chapitre
 *   en ferait un quota, et le corpus publié n'en met que dans 1,67 % des phrases.
 */
import {
  extractLongPeriods,
  periodHead,
  measurePlotRecap,
  type RecapVerdict,
} from '../variation/long-period-template.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';
import { measureDegeneration } from './degeneration-veto.js';

export type VetoCode = 'LANG_RESIDUAL' | 'PLOT_RECAP' | 'GENERATION_COLLAPSE';

export interface Veto {
  readonly code: VetoCode;
  /** De quoi il retourne, en clair, pour le journal d'admission. */
  readonly detail: string;
}

export interface Eligibility {
  readonly eligible: boolean;
  readonly vetos: readonly Veto[];
  /** Tête de la première période longue, ou null s'il n'y en a pas. */
  readonly periodHead: string | null;
  readonly periodCount: number;
  readonly recapVerdict: RecapVerdict;
}

/**
 * Étage 1 — vetos durs. Un candidat inéligible ne gagne jamais.
 * `strictLang` permet de rétrograder le veto langue en simple signal, pour une
 * mise en service progressive (SHADOW puis dur).
 */
export function checkEligibility(
  prose: string,
  opts: { readonly strictLang?: boolean } = {},
): Eligibility {
  const strictLang = opts.strictLang ?? true;
  const vetos: Veto[] = [];

  const residuals = scanEnglishResiduals(prose);
  if (residuals.length > 0 && strictLang) {
    vetos.push({
      code: 'LANG_RESIDUAL',
      detail: `${residuals.length} mot(s) anglais : ${residuals.slice(0, 4).map((r) => r.word).join(', ')}`,
    });
  }

  // Effondrement de génération : objectif, jamais rétrogradable (un candidat qui
  // boucle n'est pas une variation stylistique, c'est un déchet de sampling).
  const degen = measureDegeneration(prose);
  if (degen.verdict === 'GENERATION_COLLAPSE') {
    vetos.push({
      code: 'GENERATION_COLLAPSE',
      detail:
        `run=${degen.maxConsecutiveRun}, dup=${(degen.duplicateRatio * 100).toFixed(1)}%, ` +
        `dominante ×${Math.round(degen.dominantShare * degen.sentences)} : « ${degen.dominantSentence.slice(0, 40)} »`,
    });
  }

  const periods = extractLongPeriods(prose);
  let worst: RecapVerdict = 'CLEAN';
  let worstDetail = '';
  for (const p of periods) {
    const r = measurePlotRecap(p);
    if (r.verdict === 'PLOT_RECAP_AS_THOUGHT') {
      worst = r.verdict;
      worstDetail = `${r.connectors} connecteurs : ${r.matched.slice(0, 3).join(', ')}`;
      break;
    }
    if (r.verdict === 'WATCH' && worst === 'CLEAN') worst = 'WATCH';
  }
  if (worst === 'PLOT_RECAP_AS_THOUGHT') {
    vetos.push({ code: 'PLOT_RECAP', detail: `periode-resume (${worstDetail})` });
  }

  const first = periods[0];
  return {
    eligible: vetos.length === 0,
    vetos,
    periodHead: first !== undefined ? periodHead(first) : null,
    periodCount: periods.length,
    recapVerdict: worst,
  };
}

export interface GateDecision<T> {
  readonly chosen: T | null;
  readonly chosenHead: string | null;
  /** Refusés par un veto dur, avec la raison. */
  readonly vetoed: readonly { readonly candidate: T; readonly vetos: readonly Veto[] }[];
  /** Refusés parce que leur tête de période avait déjà servi dans ce livre. */
  readonly repelled: readonly T[];
  /** Aucun candidat admissible : c'est un signal de régénération, pas une erreur. */
  readonly exhausted: boolean;
}

/**
 * Les deux étages, dans l'ordre. Rend une décision ; le consommateur en fait ce
 * qu'il veut (SHADOW : comparer au gagnant de production ; DUR : l'appliquer).
 *
 * Un candidat sans période longue est admissible et ne consomme aucune tête —
 * l'opportunité n'est pas une obligation.
 */
export function gateSelect<T>(
  candidates: readonly T[],
  proseOf: (c: T) => string,
  usedHeads: ReadonlySet<string>,
  opts: { readonly strictLang?: boolean } = {},
): GateDecision<T> {
  const vetoed: { candidate: T; vetos: readonly Veto[] }[] = [];
  const repelled: T[] = [];

  for (const c of candidates) {
    const e = checkEligibility(proseOf(c), opts);
    if (!e.eligible) {
      vetoed.push({ candidate: c, vetos: e.vetos });
      continue;
    }
    if (e.periodHead !== null && usedHeads.has(e.periodHead)) {
      repelled.push(c);
      continue;
    }
    return { chosen: c, chosenHead: e.periodHead, vetoed, repelled, exhausted: false };
  }
  return { chosen: null, chosenHead: null, vetoed, repelled, exhausted: true };
}

/* ──────────── PRÉFÉRENCE DE FORME (SHADOW — jamais au PLAN) ──────────── */

import { measureTailRates } from '../variation/long-period-template.js';
import { PUBLISHED_SHAPE_RATIO_ENVELOPE } from '../variation/long-period-template.js';

/**
 * POURQUOI SHADOW ET PAS UNE CONSIGNE DE PLAN (arbitrage 2026-08-03) :
 * Gemini proposait une « opportunité de phrase moyenne 41-49 » dans le PLAN ;
 * ChatGPT la rejetait. Nos PROPRES données tranchent : la contrainte positive
 * fabrique son gabarit (B1b « entre par un geste » → « il posa sa main » ×5 ;
 * B1d « apporte du neuf » → « le raisonnement s'imposa » ×4 — quatre bras,
 * même verdict). Une consigne « phrase moyenne » produirait des phrases
 * moyennes en gabarit. Donc : la forme se MESURE et se PRÉFÈRE à la sélection,
 * elle ne se commande pas.
 *
 * Fait visé : N9 shapeRatio = 0,75 vs élite 0,330 [0,111-0,528] — quand une
 * phrase dépasse 40 mots elle dépasse presque toujours 50 ; la zone organique
 * 41-49 (deux tiers des phrases longues humaines) manque.
 */
export interface ShapeShadow {
  /** Distance du shapeRatio du candidat à la médiane publiée (0,33). */
  readonly distanceToPublished: number;
  readonly shapeRatio: number;
  readonly tail40: number;
  readonly inPublishedRange: boolean;
}

export function shapeShadow(prose: string): ShapeShadow {
  const r = measureTailRates(prose);
  const e = PUBLISHED_SHAPE_RATIO_ENVELOPE;
  return {
    shapeRatio: r.shapeRatio,
    tail40: r.tail40,
    distanceToPublished: r.tail40 > 0 ? Math.abs(r.shapeRatio - e.median) : 0,
    inPublishedRange: r.tail40 === 0 || (r.shapeRatio >= e.min && r.shapeRatio <= e.maxObserved),
  };
}

/**
 * Classement SHADOW de candidats par forme organique — À CONSOMMER EN OBSERVATION
 * (journal d'admission) tant que le gain n'est pas prouvé sur Candidate Packs
 * gelés. Ne change PAS le gagnant de production ; ne vetote jamais (une forme
 * atypique n'est pas une faute). Départage stable par index d'origine.
 */
export function rankByShape<T>(
  candidates: readonly T[],
  proseOf: (c: T) => string,
): readonly { readonly candidate: T; readonly shadow: ShapeShadow }[] {
  return candidates
    .map((candidate, i) => ({ candidate, shadow: shapeShadow(proseOf(candidate)), i }))
    .sort((a, b) => a.shadow.distanceToPublished - b.shadow.distanceToPublished || a.i - b.i)
    .map(({ candidate, shadow }) => ({ candidate, shadow }));
}

/** Registre des têtes déjà servies — à faire vivre sur la durée d'un livre. */
export class PeriodHeadRegistry {
  private readonly used = new Set<string>();

  get size(): number {
    return this.used.size;
  }

  has(head: string): boolean {
    return this.used.has(head);
  }

  /** Enregistre une tête ADMISE. Une tête nulle (pas de période) n'est pas retenue. */
  record(head: string | null): void {
    if (head !== null && head.length > 0) this.used.add(head);
  }

  snapshot(): ReadonlySet<string> {
    return new Set(this.used);
  }
}
