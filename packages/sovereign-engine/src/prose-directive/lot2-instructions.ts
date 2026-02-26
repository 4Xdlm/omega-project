// src/prose-directive/lot2-instructions.ts
// LOT 2 — 3 instructions PDB (INV-SOMA-01 + INV-BUDGET-01 + nécessité)
// Source: OMEGA Phase T — W2

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { PDBInstruction } from './lot1-instructions.js';
import { isInstructionEnabled } from './instruction-toggle-table.js';

export const LOT2_INSTRUCTIONS: readonly PDBInstruction[] = [
  {
    id: 'LOT2-01',
    lot: 'LOT2',
    order: 1,
    label: 'Anatomie spécifique — zéro générique',
    content: `INTERDIT: cœur qui bat, mains tremblaient, jambes flageolaient, yeux s'écarquillèrent, gorge serrée, ventre noué.
OBLIGATOIRE: Trouver le geste ou la sensation UNIQUE à ce personnage dans CE moment. Exemple: "ses doigts cherchaient le bord de la table" au lieu de "ses mains tremblaient".`,
    target_axes: ['anti_cliche', 'densite_sensorielle', 'interiorite'],
  },
  {
    id: 'LOT2-02',
    lot: 'LOT2',
    order: 2,
    label: 'Budget révélation — withholding Q1/Q2',
    content: `RÈGLE ARCHITECTURALE: L'information critique (vérité, secret, cause profonde) NE PEUT PAS apparaître avant Q3.
Q1 et Q2 = accumulation de tensions sans résolution.
Q3 = révélation ou pivot.
Q4 = conséquence, pas répétition.
Si tu révèles trop tôt, STOP et recommence depuis Q1.`,
    target_axes: ['tension_14d', 'necessite_m8', 'impact_ouverture_cloture'],
  },
  {
    id: 'LOT2-03',
    lot: 'LOT2',
    order: 3,
    label: 'Nécessité absolue — zéro décoration',
    content: `Chaque phrase doit passer ce test: "Si je supprime cette phrase, est-ce que quelque chose d'essentiel disparaît ?"
Si la réponse est NON → supprimer la phrase.
Aucune phrase de transition décorative. Aucune répétition paraphrastique.
Chaque token = information nouvelle ou tension accrue.`,
    target_axes: ['necessite_m8', 'rythme_musical', 'coherence_emotionnelle'],
  },
] as const;

// Hash deterministe du lot — tracabilite DO-178C
export const LOT2_HASH = sha256(canonicalize(LOT2_INSTRUCTIONS as readonly PDBInstruction[]));

export function getLot2AsPromptBlock(activeShape?: string): string {
  return LOT2_INSTRUCTIONS
    .filter(i => isInstructionEnabled(i.id, activeShape))
    .map(i => `[${i.id}] ${i.label}:\n${i.content}`)
    .join('\n\n');
}
