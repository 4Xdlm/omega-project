/**
 * OMEGA — AUTHOR_RULE_GATE (GO Francky 2026-06-09 : « câbler les 7 règles ruleText
 * dans le build ; buildCanonical doit pouvoir ÉCHOUER si Gemma viole les règles
 * auteur. Des sceaux non-opposables = décoration »).
 *
 * Le Sceau d'Auteur posait des ANCRES (SPAN/STYLE) déjà gatées par verifyAnchors.
 * Les 7 stations sont des RÈGLES (DECISION_LOCK, ruleText) — comptées, jamais
 * opposées. Ce module les rend OPPOSABLES *là où c'est mécanisable*, et REFUSE de
 * faire semblant ailleurs (loi : jamais de faux juge, jamais de gate faux-positif).
 *
 * CLASSES D'OPPOSABILITÉ (honnêteté EMP-12/METRIC_HONESTY) :
 *   ENFORCEABLE  — vérifiable contre le manuscrit → peut FAIRE ÉCHOUER le build.
 *                  · DRAMATIC_VITALITY (S8 « zéro ventre mou ») : VIOLATION si un
 *                    chapitre est OBJECTIVEMENT mort — drama=0 ET atmosphère < plancher
 *                    ET confort > barre (trois conditions absolues, pas une fraction
 *                    arbitraire). Prouvé : 0 faux-positif sur le V3 réel ; mord sur
 *                    un chapitre plat synthétique.
 *   ADVISORY     — loguée, NE bloque JAMAIS. Inclut :
 *                  · IDENTITY_UNIFICATION (S7) — **DÉMOTION EMPIRIQUE 2026-06-09** :
 *                    testé sur le V3, le détecteur arc-coherence (co-occurrence
 *                    rôle↔nom, fenêtre 80c) a produit des FAUX-POSITIFS (« gardien »
 *                    porte Léna/Yvon/Garcia/Gaspard = interlocuteurs, PAS une dérive
 *                    Thomas/Henri). Co-occurrence ≠ coréférence → INTERDIT comme gate
 *                    dure (un faux blocage est pire que pas de gate). Reste ADVISORY
 *                    tant qu'un détecteur de niveau coréférence n'est pas prouvé (EMP-16).
 *                  · seuils PROVISOIRES (0.45, EMP-16) et règles book-scoped (route ch.5).
 *   PROCESS      — gouverne le WORKFLOW (format station), pas le manuscrit → loguée.
 *   CONFIRMATION — constat d'auteur (« ch.46 payoff », « Doctor invisible ») : pas
 *                  une contrainte ; non gateable sans juge sémantique → loguée.
 *
 * RÈGLE DE SÛRETÉ : une règle non reconnue tombe en ADVISORY (on ne gate JAMAIS
 * l'inconnu). INV-ARG-001 : seules les décisions SANS ancre sont classées ici.
 * INV-ARG-002 : passed=false ⟺ ≥1 règle ENFORCEABLE violée.
 *
 * LIMITES : le checker vitalité repose sur des proxys (drama SSOT arc-coherence,
 * densité sensorielle, confort). Plancher/barre = PROVISOIRES (signalés ; conservateurs
 * pour minimiser le faux-positif → faux-négatif assumé : seul l'EGREGIOUS est gaté,
 * la nuance reste à transition-triage en advisory). CE QUI CASSERAIT : un chapitre
 * mort mais riche en lexique sensoriel décoratif passerait (atmosphère ≥ plancher).
 */

import type { ArcChapter } from '../coherence/arc-coherence.js';
import type { AuthorDecision } from '../identity/author-seal.js';
import { transitionSignals } from '../polish/transition-triage.js';

export type RuleEnforcement = 'ENFORCEABLE' | 'ADVISORY' | 'PROCESS' | 'CONFIRMATION';
export type RuleChecker = 'DRAMATIC_VITALITY';

export interface RuleClassification {
  readonly decisionId: string;
  readonly chapter: number | null;
  readonly enforcement: RuleEnforcement;
  readonly checker: RuleChecker | null;
  readonly reason: string;
}

export interface RuleViolation {
  readonly decisionId: string;
  readonly checker: RuleChecker;
  readonly detail: string;
}

export interface AuthorRuleReport {
  readonly classifications: readonly RuleClassification[];
  readonly enforceable: readonly string[];
  readonly advisories: readonly string[];
  readonly violations: readonly RuleViolation[];
  readonly passed: boolean;
}

/* Matchers ordonnés : la classe la PLUS FORTE gagne (ENFORCEABLE d'abord).
 * IDENTITY n'est PLUS enforceable (démotion empirique) → capté par ADVISORY_RE. */
// NB : « ventre mou » SEUL ne déclenche pas (S4 le cite comme contraste dans sa
// réponse → faux-positif vitality détecté sur données réelles 2026-06-09). On exige
// la signature du STANDARD lecteur-de-genre (S8), pas l'expression isolée.
const VITALITY_RE = /lecteur\s+de\s+genre|engagement\s+constant|z[ée]ro\s+complaisance/iu;
const ADVISORY_RE = /unifi|henri\s*\/\s*thomas|z[ée]ro\s+(?:but[ée]e|d[ée]rive)|identit[ée]|atmosph[èe]re|0[.,]45|advisory|route\s*=|predictor|contextuel|enqu[êe]te/iu;
const PROCESS_RE = /station_format|format\s+station|offset|extrait\s+cible|protocole\s+station/iu;
const CONFIRMATION_RE = /payoff|doctor\s+invisible|souverain|invisible|finale\s*=|paiement\s+r[ée]el/iu;

/** Plancher/barre PROVISOIRES (signalés — jamais calibrés en cosmétique post-hoc, EMP-12).
 *  Conservateurs : ne gatent qu'un chapitre EGREGIOUSEMENT mort. */
export const VITALITY_ATMO_FLOOR = 8;     // marqueurs sensoriels /1000 mots
export const VITALITY_COMFORT_BAR = 0.85; // ratio de phrases de confort

export function classifyRule(d: AuthorDecision): RuleClassification {
  const base = { decisionId: d.decisionId, chapter: d.chapter } as const;
  const t = `${d.ruleText ?? ''} ${d.answer}`;
  if (VITALITY_RE.test(t)) return { ...base, enforcement: 'ENFORCEABLE', checker: 'DRAMATIC_VITALITY', reason: 'zéro ventre mou = chapitre objectivement mort mesurable' };
  if (ADVISORY_RE.test(t)) return { ...base, enforcement: 'ADVISORY', checker: null, reason: 'identité (co-occurrence≠coréférence, faux-positif V3) / seuil PROVISOIRE EMP-16 / book-scoped — logué, ne bloque pas' };
  if (PROCESS_RE.test(t)) return { ...base, enforcement: 'PROCESS', checker: null, reason: 'règle de PROCESSUS (workflow), pas une propriété du manuscrit' };
  if (CONFIRMATION_RE.test(t)) return { ...base, enforcement: 'CONFIRMATION', checker: null, reason: 'constat d\'auteur — non gateable sans juge sémantique' };
  return { ...base, enforcement: 'ADVISORY', checker: null, reason: 'règle non reconnue → ADVISORY par défaut (on ne gate jamais l\'inconnu)' };
}

function vitalityViolations(decisionId: string, chapters: readonly ArcChapter[]): readonly RuleViolation[] {
  const out: RuleViolation[] = [];
  for (const c of chapters) {
    const s = transitionSignals(c.chapter, c.prose);
    if (s.dramaHits === 0 && s.atmosphereDensity < VITALITY_ATMO_FLOOR && s.comfortRatio > VITALITY_COMFORT_BAR) {
      out.push({ decisionId, checker: 'DRAMATIC_VITALITY', detail: `ch.${c.chapter} mort : drama=0, atmo=${s.atmosphereDensity}<${VITALITY_ATMO_FLOOR}, confort=${s.comfortRatio}>${VITALITY_COMFORT_BAR}` });
    }
  }
  return out;
}

/**
 * Oppose les règles d'auteur ENFORCEABLE au manuscrit. Pur, déterministe.
 * passed=false ⟺ ≥1 violation (INV-ARG-002). N'utilise que les décisions SANS
 * ancre (INV-ARG-001 ; les span/style sont gérés par verifyAnchors).
 */
export function enforceAuthorRules(decisions: readonly AuthorDecision[], chapters: readonly ArcChapter[]): AuthorRuleReport {
  const classifications = decisions.filter((d) => d.anchorExcerpt === null).map(classifyRule);
  const violations: RuleViolation[] = [];
  for (const c of classifications) {
    if (c.enforcement === 'ENFORCEABLE' && c.checker === 'DRAMATIC_VITALITY') {
      violations.push(...vitalityViolations(c.decisionId, chapters));
    }
  }
  return {
    classifications,
    enforceable: classifications.filter((c) => c.enforcement === 'ENFORCEABLE').map((c) => `${c.decisionId}:${c.checker ?? ''}`),
    advisories: classifications.filter((c) => c.enforcement !== 'ENFORCEABLE').map((c) => `${c.decisionId}:${c.enforcement}`),
    violations,
    passed: violations.length === 0,
  };
}
