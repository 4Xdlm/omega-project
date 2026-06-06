/**
 * OMEGA Book-Factory — C4 PASS REGISTRY + PASSES CALC V1 (BF-08)
 * ADR §11.5 : taxonomie CONFIGURABLE (les « 5 passes » étaient un exemple — acté).
 * Aucune passe n'est source de vérité : elles émettent des CANDIDATS confiance-bornés.
 *
 * Passes V1 (toutes CALC, déterministes) :
 *  P1_CHARACTERS — mouvements (« alla à / arriva à / entra dans X ») et morts
 *                  (« mourut / était mort(e) / s'éteignit ») des entités RÉSOLUES (C1/C2).
 *  P3_TIMELINE   — jours de semaine + durées (« trois jours plus tard ») → TemporalClaim.
 *  P6_SEEDS      — lexique de graines du plan retrouvé en prose → SEED_* candidats.
 *  P4_EPISTEMIC  — « X révéla/avoua/apprit que S » → EpistemicClaim (vérifié au diff).
 * MODE LLM_CALIBRATED : type présent, AUCUNE passe enregistrée (EMP-19 — NOT_WIRED).
 *
 * MÉCANISME : chaque passe re-scanne la prose normalisée (scanner C2 = même monde
 * lexical) ; les prédicats sont des fenêtres locales autour des mentions résolues
 * (pas de regex globale fragile) ; confiance : prédicat canonique = 0.9, formulation
 * lâche = 0.6 (bande UNCERTAIN — FORBID-011 : jamais gate dur).
 * LIMITES : rappel partiel ASSUMÉ (formulations canoniques) — couverture large =
 * instrument calibré futur ; français V1.
 */

import type { CharacterId, Confidence01 } from '../identity/identity-types.js';
import { asConfidence01, compareStrings } from '../identity/identity-types.js';
import { normalizeText, scanMentions } from '../recall/mention-scanner.js';
import type {
  ChapterKind,
  EpistemicClaim,
  ExtractedEvent,
  ExtractionPass,
  PassContext,
  PassId,
  PassRegistry,
  TemporalClaim,
} from './extraction-types.js';

const conf = (n: number): Confidence01 => {
  const r = asConfidence01(n);
  if (!r.ok) throw new Error(`confidence invalide ${n}`); // constante interne — assert frontière
  return r.value;
};
const HIGH = conf(0.9);
const LOOSE = conf(0.6);

const pid = (s: string): PassId => s as PassId;

function excerptAt(norm: string, offset: number, len = 60): string {
  return norm.slice(Math.max(0, offset - 10), offset + len);
}

/** Mentions résolues uniques de la prose (socle commun des passes). */
function resolvedMentions(prose: string, ctx: PassContext): readonly { id: CharacterId; offset: number }[] {
  return scanMentions(prose, ctx.registry, ctx.knownSurfaces, { chapter: ctx.chapter as never }, ctx.maxSurfaceWords)
    .flatMap((m) =>
      m.kind === 'KNOWN' && m.resolution.kind === 'RESOLVED_UNIQUE'
        ? [{ id: m.resolution.id, offset: m.offset }]
        : [],
    );
}

/* ───────────────────────────── P1 — PERSONNAGES ──────────────────────────────────── */
const MOVE_RE = /\b(?:alla|arriva|entra|monta|descendit|retourna|courut)\s+(?:à|au|aux|dans|vers|chez)\s+([\p{Lu}][\p{L}'’-]+(?:[ -][\p{Lu}][\p{L}'’-]+)*)/u;
const DEATH_RE = /\b(?:mourut|était\s+morte?|s['’]éteignit|fut\s+retrouvée?\s+morte?)\b/u;

const P1_CHARACTERS: ExtractionPass = {
  id: pid('P1_CHARACTERS_POV_VOICE_STATE'),
  mode: 'CALC',
  description: 'mouvements et morts des entités résolues (fenêtre locale post-mention)',
  run(prose, ctx) {
    const norm = String(normalizeText(prose));
    const rawNFC = prose.normalize('NFC');
    const out: ExtractedEvent[] = [];
    for (const m of resolvedMentions(prose, ctx)) {
      const windowRaw = rawNFC.slice(m.offset, m.offset + 90); // fenêtre locale — pas de regex globale
      const move = MOVE_RE.exec(windowRaw);
      if (move?.[1] !== undefined) {
        out.push({
          payload: { kind: 'CHARACTER_MOVE', chapter: ctx.chapter, id: ctx.storyIdOf(m.id), location: move[1] },
          confidence: HIGH,
          source: this.id,
          span: { offset: m.offset, excerpt: excerptAt(norm, m.offset) },
        });
      }
      if (DEATH_RE.test(String(normalizeText(windowRaw)))) {
        out.push({
          payload: { kind: 'CHARACTER_STATUS', chapter: ctx.chapter, id: ctx.storyIdOf(m.id), status: 'dead' },
          confidence: HIGH,
          source: this.id,
          span: { offset: m.offset, excerpt: excerptAt(norm, m.offset) },
        });
      }
    }
    return out;
  },
};

/* ───────────────────────────── P3 — TIMELINE ─────────────────────────────────────── */
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
const ELAPSED_RE = /\b(?:le\s+lendemain|(?:deux|trois|quatre|cinq|six|sept)\s+jours?\s+plus\s+tard|une\s+semaine\s+plus\s+tard)\b/gu;

const P3_TIMELINE: ExtractionPass = {
  id: pid('P3_TIMELINE_DATES_WEATHER_DURATION'),
  mode: 'CALC',
  description: 'jours de semaine + durées écoulées → TemporalClaim',
  run(prose, ctx) {
    const norm = String(normalizeText(prose));
    const out: ExtractedEvent[] = [];
    for (const day of WEEKDAYS) {
      let idx = norm.indexOf(day);
      while (idx >= 0) {
        const claim: TemporalClaim = { kind: 'TEMPORAL_CLAIM', chapter: ctx.chapter, marker: day, category: 'weekday' };
        out.push({ payload: claim, confidence: HIGH, source: this.id, span: { offset: idx, excerpt: excerptAt(norm, idx) } });
        idx = norm.indexOf(day, idx + 1);
      }
    }
    for (const m of norm.matchAll(ELAPSED_RE)) {
      const claim: TemporalClaim = { kind: 'TEMPORAL_CLAIM', chapter: ctx.chapter, marker: m[0], category: 'elapsed' };
      out.push({ payload: claim, confidence: LOOSE, source: this.id, span: { offset: m.index ?? 0, excerpt: excerptAt(norm, m.index ?? 0) } });
    }
    return out.sort((a, b) => a.span.offset - b.span.offset);
  },
};

/* ───────────────────────────── P6 — GRAINES ──────────────────────────────────────── */
const P6_SEEDS: ExtractionPass = {
  id: pid('P6_PLOT_SEEDS_PAYOFFS_DEBTS'),
  mode: 'CALC',
  description: 'lexique de graines du plan retrouvé en prose → SEED_* candidats',
  run(prose, ctx) {
    const norm = String(normalizeText(prose));
    const out: ExtractedEvent[] = [];
    for (const [seedId, keywords] of ctx.seedLexicon) {
      const hits = keywords.filter((k) => norm.includes(k.normalize('NFC').toLowerCase()));
      if (hits.length === 0) continue;
      const strong = hits.length >= 2;
      const at = norm.indexOf(hits[0]?.normalize('NFC').toLowerCase() ?? '');
      out.push({
        payload: { kind: 'SEED_REINFORCE', chapter: ctx.chapter, seed_id: seedId },
        confidence: strong ? HIGH : LOOSE, // 1 seul mot-clé = bande UNCERTAIN
        source: this.id,
        span: { offset: Math.max(0, at), excerpt: excerptAt(norm, Math.max(0, at)) },
      });
    }
    return out;
  },
};

/* ───────────────────────────── P4 — ÉPISTÉMIQUE ──────────────────────────────────── */
const REVEAL_RE = /\b(?:révéla|avoua|confia|apprit\s+à\s+tous)\s+(?:que\s+)?([^.!?]{4,80})/u;

const P4_EPISTEMIC: ExtractionPass = {
  id: pid('P4_TRUTH_BELIEF_RUMOR_REVELATION'),
  mode: 'CALC',
  description: '« X révéla S » → EpistemicClaim (le diff vérifie contre knows())',
  run(prose, ctx) {
    const norm = String(normalizeText(prose));
    const out: ExtractedEvent[] = [];
    for (const m of resolvedMentions(prose, ctx)) {
      const window = norm.slice(m.offset, m.offset + 120);
      const rev = REVEAL_RE.exec(window);
      if (rev?.[1] !== undefined) {
        const claim: EpistemicClaim = {
          kind: 'REVEAL_CLAIM',
          chapter: ctx.chapter,
          actorId: m.id,
          subject: rev[1].trim(),
        };
        out.push({ payload: claim, confidence: HIGH, source: this.id, span: { offset: m.offset, excerpt: excerptAt(norm, m.offset) } });
      }
    }
    return out;
  },
};

/* ───────────────────────────── REGISTRE + SÉLECTION ──────────────────────────────── */
const ALL_PASSES: readonly ExtractionPass[] = [P1_CHARACTERS, P3_TIMELINE, P6_SEEDS, P4_EPISTEMIC];

const SELECTION: Readonly<Record<ChapterKind, readonly string[]>> = {
  action: ['P1_CHARACTERS_POV_VOICE_STATE', 'P3_TIMELINE_DATES_WEATHER_DURATION'],
  revelation: ['P4_TRUTH_BELIEF_RUMOR_REVELATION', 'P6_PLOT_SEEDS_PAYOFFS_DEBTS'],
  atmospheric: ['P3_TIMELINE_DATES_WEATHER_DURATION'],
  finale: ['P1_CHARACTERS_POV_VOICE_STATE', 'P3_TIMELINE_DATES_WEATHER_DURATION', 'P4_TRUTH_BELIEF_RUMOR_REVELATION', 'P6_PLOT_SEEDS_PAYOFFS_DEBTS'],
  standard: ['P1_CHARACTERS_POV_VOICE_STATE', 'P3_TIMELINE_DATES_WEATHER_DURATION', 'P6_PLOT_SEEDS_PAYOFFS_DEBTS', 'P4_TRUTH_BELIEF_RUMOR_REVELATION'],
};

export function buildPassRegistry(extra: readonly ExtractionPass[] = []): PassRegistry {
  const passes = [...ALL_PASSES, ...extra]; // configurable — le nombre n'est PAS scellé
  return {
    passes,
    selectFor(kind: ChapterKind): readonly ExtractionPass[] {
      const wanted = SELECTION[kind];
      return passes.filter((p) => wanted.includes(String(p.id)) || extra.includes(p));
    },
  };
}

/** Exécution déterministe : passes dans l'ordre du registre, événements ordonnés par offset. */
export function runExtraction(
  prose: string,
  kind: ChapterKind,
  registry: PassRegistry,
  ctx: PassContext,
): readonly ExtractedEvent[] {
  return registry
    .selectFor(kind)
    .flatMap((p) => p.run(prose, ctx))
    .sort((a, b) => a.span.offset - b.span.offset || compareStrings(String(a.source), String(b.source)));
}
