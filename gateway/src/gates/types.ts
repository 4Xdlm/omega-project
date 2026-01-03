/**
 * OMEGA GATES — Types Foundation
 * Module: gateway/src/gates/types.ts
 * Phase: 7A — TRUTH_GATE + CANON
 * Standard: NASA-Grade L4
 * 
 * @description Types fondamentaux pour le système de gates
 */

// ═══════════════════════════════════════════════════════════════════════
// VERDICT TYPES
// ═══════════════════════════════════════════════════════════════════════

export type VerdictStatus = "PASS" | "FAIL" | "WARN" | "SKIP";

export interface GateVerdict {
  /** Statut du verdict */
  status: VerdictStatus;
  /** Gate qui a produit le verdict */
  gate: string;
  /** Raison du verdict (obligatoire si FAIL) */
  reason: string;
  /** Timestamp ISO */
  timestamp: string;
  /** Détails additionnels */
  details?: Record<string, unknown>;
  /** Violations détectées */
  violations: Violation[];
}

// ═══════════════════════════════════════════════════════════════════════
// VIOLATION TYPES
// ═══════════════════════════════════════════════════════════════════════

export type ViolationType = 
  | "CONTRADICTION"      // Fait contredit un fait établi
  | "CAUSALITY_BREAK"    // Effet sans cause
  | "TIMELINE_ERROR"     // Erreur chronologique
  | "CHARACTER_INCONSISTENCY"  // Personnage agit hors caractère
  | "PHYSICS_VIOLATION"  // Règles du monde violées
  | "DEUS_EX_MACHINA"    // Solution miracle non méritée
  | "PLOT_ARMOR"         // Immunité narrative injustifiée
  | "UNKNOWN_REFERENCE"  // Référence à élément non établi
  | "CANON_CONFLICT";    // Conflit avec le canon établi

export interface Violation {
  /** Type de violation */
  type: ViolationType;
  /** Sévérité (1-10, 10 = bloquant) */
  severity: number;
  /** Description de la violation */
  description: string;
  /** Élément source (ce qui cause la violation) */
  source: string;
  /** Élément cible (ce qui est violé) */
  target?: string;
  /** Suggestion de correction */
  suggestion?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CANON TYPES
// ═══════════════════════════════════════════════════════════════════════

export type FactType = 
  | "CHARACTER"    // Fait sur un personnage
  | "LOCATION"     // Fait sur un lieu
  | "EVENT"        // Événement établi
  | "RULE"         // Règle du monde
  | "RELATIONSHIP" // Relation entre entités
  | "STATE";       // État actuel d'une entité

export interface CanonFact {
  /** ID unique du fait */
  id: string;
  /** Type de fait */
  type: FactType;
  /** Sujet du fait */
  subject: string;
  /** Prédicat (ce qui est affirmé) */
  predicate: string;
  /** Objet (cible de l'affirmation) */
  object?: string;
  /** Chapitre/source où établi */
  establishedAt: string;
  /** Timestamp d'établissement */
  establishedTimestamp: string;
  /** Confiance (0-1) */
  confidence: number;
  /** Hash de preuve */
  proofHash: string;
}

export interface CanonState {
  /** Version du canon */
  version: string;
  /** Liste des faits établis */
  facts: CanonFact[];
  /** Hash Merkle root */
  rootHash: string;
  /** Timestamp dernière mise à jour */
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════
// GATE INPUT/OUTPUT
// ═══════════════════════════════════════════════════════════════════════

export interface TruthGateInput {
  /** Texte à valider */
  text: string;
  /** Contexte narratif actuel */
  context?: string;
  /** Canon actuel (faits établis) */
  canon: CanonState;
  /** Mode strict (FAIL au moindre doute) */
  strictMode: boolean;
  /** Seuil de sévérité pour FAIL (default: 7) */
  severityThreshold: number;
}

export interface TruthGateOutput {
  /** Verdict final */
  verdict: GateVerdict;
  /** Nouveaux faits extraits (si PASS) */
  extractedFacts: CanonFact[];
  /** Canon mis à jour (si PASS) */
  updatedCanon?: CanonState;
  /** Durée de traitement (ms) */
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════
// GATE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

export interface Gate<TInput, TOutput> {
  /** Nom du gate */
  readonly name: string;
  /** Version du gate */
  readonly version: string;
  /** Valide l'input (synchrone, pure) */
  validate(input: TInput): boolean;
  /** Exécute le gate */
  execute(input: TInput): Promise<TOutput>;
}

export type TruthGate = Gate<TruthGateInput, TruthGateOutput>;
