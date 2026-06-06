/**
 * OMEGA Book-Factory — C11.2 REPAIR EXECUTOR (BF-08) — exécute UNIQUEMENT les
 * MECHANICAL_SAFE, chaque action diffée (before/after comptés). La V0 n'est
 * JAMAIS touchée : l'executor reçoit du texte, retourne du texte neuf.
 *
 * SÉCURITÉS : remplacements par lookarounds \p{L} (jamais \b — leçon accents) ;
 * une action qui ne matche rien = applied:false (jamais d'échec silencieux) ;
 * SURGICAL_LLM exécuté SEULEMENT si un port LLM est injecté ET DOCTOR_LLM=1
 * (GO_B human-in-the-loop par défaut) ; SIGNAL_ONLY jamais exécuté.
 */

import type { AppliedRepair, RepairAction, RepairPlan } from './doctor-types.js';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Remplacement de nom propre, frontières Unicode-sûres, comptage exact. */
function replaceName(text: string, from: string, to: string): { text: string; count: number } {
  const re = new RegExp(`(?<!\\p{L})${escapeRe(from)}(?!['’\\p{L}])`, 'gu');
  const count = (text.match(re) ?? []).length;
  return count === 0 ? { text, count: 0 } : { text: text.replace(re, to), count };
}

/**
 * Répare une couture cassée : supprime le fragment pendu et la phrase tronquée
 * qui le porte, en gardant la reprise qui suit (qui re-déroule la même matière).
 * Pattern : « …dernière phrase complète. FRAGMENT_TRONQUÉ frag ¶¶ Reprise… »
 *           → « …dernière phrase complète. ¶¶ Reprise… »
 */
function fixBrokenStitch(text: string, danglingFragment: string): { text: string; count: number } {
  const frag = escapeRe(danglingFragment);
  // Coupe depuis le début de la phrase tronquée (après [.!?…»]) jusqu'au fragment pendu inclus.
  const re = new RegExp(`(?<=[.!?…»])([^.!?…»]{0,400}?\\s${frag})(\\s*\\r?\\n\\s*\\r?\\n)`, 'gu');
  const count = (text.match(re) ?? []).length;
  return count === 0 ? { text, count: 0 } : { text: text.replace(re, '$2'), count };
}

export interface LlmRepairPort {
  rewriteSegment(directive: string, segment: string): Promise<string>;
}

export interface ExecutorOptions {
  /** Port LLM (optionnel) — sans lui, SURGICAL_LLM reste préparé non exécuté. */
  readonly llm?: LlmRepairPort;
  /** Garde-fou : même avec un port, l'exécution chirurgicale exige ce flag. */
  readonly allowSurgical?: boolean;
  /** Remplacements littéraux supplémentaires (override planner). */
  readonly literalReplacements?: ReadonlyMap<string, string>;
}

export async function executeRepairs(
  prose: string,
  plan: RepairPlan,
  opts: ExecutorOptions = {},
): Promise<{ repaired: string; applied: readonly AppliedRepair[] }> {
  let text = prose;
  const applied: AppliedRepair[] = [];

  for (const action of plan.actions) {
    switch (action.kind) {
      case 'UNIFY_IDENTITY':
      case 'UNIFY_LOCATION': {
        let total = 0;
        for (const from of action.replace) {
          const r = replaceName(text, from, action.keep);
          text = r.text;
          total += r.count;
        }
        applied.push({ action, replacements: total, applied: total > 0 });
        break;
      }
      case 'FIX_BROKEN_STITCH': {
        const r = fixBrokenStitch(text, action.danglingFragment);
        text = r.text;
        applied.push({ action, replacements: r.count, applied: r.count > 0 });
        break;
      }
      case 'SURGICAL_REWRITE': {
        if (opts.llm !== undefined && opts.allowSurgical === true) {
          const rewritten = await opts.llm.rewriteSegment(action.directive, action.segmentExcerpt);
          const r = rewritten.trim().length > 0 && text.includes(action.segmentExcerpt)
            ? { text: text.replace(action.segmentExcerpt, rewritten.trim()), count: 1 }
            : { text, count: 0 };
          text = r.text;
          applied.push({ action, replacements: r.count, applied: r.count > 0 });
        } else {
          applied.push({ action, replacements: 0, applied: false }); // préparé, non exécuté (GO_B)
        }
        break;
      }
      case 'SIGNAL': {
        applied.push({ action, replacements: 0, applied: false });
        break;
      }
      default: {
        const never: never = action;
        throw new Error(`action inconnue: ${JSON.stringify(never)}`);
      }
    }
  }

  for (const [from, to] of opts.literalReplacements ?? new Map<string, string>()) {
    const re = new RegExp(escapeRe(from), 'gu');
    const count = (text.match(re) ?? []).length;
    if (count > 0) {
      text = text.replace(re, to);
      applied.push({
        action: { kind: 'SIGNAL', cls: 'SIGNAL_ONLY', topic: 'OBJECT', detail: `littéral « ${from} » → « ${to} »`, count },
        replacements: count,
        applied: true,
      });
    }
  }

  return { repaired: text, applied };
}
