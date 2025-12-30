// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CORE — MOTEUR ÉMOTIONNEL (NOUVELLE LOI)
// Version: 1.0
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PHILOSOPHIE:
 * Une émotion est une entité physique avec masse et inertie.
 * Plus une émotion est massive, plus elle met de temps à monter ET à descendre.
 * Sans intervention externe, une émotion revient naturellement vers son baseline.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EmotionType = 
  | "joy"
  | "fear"
  | "anger"
  | "sadness"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "love"
  | "guilt"
  | "shame"
  | "pride"
  | "hope"
  | "despair";

export interface EmotionState {
  type: EmotionType;
  mass: number;           // 0.1-10.0 (légère → massive)
  intensity: number;      // 0.0-1.0 (calme → intense)
  inertia: number;        // 0.0-1.0 (réactif → lent à changer)
  decay_rate: number;     // 0.01-0.5 (vitesse retour au baseline)
  baseline: number;       // 0.0-1.0 (niveau "normal" du personnage)
  last_update: number;    // timestamp ms
}

export interface EmotionInteraction {
  type: "addition" | "opposition" | "crush" | "contamination";
  source: EmotionState;
  target: EmotionState;
  result: EmotionState;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** Oppositions émotionnelles */
export const EMOTION_OPPOSITES: Record<EmotionType, EmotionType[]> = {
  joy: ["sadness", "despair"],
  fear: ["trust", "anger"],
  anger: ["fear", "trust"],
  sadness: ["joy", "hope"],
  surprise: [],
  disgust: ["trust", "love"],
  trust: ["fear", "disgust"],
  anticipation: ["surprise"],
  love: ["disgust", "hate" as EmotionType],
  guilt: ["pride"],
  shame: ["pride"],
  pride: ["guilt", "shame"],
  hope: ["despair", "fear"],
  despair: ["hope", "joy"]
};

/** Contaminations (émotion prolongée → transformation) */
export const EMOTION_CONTAMINATIONS: Record<EmotionType, EmotionType> = {
  fear: "despair" as EmotionType,      // peur prolongée → désespoir
  anger: "disgust" as EmotionType,     // colère prolongée → dégoût
  sadness: "despair" as EmotionType,   // tristesse prolongée → désespoir
  joy: "anticipation" as EmotionType,  // joie prolongée → anticipation
  surprise: "fear" as EmotionType,     // surprise prolongée → peur
  disgust: "anger" as EmotionType,     // dégoût prolongé → colère
  trust: "love" as EmotionType,        // confiance prolongée → amour
  anticipation: "fear" as EmotionType, // anticipation prolongée → peur
  love: "trust" as EmotionType,        // amour prolongé → confiance profonde
  guilt: "shame" as EmotionType,       // culpabilité prolongée → honte
  shame: "despair" as EmotionType,     // honte prolongée → désespoir
  pride: "anticipation" as EmotionType,// fierté prolongée → anticipation
  hope: "trust" as EmotionType,        // espoir prolongé → confiance
  despair: "sadness" as EmotionType    // désespoir prolongé → tristesse profonde
};

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateEmotionOptions {
  mass?: number;
  intensity?: number;
  inertia?: number;
  decay_rate?: number;
  baseline?: number;
}

/**
 * Crée une nouvelle émotion avec des valeurs par défaut sensées.
 */
export function createEmotion(
  type: EmotionType, 
  options: CreateEmotionOptions = {}
): EmotionState {
  return {
    type,
    mass: options.mass ?? 1.0,
    intensity: options.intensity ?? 0.5,
    inertia: options.inertia ?? 0.28,
    decay_rate: options.decay_rate ?? 0.1,
    baseline: options.baseline ?? 0.2,
    last_update: Date.now()
  };
}

/**
 * Presets d'émotions courantes.
 */
export const EMOTION_PRESETS = {
  // Émotions légères (réactives)
  fleeting_joy: () => createEmotion("joy", { mass: 0.3, inertia: 0.1, decay_rate: 0.3 }),
  fleeting_fear: () => createEmotion("fear", { mass: 0.3, inertia: 0.1, decay_rate: 0.3 }),
  
  // Émotions standard
  standard_anger: () => createEmotion("anger", { mass: 1.5, inertia: 0.4, decay_rate: 0.15 }),
  standard_sadness: () => createEmotion("sadness", { mass: 2.0, inertia: 0.5, decay_rate: 0.08 }),
  
  // Émotions massives (lentes à changer)
  deep_grief: () => createEmotion("sadness", { mass: 8.0, inertia: 0.9, decay_rate: 0.02, intensity: 0.9 }),
  chronic_fear: () => createEmotion("fear", { mass: 6.0, inertia: 0.8, decay_rate: 0.03, intensity: 0.7 }),
  profound_love: () => createEmotion("love", { mass: 7.0, inertia: 0.85, decay_rate: 0.01, intensity: 0.8 }),
  
  // Traumas (quasi-permanents)
  trauma_fear: () => createEmotion("fear", { intensity: 0.9, mass: 10.0, inertia: 0.95, decay_rate: 0.005, baseline: 0.4 })
};

// ─────────────────────────────────────────────────────────────────────────────
// DECAY (Retour naturel au baseline)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le decay d'une émotion sur une durée donnée.
 * Plus la masse est élevée, plus le decay est lent.
 * 
 * Formule: intensity_new = baseline + (intensity - baseline) * e^(-decay_rate * time / mass)
 */
export function decayEmotion(emotion: EmotionState, elapsed_ms: number): EmotionState {
  const elapsed_seconds = elapsed_ms / 1000;
  
  // Le facteur de masse ralentit le decay
  const effective_decay = emotion.decay_rate / emotion.mass;
  
  // Decay exponentiel vers le baseline
  const delta = emotion.intensity - emotion.baseline;
  const decay_factor = Math.exp(-effective_decay * elapsed_seconds);
  const new_intensity = emotion.baseline + (delta * decay_factor);
  
  return {
    ...emotion,
    intensity: Math.max(0, Math.min(1, new_intensity)),
    last_update: Date.now()
  };
}

/**
 * Met à jour une émotion en appliquant le decay depuis la dernière mise à jour.
 */
export function updateEmotion(emotion: EmotionState): EmotionState {
  const now = Date.now();
  const elapsed = now - emotion.last_update;
  
  if (elapsed < 100) {
    // Pas assez de temps écoulé pour un changement significatif
    return emotion;
  }
  
  return decayEmotion(emotion, elapsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// STIMULATION (Augmentation d'intensité)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stimule une émotion (augmente son intensité).
 * L'inertie résiste au changement rapide.
 * 
 * Formule: intensity_new = intensity + stimulus * (1 - inertia)
 */
export function stimulateEmotion(
  emotion: EmotionState, 
  stimulus: number  // 0.0-1.0
): EmotionState {
  // L'inertie réduit l'effet du stimulus
  const effective_stimulus = stimulus * (1 - emotion.inertia);
  
  // Appliquer le stimulus
  const new_intensity = emotion.intensity + effective_stimulus;
  
  return {
    ...emotion,
    intensity: Math.max(0, Math.min(1, new_intensity)),
    last_update: Date.now()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détermine le type d'interaction entre deux émotions.
 */
export function getInteractionType(
  a: EmotionState, 
  b: EmotionState
): EmotionInteraction["type"] {
  // Même type = addition
  if (a.type === b.type) {
    return "addition";
  }
  
  // STRICT (tests): Grande différence de masse = écrasement (AVANT opposition)
  const mass_ratio = Math.max(a.mass, b.mass) / Math.min(a.mass, b.mass);
  if (mass_ratio > 3) {
    return "crush";
  }
  
  // Types opposés = opposition (APRÈS crush)
  const opposites = EMOTION_OPPOSITES[a.type] || [];
  if (opposites.includes(b.type)) {
    return "opposition";
  }
  
  // Par défaut = mélange complexe
  return "opposition";
}

/**
 * Addition : même type → intensité cumulée (avec saturation).
 */
export function addEmotions(a: EmotionState, b: EmotionState): EmotionState {
  if (a.type !== b.type) {
    throw new Error("Cannot add emotions of different types");
  }
  
  // Intensité cumulée avec saturation logarithmique
  const combined_intensity = 1 - (1 - a.intensity) * (1 - b.intensity);
  
  // Masse combinée (moyenne pondérée)
  const total_weight = a.intensity + b.intensity;
  const combined_mass = (a.mass * a.intensity + b.mass * b.intensity) / total_weight;
  
  return {
    type: a.type,
    mass: combined_mass,
    intensity: Math.min(1, combined_intensity),
    inertia: Math.max(a.inertia, b.inertia), // Garder l'inertie la plus haute
    decay_rate: Math.min(a.decay_rate, b.decay_rate), // Garder le decay le plus lent
    baseline: (a.baseline + b.baseline) / 2,
    last_update: Date.now()
  };
}

/**
 * Opposition : types opposés → conflit, deuil complexe.
 */
export function opposeEmotions(a: EmotionState, b: EmotionState): EmotionState {
  const stronger = a.intensity * a.mass > b.intensity * b.mass ? a : b;
  const weaker = stronger === a ? b : a;
  
  // L'émotion dominante reste mais affaiblie
  const power_a = a.intensity * a.mass;
  const power_b = b.intensity * b.mass;
  const net_power = Math.abs(power_a - power_b);
  const total_power = power_a + power_b;
  
  // Nouvelle intensité proportionnelle à la "victoire"
  const new_intensity = net_power / total_power * stronger.intensity;
  
  return {
    ...stronger,
    intensity: new_intensity,
    // L'opposition laisse des traces : augmente l'inertie
    inertia: Math.min(1, stronger.inertia + 0.1),
    // Ralentit le decay (l'émotion est "marquée")
    decay_rate: stronger.decay_rate * 0.8,
    last_update: Date.now()
  };
}

/**
 * Écrasement : masse très différente → le plus lourd gagne.
 */
export function crushEmotion(dominant: EmotionState, weak: EmotionState): EmotionState {
  // Le dominant absorbe une partie de l'énergie
  const energy_transfer = weak.intensity * 0.2;
  
  return {
    ...dominant,
    intensity: Math.min(1, dominant.intensity + energy_transfer),
    // La masse augmente légèrement (accumulation)
    mass: dominant.mass + weak.mass * 0.1,
    last_update: Date.now()
  };
}

/**
 * Fonction principale d'interaction entre deux émotions.
 */
export function interactEmotions(a: EmotionState, b: EmotionState): EmotionInteraction {
  const interaction_type = getInteractionType(a, b);
  
  let result: EmotionState;
  
  switch (interaction_type) {
    case "addition":
      result = addEmotions(a, b);
      break;
    case "opposition":
      result = opposeEmotions(a, b);
      break;
    case "crush":
      const dominant = a.mass > b.mass ? a : b;
      const weak = dominant === a ? b : a;
      result = crushEmotion(dominant, weak);
      break;
    case "contamination":
      // Géré séparément car c'est une transformation temporelle
      result = a; // Placeholder
      break;
    default:
      result = a;
  }
  
  return {
    type: interaction_type,
    source: a,
    target: b,
    result
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTAMINATION (Transformation temporelle)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si une émotion devrait se transformer par contamination.
 * Une émotion intense maintenue longtemps se transforme.
 * 
 * @param emotion L'émotion à vérifier
 * @param duration_at_high_intensity Durée en ms à haute intensité (>0.7)
 * @param threshold_ms Seuil de transformation (défaut: 30 secondes narratives)
 */
export function checkContamination(
  emotion: EmotionState,
  duration_at_high_intensity: number,
  threshold_ms: number = 30000
): EmotionState | null {
  if (emotion.intensity < 0.7) {
    return null;
  }
  
  if (duration_at_high_intensity < threshold_ms) {
    return null;
  }
  
  const new_type = EMOTION_CONTAMINATIONS[emotion.type];
  if (!new_type) {
    return null;
  }
  
  // Transformation : l'émotion change de type mais garde sa masse/inertie
  return {
    type: new_type,
    mass: emotion.mass * 1.2, // La contamination augmente la masse
    intensity: emotion.intensity * 0.9, // Légère perte d'intensité
    inertia: Math.min(1, emotion.inertia + 0.1), // Plus difficile à changer
    decay_rate: emotion.decay_rate * 0.7, // Decay plus lent
    baseline: emotion.baseline,
    last_update: Date.now()
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface EmotionTransitionValidation {
  valid: boolean;
  reason?: string;
  suggested_intermediate?: EmotionState;
}

/**
 * Valide une transition émotionnelle.
 * Détecte les changements impossibles (ex: peur massive → joie instantanée).
 */
export function validateTransition(
  from: EmotionState,
  to: EmotionState,
  elapsed_ms: number
): EmotionTransitionValidation {
  // Calculer le changement d'intensité
  const intensity_change = Math.abs(to.intensity - from.intensity);
  
  // Le changement maximum possible dépend de la masse et du temps
  const max_change_per_second = 1 / from.mass;
  const elapsed_seconds = elapsed_ms / 1000;
  const max_possible_change = max_change_per_second * elapsed_seconds;
  
  // Vérifier si le changement est plausible
  if (intensity_change > max_possible_change) {
    // Changement trop rapide pour la masse de l'émotion
    
    // Calculer une transition intermédiaire
    const direction = to.intensity > from.intensity ? 1 : -1;
    const intermediate_intensity = from.intensity + (direction * max_possible_change);
    
    return {
      valid: false,
      reason: `Transition trop rapide pour une émotion de masse ${from.mass}. ` +
              `Changement de ${intensity_change.toFixed(2)} en ${elapsed_seconds.toFixed(1)}s ` +
              `(max autorisé: ${max_possible_change.toFixed(2)})`,
      suggested_intermediate: {
        ...from,
        intensity: Math.max(0, Math.min(1, intermediate_intensity)),
        last_update: Date.now()
      }
    };
  }
  
  // Vérifier le changement de type
  if (from.type !== to.type) {
    const opposites = EMOTION_OPPOSITES[from.type] || [];
    
    if (opposites.includes(to.type) && from.intensity > 0.5) {
      // Passage direct à une émotion opposée alors que l'originale est forte
      return {
        valid: false,
        reason: `Transition trop rapide : passage direct de ${from.type} (intensité ${from.intensity.toFixed(2)}) ` +
                `à ${to.type} (opposé) sans transition.`,
        suggested_intermediate: {
          ...from,
          intensity: from.intensity * 0.5,
          last_update: Date.now()
        }
      };
    }
  }
  
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

export const EmotionEngine = {
  create: createEmotion,
  presets: EMOTION_PRESETS,
  decay: decayEmotion,
  update: updateEmotion,
  stimulate: stimulateEmotion,
  interact: interactEmotions,
  checkContamination,
  validateTransition
};

export default EmotionEngine;
