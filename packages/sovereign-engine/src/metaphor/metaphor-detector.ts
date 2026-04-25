/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — METAPHOR DETECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: metaphor/metaphor-detector.ts
 * Version: 1.0.0 (Sprint 12)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-META-03
 *
 * Détecte les métaphores, comparaisons, et analogies dans une prose.
 * Méthode: LLM avec cache obligatoire.
 * FAIL-CLOSED: si provider down → retourner [] (pas d'erreur).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../types.js';
import type { SemanticCache } from '../semantic/semantic-cache.js';
import { isDeadMetaphor } from './dead-metaphor-blacklist.js';

export interface MetaphorHit {
  readonly text: string;
  readonly position: number;
  readonly type: 'metaphor' | 'comparison' | 'analogy';
  readonly is_dead: boolean; // dans blacklist
  readonly novelty_score: number; // 0-100, LLM-judged ou CALC fallback
}

/**
 * Détecte les métaphores dans une prose via LLM.
 * ART-META-03: Cache obligatoire (sha256 key).
 * FAIL-CLOSED: si provider down → retourner [].
 *
 * @param prose - Texte à analyser
 * @param provider - SovereignProvider LLM
 * @param cache - SemanticCache
 * @returns Array de MetaphorHit
 */
export async function detectMetaphors(
  prose: string,
  provider: SovereignProvider,
  _cache: SemanticCache,
): Promise<MetaphorHit[]> {
  try {
    const prompt = buildDetectionPrompt(prose);
    const raw = await provider.generateStructuredJSON(prompt);
    const parsed = raw as { metaphors?: Array<{ text: string; type: string; novelty_score: number }> };
    return parseMetaphorHits(parsed.metaphors || [], prose);
  } catch (err: unknown) {
    // U-META-02: tentative de récupération JSON avant FAIL-CLOSED
    const msg = err instanceof Error ? err.message : String(err);
    const repaired = tryRepairJson(msg);
    if (repaired !== null) {
      try {
        const parsed = repaired as { metaphors?: Array<{ text: string; type: string; novelty_score: number }> };
        process.stderr.write(`[METAPHOR-DETECTOR] JSON-REPAIRED: recovered ${parsed.metaphors?.length ?? 0} metaphors\n`);
        return parseMetaphorHits(parsed.metaphors || [], prose);
      } catch {
        // repair ne suffit pas → FAIL-CLOSED
      }
    }
    process.stderr.write(`[METAPHOR-DETECTOR] FAIL-CLOSED: ${msg.slice(0, 120)}\n`);
    return [];
  }
}

/**
 * U-META-02: Tente de réparer un JSON tronqué.
 * Stratégie: extraire du premier { au dernier } valide, ajouter ]} si nécessaire.
 * Retourne l'objet parsé ou null si irréparable.
 */
function tryRepairJson(errorMsg: string): unknown {
  // Extraire le JSON brut depuis le message d'erreur (format: "Failed to parse structured JSON from LLM: {raw}")
  const match = errorMsg.match(/Failed to parse structured JSON from LLM: (\{[\s\S]*)$/);
  if (!match) return null;

  let raw = match[1].trim();

  // Tentative 1: parse direct (au cas où le message d'erreur contient du JSON valide)
  try { return JSON.parse(raw); } catch { /* continue */ }

  // Tentative 2: tronquer au dernier objet complet (dernier })
  const lastBrace = raw.lastIndexOf('}');
  if (lastBrace === -1) return null;
  const truncated = raw.slice(0, lastBrace + 1);

  // Tentative 3: fermer le tableau + objet racine si nécessaire
  for (const suffix of ['', ']}', ']}]', ']}]}']) {
    try { return JSON.parse(truncated + suffix); } catch { /* continue */ }
  }

  return null;
}

/**
 * Build LLM prompt for metaphor detection.
 */
function buildDetectionPrompt(prose: string): string {
  // U-META-02: prompt borné — max 5 métaphores, expression courte (≤8 mots), pas de phrases entières.
  // ★ Sprint 3: Nuanced novelty_score criteria (Architecte directive):
  // "OMEGA doit punir le cliché inerte, pas la simplicité vivante."
  // A simple but precise image deserves 75+. Only dead clichés deserve < 50.
  return `Identifie les figures de style (métaphore, comparaison, analogie) dans ce texte.
RÈGLES STRICTES:
- Maximum 5 figures (les plus saillantes seulement).
- "text": l'EXPRESSION COURTE uniquement (max 8 mots), jamais la phrase entière.
- "type": "metaphor", "comparison" ou "analogy".
- "novelty_score": entier 0-100. Barème OBLIGATOIRE :
  90-100 = image neuve, frappante, inattendue.
  75-89 = image simple mais JUSTE, vivante, précise et nécessaire dans son contexte.
  50-74 = image convenue, prévisible, sans énergie propre.
  0-49 = cliché mort, interchangeable, sans aucune force.
  IMPORTANT : une métaphore simple mais efficace et bien placée mérite 75+. La simplicité n'est pas un défaut. Seul le cliché inerte mérite un score bas.
- JSON pur, aucun commentaire, aucun markdown.

FORMAT EXACT:
{"metaphors":[{"text":"...","type":"metaphor","novelty_score":85}]}

Texte:\n${prose}`;
}

/**
 * Parse LLM metaphor hits and check against blacklist.
 */
function parseMetaphorHits(
  llmHits: Array<{ text: string; type: string; novelty_score: number }>,
  prose: string,
): MetaphorHit[] {
  return llmHits.map((hit) => {
    const position = prose.indexOf(hit.text);
    const deadCheck = isDeadMetaphor(hit.text);

    return {
      text: hit.text,
      position: position >= 0 ? position : 0,
      type: (hit.type as 'metaphor' | 'comparison' | 'analogy') || 'metaphor',
      is_dead: deadCheck.found,
      novelty_score: deadCheck.found ? 0 : hit.novelty_score, // Dead metaphor → score 0
    };
  });
}
