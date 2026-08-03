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
import { createHash } from 'node:crypto';
import {
  gateSelect,
  checkEligibility,
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

/**
 * Trace d'un candidat ECARTE. Sans elle, « 0 veto » n'est pas verifiable : on ne
 * peut ni rejouer la decision, ni distinguer « aucun candidat fautif » de « le
 * gate ne s'est pas declenche ». Manque signale en relecture externe, comble ici.
 */
export interface RejectedTrace {
  readonly attempt: number;
  readonly candidateIndex: number;
  /** SHA256 du candidat — permet de le retrouver dans un dump sans le stocker. */
  readonly sha256: string;
  readonly words: number;
  /** Debut du texte, pour lire la raison sans ouvrir le dump. */
  readonly excerpt: string;
  readonly vetos: readonly Veto[];
  /** Ecarte par repulsion (tete deja servie) plutot que par veto. */
  readonly repelledHead?: string;
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
  /** AUDIT : tous les candidats ecartes, avec la raison. Verifiable, rejouable. */
  readonly rejected: readonly RejectedTrace[];
  /**
   * SHADOW : ce que le gate AURAIT choisi, quand il ne decide pas.
   * `null` en mode dur (le gate a decide) ou si aucun candidat n'etait admissible.
   */
  readonly shadowChoice?: { readonly candidateIndex: number; readonly head: string | null } | null;
  /** SHADOW : le choix du gate differe-t-il de celui de la production ? */
  readonly shadowDiverged?: boolean;
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
  /**
   * MODE SHADOW (arbitrage 2-IA du 2026-08-03) : le gate CALCULE son choix,
   * l'archive et mesure la divergence, mais NE CHANGE PAS le gagnant. La
   * production garde son sélecteur ; on observe d'abord ce que le gate ferait.
   *
   * Les vetos qui restent DURS même en shadow — ce sont des erreurs objectives,
   * pas des jugements littéraires :
   *   LANG_RESIDUAL   un mot anglais dans une phrase française
   * Ceux qui deviennent purement observationnels en shadow :
   *   PLOT_RECAP      la récapitulation, qui peut produire des faux positifs
   *   la répulsion de tête
   */
  readonly shadow?: boolean;
  /** Le sélecteur de production, en mode shadow. Défaut : le premier candidat. */
  readonly productionPick?: (proses: readonly string[]) => number;
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
  const shadow = opts.shadow ?? false;
  const productionPick = opts.productionPick ?? ((): number => 0);

  const vetoed: { attempt: number; vetos: readonly Veto[] }[] = [];
  const rejected: RejectedTrace[] = [];
  let candidatesSeen = 0;
  let repelledHeads = 0;
  let fallback: string | null = null;

  const trace = (
    attempt: number,
    index: number,
    prose: string,
    vetos: readonly Veto[],
    repelledHead?: string,
  ): void => {
    rejected.push({
      attempt,
      candidateIndex: index,
      sha256: createHash('sha256').update(prose, 'utf8').digest('hex'),
      words: countWordsFr(prose),
      excerpt: prose.slice(0, 120).replace(/\s+/gu, ' '),
      vetos,
      ...(repelledHead !== undefined ? { repelledHead } : {}),
    });
  };

  const finish = (
    prose: string,
    attempt: number,
    chosenHead: string | null,
    typoRulesApplied: number,
    exhausted: boolean,
    shadowChoice: { candidateIndex: number; head: string | null } | null,
    shadowDiverged: boolean | undefined,
  ): ChapterResult => ({
    prose,
    log: {
      attempts: attempt,
      candidatesSeen,
      vetoed,
      repelledHeads,
      chosenHead,
      typoRulesApplied,
      words: countWordsFr(prose),
      exhausted,
      rejected,
      ...(shadow ? { shadowChoice, shadowDiverged } : {}),
    },
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const proses = await generate(attempt);
    candidatesSeen += proses.length;
    if (fallback === null && proses.length > 0) fallback = proses[0] ?? null;

    // En SHADOW, seuls les vetos OBJECTIFS restent durs : un mot anglais est une
    // faute de langue, pas un jugement de gout. Les criteres litteraires (recap,
    // repulsion de tete) sont observes sans etre appliques.
    const candidates = proses.map((p, i) => ({ prose: p, attempt: i }));
    const decision = gateSelect(candidates, (c) => c.prose, registry.snapshot(), { strictLang });

    for (const v of decision.vetoed) {
      vetoed.push({ attempt, vetos: v.vetos });
      trace(attempt, v.candidate.attempt, v.candidate.prose, v.vetos);
    }
    for (const r of decision.repelled) {
      const e = checkEligibility(r.prose, { strictLang });
      trace(attempt, r.attempt, r.prose, [], e.periodHead ?? '');
    }
    repelledHeads += decision.repelled.length;

    if (shadow) {
      // Le gate NE DECIDE PAS. Il calcule ce qu'il aurait fait, on l'archive.
      const gateIndex = decision.chosen?.attempt ?? null;
      const prodIndex = Math.max(0, Math.min(proses.length - 1, productionPick(proses)));
      const prodProse = proses[prodIndex] ?? '';
      // Sauf pour les vetos objectifs : un candidat fautif ne peut pas gagner,
      // meme en shadow. Si la production choisit un texte a residu anglais, on
      // le signale et on prend le premier candidat sans faute de langue.
      const prodEligible = checkEligibility(prodProse, { strictLang });
      const hardFault = prodEligible.vetos.some((v) => v.code === 'LANG_RESIDUAL');
      const finalIndex = hardFault
        ? proses.findIndex((p) => !checkEligibility(p, { strictLang }).vetos.some((v) => v.code === 'LANG_RESIDUAL'))
        : prodIndex;
      const picked = proses[finalIndex >= 0 ? finalIndex : prodIndex] ?? prodProse;
      if (picked.length === 0) continue;

      const pickedHead = checkEligibility(picked, { strictLang }).periodHead;
      registry.record(pickedHead);
      const sealed = seal ? normalizeFrenchTypography(picked) : null;
      return finish(
        sealed !== null ? sealed.text : picked,
        attempt,
        pickedHead,
        sealed !== null ? sealed.totalApplied : 0,
        false,
        gateIndex !== null ? { candidateIndex: gateIndex, head: decision.chosenHead } : null,
        gateIndex !== null ? gateIndex !== finalIndex : undefined,
      );
    }

    if (decision.chosen !== null) {
      registry.record(decision.chosenHead);
      const sealed = seal ? normalizeFrenchTypography(decision.chosen.prose) : null;
      return finish(
        sealed !== null ? sealed.text : decision.chosen.prose,
        attempt,
        decision.chosenHead,
        sealed !== null ? sealed.totalApplied : 0,
        false,
        null,
        undefined,
      );
    }
  }

  // Fallback A : le meilleur disponible, DRAPEAU LEVÉ. Jamais de silence.
  const raw = fallback ?? '';
  const sealed = seal && raw.length > 0 ? normalizeFrenchTypography(raw) : null;
  return finish(
    sealed !== null ? sealed.text : raw,
    maxAttempts,
    null,
    sealed !== null ? sealed.totalApplied : 0,
    true,
    null,
    undefined,
  );
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
