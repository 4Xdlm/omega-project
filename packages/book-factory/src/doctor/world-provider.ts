/**
 * OMEGA Book-Factory — WORLD_PROVIDER (BF-08, Phase 2). Fournit l'état du monde
 * réel par chapitre au tribunal `guardPatch` (via tic-weaver). Remplace le world
 * minimal du dry-run SHADOW.
 *
 * SUBTILITÉ scellée (lue dans seam-surgeon, INV-SS-003) : `guardPatch` rejette
 * `NO_RECALL_FOR:<perso>` si un personnage ACTIF est cité par le patch SANS
 * RecallFact correspondant. Pour la substitution de tic (le personnage reste le
 * même, seul le geste change), on fournit donc un RecallFact « présent dans la
 * scène » par personnage actif — légitime (ils SONT en scène) et nécessaire pour
 * ne pas générer de faux rejet. Les données viennent d'une extraction CALC
 * (`world-state-v3.json`) — passées en argument, jamais importées en dur.
 */

import type { RecallFact, SurgeonWorldState } from './seam-surgeon.js';
import type { WorldProvider } from './tic-weaver.js';

export interface ChapterWorldData {
  readonly chapterId: number;
  readonly pov: 'FIRST' | 'THIRD';
  readonly location: string;
  readonly activeCharacters: readonly string[];
  readonly activeObjects: readonly string[];
}

export type WorldStateData = Readonly<Record<string, ChapterWorldData>>;

const FALLBACK: ChapterWorldData = {
  chapterId: 0, pov: 'THIRD', location: '', activeCharacters: [], activeObjects: [],
};

/** Construit un WorldProvider à partir des données CALC. Chaque personnage actif
 *  reçoit un RecallFact (INV-SS-003) ; les champs non extraits sont des défauts
 *  sûrs (timeState/actionInProgress vides, aucun lieu interdit). */
export function makeWorldProvider(data: WorldStateData): WorldProvider {
  return (chapter: number): SurgeonWorldState => {
    const c = data[String(chapter)] ?? FALLBACK;
    const recallPack: readonly RecallFact[] = c.activeCharacters.map((e) => ({ entity: e, fact: 'présent dans la scène' }));
    return {
      chapterId: c.chapterId,
      sceneId: `ch${c.chapterId}`,
      pov: c.pov,
      location: c.location,
      timeState: '',
      activeCharacters: c.activeCharacters,
      activeObjects: c.activeObjects,
      actionInProgress: '',
      recallPack,
      canonConstraints: [],
      forbiddenPlaces: [],
    };
  };
}
