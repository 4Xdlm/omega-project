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
  readonly context: string;
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

// Extract ~30 chars around match position
function extractContext(text: string, index: number, matchLen: number): string {
  const start = Math.max(0, index - 15);
  const end = Math.min(text.length, index + matchLen + 15);
  return (start > 0 ? '…' : '') + text.substring(start, end) + (end < text.length ? '…' : '');
}

// Détecter présence d'un token + extraire contexte (~30 chars autour du match)
function detectPresenceWithMatch(normalizedProse: string, term: string): { found: boolean; context: string } {
  const t = normalize(term);
  const exactPattern = new RegExp(`(?<=\\s|[,;:.!?'"\\-]|^)${escapeRegex(t)}(?=\\s|[,;:.!?'"\\-]|$)`, 'i');
  const lemmePattern = new RegExp(`(?<=\\s|[,;:.!?'"\\-]|^)${escapeRegex(t)}[a-zàâéèêëîïôùûüç]*(?=\\s|[,;:.!?'"\\-]|$)`, 'i');

  const match = exactPattern.exec(normalizedProse) || lemmePattern.exec(normalizedProse);
  if (!match) return { found: false, context: '' };

  return { found: true, context: extractContext(normalizedProse, match.index, match[0].length) };
}

export function applyParadoxGate(prose: string, plan: TranscendentPlanJSON): ParadoxGateResult {
  const violations: ParadoxViolation[] = [];
  const nProse = normalize(prose);

  // INV-PARADOX-01: forbidden_lexicon + lemmes + bigrammes
  for (const word of plan.forbidden_lexicon) {
    const match = detectPresenceWithMatch(nProse, word);
    if (match.found) {
      violations.push({
        invariant: 'INV-PARADOX-01',
        reason: `Mot banni détecté: "${word}" (auto-interdit par le plan)`,
        evidence: word,
        context: match.context,
      });
    }
  }
  for (const lemme of plan.forbidden_lemmes) {
    const match = detectPresenceWithMatch(nProse, lemme);
    if (match.found) {
      violations.push({
        invariant: 'INV-PARADOX-01',
        reason: `Lemme banni détecté: "${lemme}"`,
        evidence: lemme,
        context: match.context,
      });
    }
  }
  for (const bg of plan.forbidden_bigrammes) {
    const nBg = normalize(bg);
    const bgIdx = nProse.indexOf(nBg);
    if (bgIdx >= 0) {
      violations.push({
        invariant: 'INV-PARADOX-01',
        reason: `Bigramme banni détecté: "${bg}"`,
        evidence: bg,
        context: extractContext(nProse, bgIdx, nBg.length),
      });
    }
  }

  // INV-PARADOX-02: likely_metaphor absente de la prose
  const metaphorTokens = normalize(plan.likely_metaphor).split(/\s+/).filter(w => w.length > 4);
  const metaphorMatches = metaphorTokens.filter(t => nProse.includes(t));
  if (metaphorTokens.length > 0 && metaphorMatches.length >= Math.ceil(metaphorTokens.length * 0.6)) {
    const firstToken = metaphorMatches[0];
    const mIdx = nProse.indexOf(firstToken);
    violations.push({
      invariant: 'INV-PARADOX-02',
      reason: `Métaphore prévisible détectée: "${plan.likely_metaphor}"`,
      evidence: plan.likely_metaphor,
      context: mIdx >= 0 ? extractContext(nProse, mIdx, firstToken.length) : '',
    });
  }

  // INV-PARADOX-03: objective_correlative présent
  const anchorTokens = normalize(plan.objective_correlative).split(/\s+/).filter(w => w.length > 3);
  const anchorPresent = anchorTokens.some(t => nProse.includes(t));
  if (!anchorPresent && anchorTokens.length > 0) {
    violations.push({
      invariant: 'INV-PARADOX-03',
      reason: `Ancre sensorielle absente: "${plan.objective_correlative}" non trouvée dans la prose`,
      evidence: plan.objective_correlative,
      context: '',
    });
  }

  return {
    passed: violations.length === 0,
    verdict: violations.length === 0 ? 'PASS' : 'REJECT',
    violations,
  };
}
