/**
 * OMEGA Book-Factory — C5 R6-LITE (BF-08) — « observer avant de punir » (N=3).
 * ADR §13 : gates DURS minimum (G1 format, G2 fidélité-verrous, INV-RECALL-001) ;
 * G5 répétition OBSERVÉE (shadow — ne rejette jamais en Lite) ; sélecteur SIMPLE
 * documenté EXPERIMENTAL ; persistance TOTALE (FORBID-007) ; fallback ADR-003
 * (meilleur sous gates + FLAG, jamais de silence).
 *
 * MÉCANISME : 3 profils de PLUME (la réalité ne varie jamais : mêmes packs, mêmes
 * verrous, même spec) ; G2 RÉUTILISE l'extracteur C4 (P1) : une dérive de lieu/statut
 * sur entité verrouillée n'est pas « devinée », elle est EXTRAITE haute-conf puis
 * confrontée aux DriftRules. Le gate Recall est le filet post-prose C2.
 * LIMITES : sélecteur Lite = matière utile + couverture des graines à éclore
 * (CALC, EXPERIMENTAL_DEFAULTS — JAMAIS un juge esthétique : N3 interdit) ;
 * G5 trigramme = mesure d'observation, seuils non scellés.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

import type { ChapterSpec } from '../book-planner.js';
import type { ChapterGenerator, GenRequest } from '../chapter-generator.js';
import type { CharacterRegistry } from '../identity/character-registry.js';
import type { ResolutionContext, Sha256Hex } from '../identity/identity-types.js';
import { compareStrings } from '../identity/identity-types.js';
import { enforceRecallOrInvalid } from '../recall/recall-invariant.js';
import type { DriftRule, RecallGateReport, RecallPack } from '../recall/recall-types.js';
import { buildPassRegistry, runExtraction } from '../extraction/pass-registry.js';
import type { PassContext } from '../extraction/extraction-types.js';
import { highConfidenceEvents } from '../diff/bible-diff.js';

export type ProfileId = 'canon-strict' | 'sensoriel' | 'synthese';
export const LITE_PROFILES: readonly ProfileId[] = ['canon-strict', 'sensoriel', 'synthese'];

const PROFILE_FLAVOR: Readonly<Record<ProfileId, string>> = {
  'canon-strict': 'Consigne de plume : sobriété factuelle, fidélité absolue aux éléments imposés.',
  sensoriel: 'Consigne de plume : ancrage sensoriel concret (matières, sons, lumière), sans lyrisme.',
  synthese: 'Consigne de plume : équilibre récit/dialogue, progression nette de la scène.',
};

export type GateId = 'G1_FORMAT' | 'G2_FIDELITY' | 'G_RECALL' | 'G5_REPEAT_SHADOW';
/** Générique sur l'identifiant de gate : Lite = GateId (défaut), Core = CoreGateId. */
export interface GateReport<G extends string = GateId> {
  readonly gate: G;
  readonly verdict: 'PASS' | 'FAIL' | 'OBSERVE';
  readonly detail: string;
}

export interface LiteCandidate {
  readonly profile: ProfileId;
  readonly prose: string;
  readonly words: number;
  readonly model: string;
  readonly proseHash: Sha256Hex;
  readonly gates: readonly GateReport[];
  readonly recall: RecallGateReport;
  readonly eligible: boolean;
  readonly score: number; // EXPERIMENTAL — log only, jamais un verdict esthétique
}

export interface LiteChapterResult {
  readonly chapter: number;
  readonly candidates: readonly LiteCandidate[];
  readonly winner:
    | { readonly kind: 'WINNER'; readonly profile: ProfileId }
    | { readonly kind: 'NONE_ELIGIBLE_FLAGGED'; readonly bestUnderGates: ProfileId }; // fallback ADR-003
}

/* ─────────────────────────────────── gates ───────────────────────────────────────── */
const G1_MIN_WORDS = 60; // EXPERIMENTAL_DEFAULT (démo déterministe ; prod : aligné BB-02)

function gateFormat(prose: string, words: number): GateReport {
  const hasLetters = /\p{L}/u.test(prose);
  const ok = words >= G1_MIN_WORDS && hasLetters && prose.trim().length > 0;
  return { gate: 'G1_FORMAT', verdict: ok ? 'PASS' : 'FAIL', detail: `words=${words} (min=${G1_MIN_WORDS})` };
}

/** G2 : confronte les extractions haute-conf (C4-P1) aux verrous du chapitre. */
function gateFidelity(
  prose: string,
  locks: ReadonlyMap<string, readonly DriftRule[]>, // storyId → règles
  pctx: PassContext,
): GateReport {
  const events = highConfidenceEvents(runExtraction(prose, 'standard', buildPassRegistry(), pctx));
  for (const ev of events) {
    if (ev.kind === 'CHARACTER_MOVE') {
      const rules = locks.get(ev.id) ?? [];
      const lock = rules.find((r) => r.field === 'location');
      if (lock !== undefined && lock.expected.normalize('NFC').toLowerCase() !== ev.location.normalize('NFC').toLowerCase())
        return { gate: 'G2_FIDELITY', verdict: 'FAIL', detail: `lieu verrouillé « ${lock.expected} » contredit par « ${ev.location} » (${ev.id})` };
    }
    if (ev.kind === 'CHARACTER_STATUS') {
      const rules = locks.get(ev.id) ?? [];
      const lock = rules.find((r) => r.field === 'status');
      if (lock !== undefined && lock.expected !== ev.status)
        return { gate: 'G2_FIDELITY', verdict: 'FAIL', detail: `statut verrouillé « ${lock.expected} » contredit par « ${ev.status} » (${ev.id})` };
    }
  }
  return { gate: 'G2_FIDELITY', verdict: 'PASS', detail: `verrous respectés (${locks.size} entité(s))` };
}

/** G5 : taux de trigrammes répétés — OBSERVÉ seulement en Lite (shadow). */
export function repeatRate(prose: string): number {
  const words = prose.normalize('NFC').toLowerCase().split(/\s+/u).filter((w) => w.length > 0);
  if (words.length < 6) return 0;
  const seen = new Map<string, number>();
  for (let i = 0; i + 2 < words.length; i++) {
    const tri = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    seen.set(tri, (seen.get(tri) ?? 0) + 1);
  }
  const repeated = [...seen.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0);
  return repeated / Math.max(1, words.length - 2);
}

/* ───────────────────────────── sélecteur Lite (EXPERIMENTAL) ─────────────────────── */
/** Matière utile + couverture des graines à éclore — CALC pur, loggé, jamais esthétique. */
function liteScore(prose: string, words: number, spec: ChapterSpec): number {
  const norm = prose.normalize('NFC').toLowerCase();
  const bloomHits = spec.seeds_to_bloom.filter((s) => norm.includes(s.toLowerCase().slice(0, 8))).length;
  return words + bloomHits * 50; // pondération EXPERIMENTAL_DEFAULT
}

/* ─────────────────────────────────── runner ──────────────────────────────────────── */
export interface LiteDeps {
  readonly generator: ChapterGenerator;
  readonly registry: CharacterRegistry;
  readonly knownSurfaces: ReadonlySet<string>;
  readonly maxSurfaceWords: number;
  readonly packs: readonly RecallPack[]; // packs du chapitre (C2) — DÉJÀ construits
  readonly locksByStoryId: ReadonlyMap<string, readonly DriftRule[]>;
  readonly passContext: PassContext;
  readonly resolution: ResolutionContext;
}

export async function runLiteChapter(
  spec: ChapterSpec,
  baseRequest: GenRequest,
  deps: LiteDeps,
): Promise<LiteChapterResult> {
  const candidates: LiteCandidate[] = [];
  for (const profile of LITE_PROFILES) {
    // La PLUME varie, la RÉALITÉ jamais : même spec, mêmes packs, flavor en tête de digest.
    const req: GenRequest = { ...baseRequest, digest: `${PROFILE_FLAVOR[profile]}\n${baseRequest.digest}` };
    const gen = await deps.generator.generate(req);
    const recall = enforceRecallOrInvalid(
      gen.prose, deps.packs, deps.registry, deps.knownSurfaces, deps.resolution, deps.maxSurfaceWords,
    );
    const g1 = gateFormat(gen.prose, gen.words);
    const g2 = gateFidelity(gen.prose, deps.locksByStoryId, deps.passContext);
    const g5: GateReport = { gate: 'G5_REPEAT_SHADOW', verdict: 'OBSERVE', detail: `repeat_rate=${repeatRate(gen.prose).toFixed(4)}` };
    const gRecall: GateReport = { gate: 'G_RECALL', verdict: recall.verdict === 'PASS' ? 'PASS' : 'FAIL', detail: `${recall.violations.length} violation(s)` };
    const eligible = g1.verdict === 'PASS' && g2.verdict === 'PASS' && gRecall.verdict === 'PASS';
    candidates.push({
      profile,
      prose: gen.prose,
      words: gen.words,
      model: gen.model,
      proseHash: sha256(canonicalize({ p: gen.prose })) as Sha256Hex,
      gates: [g1, g2, gRecall, g5],
      recall,
      eligible,
      score: liteScore(gen.prose, gen.words, spec),
    });
  }

  const ordered = [...candidates].sort((a, b) => b.score - a.score || compareStrings(a.profile, b.profile));
  const eligibleOrdered = ordered.filter((c) => c.eligible);
  const winner: LiteChapterResult['winner'] =
    eligibleOrdered.length > 0 && eligibleOrdered[0] !== undefined
      ? { kind: 'WINNER', profile: eligibleOrdered[0].profile }
      : { kind: 'NONE_ELIGIBLE_FLAGGED', bestUnderGates: ordered[0]?.profile ?? 'canon-strict' };

  return { chapter: spec.index, candidates, winner };
}
