// src/oracle/genesis-v2/paradox-gate.ts
// INV-PARADOX-01: 0 occurrence forbidden_lexicon (token + lemme + bigramme)
// INV-PARADOX-02: 0 occurrence likely_metaphor dans prose
// INV-PARADOX-03: objective_correlative présent dans prose

import type { TranscendentPlanJSON } from './transcendent-planner.js';

export interface ParadoxGateResult {
  readonly passed: boolean;
  readonly verdict: 'PASS' | 'REJECT';
  readonly violations: readonly ParadoxViolation[];
}

export interface ParadoxViolation {
  readonly invariant: 'INV-PARADOX-01' | 'INV-PARADOX-02' | 'INV-PARADOX-03';
  readonly reason: string;
  readonly evidence: string;
}

// Normaliser: lowercase + supprimer accents pour matching robuste
function normalize(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, "'");
}

// Escape regex special characters
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Détecter présence d'un token dans le texte (exact ou lemmatisé)
function detectPresence(prose: string, term: string): boolean {
  const n = normalize(prose);
  const t = normalize(term);
  // Match mot entier exact
  const exactPattern = new RegExp(`(?<=\\s|[,;:.!?'"\\-]|^)${escapeRegex(t)}(?=\\s|[,;:.!?'"\\-]|$)`, 'i');
  // Match lemme: term comme préfixe d'un mot (e.g. "trembl" matches "tremblaient")
  const lemmePattern = new RegExp(`(?<=\\s|[,;:.!?'"\\-]|^)${escapeRegex(t)}[a-zàâéèêëîïôùûüç]*(?=\\s|[,;:.!?'"\\-]|$)`, 'i');
  return exactPattern.test(n) || lemmePattern.test(n);
}

export function applyParadoxGate(prose: string, plan: TranscendentPlanJSON): ParadoxGateResult {
  const violations: ParadoxViolation[] = [];

  // INV-PARADOX-01: forbidden_lexicon + lemmes + bigrammes
  for (const word of plan.forbidden_lexicon) {
    if (detectPresence(prose, word)) {
      violations.push({
        invariant: 'INV-PARADOX-01',
        reason: `Mot banni détecté: "${word}" (auto-interdit par le plan)`,
        evidence: word,
      });
    }
  }
  for (const lemme of plan.forbidden_lemmes) {
    if (detectPresence(prose, lemme)) {
      violations.push({
        invariant: 'INV-PARADOX-01',
        reason: `Lemme banni détecté: "${lemme}"`,
        evidence: lemme,
      });
    }
  }
  for (const bg of plan.forbidden_bigrammes) {
    if (normalize(prose).includes(normalize(bg))) {
      violations.push({
        invariant: 'INV-PARADOX-01',
        reason: `Bigramme banni détecté: "${bg}"`,
        evidence: bg,
      });
    }
  }

  // INV-PARADOX-02: likely_metaphor absente de la prose
  const metaphorTokens = normalize(plan.likely_metaphor).split(/\s+/).filter(w => w.length > 4);
  const metaphorMatches = metaphorTokens.filter(t => normalize(prose).includes(t));
  if (metaphorTokens.length > 0 && metaphorMatches.length >= Math.ceil(metaphorTokens.length * 0.6)) {
    violations.push({
      invariant: 'INV-PARADOX-02',
      reason: `Métaphore prévisible détectée: "${plan.likely_metaphor}"`,
      evidence: plan.likely_metaphor,
    });
  }

  // INV-PARADOX-03: objective_correlative présent
  const anchorTokens = normalize(plan.objective_correlative).split(/\s+/).filter(w => w.length > 3);
  const anchorPresent = anchorTokens.some(t => normalize(prose).includes(t));
  if (!anchorPresent && anchorTokens.length > 0) {
    violations.push({
      invariant: 'INV-PARADOX-03',
      reason: `Ancre sensorielle absente: "${plan.objective_correlative}" non trouvée dans la prose`,
      evidence: plan.objective_correlative,
    });
  }

  return {
    passed: violations.length === 0,
    verdict: violations.length === 0 ? 'PASS' : 'REJECT',
    violations,
  };
}
