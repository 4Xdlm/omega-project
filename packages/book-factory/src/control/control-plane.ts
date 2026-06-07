/**
 * OMEGA — CONTROL_PLANE V1 : R6_DRAMATIC_FUNCTION_GATE (C17).
 * CONCEPT-R6-DRAMATIC-FUNCTION-GATE-001 — mandat tribunal 2026-06-07 :
 * ChatGPT « GO SHADOW + BLOCKING_SOFT, pas de gate dure immédiate » ;
 * Gemini exigeait la gate dure — TRANCHÉ PAR LA LOI : EMP-16 exige 3 preuves
 * convergentes avant durcissement, on en a 1 (verdict EMP-16). Le mode 'hard'
 * N'EXISTE PAS dans ce code : coder un chemin dormant = code mort + footgun.
 *
 * FAIT MESURÉ (la faille que ce module ferme) : plan TRANSITION ≤ 0.45 →
 * réalisé 0.58 ; RÉVÉLATION planifiée ≥ 1/acte → réalisé 2/50. La gate de PLAN
 * ne contraint pas la GÉNÉRATION — il faut contrôler la trajectoire au runtime.
 *
 * SÉPARATION STRICTE : ce module NE CLASSIFIE PAS (le classifieur de fonctions
 * appartient au Doctor — Gold-Set GS-1/GS-2). Il consomme des paires
 * (plannedFn, realizedFn) et rend des VERDICTS typés. Politique d'effets chez
 * l'appelant — le module est pur et rejouable.
 *
 * RÈGLES SOFT (causales, ciblées sur les deux défauts mesurés — pas de zèle) :
 *   R1. REGEN si la dérive AGGRAVE le budget : realized=TRANSITION hors plan
 *       ET le quota TRANSITION de l'acte est déjà consommé.
 *   R2. REGEN si une RÉVÉLATION PLANIFIÉE est perdue (planned=REVELATION,
 *       realized≠) — l'anémie 0/50 du 88k ne doit jamais revenir.
 *   Une dérive inoffensive (ACTION→CONFRONTATION) ne déclenche RIEN.
 *   UNE seule regen par chapitre, puis fallback A (ADR-003) : on garde la
 *   meilleure, flaggée — jamais de blocage muet, jamais de boucle.
 */

export type DramaticFn = 'TRANSITION' | 'ACTION' | 'CONFRONTATION' | 'REVELATION' | 'SETUP' | 'PAYOFF';
export type ControlMode = '0' | 'shadow' | 'soft';

export interface ControlBudget {
  /** Plafond TRANSITION par acte (défaut 0.45 — le 88k réalisé était 0.72, EMP-16 : 0.58). */
  readonly maxTransitionRatio: number;
  /** Plancher RÉVÉLATION par acte (défaut 1 — l'anémie 0/50 devient impossible). */
  readonly minRevelationPerAct: number;
  /** Plancher CONFRONTATION par acte (défaut 1). */
  readonly minConfrontationPerAct: number;
}

export interface ChapterControlRecord {
  readonly chapter: number;
  readonly act: number;
  readonly plannedFn: DramaticFn;
  readonly realizedFn: DramaticFn;
  /** true si l'appelant re-soumet APRÈS une regen déjà demandée pour ce chapitre. */
  readonly isRegenRound?: boolean;
}

export type ChapterControlVerdict =
  | { readonly status: 'MATCH'; readonly chapter: number }
  | { readonly status: 'DRIFT_LOGGED'; readonly chapter: number; readonly plannedFn: DramaticFn; readonly realizedFn: DramaticFn; readonly rule: 'NONE' }
  | { readonly status: 'DRIFT_REGEN_REQUESTED'; readonly chapter: number; readonly plannedFn: DramaticFn; readonly realizedFn: DramaticFn; readonly rule: 'R1_TRANSITION_BUDGET' | 'R2_LOST_REVELATION' }
  | { readonly status: 'DRIFT_ACCEPTED_FLAGGED'; readonly chapter: number; readonly plannedFn: DramaticFn; readonly realizedFn: DramaticFn; readonly flag: 'below_budget' };

export interface ActCloseBreach {
  readonly act: number;
  readonly code: 'NO_REVELATION_REALIZED' | 'NO_CONFRONTATION_REALIZED' | 'TRANSITION_RATIO_EXCEEDED';
  readonly detail: string;
}

export interface ActSnapshot {
  readonly act: number;
  readonly chapters: number;
  readonly transitionCount: number;
  readonly transitionRatio: number;
  readonly revelations: number;
  readonly confrontations: number;
}

export interface ControlPlaneReport {
  readonly mode: ControlMode;
  readonly chapters: number;
  readonly matches: number;
  readonly drifts: number;
  readonly regensRequested: number;
  readonly acceptedFlagged: number;
  readonly driftRate: number;
  readonly acts: readonly ActSnapshot[];
  readonly actBreaches: readonly ActCloseBreach[];
}

const DEFAULT_BUDGET: ControlBudget = { maxTransitionRatio: 0.45, minRevelationPerAct: 1, minConfrontationPerAct: 1 };

export class ControlPlane {
  private readonly budget: ControlBudget;
  private readonly mode: ControlMode;
  private readonly records: ChapterControlRecord[] = [];
  private readonly verdicts: ChapterControlVerdict[] = [];
  private readonly regenAsked = new Set<number>();
  private readonly breaches: ActCloseBreach[] = [];

  constructor(mode: ControlMode, budget: Partial<ControlBudget> = {}) {
    this.mode = mode;
    this.budget = { ...DEFAULT_BUDGET, ...budget };
  }

  /** Photographie de l'acte sur les chapitres ENREGISTRÉS (réalisé, pas plan). */
  actSnapshot(act: number): ActSnapshot {
    const inAct = this.records.filter((r) => r.act === act);
    const transitions = inAct.filter((r) => r.realizedFn === 'TRANSITION').length;
    return {
      act,
      chapters: inAct.length,
      transitionCount: transitions,
      transitionRatio: inAct.length === 0 ? 0 : Number((transitions / inAct.length).toFixed(4)),
      revelations: inAct.filter((r) => r.realizedFn === 'REVELATION').length,
      confrontations: inAct.filter((r) => r.realizedFn === 'CONFRONTATION').length,
    };
  }

  /** Enregistre un chapitre GÉNÉRÉ et rend le verdict de contrôle. */
  record(rec: ChapterControlRecord): ChapterControlVerdict {
    const drift = rec.plannedFn !== rec.realizedFn;
    let verdict: ChapterControlVerdict;

    if (!drift) {
      verdict = { status: 'MATCH', chapter: rec.chapter };
    } else if (this.mode !== 'soft') {
      verdict = { status: 'DRIFT_LOGGED', chapter: rec.chapter, plannedFn: rec.plannedFn, realizedFn: rec.realizedFn, rule: 'NONE' };
    } else if (rec.isRegenRound === true || this.regenAsked.has(rec.chapter)) {
      /* Fallback A (ADR-003) : une regen a déjà eu lieu — on accepte, flaggé. */
      verdict = { status: 'DRIFT_ACCEPTED_FLAGGED', chapter: rec.chapter, plannedFn: rec.plannedFn, realizedFn: rec.realizedFn, flag: 'below_budget' };
    } else {
      const snap = this.actSnapshot(rec.act);
      const budgetTransitions = Math.floor((snap.chapters + 1) * this.budget.maxTransitionRatio);
      const aggravates = rec.realizedFn === 'TRANSITION' && snap.transitionCount + 1 > budgetTransitions;
      const losesRevelation = rec.plannedFn === 'REVELATION';
      if (aggravates) {
        this.regenAsked.add(rec.chapter);
        verdict = { status: 'DRIFT_REGEN_REQUESTED', chapter: rec.chapter, plannedFn: rec.plannedFn, realizedFn: rec.realizedFn, rule: 'R1_TRANSITION_BUDGET' };
      } else if (losesRevelation) {
        this.regenAsked.add(rec.chapter);
        verdict = { status: 'DRIFT_REGEN_REQUESTED', chapter: rec.chapter, plannedFn: rec.plannedFn, realizedFn: rec.realizedFn, rule: 'R2_LOST_REVELATION' };
      } else {
        verdict = { status: 'DRIFT_LOGGED', chapter: rec.chapter, plannedFn: rec.plannedFn, realizedFn: rec.realizedFn, rule: 'NONE' };
      }
    }

    /* Une regen demandée n'ADMET pas le chapitre : l'appelant re-générera puis
     * re-soumettra (isRegenRound). Tout autre verdict = chapitre enregistré. */
    if (verdict.status !== 'DRIFT_REGEN_REQUESTED') {
      this.records.push(rec);
      this.verdicts.push(verdict);
    } else {
      this.verdicts.push(verdict);
    }
    return verdict;
  }

  /** Clôture d'acte : contrôle des planchers/plafonds RÉALISÉS (ChatGPT :
   *  « BLOCK_SOFT avant passage acte suivant » — le verdict ; l'effet, chez l'appelant). */
  closeAct(act: number): readonly ActCloseBreach[] {
    const snap = this.actSnapshot(act);
    const found: ActCloseBreach[] = [];
    if (snap.revelations < this.budget.minRevelationPerAct) found.push({ act, code: 'NO_REVELATION_REALIZED', detail: `acte ${act} : ${snap.revelations} RÉVÉLATION réalisée(s) < ${this.budget.minRevelationPerAct}` });
    if (snap.confrontations < this.budget.minConfrontationPerAct) found.push({ act, code: 'NO_CONFRONTATION_REALIZED', detail: `acte ${act} : ${snap.confrontations} CONFRONTATION réalisée(s) < ${this.budget.minConfrontationPerAct}` });
    if (snap.transitionRatio > this.budget.maxTransitionRatio) found.push({ act, code: 'TRANSITION_RATIO_EXCEEDED', detail: `acte ${act} : TRANSITION ${(snap.transitionRatio * 100).toFixed(0)}% > ${(this.budget.maxTransitionRatio * 100).toFixed(0)}%` });
    this.breaches.push(...found);
    return found;
  }

  /** Rapport télémétrique — chaque run nourrit les preuves 2/3 du futur 'hard'. */
  report(): ControlPlaneReport {
    const acts = [...new Set(this.records.map((r) => r.act))].sort((a, b) => a - b).map((a) => this.actSnapshot(a));
    const drifts = this.verdicts.filter((v) => v.status !== 'MATCH').length;
    return {
      mode: this.mode,
      chapters: this.records.length,
      matches: this.verdicts.filter((v) => v.status === 'MATCH').length,
      drifts,
      regensRequested: this.verdicts.filter((v) => v.status === 'DRIFT_REGEN_REQUESTED').length,
      acceptedFlagged: this.verdicts.filter((v) => v.status === 'DRIFT_ACCEPTED_FLAGGED').length,
      driftRate: this.records.length === 0 ? 0 : Number((drifts / Math.max(1, this.verdicts.length)).toFixed(4)),
      acts,
      actBreaches: [...this.breaches],
    };
  }
}

/** ENTROPIE DU SÉLECTEUR — télémétrie anti-monoculture du Best-of-N.
 *  H = −Σ p·ln p ; ratio = H/ln(k). Un ratio ≈ 0 = Best-of-N effondré en
 *  Best-of-1 (variance perdue). Vertu démontrée dès la première mesure :
 *  EMP-16 → ratio élevé (13/8/7/7/6/6/3) = hypothèse « monoculture cause du
 *  cv plat » RÉFUTÉE avant d'avoir coûté un sprint (EMP-17 : mesure = preuve). */
export function selectorEntropy(winners: readonly string[]): {
  readonly entropy: number; readonly maxEntropy: number; readonly ratio: number;
  readonly distribution: Readonly<Record<string, number>>;
} {
  const counts = new Map<string, number>();
  for (const w of winners) counts.set(w, (counts.get(w) ?? 0) + 1);
  const n = winners.length;
  let h = 0;
  for (const c of counts.values()) { const p = c / Math.max(1, n); h -= p * Math.log(p); }
  const hMax = counts.size > 1 ? Math.log(counts.size) : 0;
  const distribution: Record<string, number> = {};
  for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1])) distribution[k] = v;
  return { entropy: Number(h.toFixed(4)), maxEntropy: Number(hMax.toFixed(4)), ratio: hMax === 0 ? 0 : Number((h / hMax).toFixed(4)), distribution };
}
