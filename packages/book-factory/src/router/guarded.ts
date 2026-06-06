/**
 * OMEGA Book-Factory — C10+ WRAPPERS GARDÉS (BF-08, BF-09 RATIFIÉE) — le
 * branchement assertCapability : les ENTRÉES PRODUIT officielles passent par
 * le router. Les fonctions cœur restent des libs pures (les 196 tests existants
 * sont intacts — adoption additive, jamais de cassure d'API).
 */

import { assertCapability } from './product-mode-router.js';
import type { OmegaSession, RouterError } from './product-mode-router.js';
import { runDoctor } from '../doctor/doctor-orchestrator.js';
import type { DoctorOptions } from '../doctor/doctor-orchestrator.js';
import type { DoctorReport, DoctorError } from '../doctor/doctor-types.js';
import { buildNarrativeGenome } from '../mycelium-export/narrative-genome.js';
import type { GenomeInput, NarrativeGenome } from '../mycelium-export/narrative-genome.js';
import { mixedSelect } from '../mixer/mixer-selector.js';
import type { MixerCandidate, MixerSelection, MixerError } from '../mixer/mixer-selector.js';
import type { KnobSettings } from '../mixer/knob-bindings.js';
import { radar } from '../gps/gps-radar.js';
import type { RadarInput, GpsPosition, RadarError } from '../gps/gps-radar.js';
import { predictTrajectories } from '../gps/trajectory-predictor.js';
import type { Trajectory, PredictorError } from '../gps/trajectory-predictor.js';
import { err } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

/** REWRITE_DOCTOR : exige REPAIR_TEXT. */
export async function guardedRunDoctor(
  session: OmegaSession | undefined, manuscript: string, opts?: DoctorOptions,
): Promise<Result<DoctorReport, RouterError | DoctorError>> {
  const gate = assertCapability(session, 'REPAIR_TEXT');
  if (!gate.ok) return err(gate.error);
  return runDoctor(manuscript, opts);
}

/** MYCELIUM_DNA : exige EXPORT_GENOME. */
export function guardedExportGenome(
  session: OmegaSession | undefined, input: GenomeInput,
): Result<NarrativeGenome, RouterError | { readonly code: 'EMPTY_BOOK'; readonly detail: string }> {
  const gate = assertCapability(session, 'EXPORT_GENOME');
  if (!gate.ok) return err(gate.error);
  return buildNarrativeGenome(input);
}

/** MIXER_CONTROL (ou AUTONOMOUS_BOOK) : exige RERANK_SELECTION. */
export function guardedMixedSelect(
  session: OmegaSession | undefined, candidates: readonly MixerCandidate[], settings: KnobSettings, weight?: number,
): Result<MixerSelection, RouterError | MixerError> {
  const gate = assertCapability(session, 'RERANK_SELECTION');
  if (!gate.ok) return err(gate.error);
  const r = mixedSelect(candidates, settings, weight);
  return r.ok ? r : err(r.error);
}

/** COAUTHOR_GPS : radar+trajectoires exigent AUDIT_TEXT + SUGGEST_TRAJECTORIES. */
export function guardedGps(
  session: OmegaSession | undefined, input: RadarInput, seeds: readonly string[],
): Result<{ readonly position: GpsPosition; readonly trajectories: readonly Trajectory[] }, RouterError | RadarError | PredictorError> {
  const gateA = assertCapability(session, 'AUDIT_TEXT');
  if (!gateA.ok) return err(gateA.error);
  const gateS = assertCapability(session, 'SUGGEST_TRAJECTORIES');
  if (!gateS.ok) return err(gateS.error);
  const pos = radar(input);
  if (!pos.ok) return err(pos.error);
  const traj = predictTrajectories(pos.value, seeds);
  if (!traj.ok) return err(traj.error);
  return { ok: true, value: { position: pos.value, trajectories: traj.value } };
}
