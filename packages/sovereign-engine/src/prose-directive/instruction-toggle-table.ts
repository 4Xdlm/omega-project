// src/prose-directive/instruction-toggle-table.ts
// SSOT — InstructionToggleTable pour toutes les instructions PDB (LOT1 + LOT2 + futurs)
// Standard: NASA-Grade L4 / DO-178C Level A

export interface InstructionToggleEntry {
  readonly id: string;
  readonly lot: string;
  readonly enabled_by_default: boolean;
  readonly kill_switch_env: string | null;    // ex: "OMEGA_DISABLE_LOT1_04"
  readonly conflicts_with_shapes: readonly string[];  // shapes incompatibles
  readonly risk_class: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly ban_reason: string | null;         // null si pas banni
  readonly ban_commit: string | null;         // hash commit ayant décidé le ban
}

export const INSTRUCTION_TOGGLE_TABLE: readonly InstructionToggleEntry[] = [
  // ═══ LOT 1 ═══
  {
    id: 'LOT1-01',
    lot: 'LOT1',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT1_01',
    conflicts_with_shapes: [],
    risk_class: 'LOW',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT1-02',
    lot: 'LOT1',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT1_02',
    conflicts_with_shapes: [],
    risk_class: 'LOW',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT1-03',
    lot: 'LOT1',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT1_03',
    conflicts_with_shapes: [],
    risk_class: 'LOW',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT1-04',
    lot: 'LOT1',
    enabled_by_default: false,
    kill_switch_env: 'OMEGA_ENABLE_LOT1_04',   // inversé: opt-in pour ablation future
    conflicts_with_shapes: ['Contemplative', 'SlowBurn'],
    risk_class: 'HIGH',
    ban_reason: 'Pente tension +0.15/Q incompatible Contemplative/SlowBurn — E3=0% (vW1 ablation)',
    ban_commit: '3895f496',
  },
  // ═══ LOT 2 ═══
  {
    id: 'LOT2-01',
    lot: 'LOT2',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT2_01',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT2-02',
    lot: 'LOT2',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT2_02',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT2-03',
    lot: 'LOT2',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT2_03',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
  // ═══ LOT 3 ═══
  {
    id: 'LOT3-01',
    lot: 'LOT3',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT3_01',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT3-02',
    lot: 'LOT3',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT3_02',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT3-03',
    lot: 'LOT3',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT3_03',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
  {
    id: 'LOT3-04',
    lot: 'LOT3',
    enabled_by_default: true,
    kill_switch_env: 'OMEGA_DISABLE_LOT3_04',
    conflicts_with_shapes: [],
    risk_class: 'MEDIUM',
    ban_reason: null,
    ban_commit: null,
  },
] as const;

// Résolution: est-ce que l'instruction est active pour une shape donnée?
export function isInstructionEnabled(id: string, activeShape?: string): boolean {
  const entry = INSTRUCTION_TOGGLE_TABLE.find(e => e.id === id);
  if (!entry) return false;

  if (!entry.enabled_by_default) {
    // Vérifier opt-in env var
    if (entry.kill_switch_env && process.env[entry.kill_switch_env]) return true;
    return false;
  }

  // Vérifier kill_switch env var
  if (entry.kill_switch_env && process.env[entry.kill_switch_env]) return false;

  // Vérifier conflit shape
  if (activeShape && entry.conflicts_with_shapes.includes(activeShape)) return false;

  return true;
}
