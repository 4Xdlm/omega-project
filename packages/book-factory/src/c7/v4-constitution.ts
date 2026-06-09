/**
 * OMEGA — AP-5 : CONSTITUTION V4 (spec + readiness, ZÉRO génération). Vérifie que
 * tous les composants que V4 devra appliquer sont CÂBLÉS et prêts : rythme-soft
 * calibré maîtres FR, escalade few-shot gemma4, exemplars sous-texte, gates
 * opposables (vitalité + identité coref-grade + LANG_CLEAN). Si tout est prêt →
 * V4 peut être dispatché « sous Constitution ». La GÉNÉRATION reste HOLD (Architecte).
 *
 * Ce n'est pas un document : c'est une sonde testable. Un composant manquant =
 * NOT_READY = on ne prétend pas que V4 est constitutionnel.
 */

import { CALIBRATED_RHYTHM_DECILES } from '../v2/v2-conductor.js';
import { FEWSHOT_EXEMPLARS, escalationProfileFor } from '../rosetta/dramatic-grid.js';
import { classifyRule } from './author-rule-gate.js';
import { scanEnglishResiduals } from '../doctor/lang-purity.js';
import type { AuthorDecision } from '../identity/author-seal.js';

function ruleStub(ruleText: string): AuthorDecision {
  return { decisionId: 'stub', kind: 'DECISION_LOCK', verdict: 'MARK_AS_CANON', question: 'q', answer: '', chapter: null, anchorHash: null, anchorExcerpt: null, ruleText, decidedBy: 'x', decidedAt: '2026-06-09', supersededBy: null, supersedeReason: null, sealHash: 'h' };
}

export interface ConstitutionCheck { readonly component: string; readonly ready: boolean; readonly detail: string }

/** Sonde de readiness de la Constitution V4. Pur, déterministe. */
export function checkV4Constitution(): { readonly checks: readonly ConstitutionCheck[]; readonly ready: boolean } {
  const esc = escalationProfileFor('gemma4:31b');
  const vit = classifyRule(ruleStub('STANDARD = lecteur de genre, zéro ventre mou'));
  const idn = classifyRule(ruleStub('unification d\'identité Henri/Thomas, zéro butée'));
  const checks: ConstitutionCheck[] = [
    { component: 'RHYTHM_SOFT_CALIBRATED', ready: CALIBRATED_RHYTHM_DECILES.length === 9, detail: `déciles maîtres FR = ${JSON.stringify(CALIBRATED_RHYTHM_DECILES)}` },
    { component: 'ESCALATION_FEWSHOT_GEMMA4', ready: esc.REVELATION === 'fewshot' && esc.CONFRONTATION === 'fewshot', detail: `REV=${esc.REVELATION} CONF=${esc.CONFRONTATION}` },
    { component: 'SUBTEXT_EXEMPLARS', ready: FEWSHOT_EXEMPLARS.REVELATION.length > 50 && FEWSHOT_EXEMPLARS.CONFRONTATION.length > 50, detail: 'exemplars REVELATION + CONFRONTATION présents (levier prouvé S0-bis)' },
    { component: 'GATE_VITALITY_ENFORCEABLE', ready: vit.enforcement === 'ENFORCEABLE' && vit.checker === 'DRAMATIC_VITALITY', detail: vit.reason },
    { component: 'GATE_IDENTITY_ENFORCEABLE', ready: idn.enforcement === 'ENFORCEABLE' && idn.checker === 'IDENTITY_UNIFICATION', detail: idn.reason },
    { component: 'GATE_LANG_CLEAN', ready: scanEnglishResiduals('Il marcha during la nuit.').length === 1 && scanEnglishResiduals('Il marcha dans la nuit.').length === 0, detail: 'détecteur franglais opérant (denylist sans homographe FR)' },
  ];
  return { checks, ready: checks.every((c) => c.ready) };
}

/** Config que V4 appliquera (lecture seule ; la génération reste HOLD). */
export const V4_CONSTITUTION = {
  scribe: 'gemma4:31b',
  rhythm: { mode: 'soft', source: 'maîtres FR (24114 phrases)', deciles: CALIBRATED_RHYTHM_DECILES },
  escalation: 'few-shot (REVELATION + CONFRONTATION exemplars)',
  buildGates: { enforceAuthorRules: true, enforceable: ['DRAMATIC_VITALITY', 'IDENTITY_UNIFICATION'], cleanliness: ['SYNTAX', 'SEAM', 'SEMANTIC', 'NARRATIVE', 'LANG', 'AUTHOR_LOCKS'] },
  filet: 'applyPatch (guard + re-certif + revert auto)',
  interdits: ['pas de mistral en prod', 'pas de gate dure sur 1 preuve', 'pas de révélation centrale prématurée'],
  status: 'GENERATION_HOLD_ARCHITECT',
} as const;
