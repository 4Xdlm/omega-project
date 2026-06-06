/**
 * OMEGA Book-Factory — C14 COAUTHOR GPS — RADAR (BF-08, BF-11 par construction).
 *
 * FOUND_EXISTING : CONCEPT-COAUTHOR-GPS-001 — VISION §6 (DÉCISION) : le GPS
 * montre « où tu es, où tu vas, les chemins possibles, les dangers » et
 * **« ne décide JAMAIS »** (VISION:279) ; organe NARRATIVE_FLOW_CONTROLLER
 * (DEC-20260121-001:48 : branches mourantes/vivantes, relances).
 *
 * Le RADAR = la moitié « où tu es / les dangers », construite à 100% sur les
 * instruments EXISTANTS (zéro doublon) : C9 (phrase/chapitre), scanner de
 * présence (qui est en scène), knob features (météo émotionnelle mesurée),
 * seeds vieillissants (graine plantée jamais rappelée depuis N chapitres =
 * branche mourante — le concept NARRATIVE_FLOW incarné en CALC).
 *
 * BF-11 PAR CONSTRUCTION : ce module ne produit AUCUNE prose et n'expose
 * aucune préférence — uniquement des mesures et des listes. Le router (C10)
 * refuse de toute façon GENERATE_PROSE au mode COAUTHOR_GPS (capacité typée).
 */

import { scanSentencePhysics } from '../coherence/sentence-physics.js';
import { scanChapterCoherence } from '../coherence/chapter-coherence.js';
import { measureKnobFeatures } from '../mixer/knob-bindings.js';
import type { KnobFeatures } from '../mixer/knob-bindings.js';
import { err, ok, compareStrings } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export interface GpsCharacterInScene {
  readonly name: string;
  readonly lastSeenSentence: number;
  readonly speaking: boolean;
}

export interface AgingSeed {
  readonly seed: string;
  readonly plantedChapter: number;
  readonly lastRecallChapter: number;
  readonly chaptersSinceRecall: number;
}

export interface GpsDanger {
  readonly kind: 'COHERENCE_SIGNAL' | 'DYING_THREAD' | 'IDENTITY_RISK';
  readonly detail: string;
}

/** « Où tu es » — l'état mesuré du texte en cours d'écriture. */
export interface GpsPosition {
  readonly chapter: number;
  readonly words: number;
  readonly charactersInScene: readonly GpsCharacterInScene[];
  /** Météo émotionnelle MESURÉE (les 5 axes potards — mêmes instruments). */
  readonly emotionalWeather: KnobFeatures;
  readonly dangers: readonly GpsDanger[];
  readonly agingSeeds: readonly AgingSeed[];
}

export interface GpsHistoryChapter { readonly chapter: number; readonly prose: string; }

export interface RadarInput {
  /** Le texte que l'écrivain vient de taper (chapitre courant, possiblement partiel). */
  readonly currentText: string;
  readonly currentChapter: number;
  /** Chapitres précédents (pour le vieillissement des graines). */
  readonly history: readonly GpsHistoryChapter[];
  /** Cast connu (registry/plan) — surfaces exactes. */
  readonly knownCharacters: readonly string[];
  /** Graines du plan à surveiller. */
  readonly seeds: readonly string[];
  /** Seuil de branche mourante (chapitres sans rappel). EXPERIMENTAL_DEFAULT. */
  readonly dyingThreadThreshold?: number;
}

export type RadarError = { readonly code: 'EMPTY_TEXT'; readonly detail: string };

const SPEAK_NEAR_RE = (name: string): RegExp =>
  new RegExp(`(?:dit|lança|murmura|souffla|répondit|répliqua|demanda|cria|reprit)\\s+${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!\\p{L})`, 'u');

/** Mesure la position GPS. Pur, déterministe — MESURE, ne suggère rien. */
export function radar(input: RadarInput): Result<GpsPosition, RadarError> {
  if (input.currentText.trim().length === 0) return err({ code: 'EMPTY_TEXT', detail: 'rien à mesurer' });
  const threshold = input.dyingThreadThreshold ?? 5;
  const text = input.currentText.normalize('NFC');
  const sentences = text.split(/(?<=[.!?…])\s+/u).filter((s) => s.trim().length > 0);

  /* ── Qui est en scène ─────────────────────────────────────────────────── */
  const charactersInScene: GpsCharacterInScene[] = [];
  for (const name of [...input.knownCharacters].sort(compareStrings)) {
    const re = new RegExp(`(?<!\\p{L})${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!['’\\p{L}])`, 'u');
    let lastSeen = -1;
    for (let i = sentences.length - 1; i >= 0; i--) {
      const s = sentences[i];
      if (s !== undefined && re.test(s)) { lastSeen = i; break; }
    }
    if (lastSeen >= 0) {
      charactersInScene.push({ name, lastSeenSentence: lastSeen, speaking: SPEAK_NEAR_RE(name).test(text) });
    }
  }

  /* ── Dangers : signaux C9 sur le texte courant ────────────────────────── */
  const dangers: GpsDanger[] = [];
  const phys = scanSentencePhysics(text, input.currentChapter);
  if (phys.ok) {
    for (const s of phys.value) dangers.push({ kind: 'COHERENCE_SIGNAL', detail: `${s.kind} : « ${s.locus.excerpt.slice(0, 70)} »` });
  }
  const chap = scanChapterCoherence(text, input.currentChapter);
  if (chap.ok) {
    for (const s of chap.value) dangers.push({ kind: 'COHERENCE_SIGNAL', detail: `${s.kind} : ${s.detail.slice(0, 90)}` });
  }

  /* ── Graines vieillissantes (branches mourantes — NARRATIVE_FLOW) ─────── */
  const agingSeeds: AgingSeed[] = [];
  for (const seed of [...input.seeds].sort(compareStrings)) {
    const re = new RegExp(`(?<!\\p{L})${seed.toLowerCase()}(?!\\p{L})`, 'u');
    let planted = -1;
    let lastRecall = -1;
    for (const h of input.history) {
      if (re.test(h.prose.normalize('NFC').toLowerCase())) {
        if (planted < 0) planted = h.chapter;
        lastRecall = h.chapter;
      }
    }
    if (re.test(text.toLowerCase())) lastRecall = input.currentChapter;
    if (planted >= 0) {
      const since = input.currentChapter - lastRecall;
      if (since >= threshold) {
        agingSeeds.push({ seed, plantedChapter: planted, lastRecallChapter: lastRecall, chaptersSinceRecall: since });
        dangers.push({ kind: 'DYING_THREAD', detail: `graine « ${seed} » sans rappel depuis ${since} chapitres (plantée ch.${planted})` });
      }
    }
  }

  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  return ok({
    chapter: input.currentChapter,
    words,
    charactersInScene,
    emotionalWeather: measureKnobFeatures(text),
    dangers,
    agingSeeds,
  });
}
