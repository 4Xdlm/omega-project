// src/oracle/genesis-v2/transcendent-planner.ts
// Step 0 — 1 appel LLM → JSON de planification TranscendentPlanJSON
// INV-PLAN-03: validation de complétude du plan

export interface TranscendentPlanJSON {
  readonly subtext_truth: string;
  readonly objective_correlative: string;
  readonly forbidden_lexicon: readonly string[];
  readonly forbidden_lemmes: readonly string[];
  readonly forbidden_bigrammes: readonly string[];
  readonly likely_metaphor: string;
  readonly subversion_angle: string;
  readonly master_axes_targets: Readonly<Record<string, number>>;
}

// Valider que le plan est complet (INV-PLAN-03)
export function validateTranscendentPlan(plan: unknown): plan is TranscendentPlanJSON {
  if (!plan || typeof plan !== 'object') return false;
  const p = plan as Record<string, unknown>;
  return (
    typeof p.subtext_truth === 'string' && p.subtext_truth.length > 10 &&
    typeof p.objective_correlative === 'string' && p.objective_correlative.length > 5 &&
    Array.isArray(p.forbidden_lexicon) && (p.forbidden_lexicon as string[]).length >= 5 &&
    Array.isArray(p.forbidden_lemmes) && (p.forbidden_lemmes as string[]).length >= 3 &&
    Array.isArray(p.forbidden_bigrammes) && (p.forbidden_bigrammes as string[]).length >= 3 &&
    typeof p.likely_metaphor === 'string' && p.likely_metaphor.length > 5 &&
    typeof p.subversion_angle === 'string' && p.subversion_angle.length > 5 &&
    typeof p.master_axes_targets === 'object' &&
    p.master_axes_targets !== null &&
    Object.keys(p.master_axes_targets as object).length >= 3
  );
}

// Prompt pour générer le plan (injecté dans buildGenesisPlanPrompt)
export function buildPlanningPrompt(packet: {
  intent: string;
  shape: string;
  context: string;
  master_axes: string[];
}): string {
  return `Tu es un architecte de prose littéraire. Avant d'écrire une seule ligne, analyse cette scène.

SCÈNE: ${packet.intent}
SHAPE NARRATIVE: ${packet.shape}
CONTEXTE: ${packet.context}

TÂCHE: Retourne UNIQUEMENT un JSON valide (aucun texte avant/après):

{
  "subtext_truth": "<L'enjeu émotionnel/existentiel RÉEL de cette scène, en 1 phrase>",
  "objective_correlative": "<UN objet ou détail physique concret, non-symbolique évident, qui pourra incarner l'enjeu sans le nommer>",
  "forbidden_lexicon": ["<mot1>","<mot2>","<mot3>","<mot4>","<mot5>"],
  "forbidden_lemmes": ["<racine1>","<racine2>","<racine3>","<racine4>","<racine5>"],
  "forbidden_bigrammes": ["<bg1>","<bg2>","<bg3>","<bg4>","<bg5>"],
  "likely_metaphor": "<LA métaphore ou comparaison que tu aurais instinctivement utilisée>",
  "subversion_angle": "<Comment détourner ou inverser cette métaphore pour qu'elle soit inattendue>",
  "master_axes_targets": {
    ${packet.master_axes.map(a => `"${a}": <valeur cible 0.0-1.0>`).join(',\n    ')}
  }
}

RÈGLE forbidden_lexicon: Ce sont les 5 mots les plus PROBABLES que tu écrirais pour exprimer l'enjeu. Tu t'AUTO-INTERDIS ces mots.
RÈGLE forbidden_bigrammes: Les 5 enchaînements de mots les plus prévisibles dans ce contexte.
RÈGLE likely_metaphor: La métaphore que tout auteur médiocre utiliserait ici.`;
}
