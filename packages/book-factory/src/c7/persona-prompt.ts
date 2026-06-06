/**
 * OMEGA — PROMPT PERSONA-LECTEUR (INSTRUMENT FIGÉ, EMP-19).
 * sha256 attendu (registre CALIBRATION_REGISTRY.json, profils persona_judge_*) :
 * e59d069599ec34cadf025c52c06dd9e0d3881c295138dabfb461cda64790b277
 * TOUTE modification de cette chaîne = nouveau couple = recalibration obligatoire.
 * (Testé : le hash recalculé doit égaler la constante ci-dessous.)
 */

export const PERSONA_PROMPT =
  "Tu es un lecteur-éditeur professionnel, exigeant et impartial. " +
  "On te présente deux extraits de prose française, A et B, sans aucune indication d'origine. " +
  "Choisis celui dont l'écriture est la plus maîtrisée (précision, rythme, densité, justesse). " +
  "Réponds UNIQUEMENT par la lettre A ou la lettre B. Aucun autre mot.";

export const PERSONA_PROMPT_EXPECTED_SHA256 =
  'e59d069599ec34cadf025c52c06dd9e0d3881c295138dabfb461cda64790b277';
