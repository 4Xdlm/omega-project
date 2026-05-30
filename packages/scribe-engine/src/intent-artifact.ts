/**
 * OMEGA Scribe Engine -- IntentArtifact
 * Contrat de l'artefact `intent.json` (composite produit par omega-runner, stage 00-intent).
 * Remplace les acces epars `(intent as any).X` par un type unique + une validation fail-closed.
 * Standard: NASA-Grade L4
 */
import type { Intent, Canon, Constraints, StyleGenomeInput, EmotionTarget } from '@omega/genesis-planner';

/**
 * Artefact intent.json deserialise.
 * - intent / canon : metadonnees narratives best-effort (defauts gracieux si absentes).
 * - constraints / genome / emotion : REQUIS (consommes par acces direct dans weaveLLM ;
 *   leur absence provoquerait un crash opaque -> valides en amont par loadIntentArtifact).
 */
export interface IntentArtifact {
  readonly intent?: Intent;
  readonly canon?: Canon;
  readonly constraints: Constraints;
  readonly genome: StyleGenomeInput;
  readonly emotion: EmotionTarget;
}

const REQUIRED_FIELDS = ['constraints', 'genome', 'emotion'] as const;

/**
 * Valide + type un artefact intent.json deserialise.
 * Fail-closed (doctrine OMEGA : unknown = FAIL) : leve une erreur explicite si un champ
 * requis manque, plutot que de propager `undefined` jusqu'a un crash opaque dans weaveLLM.
 * @throws Error si raw n'est pas un objet ou si un champ requis est absent/invalide.
 */
export function loadIntentArtifact(raw: unknown): IntentArtifact {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('IntentArtifact: intent.json is not an object');
  }
  const obj = raw as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    const value = obj[field];
    if (value === null || typeof value !== 'object') {
      throw new Error(`IntentArtifact: missing or invalid required field '${field}' in intent.json`);
    }
  }
  return obj as unknown as IntentArtifact;
}