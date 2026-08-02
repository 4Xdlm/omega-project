/**
 * OMEGA — SCRIBE V2 : la chaîne complète, assemblée.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE
 * ══════════════════════════════════════════════════════════════════════════════
 * L'audit du 30 juillet avait établi le défaut de fond : `book-factory` (qui
 * écrit) n'avait aucune dépendance vers la métrologie (qui mesure), la sélection
 * se faisait au nombre de mots, et les capteurs étaient calculés puis jetés.
 * Douze campagnes, zéro modification du générateur.
 *
 * Ce module ferme la boucle. Il compose, dans l'ordre, tout ce que les mesures
 * du 2 août ont établi — et RIEN d'autre. Chaque étage cite le fait qui le
 * justifie ; aucun n'est là par intuition.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LES QUATRE ÉTAGES
 * ══════════════════════════════════════════════════════════════════════════════
 *   1. PLAN        l'opportunité de période longue, si la scène s'y prête.
 *                  Mesuré : 0/42 périodes sans, 21/21 avec, sur deux fonctions
 *                  narratives opposées. Le levier est une propriété de la forme.
 *                  C'est une OPPORTUNITÉ, jamais un quota (FORBID-006 v2 §5) :
 *                  aucun nombre n'est transmis au modèle.
 *
 *   2. GARDES      interdiction de formule de bascule (gabarit d'ouverture,
 *                  0,38 → 0,08) et de chaîne déductive (moule de raisonnement).
 *                  Ce sont des interdictions, pas des consignes positives : B1b
 *                  a montré qu'une contrainte positive fabrique son propre
 *                  gabarit (« il posa sa main » ×5).
 *
 *   3. GATE        éligibilité (vetos durs) puis répulsion (têtes déjà servies).
 *                  Le prompt fait tomber la collision à la source, le gate
 *                  garantit le zéro. Coût mesuré : 1 régénération sur 21 avec
 *                  les gardes, 7 sans. Conforme ADR-003.
 *
 *   4. SCELLEMENT  typographie française éditoriale. Mesuré : apostrophes
 *                  droites 1490 → 0 sur le corpus gelé, idempotent 21/21.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QUE CE MODULE NE FAIT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 * Il ne juge pas la qualité littéraire — aucune mesure de ce projet ne le sait
 * faire, et le seul juge reconnu reste le lecteur aveugle. Il n'écrit pas à la
 * place du générateur, ne réécrit pas la prose, et ne conseille jamais le modèle
 * sur l'esthétique. Il ouvre une opportunité, il refuse ce qui est mesurablement
 * fautif, il scelle.
 */
import {
  gateSelect,
  PeriodHeadRegistry,
  type Veto,
} from './scribe-gate.js';
import { normalizeFrenchTypography } from '../seal/french-typography.js';
import { countWordsFr } from '../../../omega-p0/src/phonetic/sentence-splitter-fr.js';

/* ─────────────────────────── les blocs de prompt ─────────────────────────── */

/**
 * ÉTAGE 1 — l'opportunité. Situe un endroit de la scène où la pensée a le droit
 * de se dérouler d'un seul tenant. Aucun nombre, aucune obligation.
 */
export const PLAN_LONG_TAIL_OPPORTUNITY =
  "STRUCTURE DE LA SCÈNE — une opportunité, pas une obligation :\n" +
  "dans le dernier tiers, au moment où la pensée du personnage relie enfin les " +
  "choses entre elles, elle a le droit de se dérouler d'un seul tenant — une seule " +
  "période portée par ses subordonnées, qui suit le mouvement jusqu'à son terme " +
  "sans le découper. Ailleurs dans la scène : phrases ordinaires. Si la pensée ne " +
  "le porte pas à cet endroit, n'en fais rien : une période creuse serait pire que " +
  "son absence.";

/** ÉTAGE 2a — le gabarit d'ouverture. Mesuré : 0,38 → 0,08. */
export const GUARD_NO_PIVOT_FORMULA =
  "OUVERTURE DE CETTE PÉRIODE — interdits :\n" +
  "n'ouvre pas par une formule de bascule (« c'est alors que… », « il comprit " +
  "que… », « tout devint limpide », « les pièces du puzzle », « sa pensée " +
  "s'accéléra »). Ces tournures annoncent la pensée au lieu de la faire.";

/** ÉTAGE 2b — le moule de raisonnement. Baseline : 0 période publiée sur 1384. */
export const GUARD_NO_PLOT_RECAP =
  "CONTENU DE CETTE PÉRIODE — interdits :\n" +
  "elle ne récapitule pas l'intrigue. Pas de chaîne de déductions, pas de " +
  "« si… alors », pas de « ce qui signifiait que », pas de « transformant ainsi », " +
  "pas de bilan des faits déjà connus du lecteur. Le lecteur sait déjà ce qui s'est " +
  "passé ; le lui réexpliquer dans la tête du personnage, c'est écrire une fiche " +
  "de synthèse.";

export interface ScribeDirectives {
  /** Ouvrir l'opportunité de période longue sur cette scène. */
  readonly longTailOpportunity: boolean;
  /** Poser les deux gardes anti-gabarit. Sans opportunité, elles n'ont pas d'objet. */
  readonly antiTemplateGuards: boolean;
}

/** Le bloc de consigne, assemblé. Vide si la scène n'ouvre aucune opportunité. */
export function buildDirectiveBlock(d: ScribeDirectives): string {
  if (!d.longTailOpportunity) return '';
  const parts = [PLAN_LONG_TAIL_OPPORTUNITY];
  if (d.antiTemplateGuards) parts.push(GUARD_NO_PIVOT_FORMULA, GUARD_NO_PLOT_RECAP);
  return parts.join('\n\n');
}

/* ──────────────────────────── la boucle d'écriture ──────────────────────────── */

export interface ScribeCandidate {
  readonly prose: string;
  readonly attempt: number;
}

export interface AdmissionLog {
  readonly attempts: number;
  readonly candidatesSeen: number;
  readonly vetoed: readonly { readonly attempt: number; readonly vetos: readonly Veto[] }[];
  readonly repelledHeads: number;
  readonly chosenHead: string | null;
  readonly typoRulesApplied: number;
  readonly words: number;
  /** Aucun candidat admissible après le budget d'essais : à remonter, jamais à masquer. */
  readonly exhausted: boolean;
}

export interface ChapterResult {
  readonly prose: string;
  readonly log: AdmissionLog;
}

export interface ScribeOptions {
  /** Nombre de candidats par tentative. Défaut 7 (N=7 scellé R7). */
  readonly candidatesPerAttempt?: number;
  /** Tentatives maximales avant d'abandonner. Défaut 3. */
  readonly maxAttempts?: number;
  /** Veto langue dur. Défaut true. `false` = mise en service progressive. */
  readonly strictLang?: boolean;
  /** Scellement typographique. Défaut true. */
  readonly seal?: boolean;
}

/**
 * Écrit un chapitre : génère, filtre, choisit, scelle.
 *
 * `generate` est injecté — le module ne connaît ni Ollama ni aucun fournisseur.
 * C'est ce qui le rend testable hors LLM et conforme à la règle de déterminisme
 * (IO injecté).
 *
 * En cas d'épuisement, rend le MEILLEUR candidat disponible avec `exhausted:true`
 * plutôt que rien : un chapitre signalé vaut mieux qu'un trou, et le fallback A
 * (meilleur jet sous seuil + drapeau) est la doctrine scellée par ADR-003.
 */
export async function writeChapter(
  generate: (attempt: number) => Promise<readonly string[]>,
  registry: PeriodHeadRegistry,
  opts: ScribeOptions = {},
): Promise<ChapterResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const strictLang = opts.strictLang ?? true;
  const seal = opts.seal ?? true;

  const vetoed: { attempt: number; vetos: readonly Veto[] }[] = [];
  let candidatesSeen = 0;
  let repelledHeads = 0;
  let fallback: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const proses = await generate(attempt);
    candidatesSeen += proses.length;
    if (fallback === null && proses.length > 0) fallback = proses[0] ?? null;

    const decision = gateSelect(
      proses.map((p, i) => ({ prose: p, attempt: i })),
      (c) => c.prose,
      registry.snapshot(),
      { strictLang },
    );
    for (const v of decision.vetoed) vetoed.push({ attempt, vetos: v.vetos });
    repelledHeads += decision.repelled.length;

    if (decision.chosen !== null) {
      registry.record(decision.chosenHead);
      const sealed = seal ? normalizeFrenchTypography(decision.chosen.prose) : null;
      const prose = sealed !== null ? sealed.text : decision.chosen.prose;
      return {
        prose,
        log: {
          attempts: attempt,
          candidatesSeen,
          vetoed,
          repelledHeads,
          chosenHead: decision.chosenHead,
          typoRulesApplied: sealed !== null ? sealed.totalApplied : 0,
          words: countWordsFr(prose),
          exhausted: false,
        },
      };
    }
  }

  // Fallback A : le meilleur disponible, DRAPEAU LEVÉ. Jamais de silence.
  const raw = fallback ?? '';
  const sealed = seal && raw.length > 0 ? normalizeFrenchTypography(raw) : null;
  const prose = sealed !== null ? sealed.text : raw;
  return {
    prose,
    log: {
      attempts: maxAttempts,
      candidatesSeen,
      vetoed,
      repelledHeads,
      chosenHead: null,
      typoRulesApplied: sealed !== null ? sealed.totalApplied : 0,
      words: countWordsFr(prose),
      exhausted: true,
    },
  };
}

/** Résumé d'un livre entier — ce qui doit figurer au journal d'admission. */
export interface BookAdmissionSummary {
  readonly chapters: number;
  readonly exhausted: number;
  readonly totalVetoed: number;
  readonly vetoByCode: Readonly<Record<string, number>>;
  readonly totalRepelled: number;
  readonly distinctHeads: number;
  readonly regenerationRate: number;
}

export function summarizeBook(
  logs: readonly AdmissionLog[],
  registry: PeriodHeadRegistry,
): BookAdmissionSummary {
  const vetoByCode: Record<string, number> = {};
  let totalVetoed = 0;
  for (const l of logs) {
    for (const v of l.vetoed) {
      for (const x of v.vetos) {
        vetoByCode[x.code] = (vetoByCode[x.code] ?? 0) + 1;
        totalVetoed += 1;
      }
    }
  }
  const attempts = logs.reduce((a, l) => a + l.attempts, 0);
  return {
    chapters: logs.length,
    exhausted: logs.filter((l) => l.exhausted).length,
    totalVetoed,
    vetoByCode,
    totalRepelled: logs.reduce((a, l) => a + l.repelledHeads, 0),
    distinctHeads: registry.size,
    regenerationRate:
      logs.length === 0 ? 0 : Number(((attempts - logs.length) / logs.length).toFixed(3)),
  };
}
