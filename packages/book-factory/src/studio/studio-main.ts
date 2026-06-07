/**
 * OMEGA — PHASE 18 WRITING STUDIO — ENTRY DU BUNDLE (BF-08).
 *
 * DEC-20260121-001:202 « PHASE 18 — UI WRITING STUDIO » (DÉCISION). Cette entry
 * est bundlée par esbuild (IIFE) et injectée dans WRITING_STUDIO.html : c'est
 * LE MOTEUR RÉEL qui tourne dans la page — radar C14, trajectoires, mixer C13,
 * router C10 — ZÉRO duplication de logique (la règle des UI data-driven, tenue).
 *
 * LOIS DANS L'UI, PAR LE CODE : la session est ouverte en COAUTHOR_GPS pour le
 * radar (GENERATE_PROSE refusé par le router — « le GPS ne décide JAMAIS ») et
 * en MIXER_CONTROL pour la re-sélection. Modules importés = PURS (aucun node:*,
 * aucun canon-kernel) — browser-safe par construction.
 */

import { setMode, assertCapability } from '../router/product-mode-router.js';
import type { OmegaSession } from '../router/product-mode-router.js';
import { radar } from '../gps/gps-radar.js';
import type { GpsPosition, GpsHistoryChapter } from '../gps/gps-radar.js';
import { predictTrajectories } from '../gps/trajectory-predictor.js';
import type { Trajectory } from '../gps/trajectory-predictor.js';
import { mixedSelect } from '../mixer/mixer-selector.js';
import type { MixerCandidate, MixerSelection } from '../mixer/mixer-selector.js';
import type { KnobSettings } from '../mixer/knob-bindings.js';
import { measureKnobFeatures, KNOB_IDS } from '../mixer/knob-bindings.js';

export interface StudioAnalysis {
  readonly ok: boolean;
  readonly position?: GpsPosition;
  readonly trajectories?: readonly Trajectory[];
  readonly error?: string;
}

const gpsSession: OmegaSession | undefined = (() => {
  const r = setMode('COAUTHOR_GPS');
  return r.ok ? r.value : undefined;
})();
const mixerSession: OmegaSession | undefined = (() => {
  const r = setMode('MIXER_CONTROL');
  return r.ok ? r.value : undefined;
})();

/** Radar + routes sur le texte en cours de frappe. Lois router vérifiées. */
export function analyze(
  currentText: string,
  currentChapter: number,
  history: readonly GpsHistoryChapter[],
  knownCharacters: readonly string[],
  seeds: readonly string[],
): StudioAnalysis {
  const gateA = assertCapability(gpsSession, 'AUDIT_TEXT');
  const gateS = assertCapability(gpsSession, 'SUGGEST_TRAJECTORIES');
  if (!gateA.ok || !gateS.ok) return { ok: false, error: 'mode GPS indisponible' };
  const pos = radar({ currentText, currentChapter, history, knownCharacters, seeds, dyingThreadThreshold: 3 });
  if (!pos.ok) return { ok: false, error: pos.error.detail };
  const traj = predictTrajectories(pos.value, seeds);
  return { ok: true, position: pos.value, trajectories: traj.ok ? traj.value : [] };
}

/** Re-sélection par potards sur les candidats embarqués. Étage A inviolable. */
export function remix(candidates: readonly MixerCandidate[], settings: KnobSettings): MixerSelection | { readonly error: string } {
  const gate = assertCapability(mixerSession, 'RERANK_SELECTION');
  if (!gate.ok) return { error: gate.error.detail };
  const r = mixedSelect(candidates, settings);
  return r.ok ? r.value : { error: r.error.detail };
}

export { measureKnobFeatures, KNOB_IDS };
export const STUDIO_LAWS = [
  'Le GPS ne décide JAMAIS. Il montre des chemins. (VISION:279, imposé par le router)',
  'Routes en ordre alphabétique — aucune préférence. Les risques sont toujours affichés.',
  'Les potards re-classent des candidats EXISTANTS déjà passés par les gates — jamais de coaching.',
  'Un candidat inéligible ne gagne jamais, quel que soit le potard (étage A inviolable).',
] as const;
