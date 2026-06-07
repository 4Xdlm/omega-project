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
 * qui le porte, PUIS déduplique la REPRISE (NCR-EXPORT-V1-001 : la V1 précédente
 * supprimait « Elle l » mais laissait « Le métal est froid, luisant. ¶¶ Le métal
 * est froid, luisant. Elle l'ouvre » — doublon vu par l'Architecte ET le tribunal).
 * Pattern complet : « …P. FRAG ¶¶ P Suite… » → « …¶¶ P Suite… » (on garde la
 * reprise qui PORTE la suite ; l'occurrence orpheline de gauche est retirée).
 */
function fixBrokenStitch(text: string, danglingFragment: string): { text: string; count: number } {
  const frag = escapeRe(danglingFragment);
  // Coupe depuis le début de la phrase tronquée (après [.!?…»]) jusqu'au fragment pendu inclus.
  const re = new RegExp(`(?<=[.!?…»])([^.!?…»]{0,400}?\\s${frag})(\\s*\\r?\\n\\s*\\r?\\n)`, 'gu');
  const count = (text.match(re) ?? []).length;
  if (count === 0) return { text, count: 0 };
  let out = text.replace(re, '$2');
  // Dédup de reprise : phrase ENTIÈRE (≥4 mots) identique de part et d'autre du
  // saut de paragraphe à la couture — l'occurrence GAUCHE (orpheline) est retirée.
  out = out.replace(
    /([^.!?…»\n]{12,}?[.!?…»])\s*(\r?\n\s*\r?\n\s*)\1/gu,
    (_m, sentence: string, gap: string) => `${gap.trimStart()}${sentence}`,
  );
  return { text: out, count };
}

/**
 * Dédoublonnage ADJACENT EXACT (mécanique sûr) : une phrase entière ≥6 mots
 * strictement répétée à travers un saut de paragraphe = défaut de couture dans
 * tous les cas observés (une anaphore stylistique répète des DÉBUTS, jamais une
 * phrase complète identique). Compte tracé — jamais silencieux.
 */
export function dedupAdjacentDuplicateSentences(text: string): { text: string; count: number } {
  let count = 0;
  const out = text.replace(
    /([^.!?…»\n]{20,}?[.!?…»])\s*(\r?\n\s*\r?\n\s*)\1/gu,
    (_m, sentence: string, gap: string) => {
      count += 1;
      return `${gap.trimStart()}${sentence}`;
    },
  );
  return { text: out, count };
}

/** NCR-EXPORT-V1-001 : le DERNIER texte d'un livre doit FINIR — détecte une
 *  terminaison tronquée (pas de ponctuation finale de phrase). */
export function isTailTruncated(prose: string): boolean {
  const t = prose.trimEnd();
  return t.length > 0 && !/[.!?…»]$/u.test(t);
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
