/**
 * OMEGA Book-Factory — C8.3 AMORCES VARIÉES + MÉTRIQUE D'INCIPIT (BF-08) — la prise D2.
 * Constat revue : les 4 proses du ch.1 ouvraient sur la MÊME image (le digest aimante
 * l'attaque). Remède : une DIRECTIVE D'ATTAQUE distincte par profil — c'est une
 * consigne de FORME D'OUVERTURE (in medias res / dialogue / lieu / geste / son),
 * PAS un coaching de qualité (FORBID-006 : audité par test — aucun adjectif de
 * valeur, aucune cible de score, la RÉALITÉ ne change pas).
 * + MÉTRIQUE (CALC, shadow) : divergence d'incipit inter-candidats = 1 − chevauchement
 * moyen de trigrammes sur les 50 premiers mots (0 = clones, →1 = attaques distinctes).
 */

import type { CoreProfileId } from './r6-core.js';

/** Directives d'ATTAQUE — forme d'ouverture uniquement (table fermée, auditée FORBID-006). */
export const OPENING_DIRECTIVES: Readonly<Record<CoreProfileId, string>> = {
  'canon-strict': "Ouvre le chapitre par une action déjà en cours (in medias res).",
  'tension-interne': "Ouvre le chapitre par une perception intérieure du personnage point de vue.",
  sensoriel: "Ouvre le chapitre par un détail matériel du lieu, sans le personnage.",
  dialogue: "Ouvre le chapitre par une réplique de dialogue.",
  'rythme-compresse': "Ouvre le chapitre par une phrase courte qui situe l'heure ou le lieu.",
  'voix-seche': "Ouvre le chapitre par un fait énoncé sans commentaire.",
  synthese: "Ouvre le chapitre par un geste du personnage point de vue.",
};

const FIRST_WORDS = 50;

function trigrams(text: string): ReadonlySet<string> {
  const words = text.normalize('NFC').toLowerCase().split(/\s+/u).filter((w) => w.length > 0).slice(0, FIRST_WORDS);
  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return grams;
}

function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter += 1;
  return inter / Math.min(a.size, b.size);
}

/** Divergence d'incipit inter-candidats ∈ [0,1] : 0 = attaques clonées, →1 = distinctes. */
export function incipitDivergence(proses: readonly string[]): number {
  if (proses.length < 2) return 1;
  const sets = proses.map(trigrams);
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i];
      const b = sets[j];
      if (a !== undefined && b !== undefined) {
        total += overlap(a, b);
        pairs += 1;
      }
    }
  }
  return pairs === 0 ? 1 : 1 - total / pairs;
}
