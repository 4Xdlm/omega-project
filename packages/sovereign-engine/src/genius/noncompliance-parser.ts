/**
 * OMEGA GENIUS ENGINE — NONCOMPLIANCE PARSER
 * Sprint: GENIUS-03 | NASA-Grade L4 / DO-178C Level A
 *
 * Parse les déclarations NONCOMPLIANCE dans la sortie LLM.
 * Format attendu : "NONCOMPLIANCE: [SECTION] | [raison 1 ligne]"
 *
 * Règles (GENIUS-27, GENIUS-29) :
 * - count <= 1 : OK, archivé dans output JSON (tolérance normale)
 * - count == 2 : H5 penalty appliquée (le parser compte, ne cap pas)
 * - count > 2  : verdict automatique PITCH
 * Note : le parser retourne TOUTES les déclarations trouvées.
 * C'est le calibrator qui applique les penalties, pas le parser.
 */

export interface NoncomplianceDeclaration {
  readonly section: string;
  readonly reason: string;
  readonly raw: string;
}

export interface NoncomplianceResult {
  readonly declarations: readonly NoncomplianceDeclaration[];
  readonly count: number;
  readonly h5_penalty: boolean;
  readonly auto_pitch: boolean;
}

/**
 * Parse un texte LLM pour extraire les déclarations NONCOMPLIANCE.
 *
 * Regex : /^NONCOMPLIANCE:\s*(.+?)\s*\|\s*(.+)$/gim
 *
 * - Case insensitive sur "NONCOMPLIANCE"
 * - Section = avant le pipe, trimmed
 * - Reason = après le pipe, trimmed
 * - Lignes qui ne matchent pas le format sont IGNORÉES
 * - Résultat déterministe (même input → même output)
 */
export function parseNoncompliance(llmOutput: string): NoncomplianceResult {
  const regex = /^NONCOMPLIANCE:\s*(.+?)\s*\|\s*(.+)$/gim;
  const declarations: NoncomplianceDeclaration[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(llmOutput)) !== null) {
    const section = match[1].trim();
    const reason = match[2].trim();
    if (section.length > 0 && reason.length > 0) {
      declarations.push({ section, reason, raw: match[0] });
    }
  }

  const count = declarations.length;
  return {
    declarations,
    count,
    h5_penalty: count > 1,
    auto_pitch: count > 2,
  };
}
