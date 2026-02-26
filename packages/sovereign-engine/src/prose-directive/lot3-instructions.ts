// src/prose-directive/lot3-instructions.ts
// LOT 3 — 4 instructions PDB (Genesis v2 — master axes ciblés)
// Source: OMEGA Phase T — W3a

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { PDBInstruction } from './lot1-instructions.js';
import { isInstructionEnabled } from './instruction-toggle-table.js';

export const LOT3_INSTRUCTIONS: readonly PDBInstruction[] = [
  {
    id: 'LOT3-01',
    lot: 'LOT3',
    order: 1,
    label: 'Scène contrainte — action concrète obligatoire',
    content: `Chaque scène doit contenir AU MOINS:
- 1 geste physique précis (pas "il bougea" — "il retourna la tasse sur la table")
- 1 détail sensoriel non-visuel (son, texture, température, odeur)
- 0 résumé narratif ("il passa les heures suivantes à" → INTERDIT)
Si tu ne peux pas placer ces éléments naturellement → la scène est à reécrire.`,
    target_axes: ['signature', 'densite_sensorielle', 'anti_cliche'] as const,
  },
  {
    id: 'LOT3-02',
    lot: 'LOT3',
    order: 2,
    label: 'Inversion sous-texte — discordance dit/vrai',
    content: `RÈGLE D'OR: Ce qui est dit ≠ ce qui est vrai.
Si le personnage "va bien" → trouve 1 détail qui dit le contraire sans le nommer.
Si la scène est calme → trouve 1 élément de tension qui ne s'exprime pas directement.
Exemple: "Elle sourit. La tasse était vide depuis dix minutes." — pas "Elle sourit tristement."
Cette discordance doit exister dans CHAQUE scène.`,
    target_axes: ['tension_14d', 'interiorite', 'signature'] as const,
  },
  {
    id: 'LOT3-03',
    lot: 'LOT3',
    order: 3,
    label: "Utilise l'ancre sensorielle du plan",
    content: `Le plan de planification t'a fourni un "objective_correlative" (ancre sensorielle).
Tu DOIS utiliser cet objet/détail dans la prose pour incarner l'enjeu émotionnel.
Il doit apparaître au moins 2 fois: une fois en ouverture (neutre) et une fois en clôture (chargé).
INTERDIT: l'expliquer. OBLIGATOIRE: le montrer.`,
    target_axes: ['interiorite', 'impact_ouverture_cloture', 'coherence_emotionnelle'] as const,
  },
  {
    id: 'LOT3-04',
    lot: 'LOT3',
    order: 4,
    label: 'Rythme asymétrique — phrases courtes/longues alternées',
    content: `Aucune suite de plus de 3 phrases de longueur similaire.
Pattern cible: [courte (impact)] [longue (développement)] [courte (coup de grâce)]
Exemple interdit: "Il entra. Elle le vit. Il s'arrêta. Silence." (4 courtes = anesthésie)
Exemple cible: "Il entra. Elle avait posé le journal depuis longtemps, les mains croisées sur la table dans une immobilité qui n'attendait plus rien. Il s'arrêta."`,
    target_axes: ['rythme_musical', 'tension_14d', 'necessite_m8'] as const,
  },
] as const;

// Hash deterministe du lot — tracabilite DO-178C
export const LOT3_HASH = sha256(canonicalize(LOT3_INSTRUCTIONS as readonly PDBInstruction[]));

export function getLot3AsPromptBlock(activeShape?: string): string {
  return LOT3_INSTRUCTIONS
    .filter(i => isInstructionEnabled(i.id, activeShape))
    .map(i => `[${i.id}] ${i.label}:\n${i.content}`)
    .join('\n\n');
}
