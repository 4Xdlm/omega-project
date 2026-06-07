/**
 * OMEGA — GATE QUOTAS DRAMATIQUES (BF-08) — mandat tribunal 2/2 (allumage #4).
 * L'anémie du 88k (72 % TRANSITION, 0 RÉVÉLATION/50) est un défaut de PLAN.
 * Cette gate s'applique AU PLAN (prochain run) — pas en rustine sur un texte.
 * Gemini : « un chapitre est admis seulement si son acte valide ses quotas ».
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export type DramaticFunction = 'TRANSITION' | 'ACTION' | 'CONFRONTATION' | 'REVELATION' | 'SETUP' | 'PAYOFF';

export interface PlannedChapter { readonly chapter: number; readonly act: number; readonly fn: DramaticFunction; }

export interface QuotaRules {
  /** Minimum de RÉVÉLATION par acte (défaut 1 — l'anémie 0/50 devient impossible). */
  readonly minRevelationPerAct?: number;
  /** Minimum de CONFRONTATION par acte (défaut 1). */
  readonly minConfrontationPerAct?: number;
  /** Plafond de TRANSITION sur le livre (défaut 0.45 — le 88k était à 0.72). */
  readonly maxTransitionRatio?: number;
  /** Une CONFRONTATION au moins toutes les N positions (défaut 4 — levier Gemini). */
  readonly confrontationEveryN?: number;
}

export interface QuotaViolation { readonly code: 'NO_REVELATION_IN_ACT' | 'NO_CONFRONTATION_IN_ACT' | 'TRANSITION_RATIO_EXCEEDED' | 'CONFRONTATION_GAP'; readonly detail: string; }

/** Gate BLOQUANTE de plan : violations explicites, jamais silencieuses. */
export function validateDramaticQuotas(plan: readonly PlannedChapter[], rules: QuotaRules = {}): Result<true, { readonly code: 'QUOTA_FAIL'; readonly violations: readonly QuotaViolation[] }> {
  const minRev = rules.minRevelationPerAct ?? 1;
  const minConf = rules.minConfrontationPerAct ?? 1;
  const maxTrans = rules.maxTransitionRatio ?? 0.45;
  const everyN = rules.confrontationEveryN ?? 4;
  const violations: QuotaViolation[] = [];

  const acts = [...new Set(plan.map((c) => c.act))].sort((a, b) => a - b);
  for (const act of acts) {
    const inAct = plan.filter((c) => c.act === act);
    if (inAct.filter((c) => c.fn === 'REVELATION').length < minRev) violations.push({ code: 'NO_REVELATION_IN_ACT', detail: `acte ${act} : ${minRev} RÉVÉLATION minimum exigée` });
    if (inAct.filter((c) => c.fn === 'CONFRONTATION').length < minConf) violations.push({ code: 'NO_CONFRONTATION_IN_ACT', detail: `acte ${act} : ${minConf} CONFRONTATION minimum exigée` });
  }
  const ratio = plan.filter((c) => c.fn === 'TRANSITION').length / Math.max(1, plan.length);
  if (ratio > maxTrans) violations.push({ code: 'TRANSITION_RATIO_EXCEEDED', detail: `TRANSITION ${(ratio * 100).toFixed(0)}% > plafond ${(maxTrans * 100).toFixed(0)}% (le 88k était à 72%)` });
  let gap = 0;
  for (const c of [...plan].sort((a, b) => a.chapter - b.chapter)) {
    gap = c.fn === 'CONFRONTATION' || c.fn === 'REVELATION' ? 0 : gap + 1;
    if (gap >= everyN + 1) { violations.push({ code: 'CONFRONTATION_GAP', detail: `aucune CONFRONTATION/RÉVÉLATION sur ${gap} chapitres autour du ch.${c.chapter}` }); gap = 0; }
  }

  return violations.length === 0 ? ok(true) : err({ code: 'QUOTA_FAIL', violations });
}
