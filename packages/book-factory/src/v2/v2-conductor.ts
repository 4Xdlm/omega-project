/**
 * OMEGA — V2 CONDUCTOR (NEXT_BOOK_V2, GO tribunal 2/2 2026-06-08).
 * Configuration MANDATÉE : C18 mode '1' (sélection) · C17 mode 'soft' (1 regen
 * max, fallback A) · Lyapunov readout SHADOW · Pareto front SHADOW ·
 * Wasserstein rythme ADVISORY · Emergence Tracker SHADOW · ligne C19 finale.
 *
 * DOCTRINE (ADR-003, scellée) : le CALC contrôle la SÉLECTION, pas la
 * génération. Le conducteur COMPOSE les organes C17/C18 (déjà testés) — il ne
 * duplique aucune logique. Tout gain non calibré est marqué PROVISIONAL et ne
 * sert qu'en SHADOW (famille EMP-19 : pas d'instrument sans profil).
 */

import { appendFileSync, writeFileSync } from 'node:fs';

import { ControlPlane, selectorEntropy } from '../control/control-plane.js';
import type { ChapterControlVerdict, ControlPlaneReport, DramaticFn } from '../control/control-plane.js';
import { MotifRepulsionField, normalizedHead } from '../variation/motif-repulsion.js';

/* ————————————————— Wasserstein rythme (ADVISORY, profil PROVISOIRE) ————————————————— */

/** Profil cible PROVISOIRE (vision §5 : P10≤4, P50≈12, P90≥28, queue lourde).
 *  Déciles explicites — à RECALIBRER sur les maîtres FR du Gold-Set avant tout
 *  passage au-dessus d'ADVISORY. Marqué PROVISIONAL dans chaque rapport. */
export const PROVISIONAL_RHYTHM_DECILES: readonly number[] = [3, 4, 6, 8, 10, 12, 15, 19, 24, 31];

export function sentenceLengths(prose: string): readonly number[] {
  return prose.split(/(?<=[.!?…»])\s+(?!»)/u).map((s) => s.trim().split(/\s+/u).filter((w) => /\p{L}/u.test(w)).length).filter((n) => n > 0);
}

/** W₁ approchée par comparaison de déciles (déterministe, CALC pur). */
export function wassersteinToProfile(lengths: readonly number[], deciles: readonly number[] = PROVISIONAL_RHYTHM_DECILES): number {
  if (lengths.length < 5) return Number.POSITIVE_INFINITY;
  const sorted = [...lengths].sort((a, b) => a - b);
  const q = (p: number): number => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? 0;
  let acc = 0;
  deciles.forEach((d, i) => { acc += Math.abs(q((i + 0.5) / deciles.length) - d); });
  return Number((acc / deciles.length).toFixed(3));
}

/* ————————————————— Emergence Tracker (SHADOW — jamais d'auto-mint) ————————————————— */

const NAME_MID_RE = /[^.!?…»\n]\s(\p{Lu}[\p{Ll}'’-]{2,})\b/gu;

export class EmergenceTracker {
  private readonly minted: ReadonlySet<string>;
  private readonly seen = new Map<string, { count: number; chapters: Set<number> }>();
  constructor(mintedSurfaces: readonly string[]) {
    this.minted = new Set(mintedSurfaces.map((s) => s.toLowerCase()));
  }
  observe(prose: string, chapter: number): void {
    for (const m of prose.matchAll(NAME_MID_RE)) {
      const name = m[1] ?? '';
      if (this.minted.has(name.toLowerCase())) continue;
      const e = this.seen.get(name) ?? { count: 0, chapters: new Set<number>() };
      e.count += 1; e.chapters.add(chapter);
      this.seen.set(name, e);
    }
  }
  /** Masse V1 = fréquence + 2×dispersion (co-occurrence omise V1 — documenté). */
  report(threshold = 5): ReadonlyArray<{ name: string; mass: number; count: number; chapters: number; verdict: 'AUTHOR_REVIEW_REQUIRED' | 'OBSERVED' }> {
    return [...this.seen.entries()]
      .map(([name, e]) => ({ name, mass: e.count + 2 * e.chapters.size, count: e.count, chapters: e.chapters.size, verdict: (e.count + 2 * e.chapters.size >= threshold ? 'AUTHOR_REVIEW_REQUIRED' : 'OBSERVED') as 'AUTHOR_REVIEW_REQUIRED' | 'OBSERVED' }))
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.mass - a.mass);
  }
}

/* ————————————————— Lyapunov readout (SHADOW, gains PROVISOIRES = 1) ————————————————— */

export interface LyapunovTerms {
  readonly chapter: number;
  readonly unpaidSeeds: number;
  readonly motifSaturation: number;
  readonly driftRate: number;
  readonly emergenceCandidates: number;
  readonly actBreaches: number;
  readonly rhythmFlatness: number;
  readonly V: number;
}

export function lyapunovReadout(t: Omit<LyapunovTerms, 'V'>): LyapunovTerms {
  /* GAINS α..ζ = 1 PROVISOIRES (SHADOW only) — calibration exigée via C19 ≥3 runs. */
  const V = t.unpaidSeeds + t.motifSaturation + t.driftRate + t.emergenceCandidates + t.actBreaches + t.rhythmFlatness;
  return { ...t, V: Number(V.toFixed(3)) };
}

/* ————————————————— Le conducteur ————————————————— */

export interface CandidateLike { readonly profile: string; readonly prose: string; readonly eligible?: boolean }

export interface ChapterDecision {
  readonly chapter: number;
  readonly originalWinner: string;
  readonly finalWinner: string;
  readonly c18: 'PASS' | 'SWAPPED' | 'FALLBACK_ALL_FLAGGED';
  readonly c17: ChapterControlVerdict['status'] | 'NOT_EVALUATED';
  readonly regenUsed: boolean;
  readonly wassersteinWinner: number;
  readonly wassersteinBestProfile: string;
}

export class V2Conductor {
  readonly field = new MotifRepulsionField();
  readonly control: ControlPlane;
  readonly emergence: EmergenceTracker;
  private readonly decisions: ChapterDecision[] = [];
  private readonly lyapunov: LyapunovTerms[] = [];
  private readonly outRoot: string;

  constructor(outRoot: string, mintedSurfaces: readonly string[], controlMode: 'shadow' | 'soft' = 'soft') {
    this.outRoot = outRoot;
    this.control = new ControlPlane(controlMode);
    this.emergence = new EmergenceTracker(mintedSurfaces);
  }

  /** C18 mode '1' — choisit la candidate FINALE. Le CALC contrôle la SÉLECTION :
   *  si la gagnante clonerait un incipit, bascule vers la meilleure admissible
   *  ÉLIGIBLE (ordre du record = préséance du duel) ; si toutes violent ⇒
   *  fallback A (gagnante conservée, flaggée). Déterministe, tracé. */
  applyIncipitGate(candidates: readonly CandidateLike[], winnerProfile: string, chapter: number): { profile: string; c18: ChapterDecision['c18'] } {
    const sel = this.field.filterCandidatesByIncipit(candidates, chapter);
    const winIdx = candidates.findIndex((c) => c.profile === winnerProfile);
    if (sel.fallbackAll) return { profile: winnerProfile, c18: 'FALLBACK_ALL_FLAGGED' };
    if (sel.admissible.includes(winIdx)) return { profile: winnerProfile, c18: 'PASS' };
    const swap = sel.admissible.find((i) => candidates[i]?.eligible !== false) ?? sel.admissible[0];
    const swapped = swap !== undefined ? candidates[swap] : undefined;
    return swapped !== undefined ? { profile: swapped.profile, c18: 'SWAPPED' } : { profile: winnerProfile, c18: 'FALLBACK_ALL_FLAGGED' };
  }

  /** Wasserstein ADVISORY sur toutes les candidates (jamais bloquant). */
  rhythmAdvisory(candidates: readonly CandidateLike[]): ReadonlyArray<{ profile: string; w1: number }> {
    return candidates.map((c) => ({ profile: c.profile, w1: wassersteinToProfile(sentenceLengths(c.prose)) })).sort((a, b) => a.w1 - b.w1);
  }

  /** Admission FINALE d'un chapitre : observe le réel, journalise tout. */
  admitChapter(args: {
    readonly chapter: number; readonly act: number;
    readonly plannedFn: DramaticFn; readonly realizedFn: DramaticFn;
    readonly prose: string; readonly originalWinner: string; readonly finalWinner: string;
    readonly c18: ChapterDecision['c18']; readonly regenUsed: boolean;
    readonly unpaidSeeds: number; readonly isRegenRound?: boolean;
  }): ChapterControlVerdict {
    const verdict = this.control.record({ chapter: args.chapter, act: args.act, plannedFn: args.plannedFn, realizedFn: args.realizedFn, isRegenRound: args.isRegenRound ?? args.regenUsed });
    if (verdict.status === 'DRIFT_REGEN_REQUESTED') return verdict; // pas admis — l'appelant re-génère UNE fois

    const head = normalizedHead(args.prose);
    const obs = this.field.observe({ kind: 'INCIPIT_HEAD', motif: head, chapter: args.chapter });
    if (!obs.ok) appendFileSync(`${this.outRoot}/V2_CONDUCTOR.log`, `WARN observe ch${args.chapter}: ${obs.error.code}\n`, 'utf8');
    this.emergence.observe(args.prose, args.chapter);

    const wAll = this.rhythmAdvisory([{ profile: args.finalWinner, prose: args.prose }]);
    const lengths = sentenceLengths(args.prose);
    const report = this.control.report();
    this.lyapunov.push(lyapunovReadout({
      chapter: args.chapter,
      unpaidSeeds: args.unpaidSeeds,
      motifSaturation: Number(this.field.banned('INCIPIT_HEAD', args.chapter, 0.6).length + this.field.banned('TIC', args.chapter, 0.6).length),
      driftRate: report.driftRate,
      emergenceCandidates: this.emergence.report().filter((r) => r.verdict === 'AUTHOR_REVIEW_REQUIRED').length,
      actBreaches: report.actBreaches.length,
      rhythmFlatness: wassersteinToProfile(lengths) === Number.POSITIVE_INFINITY ? 0 : wassersteinToProfile(lengths),
    }));
    this.decisions.push({ chapter: args.chapter, originalWinner: args.originalWinner, finalWinner: args.finalWinner, c18: args.c18, c17: verdict.status, regenUsed: args.regenUsed, wassersteinWinner: wAll[0]?.w1 ?? -1, wassersteinBestProfile: wAll[0]?.profile ?? '' });
    return verdict;
  }

  /** Directive d'escalade pour la regen C17 (INTERDITS + faits — zéro coaching,
   *  leçon Mode C). La traduction model-aware (Rosetta) s'applique en amont si
   *  un profil calibré existe pour le couple — sinon flag ROSETTA_NA tracé. */
  escalationDirective(plannedFn: DramaticFn, atChapter: number): string {
    const variation = this.field.compileVariationDirective(atChapter);
    const fnLine = plannedFn === 'REVELATION'
      ? 'CE CHAPITRE DOIT CONTENIR UNE RÉVÉLATION CONCRÈTE : un personnage APPREND un fait précis qu\'il ignorait (nomme le fait). INTERDIT de finir le chapitre sans cette découverte.'
      : plannedFn === 'CONFRONTATION'
        ? 'CE CHAPITRE EST UNE CONFRONTATION : deux personnages s\'affrontent EN DIALOGUE sur un désaccord nommé. INTERDIT de rester en description ou en déplacement.'
        : `FONCTION OBLIGATOIRE DU CHAPITRE : ${plannedFn}. INTERDIT de glisser vers une simple transition.`;
    return `${fnLine}${variation.length > 0 ? `\n${variation}` : ''}`;
  }

  closeAct(act: number): void { this.control.closeAct(act); }

  /** Écrit les 5 rapports mandatés. */
  flush(winners: readonly string[]): { control: ControlPlaneReport } {
    const control = this.control.report();
    writeFileSync(`${this.outRoot}/V2_C17_DRIFT_REPORT.json`, JSON.stringify({ control, selectorEntropy: selectorEntropy(winners) }, null, 2), 'utf8');
    writeFileSync(`${this.outRoot}/V2_C18_DECISIONS.json`, JSON.stringify({ decisions: this.decisions }, null, 2), 'utf8');
    writeFileSync(`${this.outRoot}/V2_LYAPUNOV_CURVE.json`, JSON.stringify({ gains: 'PROVISIONAL_ALL_1 (SHADOW — calibration C19 >=3 runs exigée)', curve: this.lyapunov }, null, 2), 'utf8');
    writeFileSync(`${this.outRoot}/V2_EMERGENCE_REPORT.json`, JSON.stringify({ note: 'SHADOW — jamais d\'auto-mint (CONCEPT-AUTHOR-SEAL-001)', entities: this.emergence.report() }, null, 2), 'utf8');
    writeFileSync(`${this.outRoot}/V2_RHYTHM_PROFILE.json`, JSON.stringify({ profile: 'PROVISIONAL_RHYTHM_DECILES (à recalibrer Gold-Set FR)', deciles: PROVISIONAL_RHYTHM_DECILES, perChapterW1: this.lyapunov.map((l) => ({ chapter: l.chapter, w1: l.rhythmFlatness })) }, null, 2), 'utf8');
    return { control };
  }
}
