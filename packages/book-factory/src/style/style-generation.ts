/**
 * OMEGA Book-Factory — C15-gen GÉNÉRATION STYLISÉE (BF-08, BF-14, FORBID-006).
 *
 * Boucle : RightsTicket GENERATE (brandé, machine-level) → fingerprint cible →
 * directives de FORME compilées → génération (port injecté) → VÉRIFICATION
 * POST (re-extraction du fingerprint, distance L1 aux cibles) → conformityScore
 * + flag below_style_floor (pattern fallback-A : on livre le meilleur AVEC le
 * flag, jamais de mensonge de conformité).
 *
 * FORBID-006/N3 : les directives compilées sont des consignes de FORME
 * MESURABLE (longueur de phrases, ratio dialogue, ponctuation — comme les
 * profils d'écriture C7), JAMAIS de qualité esthétique. Audit lexical à la
 * compilation (lexique interdit identique à r6-core).
 */

import { extractStyleFingerprint } from './style-extractor.js';
import type { StyleFingerprint } from './style-extractor.js';
import type { RightsTicket } from './rights-gate.js';
import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

/** Port de génération injecté (stub déterministe en test, Ollama en réel). */
export interface StyleGenPort {
  generate(directives: string, brief: string): Promise<string>;
}

export interface StyleGenResult {
  readonly prose: string;
  readonly conformityScore: number; // 1 − distance L1 moyenne aux cibles [0,1]
  readonly belowStyleFloor: boolean;
  readonly directives: string;
  readonly measured: StyleFingerprint;
}

export type StyleGenError =
  | { readonly code: 'WRONG_TICKET_OPERATION'; readonly detail: string }
  | { readonly code: 'COACHING_DETECTED'; readonly detail: string }
  | { readonly code: 'GENERATION_EMPTY'; readonly detail: string }
  | { readonly code: 'MEASURE_FAILED'; readonly detail: string };

/** Seuil de conformité — EXPERIMENTAL_DEFAULT (calibration multi-textes V2). */
export const STYLE_FLOOR_DEFAULT = 0.6;

const FORBIDDEN_COACHING = /\b(magnifique|sublime|génial|excellent|meilleur|qualité|beau|belle|émouvant|puissant|profond)\b/iu;

/** Compile un fingerprint en directives de FORME (auditées anti-coaching). */
export function compileStyleDirectives(fp: StyleFingerprint): Result<string, StyleGenError> {
  const parts: string[] = [];
  parts.push(fp.phrase_length_mean > 0.6
    ? 'Phrases longues, subordonnées multiples, période ample.'
    : fp.phrase_length_mean < 0.3
      ? 'Phrases courtes. Sujet, verbe. Coupes franches.'
      : 'Alternance de phrases moyennes et courtes.');
  parts.push(fp.dialogue_ratio > 0.4 ? 'Part importante de dialogue incarné.' : 'Dialogue rare, récit dominant.');
  if (fp.metaphor_density > 0.5) parts.push('Comparaisons concrètes régulières (« comme… »).');
  if (fp.ellipsis_rate > 0.4) parts.push('Points de suspension aux suspens.');
  if (fp.abstraction_ratio > 0.5) parts.push('Vocabulaire conceptuel (noms en -tion, -té) toléré.');
  else parts.push('Vocabulaire concret, sensoriel.');
  if (fp.punctuation_style > 0.5) parts.push('Ponctuation expressive (tirets, deux-points).');
  parts.push(fp.opening_variety > 0.6 ? 'Varier systématiquement les attaques de phrases.' : 'Attaques de phrases simples autorisées.');
  const directives = parts.join(' ');
  if (FORBIDDEN_COACHING.test(directives)) {
    return err({ code: 'COACHING_DETECTED', detail: 'directive de qualité interdite (FORBID-006)' });
  }
  return ok(directives);
}

function l1Conformity(target: StyleFingerprint, measured: StyleFingerprint): number {
  const keys = Object.keys(target) as readonly (keyof StyleFingerprint)[];
  const dist = keys.reduce((s, k) => s + Math.abs(target[k] - measured[k]), 0) / keys.length;
  return Math.max(0, Math.min(1, 1 - dist));
}

/**
 * Génère dans un style cible. EXIGE un ticket GENERATE_IN_STYLE/CONTINUE_WORK
 * (le brand garantit assertRights ; l'OPÉRATION est re-vérifiée au runtime).
 */
export async function generateInStyle(
  ticket: RightsTicket,
  target: StyleFingerprint,
  port: StyleGenPort,
  brief: string,
  styleFloor: number = STYLE_FLOOR_DEFAULT,
): Promise<Result<StyleGenResult, StyleGenError>> {
  const op = (ticket as unknown as { operation: string }).operation;
  if (op !== 'GENERATE_IN_STYLE' && op !== 'CONTINUE_WORK') {
    return err({ code: 'WRONG_TICKET_OPERATION', detail: `ticket ${op} — génération refusée (BF-14)` });
  }
  const directives = compileStyleDirectives(target);
  if (!directives.ok) return directives;

  const prose = await port.generate(directives.value, brief);
  if (prose.trim().length === 0) return err({ code: 'GENERATION_EMPTY', detail: 'le port a retourné vide' });

  const measured = extractStyleFingerprint(ticket, prose);
  if (!measured.ok) return err({ code: 'MEASURE_FAILED', detail: measured.error.detail });

  const conformityScore = Number(l1Conformity(target, measured.value).toFixed(3));
  return ok({
    prose,
    conformityScore,
    belowStyleFloor: conformityScore < styleFloor, // flag honnête, jamais de rejet silencieux
    directives: directives.value,
    measured: measured.value,
  });
}
