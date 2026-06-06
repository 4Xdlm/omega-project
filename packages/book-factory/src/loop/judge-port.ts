/**
 * OMEGA Book-Factory — C8.4 JUDGE PORT — l'étage B avec juge LLM, GATÉ APPROVED (EMP-19).
 * Deux profils existent (gemma4 : acc 0.929/biais 0.000 ; qwen3.5 : 0.857/−0.071) —
 * tous deux **PROPOSED** : ce port REFUSE tout profil non APPROVED par construction.
 *
 * LOIS : le juge n'intervient QUE sur les candidats ÉLIGIBLES (étage A intact — un
 * advisory ne renverse jamais un dur) ; tournoi pairwise DOUBLE-ORDRE (le biais de
 * position est neutralisé par design : un point n'est marqué que si le juge préfère
 * le même texte dans LES DEUX ordres — sinon tie) ; poids EXPERIMENTAL_DEFAULT
 * (bonus borné, jamais l'autorité seule) ; chaque verdict archivé avec prompt_hash.
 * LIMITES : coût O(n²) appels (n=éligibles ≤7 ⇒ ≤42 appels double-ordre) — réservé
 * BOOST ; l'activation réelle attend l'APPROVED Architecte.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';

import type { Result, Sha256Hex } from '../identity/identity-types.js';
import { err, ok } from '../identity/identity-types.js';
import type { CoreProfileId } from './r6-core.js';

export interface JudgeProfile {
  readonly status: 'APPROVED' | 'PROPOSED' | 'EXPIRED' | 'DISQUALIFIED';
  readonly model: string;
  readonly promptSha256: Sha256Hex;
  readonly temperature: number;
  readonly approvedBy?: string; // Architecte/Tribunal — requis si APPROVED
}

export interface PairwiseJudge {
  /** retourne 'A' | 'B' | 'TIE' — implémentation = couple calibré (Ollama). */
  compare(a: string, b: string): Promise<'A' | 'B' | 'TIE'>;
}

export type JudgePortError =
  | { readonly code: 'PROFILE_NOT_APPROVED'; readonly status: JudgeProfile['status'] }
  | { readonly code: 'MISSING_APPROVER' };

export interface TournamentResult {
  readonly points: ReadonlyMap<CoreProfileId, number>;
  readonly duels: number;
  readonly verdictHash: Sha256Hex;
}

/** Refus PAR CONSTRUCTION de tout profil non APPROVED (EMP-19 / FORBID-012). */
export function openJudgePort(profile: JudgeProfile): Result<JudgeProfile, JudgePortError> {
  if (profile.status !== 'APPROVED') return err({ code: 'PROFILE_NOT_APPROVED', status: profile.status });
  if (profile.approvedBy === undefined || profile.approvedBy.trim().length === 0)
    return err({ code: 'MISSING_APPROVER' });
  return ok(profile);
}

/**
 * Tournoi pairwise double-ordre entre candidats ÉLIGIBLES.
 * Point ssi préférence CONCORDANTE dans les deux ordres (anti-biais par design).
 */
export async function runTournament(
  judge: PairwiseJudge,
  eligible: readonly { readonly profile: CoreProfileId; readonly prose: string }[],
): Promise<TournamentResult> {
  const points = new Map<CoreProfileId, number>(eligible.map((c) => [c.profile, 0]));
  let duels = 0;
  const transcript: unknown[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const x = eligible[i];
      const y = eligible[j];
      if (x === undefined || y === undefined) continue;
      const r1 = await judge.compare(x.prose, y.prose); // x=A
      const r2 = await judge.compare(y.prose, x.prose); // y=A (ordre inversé)
      duels += 1;
      const xWins = r1 === 'A' && r2 === 'B';
      const yWins = r1 === 'B' && r2 === 'A';
      if (xWins) points.set(x.profile, (points.get(x.profile) ?? 0) + 1);
      else if (yWins) points.set(y.profile, (points.get(y.profile) ?? 0) + 1);
      transcript.push({ x: x.profile, y: y.profile, r1, r2, scored: xWins ? x.profile : yWins ? y.profile : 'TIE' });
    }
  }
  const verdictHash = sha256(canonicalize({ v: 1, transcript })) as Sha256Hex;
  return { points, duels, verdictHash };
}

/** Bonus étage B (EXPERIMENTAL_DEFAULT) : borné, jamais l'autorité seule. */
export const JUDGE_POINT_BONUS = 40; // ~poids d'un bloomHit — non scellé (EMP-16)
