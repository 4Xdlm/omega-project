/**
 * OMEGA Book-Factory — C13 MIXER SELECTOR (BF-08) — le potard agit sur la
 * SÉLECTION (BF-15 + réserve tribunale), jamais sur la génération.
 *
 * MÉCANISME (pattern judgedSelect, étage A INVIOLABLE) :
 *   1. candidats ÉLIGIBLES uniquement (un inéligible ne gagne JAMAIS via mixer) ;
 *   2. features par candidat (measureKnobFeatures) ;
 *   3. z-score INTRA-SCÈNE par feature (comparer des candidats du même prompt —
 *      le seul périmètre où les proxys lexicaux sont fiables, cf. bindings) ;
 *   4. score' = scoreBase + Σ_knob (valeur × zscore × KNOB_WEIGHT) ;
 *   5. rapport de traçabilité par sélection (BF-10) : contribution PAR potard.
 *
 * KNOB_WEIGHT = EXPERIMENTAL_DEFAULT (à calibrer au bench — jamais scellé sans
 * multi-livres, EMP-16). Goodhart borné par construction : le mixer ne voit que
 * des candidats déjà passés par TOUS les gates durs.
 */

import { measureKnobFeatures, KNOB_IDS } from './knob-bindings.js';
import type { KnobFeatures, KnobId, KnobSettings } from './knob-bindings.js';
import { compareStrings } from '../identity/identity-types.js';

export const KNOB_WEIGHT_DEFAULT = 25; // EXPERIMENTAL — ordre de grandeur des écarts de score base

export interface MixerCandidate {
  readonly id: string; // profil (ex. 'tension-interne')
  readonly prose: string;
  readonly baseScore: number;
  readonly eligible: boolean;
}

export interface KnobContribution {
  readonly knob: KnobId;
  readonly setting: number;
  readonly zscore: number;
  readonly delta: number; // setting × zscore × weight
}

export interface MixedCandidate {
  readonly id: string;
  readonly baseScore: number;
  readonly adjustedScore: number;
  readonly features: KnobFeatures;
  readonly contributions: readonly KnobContribution[];
}

export interface MixerSelection {
  readonly winner: string;
  readonly changedWinner: boolean; // vs sélection base (sans potards)
  readonly ranked: readonly MixedCandidate[];
  readonly settings: KnobSettings;
  readonly weight: number;
}

export type MixerErrorCode = 'NO_ELIGIBLE_CANDIDATES' | 'INVALID_SETTING';
export interface MixerError { readonly code: MixerErrorCode; readonly detail: string; }

function zscores(values: readonly number[]): readonly number[] {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return values.map((v) => (sd < 1e-9 ? 0 : (v - mean) / sd));
}

/**
 * Re-classe les candidats ÉLIGIBLES selon les potards. Pur, déterministe.
 * Potards absents/0 ⇒ classement = base (identité prouvée par test).
 */
export function mixedSelect(
  candidates: readonly MixerCandidate[],
  settings: KnobSettings,
  weight: number = KNOB_WEIGHT_DEFAULT,
): { ok: true; value: MixerSelection } | { ok: false; error: MixerError } {
  for (const k of KNOB_IDS) {
    const v = settings[k];
    if (v !== undefined && (!Number.isFinite(v) || v < -1 || v > 1)) {
      return { ok: false, error: { code: 'INVALID_SETTING', detail: `${k}=${v} hors [-1,+1]` } };
    }
  }
  const eligible = candidates.filter((c) => c.eligible);
  if (eligible.length === 0) {
    return { ok: false, error: { code: 'NO_ELIGIBLE_CANDIDATES', detail: 'étage A vide — le mixer ne repêche JAMAIS un inéligible' } };
  }

  const feats = eligible.map((c) => measureKnobFeatures(c.prose));
  const zByKnob = new Map<KnobId, readonly number[]>();
  for (const k of KNOB_IDS) zByKnob.set(k, zscores(feats.map((f) => f[k])));

  const mixed: MixedCandidate[] = eligible.map((c, i) => {
    const contributions: KnobContribution[] = [];
    let delta = 0;
    for (const k of KNOB_IDS) {
      const setting = settings[k] ?? 0;
      if (setting === 0) continue;
      const z = zByKnob.get(k)?.[i] ?? 0;
      const d = setting * z * weight;
      contributions.push({ knob: k, setting, zscore: Number(z.toFixed(4)), delta: Number(d.toFixed(3)) });
      delta += d;
    }
    return {
      id: c.id,
      baseScore: c.baseScore,
      adjustedScore: Number((c.baseScore + delta).toFixed(3)),
      features: feats[i] as KnobFeatures,
      contributions,
    };
  });

  const byBase = [...mixed].sort((a, b) => b.baseScore - a.baseScore || compareStrings(a.id, b.id));
  const byAdjusted = [...mixed].sort((a, b) => b.adjustedScore - a.adjustedScore || compareStrings(a.id, b.id));
  const baseWinner = byBase[0]?.id ?? '';
  const winner = byAdjusted[0]?.id ?? '';

  return {
    ok: true,
    value: { winner, changedWinner: winner !== baseWinner, ranked: byAdjusted, settings, weight },
  };
}
