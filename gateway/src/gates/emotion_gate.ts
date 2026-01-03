/**
 * OMEGA EMOTION_GATE — Validation Émotionnelle
 * Module: gateway/src/gates/emotion_gate.ts
 * Phase: 7C — NASA-Grade L4
 * 
 * @description Gate qui évalue la cohérence émotionnelle.
 *              SOUMIS au duo CANON + TRUTH — ne modifie JAMAIS le réel.
 * 
 * @invariant INV-EMO-01: Ne crée jamais de fait (read-only)
 * @invariant INV-EMO-02: Ne contredit jamais le canon
 * @invariant INV-EMO-03: Cohérence émotionnelle obligatoire
 * @invariant INV-EMO-04: Dette émotionnelle traçable
 * @invariant INV-EMO-05: Arc cassé = WARN ou FAIL selon sévérité
 */

import { GateVerdict, VerdictStatus, Violation, CanonState, CanonFact } from "./types";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const GATE_NAME = "EMOTION_GATE";
const GATE_VERSION = "1.0.0";

// ═══════════════════════════════════════════════════════════════════════
// EMOTION TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Émotions de base (Plutchik) */
export type BaseEmotion =
  | "joy"       // Joie
  | "trust"     // Confiance
  | "fear"      // Peur
  | "surprise"  // Surprise
  | "sadness"   // Tristesse
  | "disgust"   // Dégoût
  | "anger"     // Colère
  | "anticipation"; // Anticipation

/** État émotionnel d'un personnage */
export interface EmotionalState {
  /** ID du personnage */
  characterId: string;
  /** Nom du personnage */
  characterName: string;
  /** Émotion dominante */
  dominantEmotion: BaseEmotion;
  /** Intensité (0-1) */
  intensity: number;
  /** Émotions secondaires */
  secondaryEmotions: Array<{ emotion: BaseEmotion; intensity: number }>;
  /** Chapitre/source */
  establishedAt: string;
  /** Timestamp */
  timestamp: string;
}

/** Arc émotionnel */
export interface EmotionalArc {
  /** ID du personnage */
  characterId: string;
  /** Séquence d'états émotionnels */
  states: EmotionalState[];
  /** Dette émotionnelle accumulée */
  emotionalDebt: number;
  /** Arc valide ? */
  isValid: boolean;
  /** Raison si invalide */
  invalidReason?: string;
}

/** Violation émotionnelle (étend Violation avec champs additionnels) */
export interface EmotionViolation extends Violation {
  characterId?: string;
  previousState?: EmotionalState;
  currentState?: EmotionalState;
}

// ═══════════════════════════════════════════════════════════════════════
// INPUT/OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface EmotionGateInput {
  /** Texte à analyser */
  text: string;
  /** Personnage concerné */
  characterId: string;
  characterName: string;
  /** État émotionnel détecté dans le texte */
  detectedState: {
    emotion: BaseEmotion;
    intensity: number;
  };
  /** Arc émotionnel existant */
  existingArc: EmotionalArc | null;
  /** Canon (pour vérification) */
  canon: CanonState;
  /** Seuil de dette acceptable (default: 0.7) */
  debtThreshold: number;
  /** Mode strict */
  strictMode: boolean;
}

export interface EmotionGateOutput {
  /** Verdict */
  verdict: GateVerdict;
  /** Nouvel état émotionnel (si valide) */
  newState: EmotionalState | null;
  /** Arc mis à jour (si valide) */
  updatedArc: EmotionalArc | null;
  /** Dette émotionnelle actuelle */
  currentDebt: number;
  /** Temps de traitement */
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════
// EMOTION GATE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

export interface EmotionGate {
  readonly name: string;
  readonly version: string;
  validate(input: EmotionGateInput): boolean;
  execute(input: EmotionGateInput): Promise<EmotionGateOutput>;
}

// ═══════════════════════════════════════════════════════════════════════
// EMOTION COMPATIBILITY MATRIX
// ═══════════════════════════════════════════════════════════════════════

/** Transitions émotionnelles naturelles (faible coût) */
const NATURAL_TRANSITIONS: Record<BaseEmotion, BaseEmotion[]> = {
  joy: ["trust", "anticipation", "surprise"],
  trust: ["joy", "anticipation", "fear"],
  fear: ["surprise", "sadness", "trust"],
  surprise: ["fear", "joy", "anticipation"],
  sadness: ["fear", "disgust", "anger"],
  disgust: ["anger", "sadness", "fear"],
  anger: ["disgust", "anticipation", "sadness"],
  anticipation: ["joy", "anger", "trust"],
};

/** Opposés émotionnels (transition coûteuse) */
const EMOTIONAL_OPPOSITES: Record<BaseEmotion, BaseEmotion> = {
  joy: "sadness",
  trust: "disgust",
  fear: "anger",
  surprise: "anticipation",
  sadness: "joy",
  disgust: "trust",
  anger: "fear",
  anticipation: "surprise",
};

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calcule le coût de transition entre deux émotions
 * 0 = même émotion, 0.3 = naturelle, 0.6 = neutre, 1.0 = opposée
 */
function computeTransitionCost(from: BaseEmotion, to: BaseEmotion): number {
  if (from === to) return 0;
  if (NATURAL_TRANSITIONS[from].includes(to)) return 0.3;
  if (EMOTIONAL_OPPOSITES[from] === to) return 1.0;
  return 0.6;
}

/**
 * Vérifie si la transition est hors caractère
 * INV-EMO-03: Cohérence émotionnelle obligatoire
 */
function checkOutOfCharacter(
  previousState: EmotionalState | null,
  newEmotion: BaseEmotion,
  newIntensity: number
): EmotionViolation | null {
  if (!previousState) return null;
  
  const cost = computeTransitionCost(previousState.dominantEmotion, newEmotion);
  
  // Transition opposée directe avec haute intensité = suspect
  if (cost >= 1.0 && newIntensity > 0.7 && previousState.intensity > 0.5) {
    return {
      type: "OUT_OF_CHARACTER",
      severity: 7,
      description: `Transition brutale de ${previousState.dominantEmotion} (${previousState.intensity.toFixed(2)}) vers ${newEmotion} (${newIntensity.toFixed(2)})`,
      source: `${previousState.characterName}`,
      suggestion: "Ajouter une transition intermédiaire ou justifier le changement",
      characterId: previousState.characterId,
      previousState,
    };
  }
  
  return null;
}

/**
 * Vérifie si l'intensité est justifiée
 * INV-EMO-03: Cohérence émotionnelle
 */
function checkIntensityJustified(
  previousState: EmotionalState | null,
  newIntensity: number,
  text: string
): EmotionViolation | null {
  // Saut d'intensité de plus de 0.5 sans mot déclencheur
  if (previousState) {
    const intensityJump = Math.abs(newIntensity - previousState.intensity);
    
    // Mots qui justifient un saut d'intensité
    const triggerWords = [
      "soudain", "brusquement", "tout à coup", "subitement",
      "suddenly", "abruptly", "immediately",
      "choc", "shock", "trauma", "révélation", "revelation"
    ];
    
    const hasJustification = triggerWords.some(w => 
      text.toLowerCase().includes(w.toLowerCase())
    );
    
    if (intensityJump > 0.5 && !hasJustification) {
      return {
        type: "INTENSITY_UNJUSTIFIED",
        severity: 5,
        description: `Saut d'intensité de ${intensityJump.toFixed(2)} sans justification narrative`,
        source: text.substring(0, 50),
        suggestion: "Justifier le changement d'intensité ou le rendre plus progressif",
        previousState,
      };
    }
  }
  
  return null;
}

/**
 * Vérifie la transition manquante
 */
function checkMissingTransition(
  previousState: EmotionalState | null,
  newEmotion: BaseEmotion
): EmotionViolation | null {
  if (!previousState) return null;
  
  const cost = computeTransitionCost(previousState.dominantEmotion, newEmotion);
  
  // Opposés directs sans intermédiaire
  if (cost >= 1.0) {
    return {
      type: "MISSING_TRANSITION",
      severity: 4,
      description: `Transition directe de ${previousState.dominantEmotion} vers ${newEmotion} (opposés)`,
      source: previousState.characterName,
      suggestion: `Considérer une transition via ${NATURAL_TRANSITIONS[previousState.dominantEmotion].join(" ou ")}`,
      previousState,
    };
  }
  
  return null;
}

/**
 * Calcule la dette émotionnelle
 * INV-EMO-04: Dette traçable
 */
function computeEmotionalDebt(arc: EmotionalArc, newCost: number): number {
  // Dette = accumulation des coûts de transition non résolus
  // Se dissipe naturellement de 0.1 par état
  const decay = 0.1;
  const currentDebt = Math.max(0, arc.emotionalDebt - decay);
  return Math.min(1.0, currentDebt + newCost);
}

/**
 * Vérifie si l'émotion contredit le canon
 * INV-EMO-02: Ne contredit jamais le canon
 */
function checkCanonContradiction(
  characterId: string,
  emotion: BaseEmotion,
  canon: CanonState
): EmotionViolation | null {
  // Chercher des faits établis sur l'état émotionnel du personnage
  const characterFacts = canon.facts.filter(
    f => f.subject.toLowerCase() === characterId.toLowerCase() &&
         f.type === "STATE"
  );
  
  // Vérifier si un fait établit un état émotionnel incompatible
  for (const fact of characterFacts) {
    const predLower = fact.predicate.toLowerCase();
    
    // Mapping prédicats -> émotions (avec variations)
    const emotionMappings: Record<string, BaseEmotion[]> = {
      "heureux": ["joy"],
      "heureuse": ["joy"],
      "happy": ["joy"],
      "joyeux": ["joy"],
      "joyeuse": ["joy"],
      "triste": ["sadness"],
      "sad": ["sadness"],
      "malheureux": ["sadness"],
      "malheureuse": ["sadness"],
      "en colère": ["anger"],
      "angry": ["anger"],
      "furieux": ["anger"],
      "furieuse": ["anger"],
      "effrayé": ["fear"],
      "effrayée": ["fear"],
      "scared": ["fear"],
      "afraid": ["fear"],
      "apeuré": ["fear"],
      "apeurée": ["fear"],
      "dégoûté": ["disgust"],
      "dégoûtée": ["disgust"],
      "disgusted": ["disgust"],
    };
    
    for (const [keyword, emotions] of Object.entries(emotionMappings)) {
      if (predLower.includes(keyword)) {
        const opposite = EMOTIONAL_OPPOSITES[emotions[0]];
        if (emotion === opposite) {
          return {
            type: "EMOTION_CONTRADICTION",
            severity: 9,
            description: `Émotion "${emotion}" contredit le canon: "${fact.subject} ${fact.predicate}"`,
            source: fact.id,
            target: characterId,
            suggestion: `Respecter l'état établi ou faire évoluer le canon via CANON_ENGINE`,
          };
        }
      }
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// EMOTION GATE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Crée une instance de EmotionGate
 * 
 * @example
 * const gate = createEmotionGate();
 * const result = await gate.execute({
 *   text: "Marie sourit, enfin heureuse.",
 *   characterId: "marie",
 *   characterName: "Marie",
 *   detectedState: { emotion: "joy", intensity: 0.8 },
 *   existingArc: previousArc,
 *   canon: currentCanon,
 *   debtThreshold: 0.7,
 *   strictMode: false
 * });
 */
export function createEmotionGate(): EmotionGate {
  return {
    name: GATE_NAME,
    version: GATE_VERSION,
    
    validate(input: EmotionGateInput): boolean {
      if (!input.text || typeof input.text !== "string") return false;
      if (!input.characterId || !input.characterName) return false;
      if (!input.detectedState?.emotion) return false;
      if (typeof input.detectedState.intensity !== "number") return false;
      if (input.detectedState.intensity < 0 || input.detectedState.intensity > 1) return false;
      if (!input.canon) return false;
      return true;
    },
    
    async execute(input: EmotionGateInput): Promise<EmotionGateOutput> {
      const startTime = Date.now();
      const violations: EmotionViolation[] = [];
      
      const { 
        text, characterId, characterName, 
        detectedState, existingArc, canon, 
        debtThreshold, strictMode 
      } = input;
      
      // Récupérer l'état précédent
      const previousState = existingArc?.states.slice(-1)[0] || null;
      
      // INV-EMO-02: Vérifier contradiction canon
      const canonViolation = checkCanonContradiction(
        characterId, 
        detectedState.emotion, 
        canon
      );
      if (canonViolation) {
        violations.push(canonViolation);
      }
      
      // INV-EMO-03: Vérifier cohérence
      const oocViolation = checkOutOfCharacter(
        previousState,
        detectedState.emotion,
        detectedState.intensity
      );
      if (oocViolation) {
        violations.push(oocViolation);
      }
      
      // Vérifier intensité
      const intensityViolation = checkIntensityJustified(
        previousState,
        detectedState.intensity,
        text
      );
      if (intensityViolation) {
        violations.push(intensityViolation);
      }
      
      // Vérifier transition
      const transitionViolation = checkMissingTransition(
        previousState,
        detectedState.emotion
      );
      if (transitionViolation && strictMode) {
        violations.push(transitionViolation);
      }
      
      // Calculer la dette émotionnelle
      const transitionCost = previousState 
        ? computeTransitionCost(previousState.dominantEmotion, detectedState.emotion)
        : 0;
      
      const currentDebt = existingArc 
        ? computeEmotionalDebt(existingArc, transitionCost * 0.3)
        : transitionCost * 0.3;
      
      // INV-EMO-04: Vérifier dette
      if (currentDebt > debtThreshold) {
        violations.push({
          type: "DEBT_OVERFLOW",
          severity: 6,
          description: `Dette émotionnelle (${currentDebt.toFixed(2)}) dépasse le seuil (${debtThreshold})`,
          source: characterName,
          suggestion: "Résoudre la dette via des scènes de transition ou de résolution",
        });
      }
      
      // Calculer le verdict
      const hasBlockingViolation = violations.some(v => v.severity >= 7);
      const hasCanonContradiction = violations.some(v => v.type === "EMOTION_CONTRADICTION");
      
      // INV-EMO-02: Contradiction canon = TOUJOURS FAIL
      const status: VerdictStatus = hasCanonContradiction || hasBlockingViolation
        ? "FAIL"
        : violations.length > 0
          ? "WARN"
          : "PASS";
      
      const verdict: GateVerdict = {
        status,
        gate: GATE_NAME,
        reason: status === "PASS"
          ? "Cohérence émotionnelle validée"
          : status === "WARN"
            ? `${violations.length} avertissement(s) émotionnel(s)`
            : `${violations.length} violation(s) émotionnelle(s) bloquante(s)`,
        timestamp: new Date().toISOString(),
        violations: violations as Violation[],
        details: {
          characterId,
          characterName,
          previousEmotion: previousState?.dominantEmotion || null,
          newEmotion: detectedState.emotion,
          transitionCost,
          currentDebt,
          debtThreshold
        }
      };
      
      // Créer le nouvel état (seulement si pas FAIL)
      let newState: EmotionalState | null = null;
      let updatedArc: EmotionalArc | null = null;
      
      if (status !== "FAIL") {
        newState = {
          characterId,
          characterName,
          dominantEmotion: detectedState.emotion,
          intensity: detectedState.intensity,
          secondaryEmotions: [],
          establishedAt: "current",
          timestamp: new Date().toISOString()
        };
        
        updatedArc = {
          characterId,
          states: existingArc 
            ? [...existingArc.states, newState]
            : [newState],
          emotionalDebt: currentDebt,
          isValid: status === "PASS",
          invalidReason: status === "WARN" 
            ? violations.map(v => v.description).join("; ")
            : undefined
        };
      }
      
      return {
        verdict,
        newState,
        updatedArc,
        currentDebt,
        processingTimeMs: Date.now() - startTime
      };
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

export { GATE_NAME as EMOTION_GATE_NAME, GATE_VERSION as EMOTION_GATE_VERSION };
export default createEmotionGate;


