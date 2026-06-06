/**
 * OMEGA Book-Factory — C6 R6-CORE (BF-08) — boucle souveraine complète (N=7).
 * ADR §12/§14 : échelle de PRÉSÉANCE (un advisory ne renverse JAMAIS un dur ;
 * deux durs en conflit ⇒ rejet + rapport, jamais d'arbitrage silencieux) ;
 * G3 = diff Double-Bible HAUTE-CONF câblé (C4) ; sélection 2 ÉTAGES (éligibilité
 * dure → score EXPERIMENTAL loggé) ; EXECUTION_MODE OFF/SEMI/BOOST déclaré ;
 * INV-REPLAY-BOOK-001 : l'admission est REJOUABLE depuis l'enregistrement persisté.
 *
 * N2 : ABSENT PAR CONSTRUCTION (ratification 3-IA pendante — N2_RATIFICATION_DOSSIER) ;
 * le runner n'a AUCUN chemin de retry guidé. N1 (régénération aveugle) = relancer le
 * runner avec d'autres seeds, à l'étage orchestrateur. FORBID-006 vérifié par test
 * (zéro vocabulaire esthétique dans ce que voit le générateur).
 *
 * G6 « SKEPTIC » V1 = AGRÉGATEUR de verdicts EXISTANTS (diff EPISTEMIC/TEMPORAL durs
 * + violations continuity) — ce n'est PAS un nouveau juge (FORBID-002) : le module
 * gateway profiles.ts (FROZEN, pré-ESM — même barrière d'ère que C3) sera ponté en
 * C6-W1 via le même pattern de port ; d'ici là l'agrégateur porte le veto vérité
 * avec les seuls signaux déjà prouvés. Documenté, pas simulé.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

import type { ChapterSpec } from '../book-planner.js';
import type { ChapterGenerator, GenRequest } from '../chapter-generator.js';
import type { Sha256Hex } from '../identity/identity-types.js';
import { compareStrings } from '../identity/identity-types.js';
import { enforceRecallOrInvalid } from '../recall/recall-invariant.js';
import { runExtraction, buildPassRegistry } from '../extraction/pass-registry.js';
import { diffBibles, highConfidenceEvents } from '../diff/bible-diff.js';
import type { EpistemicChecker } from '../diff/bible-diff.js';
import { projectStoryState } from '../story-state.js';
import type { StoryState } from '../story-state.js';
import type { GateReport, LiteDeps } from './r6-lite.js';
import { repeatRate } from './r6-lite.js';

export type CoreProfileId =
  | 'canon-strict' | 'tension-interne' | 'sensoriel' | 'dialogue'
  | 'rythme-compresse' | 'voix-seche' | 'synthese';
export const CORE_PROFILES: readonly CoreProfileId[] = [
  'canon-strict', 'tension-interne', 'sensoriel', 'dialogue', 'rythme-compresse', 'voix-seche', 'synthese',
];

/** Consignes de PLUME uniquement — auditées par test FORBID-006 (zéro coaching esthétique). */
const CORE_FLAVOR: Readonly<Record<CoreProfileId, string>> = {
  'canon-strict': 'Plume : sobriété factuelle, fidélité stricte aux éléments imposés.',
  'tension-interne': 'Plume : focalisation interne, perception et pensée du personnage point de vue.',
  sensoriel: 'Plume : matières, sons, lumière, odeurs — concret.',
  dialogue: 'Plume : la scène avance par les répliques.',
  'rythme-compresse': 'Plume : scène resserrée, ellipses franches.',
  'voix-seche': 'Plume : phrases déclaratives, zéro ornement.',
  synthese: 'Plume : équilibre récit/dialogue.',
};

export type ExecutionMode = 'OFF' | 'SEMI_OFF' | 'BOOST';

export type CoreGateId = 'G1_FORMAT' | 'G2_FIDELITY' | 'G3_CANON_DIFF' | 'G_RECALL' | 'G6_SKEPTIC_AGG' | 'G5_REPEAT_SHADOW';

/** Échelle de préséance ADR §12.3 — ordre STRICT, advisory jamais au-dessus d'un dur. */
export const PRECEDENCE: readonly CoreGateId[] = [
  'G3_CANON_DIFF', 'G2_FIDELITY', 'G_RECALL', 'G6_SKEPTIC_AGG', 'G1_FORMAT', 'G5_REPEAT_SHADOW',
];
const HARD_GATES: ReadonlySet<CoreGateId> = new Set(['G1_FORMAT', 'G2_FIDELITY', 'G3_CANON_DIFF', 'G_RECALL', 'G6_SKEPTIC_AGG']);

export interface CoreCandidate {
  readonly profile: CoreProfileId;
  readonly prose: string;
  readonly words: number;
  readonly proseHash: Sha256Hex;
  readonly gates: readonly GateReport<CoreGateId>[]; // rapports complets persistés
  readonly eligible: boolean;
  readonly expScore: number; // EXPERIMENTAL_DEFAULTS — loggé, jamais autorité seule
}

export interface AdmissionRecord {
  readonly chapter: number;
  readonly mode: ExecutionMode;
  readonly candidates: readonly { readonly profile: CoreProfileId; readonly proseHash: Sha256Hex; readonly eligible: boolean; readonly expScore: number; readonly gates: readonly GateReport<CoreGateId>[] }[];
  readonly winner: { readonly kind: 'WINNER'; readonly profile: CoreProfileId } | { readonly kind: 'NONE_ELIGIBLE_FLAGGED'; readonly bestUnderGates: CoreProfileId };
  readonly admissionHash: Sha256Hex; // INV-REPLAY-BOOK-001
}

export interface CoreDeps extends Omit<LiteDeps, 'generator'> {
  readonly generator: ChapterGenerator;
  readonly realState: StoryState; // Bible-RÉELLE du moment (G3)
  readonly weekdayByChapter: ReadonlyMap<number, string>;
  readonly epistemic?: EpistemicChecker;
  readonly mode: ExecutionMode;
}

const G1_MIN_WORDS = 60; // EXPERIMENTAL_DEFAULT (aligné Lite)

/** Variante C7 : retourne AUSSI les candidats COMPLETS (prose incluse) pour persistance. */
export async function runCoreChapterFull(
  spec: ChapterSpec,
  baseRequest: GenRequest,
  deps: CoreDeps,
): Promise<{ readonly record: AdmissionRecord; readonly full: readonly CoreCandidate[] }> {
  return runCoreInternal(spec, baseRequest, deps);
}

export async function runCoreChapter(
  spec: ChapterSpec,
  baseRequest: GenRequest,
  deps: CoreDeps,
): Promise<AdmissionRecord> {
  return (await runCoreInternal(spec, baseRequest, deps)).record;
}

async function runCoreInternal(
  spec: ChapterSpec,
  baseRequest: GenRequest,
  deps: CoreDeps,
): Promise<{ readonly record: AdmissionRecord; readonly full: readonly CoreCandidate[] }> {
  const candidates: CoreCandidate[] = [];

  for (const profile of CORE_PROFILES) {
    const req: GenRequest = { ...baseRequest, digest: `${CORE_FLAVOR[profile]}\n${baseRequest.digest}` };
    const gen = await deps.generator.generate(req);
    const gates: GateReport<CoreGateId>[] = [];

    // G1 — format (dur, CALC, tous modes)
    gates.push({
      gate: 'G1_FORMAT',
      verdict: gen.words >= G1_MIN_WORDS && /\p{L}/u.test(gen.prose) ? 'PASS' : 'FAIL',
      detail: `words=${gen.words}`,
    });

    // G_RECALL — BF-02 (dur, CALC, tous modes)
    const recall = enforceRecallOrInvalid(gen.prose, deps.packs, deps.registry, deps.knownSurfaces, deps.resolution, deps.maxSurfaceWords);
    gates.push({ gate: 'G_RECALL', verdict: recall.verdict === 'PASS' ? 'PASS' : 'FAIL', detail: `${recall.violations.length} violation(s)` });

    // Extraction unique (réutilisée par G2/G3/G6).
    // ASYMÉTRIE DOCUMENTÉE (revue C6 P2) : l'état extrait est PRÉ-ENSEMENCÉ avec tous les
    // personnages réels (ils existent au monde même non mentionnés) ⇒ le diff MISSING-character
    // ne PEUT PAS se déclencher dans Core — c'est un choix : « absent de la prose » n'est pas
    // une faute ici (la présence requise se gate via ChapterSpec/continuity, pas via le diff).
    const extracted = runExtraction(gen.prose, 'standard', buildPassRegistry(), deps.passContext);
    const extractedState = projectStoryState([
      ...deps.realState.characters.map((c) => ({ kind: 'CHARACTER_INTRODUCE' as const, chapter: 1, id: c.id, name: c.name })),
      ...highConfidenceEvents(extracted),
    ]);
    const diff = diffBibles(deps.realState, extractedState, extracted, deps.weekdayByChapter, deps.epistemic);

    // G2 — fidélité aux verrous (dur) : MUTATED haute-conf sur (entité, champ) verrouillé.
    // Appartenance par CLÉ (subject|field), pas par identité d'objet (revue C6 P1 :
    // un perso à DEUX verrous mutés doit voir ses deux violations au G2, pas fuir au G3).
    const lockKeys = new Set(
      diff.hardViolations
        .filter((i) => i.kind === 'MUTATED' && (deps.locksByStoryId.get(i.subject) ?? []).some((r) => r.field === i.field))
        .map((i) => `${i.subject}|${i.field}`),
    );
    const lockBreak = diff.hardViolations.find((i) => lockKeys.has(`${i.subject}|${i.field}`));
    gates.push({
      gate: 'G2_FIDELITY',
      verdict: lockBreak === undefined ? 'PASS' : 'FAIL',
      detail: lockBreak === undefined ? 'verrous respectés' : lockBreak.detail,
    });

    // G3 — canon/diff (dur) : violations STRUCTURELLES haute-conf HORS verrous (EXTRA/MUTATED)
    const canonBreak = diff.hardViolations.find(
      (i) => i.kind === 'EXTRA' || (i.kind === 'MUTATED' && !lockKeys.has(`${i.subject}|${i.field}`)),
    );
    gates.push({
      gate: 'G3_CANON_DIFF',
      verdict: canonBreak === undefined ? 'PASS' : 'FAIL',
      detail: canonBreak === undefined ? `diff propre (${diff.uncertain.length} signaux UNCERTAIN non-bloquants)` : canonBreak.detail,
    });

    // G6 — agrégateur vérité (dur) : EPISTEMIC/TEMPORAL haute-conf (cf. en-tête : pas un nouveau juge)
    const truthBreak = diff.hardViolations.find((i) => i.kind === 'EPISTEMIC' || i.kind === 'TEMPORAL');
    gates.push({
      gate: 'G6_SKEPTIC_AGG',
      verdict: truthBreak === undefined ? 'PASS' : 'FAIL',
      detail: truthBreak === undefined ? 'aucune violation vérité' : truthBreak.detail,
    });

    // G5 — répétition (OBSERVE, tous modes)
    gates.push({ gate: 'G5_REPEAT_SHADOW', verdict: 'OBSERVE', detail: `repeat_rate=${repeatRate(gen.prose).toFixed(4)}` });

    // Préséance : l'éligibilité = AUCUN dur en FAIL (l'ordre sert au RAPPORT, pas à masquer)
    const hardFails = gates.filter((g) => HARD_GATES.has(g.gate as CoreGateId) && g.verdict === 'FAIL');
    const eligible = hardFails.length === 0;

    // Étage B (EXPERIMENTAL_DEFAULTS — loggé) : matière + graines − incertitude résiduelle
    const norm = gen.prose.normalize('NFC').toLowerCase();
    const bloomHits = spec.seeds_to_bloom.filter((s) => norm.includes(s.toLowerCase().slice(0, 8))).length;
    const expScore = gen.words + bloomHits * 50 - diff.uncertain.length * 5;

    candidates.push({
      profile,
      prose: gen.prose,
      words: gen.words,
      proseHash: sha256(canonicalize({ p: gen.prose })) as Sha256Hex,
      gates,
      eligible,
      expScore,
    });
  }

  const ordered = [...candidates].sort((a, b) => b.expScore - a.expScore || compareStrings(a.profile, b.profile));
  const eligibleOrdered = ordered.filter((c) => c.eligible);
  const winner: AdmissionRecord['winner'] =
    eligibleOrdered[0] !== undefined
      ? { kind: 'WINNER', profile: eligibleOrdered[0].profile }
      : { kind: 'NONE_ELIGIBLE_FLAGGED', bestUnderGates: ordered[0]?.profile ?? 'canon-strict' };

  const slim = candidates.map((c) => ({ profile: c.profile, proseHash: c.proseHash, eligible: c.eligible, expScore: c.expScore, gates: c.gates }));
  const admissionHash = sha256(canonicalize({ v: 1, chapter: spec.index, mode: deps.mode, slim, winner })) as Sha256Hex;

  return { record: { chapter: spec.index, mode: deps.mode, candidates: slim, winner, admissionHash }, full: candidates };
}

/* ───────────────── INV-REPLAY-BOOK-001 : rejouer l'ADMISSION depuis l'enregistrement ── */
/**
 * Re-dérive la décision depuis les SEULS artefacts persistés (gates + scores + hashes).
 * Même enregistrement ⇒ même gagnant ⇒ même admissionHash. Toute divergence = corruption.
 */
export function replayAdmission(record: AdmissionRecord): { readonly winner: AdmissionRecord['winner']; readonly admissionHash: Sha256Hex; readonly consistent: boolean } {
  const ordered = [...record.candidates].sort((a, b) => b.expScore - a.expScore || compareStrings(a.profile, b.profile));
  const eligibleOrdered = ordered.filter((c) => c.eligible);
  const winner: AdmissionRecord['winner'] =
    eligibleOrdered[0] !== undefined
      ? { kind: 'WINNER', profile: eligibleOrdered[0].profile }
      : { kind: 'NONE_ELIGIBLE_FLAGGED', bestUnderGates: ordered[0]?.profile ?? 'canon-strict' };
  const admissionHash = sha256(
    canonicalize({ v: 1, chapter: record.chapter, mode: record.mode, slim: record.candidates, winner }),
  ) as Sha256Hex;
  return { winner, admissionHash, consistent: admissionHash === record.admissionHash };
}

/** FORBID-006 : lexique esthétique INTERDIT dans tout ce que voit le générateur. */
export const FORBIDDEN_COACHING_LEXICON: readonly string[] = [
  'plus littéraire', 'plus de tension', 'plus de sous-texte', 'écris plus long', 'comme flaubert', 'améliore le style',
];

export function auditNoCoaching(textSeenByGenerator: string): readonly string[] {
  const norm = textSeenByGenerator.normalize('NFC').toLowerCase();
  return FORBIDDEN_COACHING_LEXICON.filter((f) => norm.includes(f));
}
