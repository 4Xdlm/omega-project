/**
 * OMEGA Book-Factory — C10 PRODUCT_MODE_ROUTER (BF-08) — BF-09 incarné.
 *
 * FOUND_EXISTING : CONCEPT-PRODUCT-MODE-ROUTER-001 (BF-09 RATIFIÉ 2026-06-06,
 * tribunal 2/2 ; ancêtre VISION §7 « LES 3 MODES »). LOI : OMEGA ne travaille
 * JAMAIS sans mode produit déclaré — les lois de fonctionnement de chaque mode
 * sont imposées PAR LE CODE (ex. « le GPS ne décide jamais »), pas par la
 * discipline de l'IA (mandat Gemini).
 *
 * MÉCANISME : un OmegaSession ne s'obtient que par setMode() ; chaque mode
 * porte ses lois actives (vérifiables par les modules consommateurs), son
 * EXECUTION_MODE par défaut (DEC-20260121-001 organe 7) et ses capacités.
 * Un travail demandé hors capacités du mode = REFUS TYPÉ (jamais silencieux).
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

export type ProductMode =
  | 'AUTONOMOUS_BOOK'
  | 'COAUTHOR_GPS'
  | 'REWRITE_DOCTOR'
  | 'MYCELIUM_DNA'
  | 'STYLE_CONTINUATION'
  | 'MIXER_CONTROL';

export type ExecutionTier = 'OFF' | 'SEMI_OFF' | 'BOOST';

export type ModeLaw =
  | 'BF-07_BLIND_SCRIBE'
  | 'BF-11_USER_SOVEREIGN' // le GPS/coauteur ne décide JAMAIS
  | 'BF-12_PRESERVE_INTENT' // le doctor conserve l'intention, diff obligatoire
  | 'BF-13_DETERMINISTIC_DNA' // même œuvre ⇒ même hash
  | 'BF-14_RIGHTS_GATE' // pas de génération sans droits (machine-level)
  | 'BF-15_NO_GOODHART_SELECTION_ONLY' // potards ⇒ sélection, jamais coaching
  | 'N3_FORBIDDEN'; // coaching esthétique interdit partout

export type Capability =
  | 'GENERATE_PROSE'
  | 'REPAIR_TEXT'
  | 'AUDIT_TEXT'
  | 'EXPORT_GENOME'
  | 'SUGGEST_TRAJECTORIES'
  | 'RERANK_SELECTION';

interface ModeSpec {
  readonly laws: readonly ModeLaw[];
  readonly capabilities: readonly Capability[];
  readonly defaultTier: ExecutionTier;
}

/** La table des modes — chaque entrée cite sa généalogie (Concept Ledger). */
export const MODE_SPECS: Readonly<Record<ProductMode, ModeSpec>> = {
  AUTONOMOUS_BOOK: {
    laws: ['BF-07_BLIND_SCRIBE', 'N3_FORBIDDEN', 'BF-15_NO_GOODHART_SELECTION_ONLY'],
    capabilities: ['GENERATE_PROSE', 'AUDIT_TEXT', 'RERANK_SELECTION'],
    defaultTier: 'BOOST',
  },
  COAUTHOR_GPS: {
    laws: ['BF-11_USER_SOVEREIGN', 'N3_FORBIDDEN'], // « ne décide JAMAIS » (VISION:279)
    capabilities: ['AUDIT_TEXT', 'SUGGEST_TRAJECTORIES'],
    defaultTier: 'SEMI_OFF',
  },
  REWRITE_DOCTOR: {
    laws: ['BF-12_PRESERVE_INTENT', 'N3_FORBIDDEN'],
    capabilities: ['AUDIT_TEXT', 'REPAIR_TEXT'],
    defaultTier: 'SEMI_OFF', // GO_B : human-in-the-loop
  },
  MYCELIUM_DNA: {
    laws: ['BF-13_DETERMINISTIC_DNA'],
    capabilities: ['EXPORT_GENOME', 'AUDIT_TEXT'],
    defaultTier: 'OFF', // CALC pur
  },
  STYLE_CONTINUATION: {
    laws: ['BF-14_RIGHTS_GATE', 'BF-07_BLIND_SCRIBE', 'N3_FORBIDDEN'],
    capabilities: ['GENERATE_PROSE', 'AUDIT_TEXT'],
    defaultTier: 'BOOST',
  },
  MIXER_CONTROL: {
    laws: ['BF-15_NO_GOODHART_SELECTION_ONLY', 'N3_FORBIDDEN'],
    capabilities: ['RERANK_SELECTION', 'AUDIT_TEXT'],
    defaultTier: 'OFF', // le mixer ne génère rien : il pondère la sélection
  },
};

export interface OmegaSession {
  readonly mode: ProductMode;
  readonly laws: readonly ModeLaw[];
  readonly tier: ExecutionTier;
  /** Vérification de capacité — un refus est TYPÉ, jamais silencieux (BF-09). */
  readonly can: (cap: Capability) => boolean;
  readonly requires: (law: ModeLaw) => boolean;
}

export type RouterErrorCode = 'NO_MODE_DECLARED' | 'UNKNOWN_MODE' | 'CAPABILITY_DENIED';
export interface RouterError { readonly code: RouterErrorCode; readonly detail: string; }

/** L'UNIQUE porte d'entrée : pas de session sans mode (BF-09). */
export function setMode(mode: ProductMode, tier?: ExecutionTier): Result<OmegaSession, RouterError> {
  const spec = MODE_SPECS[mode];
  // (typage exhaustif : `mode` est l'union — spec ne peut pas être undefined ;
  //  gardé pour les appels depuis JS non typé)
  if ((spec as ModeSpec | undefined) === undefined) {
    return err({ code: 'UNKNOWN_MODE', detail: String(mode) });
  }
  const session: OmegaSession = {
    mode,
    laws: spec.laws,
    tier: tier ?? spec.defaultTier,
    can: (cap) => spec.capabilities.includes(cap),
    requires: (law) => spec.laws.includes(law),
  };
  return ok(session);
}

/** Garde d'exécution : à appeler par tout module avant un travail de capacité C. */
export function assertCapability(session: OmegaSession | undefined, cap: Capability): Result<true, RouterError> {
  if (session === undefined) {
    return err({ code: 'NO_MODE_DECLARED', detail: `capability « ${cap} » demandée sans mode déclaré (BF-09)` });
  }
  if (!session.can(cap)) {
    return err({ code: 'CAPABILITY_DENIED', detail: `mode ${session.mode} n'autorise pas « ${cap} » — lois actives : ${session.laws.join(', ')}` });
  }
  return ok(true);
}
