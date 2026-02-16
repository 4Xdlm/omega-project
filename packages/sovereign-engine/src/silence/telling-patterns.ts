/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — TELLING PATTERNS (SHOW DON'T TELL)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: silence/telling-patterns.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SDT-01
 *
 * 30+ patterns FR détectant le "telling" (narration d'émotion directe)
 * vs "showing" (description comportementale et sensorielle).
 *
 * 8 familles obligatoires :
 * 1. VERBE_ÉTAT + ÉMOTION
 * 2. SENTIR + ÉMOTION
 * 3. ÉPROUVER + ÉMOTION
 * 4. RESSENTIR + ÉMOTION
 * 5. ÊTRE_ENVAHI + ÉMOTION
 * 6. ADV_INTENSITÉ + ADJ_ÉMOTION
 * 7. NOM_ÉMOTION_SUJET
 * 8. EXPLICATION_PSYCHOLOGIQUE
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface TellingPattern {
  readonly id: string;
  readonly regex: RegExp;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly weight: number;
  readonly suggested_show: string;
  readonly false_positive_guards: readonly RegExp[]; // exceptions connues
}

/**
 * 30+ patterns français détectant le "telling"
 * ART-SDT-01: 80%+ précision avec false positive guards
 */
export const TELLING_PATTERNS_FR: readonly TellingPattern[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 1 : VERBE_ÉTAT + ÉMOTION (10 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ETAT_TRISTE',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(triste|mélancolique|déprimé)/gi,
    severity: 'critical',
    weight: 10,
    suggested_show: 'Décrire posture (épaules affaissées), regard (yeux baissés), silence',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_HEUREUX',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(heureux|heureuse|joyeux|joyeuse|content|contente)/gi,
    severity: 'critical',
    weight: 10,
    suggested_show: 'Sourire, yeux brillants, rire, gestes amples',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_FURIEUX',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(furieux|furieuse|en colère|enragé)/gi,
    severity: 'critical',
    weight: 10,
    suggested_show: 'Poings serrés, mâchoire crispée, voix haussée, gestes brusques',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_EFFRAYÉ',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(effrayé|terrifié|apeuré|craintif)/gi,
    severity: 'critical',
    weight: 10,
    suggested_show: 'Recul, pupilles dilatées, souffle court, tremblements',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_ANXIEUX',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(anxieux|anxieuse|stressé|nerveux|nerveuse)/gi,
    severity: 'high',
    weight: 8,
    suggested_show: 'Agitation, tapotement des doigts, regard fuyant, respiration rapide',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_SURPRIS',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(surpris|surprise|étonné|étonnée)/gi,
    severity: 'high',
    weight: 7,
    suggested_show: 'Sourcils levés, bouche entrouverte, pause dans le geste',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_DÉÇU',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(déçu|déçue|frustré|frustrée)/gi,
    severity: 'high',
    weight: 7,
    suggested_show: 'Épaules tombantes, soupir, regard vers le sol',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_JALOUX',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(jaloux|jalouse|envieux)/gi,
    severity: 'high',
    weight: 7,
    suggested_show: 'Regard fixe, mâchoire serrée, poing fermé',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_CONFUS',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(confus|confuse|perdu|perdue|désorienté)/gi,
    severity: 'medium',
    weight: 5,
    suggested_show: 'Froncement de sourcils, tête penchée, regard vague',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
  {
    id: 'ETAT_SEREIN',
    regex: /\b(il|elle|je|tu)\s+(était|étais|fut)\s+(serein|sereine|apaisé|calme|tranquille)/gi,
    severity: 'medium',
    weight: 4,
    suggested_show: 'Respiration lente, épaules détendues, sourire léger',
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 2 : SENTIR + ÉMOTION (4 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'SENTIR_PEUR',
    regex: /\b(il|elle|je|tu)\s+(sentait|sentais|sentit)\s+(la peur|l'angoisse|la terreur)/gi,
    severity: 'critical',
    weight: 10,
    suggested_show: 'Mains moites, gorge nouée, cœur battant',
    false_positive_guards: [],
  },
  {
    id: 'SENTIR_JOIE',
    regex: /\b(il|elle|je|tu)\s+(sentait|sentais|sentit)\s+(la joie|le bonheur|l'euphorie)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Légèreté dans les gestes, sourire spontané, rire',
    false_positive_guards: [],
  },
  {
    id: 'SENTIR_COLÈRE',
    regex: /\b(il|elle|je|tu)\s+(sentait|sentais|sentit)\s+(la colère|la rage|la fureur)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Chaleur au visage, poings serrés, voix tremblante',
    false_positive_guards: [],
  },
  {
    id: 'SENTIR_TRISTESSE',
    regex: /\b(il|elle|je|tu)\s+(sentait|sentais|sentit)\s+(la tristesse|le chagrin|la mélancolie)/gi,
    severity: 'high',
    weight: 8,
    suggested_show: 'Gorge serrée, picotement des yeux, silence pesant',
    false_positive_guards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 3 : ÉPROUVER + ÉMOTION (3 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'EPROUVER_TRISTESSE',
    regex: /\b(il|elle|je|tu)\s+(éprouvait|éprouvais|éprouva)\s+(de la tristesse|du chagrin)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Larmes retenues, regard fuyant, voix cassée',
    false_positive_guards: [],
  },
  {
    id: 'EPROUVER_JOIE',
    regex: /\b(il|elle|je|tu)\s+(éprouvait|éprouvais|éprouva)\s+(de la joie|du bonheur|du plaisir)/gi,
    severity: 'high',
    weight: 8,
    suggested_show: 'Sourire éclatant, geste vif, exclamation',
    false_positive_guards: [],
  },
  {
    id: 'EPROUVER_ANGOISSE',
    regex: /\b(il|elle|je|tu)\s+(éprouvait|éprouvais|éprouva)\s+(de l'angoisse|de l'anxiété)/gi,
    severity: 'high',
    weight: 8,
    suggested_show: 'Souffle court, mains tremblantes, regard inquiet',
    false_positive_guards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 4 : RESSENTIR + ÉMOTION (3 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'RESSENTIR_ANGOISSE',
    regex: /\b(il|elle|je|tu)\s+(ressentait|ressentais|ressentit)\s+(une (profonde )?angoisse|une (grande )?anxiété)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Oppression thoracique, respiration saccadée, sueur froide',
    false_positive_guards: [],
  },
  {
    id: 'RESSENTIR_COLÈRE',
    regex: /\b(il|elle|je|tu)\s+(ressentait|ressentais|ressentit)\s+(une (vive )?colère|une (grande )?fureur)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Visage empourpré, mâchoire crispée, ton cassant',
    false_positive_guards: [],
  },
  {
    id: 'RESSENTIR_SOULAGEMENT',
    regex: /\b(il|elle|je|tu)\s+(ressentait|ressentais|ressentit)\s+(un (grand )?soulagement)/gi,
    severity: 'medium',
    weight: 6,
    suggested_show: 'Expiration longue, épaules qui retombent, sourire',
    false_positive_guards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 5 : ÊTRE_ENVAHI + ÉMOTION (2 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ENVAHI_TERREUR',
    regex: /\b(la terreur|la peur|l'angoisse)\s+(l'envahit|l'envahissait|m'envahit)/gi,
    severity: 'critical',
    weight: 10,
    suggested_show: 'Paralysie soudaine, souffle coupé, frisson glacé',
    false_positive_guards: [],
  },
  {
    id: 'ENVAHI_COLÈRE',
    regex: /\b(la colère|la rage|la fureur)\s+(l'envahit|l'envahissait|m'envahit)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Chaleur montante, vision qui se trouble, geste violent',
    false_positive_guards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 6 : ADV_INTENSITÉ + ADJ_ÉMOTION (3 patterns, pénalisation forte)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TERRIBLEMENT_TRISTE',
    regex: /\b(terriblement|extrêmement|incroyablement|vraiment)\s+(triste|heureux|furieux|effrayé)/gi,
    severity: 'critical',
    weight: 12, // pénalisation renforcée
    suggested_show: "Montrer l'intensité via comportement extrême, pas adverbe",
    false_positive_guards: [],
  },
  {
    id: 'TRÈS_EMOUVANT',
    regex: /\b(très|trop|si)\s+(ému|émue|touché|touchée|bouleversé)/gi,
    severity: 'high',
    weight: 10,
    suggested_show: 'Larmes, voix tremblante, geste interrompu',
    false_positive_guards: [],
  },
  {
    id: 'ABSOLUMENT_RAVI',
    regex: /\b(absolument|complètement|totalement)\s+(ravi|ravie|enchanté|enchantée)/gi,
    severity: 'high',
    weight: 9,
    suggested_show: 'Gestes expansifs, rire, exclamation joyeuse',
    false_positive_guards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 7 : NOM_ÉMOTION_SUJET (3 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'COLÈRE_MONTAIT',
    regex: /\b(la colère|la rage|la fureur)\s+(montait|monte|monta)\s+(en (lui|elle|moi))?/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Rougeur progressive, respiration accélérée, gestes saccadés',
    false_positive_guards: [],
  },
  {
    id: 'PEUR_SAISIT',
    regex: /\b(la peur|la terreur|l'angoisse)\s+(saisit|saisissait|le saisit|la saisit)/gi,
    severity: 'critical',
    weight: 9,
    suggested_show: 'Immobilité soudaine, yeux écarquillés, souffle suspendu',
    false_positive_guards: [],
  },
  {
    id: 'JOIE_DEBORDE',
    regex: /\b(la joie|le bonheur)\s+(déborde|débordait|déborda)/gi,
    severity: 'high',
    weight: 7,
    suggested_show: 'Rire incontrôlable, gestes désordonnés, yeux brillants',
    false_positive_guards: [],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FAMILLE 8 : EXPLICATION_PSYCHOLOGIQUE (2 patterns)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'PARCE_QUE_PEUR',
    regex: /\bparce qu'(il|elle|je)\s+(avait|avais)\s+(peur|peur de|craignait|redoutait)/gi,
    severity: 'high',
    weight: 8,
    suggested_show: 'Montrer la cause via action observable, pas explication',
    false_positive_guards: [],
  },
  {
    id: 'CAR_COLÈRE',
    regex: /\bcar\s+(il|elle|je)\s+(était|étais)\s+(en colère|furieux|furieuse)/gi,
    severity: 'high',
    weight: 8,
    suggested_show: "Montrer la conséquence de la colère, pas l'explication",
    false_positive_guards: [/\b(médecin|ingénieur|professeur|debout|assis|là|présent|midi|minuit)\b/gi],
  },
];

/**
 * Vérifie qu'une violation ne correspond pas à un false positive connu.
 */
export function isNotFalsePositive(sentence: string, pattern: TellingPattern): boolean {
  for (const guard of pattern.false_positive_guards) {
    if (guard.test(sentence)) {
      return false; // C'est un false positive, on ignore
    }
  }
  return true; // Pas de false positive détecté, c'est une vraie violation
}
