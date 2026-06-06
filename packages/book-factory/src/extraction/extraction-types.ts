/**
 * OMEGA Book-Factory — C4 EXTRACTION — TYPES (BF-08)
 * ADR §11 · BF-03 DOUBLE_BIBLE_DIFF · « les passes produisent des événements CANDIDATS ».
 *
 * INVARIANTS : INV-XTR-001 (un événement extrait n'est JAMAIS écrit au canon sans
 * validation) · INV-XTR-002 (toute sortie d'instrument porte confiance + provenance)
 * · INV-XTR-004 (FORBID-011 : confiance basse ⇒ jamais gate dur).
 *
 * MÉCANISME : une passe = instrument déclaré CALC ou LLM_CALIBRATED. V1 ne câble QUE
 * des passes CALC (heuristiques FR déterministes) ; le mode LLM_CALIBRATED existe au
 * niveau du TYPE mais aucune passe LLM n'est enregistrée (EMP-19 : un extracteur LLM
 * est un instrument à calibrer — couple modèle+prompt — AVANT toute mesure ; statut
 * NOT_WIRED documenté, pas simulé).
 * LIMITES : les heuristiques CALC ont un rappel partiel ASSUMÉ (elles attrapent les
 * formulations canoniques du catalogue de fautes) — la couverture totale viendra de
 * l'instrument calibré ; chaque capture porte sa confiance pour que le diff borne
 * l'autorité de la passe (le capteur ne devient pas tyran).
 */

import type { Brand, CharacterId, Confidence01 } from '../identity/identity-types.js';
import type { CharacterRegistry } from '../identity/character-registry.js';
import type { NarrativeEvent } from '../story-state.js';

export type PassId = Brand<string, 'PassId'>;
export type ChapterKind = 'action' | 'revelation' | 'atmospheric' | 'finale' | 'standard';
export type PassMode = 'CALC' | 'LLM_CALIBRATED';

/** Revendication épistémique extraite (« X révèle S ») — vérifiée au diff contre knows(). */
export interface EpistemicClaim {
  readonly kind: 'REVEAL_CLAIM';
  readonly chapter: number;
  readonly actorId: CharacterId;
  readonly subject: string;
}

/** Marqueur temporel extrait (« mardi », « trois jours plus tard ») — confronté au réel. */
export interface TemporalClaim {
  readonly kind: 'TEMPORAL_CLAIM';
  readonly chapter: number;
  readonly marker: string; // normalisé (ex: 'mardi')
  readonly category: 'weekday' | 'elapsed';
}

export type ExtractedPayload = NarrativeEvent | EpistemicClaim | TemporalClaim;

/** Événement CANDIDAT — provenance + confiance OBLIGATOIRES (INV-XTR-002). */
export interface ExtractedEvent {
  readonly payload: ExtractedPayload;
  readonly confidence: Confidence01;
  readonly source: PassId;
  readonly span: { readonly offset: number; readonly excerpt: string }; // traçabilité prose
}

export interface PassContext {
  readonly chapter: number;
  readonly registry: CharacterRegistry;
  readonly knownSurfaces: ReadonlySet<string>;
  readonly maxSurfaceWords: number;
  /** descripteurs de graines du plan (seed_id → mots-clés) pour P6. */
  readonly seedLexicon: ReadonlyMap<string, readonly string[]>;
  /** id story-state d'un personnage (même pont que C2). */
  readonly storyIdOf: (id: CharacterId) => string;
}

export interface ExtractionPass {
  readonly id: PassId;
  readonly mode: PassMode;
  readonly description: string;
  run(rawProse: string, ctx: PassContext): readonly ExtractedEvent[];
}

/** Sélection dynamique ADR §11.5 — le NOMBRE de passes n'est pas scellé. */
export interface PassRegistry {
  readonly passes: readonly ExtractionPass[];
  selectFor(kind: ChapterKind): readonly ExtractionPass[];
}
