// src/prose-directive/lot1-instructions.ts
// LOT 1 — 4 instructions PDB (les plus ROI)
// Source: OMEGA_SUPREME_ROADMAP_v6_0 — W1 Lot 1

import { sha256, canonicalize } from '@omega/canon-kernel';

export interface PDBInstruction {
  readonly id: string;
  readonly lot: 'LOT1' | 'LOT2' | 'LOT3';
  readonly order: number;
  readonly label: string;
  readonly content: string;
  readonly target_axes: readonly string[];
}

export const LOT1_INSTRUCTIONS: readonly PDBInstruction[] = [
  {
    id: 'LOT1-01',
    lot: 'LOT1',
    order: 1,
    label: 'Exemplar Dynamique',
    content: `[EXTRAIT CERTIFIÉ L4 — profil 14D le plus proche]. Annot: temps dilaté, no-return, corps spécifique, sensation avant label. Opère à ce niveau ou déclare NONCOMPLIANCE.`,
    target_axes: ['tension_14d', 'densite_sensorielle', 'interiorite'],
  },
  {
    id: 'LOT1-02',
    lot: 'LOT1',
    order: 2,
    label: 'Poids physique avant label (INV-SDT-PROXY-01)',
    content: `ORDRE INTERDIT: label→sensation. ORDRE OBLIGATOIRE: sensation→comportement→(jamais le label). Exemple interdit: "Elle avait peur, ses mains tremblaient." Exemple obligatoire: "Ses mains refusaient de se fermer. Elle ne comprenait pas pourquoi."`,
    target_axes: ['anti_cliche', 'densite_sensorielle', 'tension_14d'],
  },
  {
    id: 'LOT1-03',
    lot: 'LOT1',
    order: 3,
    label: 'Blacklist transitions',
    content: `LISTE NOIRE ABSOLUE: puis, ensuite, alors, soudain, tout à coup, brusquement, soudainement. Alternative obligatoire: changement de sujet grammatical / causalité physique directe.`,
    target_axes: ['rythme_musical', 'anti_cliche', 'necessite_m8'],
  },
  {
    id: 'LOT1-04',
    lot: 'LOT1',
    order: 4,
    label: 'Instruction pente + withholding quartile',
    content: `Q[n] tension +0.15 minimum vs Q[n-1]. Révèle UN fait critique dans les 40 derniers tokens du quartile. Jamais avant.`,
    target_axes: ['tension_14d', 'interiorite'],
  },
] as const;

// Hash deterministe du lot — tracabilite DO-178C
export const LOT1_HASH = sha256(canonicalize(LOT1_INSTRUCTIONS as readonly PDBInstruction[]));

export function getLot1AsPromptBlock(): string {
  return LOT1_INSTRUCTIONS
    .map(i => `[${i.id}] ${i.label}:\n${i.content}`)
    .join('\n\n');
}
