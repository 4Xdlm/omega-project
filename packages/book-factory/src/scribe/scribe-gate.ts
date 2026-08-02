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

export type VetoCode = 'LANG_RESIDUAL' | 'PLOT_RECAP';

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
