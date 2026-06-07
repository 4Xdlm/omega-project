/**
 * OMEGA — VARIATION_ENGINE V1 : MOTIF_REPULSION_FIELD (C18).
 * CONCEPT-MOTIF-REPULSION-FIELD-001 — fusion tribunal 2026-06-07 :
 * ChatGPT (« champ de répulsion narratif, le cooldown devient un cas
 * particulier ») × Gemini (cause générationnelle des incipits) × Claude
 * (contrôle PID : des gains principiels au lieu de constantes magiques).
 *
 * DEUX MÉCANISMES, SÉPARÉS PAR NATURE :
 *
 * 1. INVARIANT COMBINATOIRE (loi dure, déterministe) — une tête d'incipit déjà
 *    vue ≥ 2 fois est INTERDITE en 3ᵉ occurrence. C'est la définition exacte du
 *    « clone » du rapport EMP-16 (11 clones = têtes ×≥3). Indépendant des gains.
 *
 * 2. CHAMP CONTINU (pression, PID) — l'énergie de répulsion d'un motif :
 *        E(m, n) = Kp·ρ_W(m, n) + Ki·S(m, n)/n + Kd·[ρ_W(m, n) − ρ_W(m, n−W)]
 *    où ρ_W = densité d'occurrences dans la fenêtre des W derniers chapitres
 *    (terme PROPORTIONNEL : pression récente), S/n = saturation cumulée du
 *    livre (terme INTÉGRAL : mémoire longue — le « cooldown » classique est le
 *    cas Ki=Kd=0), et le delta de densité (terme DÉRIVÉ : tendance montante
 *    punie avant la saturation). Pourquoi PID : le bannissement par compteur
 *    (3-usages→ban-5) du PLAN_LOCK a réduit les tics de 69 % mais a laissé les
 *    clones d'incipit — il ne voit ni la tendance ni la mémoire longue.
 *
 * MODES (politique d'évolution scellée SPEC→SHADOW→SOFT→HARD) :
 *   le module est PUR — la politique vit chez l'appelant. `evaluateIncipit`
 *   rend un verdict typé ; `filterCandidatesByIncipit` est le contrat prêt à
 *   câbler du mode '1' (rejette la candidate qui créerait une 3ᵉ occurrence,
 *   fallback meilleure-flaggée = précédent ADR-003 fallback A).
 *
 * LIMITES (honnêteté) : la tête 4-mots est un PROXY de similarité d'ouverture —
 * deux incipits peuvent diverger au 5ᵉ mot et rester des jumeaux sémantiques.
 * L'étage sémantique (bge-m3) reste SHADOW tant que le ledger C19 n'a pas
 * prouvé son gain (EMP-16 : 3 preuves avant durcissement).
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export type MotifKind = 'INCIPIT_HEAD' | 'TIC' | 'LEXICAL';

export interface MotifEvent {
  readonly kind: MotifKind;
  readonly motif: string;
  readonly chapter: number;
}

export interface PidGains {
  /** Pression récente (densité fenêtre W). Défaut 1.0. */
  readonly kp: number;
  /** Mémoire longue (saturation cumulée / n). Défaut 0.5. */
  readonly ki: number;
  /** Tendance (Δ densité entre fenêtres adjacentes). Défaut 0.5. */
  readonly kd: number;
}

export type IncipitVerdict =
  | { readonly verdict: 'OK'; readonly energy: number; readonly priorCount: 0 }
  | { readonly verdict: 'REPEAT_2ND'; readonly energy: number; readonly priorCount: 1 }
  | { readonly verdict: 'CLONE_3RD_FORBIDDEN'; readonly energy: number; readonly priorCount: number }
  | { readonly verdict: 'WEATHER_SATURATED'; readonly energy: number; readonly priorCount: number };

export type RepulsionError = { readonly code: 'BAD_CHAPTER' | 'EMPTY_MOTIF'; readonly detail: string };

/** Tête d'incipit — DÉFINITION IDENTIQUE au verdict EMP-16 (comparabilité des
 *  mesures scellées) : 4 premiers tokens d'espace, minuscules. La variante
 *  `lettersOnly` ignore les tokens sans lettre (« — », « « ») — mesurée par la
 *  sonde rétro, adoptée seulement si le ledger C19 prouve son gain. */
export function normalizedHead(prose: string, lettersOnly = false): string {
  const tokens = prose.trim().split(/\s+/u);
  const picked = lettersOnly ? tokens.filter((t) => /\p{L}/u.test(t)) : tokens;
  return picked.slice(0, 4).join(' ').toLowerCase();
}

/** Têtes météo — le défaut signature du 88k (48/50). Définition par classe
 *  météorologique fermée en position de tête, pas par liste de phrases. */
const WEATHER_HEAD_RE = /^[^\p{L}]*(la pluie|la brume|le vent|la neige|le brouillard|l'orage|le crachin)\b/iu;
export function isWeatherHead(head: string): boolean {
  return WEATHER_HEAD_RE.test(head);
}

export interface FieldOptions {
  readonly gains?: Partial<PidGains>;
  /** Fenêtre W du terme proportionnel/dérivé (chapitres). Défaut 5. */
  readonly window?: number;
  /** Quota météo en tête sur le livre (PLAN_LOCK : ≤ 5/50). Défaut 5. */
  readonly weatherQuota?: number;
}

export class MotifRepulsionField {
  private readonly gains: PidGains;
  private readonly window: number;
  private readonly weatherQuota: number;
  /** kind → motif → chapitres d'occurrence (ordonnés à l'observation). */
  private readonly events = new Map<MotifKind, Map<string, number[]>>();
  private weatherHeads = 0;

  constructor(opts: FieldOptions = {}) {
    this.gains = { kp: opts.gains?.kp ?? 1.0, ki: opts.gains?.ki ?? 0.5, kd: opts.gains?.kd ?? 0.5 };
    this.window = opts.window ?? 5;
    this.weatherQuota = opts.weatherQuota ?? 5;
  }

  /** Enregistre une occurrence ADMISE (le champ n'observe que le réel). */
  observe(event: MotifEvent): Result<true, RepulsionError> {
    if (!Number.isInteger(event.chapter) || event.chapter < 1) return err({ code: 'BAD_CHAPTER', detail: `chapter=${event.chapter}` });
    const motif = event.motif.trim().toLowerCase();
    if (motif.length === 0) return err({ code: 'EMPTY_MOTIF', detail: 'motif vide' });
    const byMotif = this.events.get(event.kind) ?? new Map<string, number[]>();
    const arr = byMotif.get(motif) ?? [];
    arr.push(event.chapter);
    byMotif.set(motif, arr);
    this.events.set(event.kind, byMotif);
    if (event.kind === 'INCIPIT_HEAD' && isWeatherHead(motif)) this.weatherHeads += 1;
    return ok(true);
  }

  private occurrences(kind: MotifKind, motif: string): readonly number[] {
    return this.events.get(kind)?.get(motif.trim().toLowerCase()) ?? [];
  }

  /** Énergie PID du motif au chapitre n. Déterministe, sans état caché. */
  energy(kind: MotifKind, motif: string, atChapter: number): number {
    const occ = this.occurrences(kind, motif);
    if (occ.length === 0) return 0;
    const inWin = (lo: number, hi: number): number => occ.filter((c) => c > lo && c <= hi).length;
    const rhoNow = inWin(atChapter - this.window, atChapter) / this.window;
    const rhoPrev = inWin(atChapter - 2 * this.window, atChapter - this.window) / this.window;
    const saturation = occ.filter((c) => c <= atChapter).length / Math.max(1, atChapter);
    const e = this.gains.kp * rhoNow + this.gains.ki * saturation + this.gains.kd * Math.max(0, rhoNow - rhoPrev);
    return Number(e.toFixed(4));
  }

  /** Motifs dont l'énergie dépasse le seuil — la liste de bans ADVISORY. */
  banned(kind: MotifKind, atChapter: number, threshold: number): readonly string[] {
    const byMotif = this.events.get(kind);
    if (byMotif === undefined) return [];
    return [...byMotif.keys()].filter((m) => this.energy(kind, m, atChapter) >= threshold).sort();
  }

  /** VERDICT D'INCIPIT pour une tête CANDIDATE au chapitre n.
   *  Loi dure : priorCount ≥ 2 ⇒ CLONE_3RD_FORBIDDEN (définition EMP-16 du clone).
   *  Quota météo : tête météo au-delà du quota livre ⇒ WEATHER_SATURATED. */
  evaluateIncipit(head: string, atChapter: number): IncipitVerdict {
    const h = head.trim().toLowerCase();
    const prior = this.occurrences('INCIPIT_HEAD', h).filter((c) => c < atChapter).length;
    const e = this.energy('INCIPIT_HEAD', h, atChapter);
    if (isWeatherHead(h) && this.weatherHeads >= this.weatherQuota) return { verdict: 'WEATHER_SATURATED', energy: e, priorCount: prior };
    if (prior >= 2) return { verdict: 'CLONE_3RD_FORBIDDEN', energy: e, priorCount: prior };
    if (prior === 1) return { verdict: 'REPEAT_2ND', energy: e, priorCount: 1 };
    return { verdict: 'OK', energy: e, priorCount: 0 };
  }

  /** Directive de variation compilée pour le PROMPT du chapitre n — uniquement
   *  des INTERDITS et des faits (jamais de feedback sémantique : leçon Mode C,
   *  bench R6 — le coaching en cascade est TOXIQUE ; CALC = douanier). */
  compileVariationDirective(atChapter: number, ticThreshold = 0.6): string {
    const lines: string[] = [];
    const repeated = [...(this.events.get('INCIPIT_HEAD') ?? new Map<string, number[]>()).entries()]
      .filter(([, occ]) => occ.filter((c) => c < atChapter).length >= 1)
      .map(([m]) => m).sort();
    if (repeated.length > 0) lines.push(`INTERDIT d'ouvrir le chapitre par : ${repeated.map((m) => `« ${m}… »`).join(', ')}. Ouvre par un angle neuf (geste, parole, objet, lieu).`);
    if (this.weatherHeads >= this.weatherQuota) lines.push('INTERDIT d\'ouvrir sur la météo (quota livre atteint).');
    const bannedTics = this.banned('TIC', atChapter, ticThreshold);
    if (bannedTics.length > 0) lines.push(`Expressions SATURÉES à éviter : ${bannedTics.join(', ')}.`);
    return lines.join('\n');
  }

  /** CONTRAT MODE '1' (prêt à câbler, pur) : filtre les candidates dont la tête
   *  créerait une violation. Si TOUTES violent ⇒ fallback A (ADR-003) : indices
   *  intacts + flag — l'appelant garde la meilleure et trace `below_threshold`. */
  filterCandidatesByIncipit<T extends { readonly prose: string }>(
    candidates: readonly T[], atChapter: number,
  ): { readonly admissible: readonly number[]; readonly fallbackAll: boolean; readonly verdicts: readonly IncipitVerdict[] } {
    const verdicts = candidates.map((c) => this.evaluateIncipit(normalizedHead(c.prose), atChapter));
    const admissible = verdicts
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v.verdict === 'OK' || v.verdict === 'REPEAT_2ND')
      .map(({ i }) => i);
    return admissible.length > 0
      ? { admissible, fallbackAll: false, verdicts }
      : { admissible: candidates.map((_, i) => i), fallbackAll: true, verdicts };
  }
}
