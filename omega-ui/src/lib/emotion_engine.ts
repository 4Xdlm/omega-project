// ═══════════════════════════════════════════════════════════════════════════
// OMEGA CORE — MOTEUR EMOTIONNEL (NOUVELLE LOI)
// Version: 1.0
// ═══════════════════════════════════════════════════════════════════════════

export type EmotionType = 
  | "joy" | "fear" | "anger" | "sadness" | "surprise" | "disgust"
  | "trust" | "anticipation" | "love" | "guilt" | "shame" | "pride"
  | "hope" | "despair";

export interface EmotionState {
  type: EmotionType;
  mass: number;           // 0.1-10.0 (legere -> massive)
  intensity: number;      // 0.0-1.0 (calme -> intense)
  inertia: number;        // 0.0-1.0 (reactif -> lent a changer)
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

// Oppositions emotionnelles
export const EMOTION_OPPOSITES: Record<EmotionType, EmotionType[]> = {
  joy: ["sadness", "despair"],
  fear: ["trust", "anger"],
  anger: ["fear", "trust"],
  sadness: ["joy", "hope"],
  surprise: [],
  disgust: ["trust", "love"],
  trust: ["fear", "disgust"],
  anticipation: ["surprise"],
  love: ["disgust"],
  guilt: ["pride"],
  shame: ["pride"],
  pride: ["guilt", "shame"],
  hope: ["despair", "fear"],
  despair: ["hope", "joy"]
};

// Contaminations (emotion prolongee -> transformation)
export const EMOTION_CONTAMINATIONS: Record<EmotionType, EmotionType> = {
  fear: "despair",
  anger: "disgust",
  sadness: "despair",
  joy: "anticipation",
  surprise: "fear",
  disgust: "anger",
  trust: "love",
  anticipation: "fear",
  love: "trust",
  guilt: "shame",
  shame: "despair",
  pride: "anticipation",
  hope: "trust",
  despair: "sadness"
};

export interface CreateEmotionOptions {
  mass?: number;
  intensity?: number;
  inertia?: number;
  decay_rate?: number;
  baseline?: number;
}

// Cree une nouvelle emotion
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

// Presets
export const EMOTION_PRESETS = {
  fleeting_joy: () => createEmotion("joy", { mass: 0.3, inertia: 0.1, decay_rate: 0.3 }),
  fleeting_fear: () => createEmotion("fear", { mass: 0.3, inertia: 0.1, decay_rate: 0.3 }),
  standard_anger: () => createEmotion("anger", { mass: 1.5, inertia: 0.4, decay_rate: 0.15 }),
  standard_sadness: () => createEmotion("sadness", { mass: 2.0, inertia: 0.5, decay_rate: 0.08 }),
  deep_grief: () => createEmotion("sadness", { mass: 8.0, inertia: 0.9, decay_rate: 0.02, intensity: 0.9 }),
  chronic_fear: () => createEmotion("fear", { mass: 6.0, inertia: 0.8, decay_rate: 0.03, intensity: 0.7 }),
  profound_love: () => createEmotion("love", { mass: 7.0, inertia: 0.85, decay_rate: 0.01, intensity: 0.8 }),
  trauma_fear: () => createEmotion("fear", { intensity: 0.9, mass: 10.0, inertia: 0.95, decay_rate: 0.005, baseline: 0.4 })
};

// DECAY: Formule = baseline + (intensity - baseline) * e^(-decay_rate * time / mass)
export function decayEmotion(emotion: EmotionState, elapsed_ms: number): EmotionState {
  const elapsed_seconds = elapsed_ms / 1000;
  const effective_decay = emotion.decay_rate / emotion.mass;
  const delta = emotion.intensity - emotion.baseline;
  const decay_factor = Math.exp(-effective_decay * elapsed_seconds);
  const new_intensity = emotion.baseline + (delta * decay_factor);
  
  return {
    ...emotion,
    intensity: Math.max(0, Math.min(1, new_intensity)),
    last_update: Date.now()
  };
}

export function updateEmotion(emotion: EmotionState): EmotionState {
  const now = Date.now();
  const elapsed = now - emotion.last_update;
  if (elapsed < 100) return emotion;
  return decayEmotion(emotion, elapsed);
}

// STIMULATION: Formule = intensity + stimulus * (1 - inertia)
export function stimulateEmotion(emotion: EmotionState, stimulus: number): EmotionState {
  const effective_stimulus = stimulus * (1 - emotion.inertia);
  const new_intensity = emotion.intensity + effective_stimulus;
  
  return {
    ...emotion,
    intensity: Math.max(0, Math.min(1, new_intensity)),
    last_update: Date.now()
  };
}

// Type interaction
export function getInteractionType(a: EmotionState, b: EmotionState): EmotionInteraction["type"] {
  if (a.type === b.type) return "addition";
  
  const mass_ratio = Math.max(a.mass, b.mass) / Math.min(a.mass, b.mass);
  if (mass_ratio > 3) return "crush";
  
  const opposites = EMOTION_OPPOSITES[a.type] || [];
  if (opposites.includes(b.type)) return "opposition";
  
  return "opposition";
}

// Addition
export function addEmotions(a: EmotionState, b: EmotionState): EmotionState {
  const combined_intensity = 1 - (1 - a.intensity) * (1 - b.intensity);
  const total_weight = a.intensity + b.intensity;
  const combined_mass = (a.mass * a.intensity + b.mass * b.intensity) / total_weight;
  
  return {
    type: a.type,
    mass: combined_mass,
    intensity: Math.min(1, combined_intensity),
    inertia: Math.max(a.inertia, b.inertia),
    decay_rate: Math.min(a.decay_rate, b.decay_rate),
    baseline: (a.baseline + b.baseline) / 2,
    last_update: Date.now()
  };
}

// Opposition
export function opposeEmotions(a: EmotionState, b: EmotionState): EmotionState {
  const stronger = a.intensity * a.mass > b.intensity * b.mass ? a : b;
  const power_a = a.intensity * a.mass;
  const power_b = b.intensity * b.mass;
  const net_power = Math.abs(power_a - power_b);
  const total_power = power_a + power_b;
  const new_intensity = net_power / total_power * stronger.intensity;
  
  return {
    ...stronger,
    intensity: new_intensity,
    inertia: Math.min(1, stronger.inertia + 0.1),
    decay_rate: stronger.decay_rate * 0.8,
    last_update: Date.now()
  };
}

// Crush
export function crushEmotion(dominant: EmotionState, weak: EmotionState): EmotionState {
  const energy_transfer = weak.intensity * 0.2;
  return {
    ...dominant,
    intensity: Math.min(1, dominant.intensity + energy_transfer),
    mass: dominant.mass + weak.mass * 0.1,
    last_update: Date.now()
  };
}

// Interaction principale
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
    default:
      result = a;
  }
  
  return { type: interaction_type, source: a, target: b, result };
}

// Contamination
export function checkContamination(
  emotion: EmotionState,
  duration_at_high_intensity: number,
  threshold_ms: number = 30000
): EmotionState | null {
  if (emotion.intensity < 0.7 || duration_at_high_intensity < threshold_ms) return null;
  
  const new_type = EMOTION_CONTAMINATIONS[emotion.type];
  if (!new_type) return null;
  
  return {
    type: new_type,
    mass: emotion.mass * 1.2,
    intensity: emotion.intensity * 0.9,
    inertia: Math.min(1, emotion.inertia + 0.1),
    decay_rate: emotion.decay_rate * 0.7,
    baseline: emotion.baseline,
    last_update: Date.now()
  };
}

// Validation transition
export function validateTransition(
  from: EmotionState,
  to: EmotionState,
  elapsed_ms: number
): { valid: boolean; reason?: string } {
  const intensity_change = Math.abs(to.intensity - from.intensity);
  const max_change_per_second = 1 / from.mass;
  const elapsed_seconds = elapsed_ms / 1000;
  const max_possible_change = max_change_per_second * elapsed_seconds;
  
  if (intensity_change > max_possible_change) {
    return {
      valid: false,
      reason: `Transition trop rapide pour masse ${from.mass}. Change: ${intensity_change.toFixed(2)}, Max: ${max_possible_change.toFixed(2)}`
    };
  }
  
  return { valid: true };
}

// Export principal
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

