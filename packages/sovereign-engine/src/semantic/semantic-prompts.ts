/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC ANALYZER PROMPTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: src/semantic/semantic-prompts.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Prompt templates for LLM-based semantic emotion analysis.
 * Language-specific instructions for negation, irony, and mixed emotions.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Builds semantic analysis prompt with negation and irony instructions.
 * Language-specific to maximize LLM understanding.
 *
 * @param text - Text to analyze
 * @param language - Target language ('fr' or 'en')
 * @returns Structured prompt string
 */
export function buildSemanticPrompt(text: string, language: 'fr' | 'en'): string {
  if (language === 'fr') {
    return `Analyse les émotions dans ce texte selon le modèle Plutchik 14D.
Retourne UNIQUEMENT un JSON strict avec exactement 14 clés, chaque valeur entre 0.0 et 1.0.

INSTRUCTIONS CRITIQUES :
- Négation : "il n'avait pas peur" → fear FAIBLE (0.0-0.2), PAS fort
- Négation : "elle ne souriait pas" → joy FAIBLE (0.0-0.2)
- Émotions mixtes : "elle souriait malgré sa tristesse" → joy MOYEN (0.4-0.6) + sadness MOYEN (0.4-0.6)
- Ironie : inverser l'émotion apparente si contexte ironique détecté
- Absence d'émotion : toutes les valeurs proches de 0.0

Les 14 clés obligatoires :
joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt

Format de réponse (JSON strict, aucun texte avant/après) :
{
  "joy": 0.0,
  "trust": 0.0,
  "fear": 0.0,
  "surprise": 0.0,
  "sadness": 0.0,
  "disgust": 0.0,
  "anger": 0.0,
  "anticipation": 0.0,
  "love": 0.0,
  "submission": 0.0,
  "awe": 0.0,
  "disapproval": 0.0,
  "remorse": 0.0,
  "contempt": 0.0
}

Texte à analyser :
${text}`;
  } else {
    return `Analyze emotions in this text using the Plutchik 14D model.
Return ONLY strict JSON with exactly 14 keys, each value between 0.0 and 1.0.

CRITICAL INSTRUCTIONS:
- Negation: "he was not afraid" → fear LOW (0.0-0.2), NOT high
- Negation: "she did not smile" → joy LOW (0.0-0.2)
- Mixed emotions: "she smiled despite her sadness" → joy MEDIUM (0.4-0.6) + sadness MEDIUM (0.4-0.6)
- Irony: invert apparent emotion if ironic context detected
- No emotion: all values near 0.0

Required 14 keys:
joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt

Response format (strict JSON, no text before/after):
{
  "joy": 0.0,
  "trust": 0.0,
  "fear": 0.0,
  "surprise": 0.0,
  "sadness": 0.0,
  "disgust": 0.0,
  "anger": 0.0,
  "anticipation": 0.0,
  "love": 0.0,
  "submission": 0.0,
  "awe": 0.0,
  "disapproval": 0.0,
  "remorse": 0.0,
  "contempt": 0.0
}

Text to analyze:
${text}`;
  }
}
