/**
 * OMEGA Book-Factory — ANNOTATEUR DE MENTIONS (BF-08) — proposition Architecte
 * 2026-06-06 : « les personnages doivent être accolés d'un POINTEUR CHIFFRABLE
 * qui ne laisse pas de doute de qui on parle, avec les alias et autres dérives,
 * avec un contrôle de chapitre sur la situation pour être sûr que c'est bien ce
 * personnage qui est cité. »
 *
 * FOUND_EXISTING : CONCEPT-CHARACTER-REGISTRY-001 (CharId minté C1, alias) —
 * ce module ajoute la PROJECTION INLINE manquante : chaque mention du manuscrit
 * reçoit son pointeur résolu {{surface→charId}} + un CONTRÔLE DE SITUATION par
 * chapitre (un personnage DEAD qui PARLE = SUSPECT — réutilise la logique saga).
 * Sorties : texte annoté + table de résolutions + mentions UNRESOLVED (jamais
 * silencieuses) + suspicions situationnelles avec evidence.
 */

import { err, ok, compareStrings } from './identity-types.js';
import type { Result } from './identity-types.js';

export interface AnnotatorEntity {
  /** Pointeur chiffrable stable (CharId minté C1, ou id de plan). */
  readonly charId: string;
  readonly canonical: string;
  readonly aliases: readonly string[];
  /** Situation par défaut (contrôle) — extensible par chapitre via situations. */
  readonly vital: 'ALIVE' | 'DEAD' | 'MISSING';
}

export interface ChapterSituation {
  readonly chapter: number;
  /** Vital overrides à ce chapitre (mort en cours de livre, résurrection-REVEAL…). */
  readonly vitalOverrides?: Readonly<Record<string, 'ALIVE' | 'DEAD' | 'MISSING'>>;
}

export interface MentionRecord {
  readonly chapter: number;
  readonly surface: string;
  readonly charId: string;
  readonly count: number;
}

export interface SituationSuspicion {
  readonly chapter: number;
  readonly charId: string;
  readonly canonical: string;
  readonly kind: 'DEAD_SPEAKS' | 'DEAD_ACTS';
  readonly evidence: string;
}

export interface AnnotatedManuscript {
  /** Texte avec pointeurs inline : « Henri{{ent_henri}} lisait… ». */
  readonly annotated: string;
  readonly mentions: readonly MentionRecord[];
  /** Noms propres détectés NON résolus (ni canonique ni alias) — jamais tus. */
  readonly unresolved: readonly { readonly chapter: number; readonly name: string; readonly count: number }[];
  readonly suspicions: readonly SituationSuspicion[];
  readonly totalMentions: number;
  readonly resolvedRate: number;
}

export type AnnotatorError = { readonly code: 'EMPTY_TEXT' | 'NO_ENTITIES'; readonly detail: string };

const SPEAK_NEAR = (surface: string): RegExp =>
  new RegExp(`(?:dit|lança|murmura|souffla|répondit|répliqua|reprit|demanda|cria|chuchota|ajouta)\\s+${surface.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?!\\p{L})|${surface.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s+(?:dit|déclara|répondit|s'exclama|lança)`, 'u');
const ACT_NEAR = (surface: string): RegExp =>
  new RegExp(`${surface.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s+(?:se leva|marcha|saisit|ouvrit|prit|courut|frappa|entra|sortit|avança)`, 'u');

/** Annote un manuscrit chapitré. Pur, déterministe. */
export function annotateMentions(
  chapters: readonly { readonly chapter: number; readonly prose: string }[],
  entities: readonly AnnotatorEntity[],
  situations: readonly ChapterSituation[] = [],
): Result<AnnotatedManuscript, AnnotatorError> {
  if (chapters.length === 0) return err({ code: 'EMPTY_TEXT', detail: 'aucun chapitre' });
  if (entities.length === 0) return err({ code: 'NO_ENTITIES', detail: 'aucune entité — rien à pointer' });

  // Surfaces triées par LONGUEUR DESC (longest-match-first — « Henri Morel » avant « Henri »).
  const surfaceMap: { surface: string; charId: string; canonical: string }[] = [];
  for (const e of entities) {
    surfaceMap.push({ surface: e.canonical, charId: e.charId, canonical: e.canonical });
    for (const a of e.aliases) surfaceMap.push({ surface: a, charId: e.charId, canonical: e.canonical });
  }
  surfaceMap.sort((a, b) => b.surface.length - a.surface.length || compareStrings(a.surface, b.surface));
  const byId = new Map(entities.map((e) => [e.charId, e] as const));

  const mentionCounts = new Map<string, MentionRecord>();
  const unresolvedCounts = new Map<string, { chapter: number; name: string; count: number }>();
  const suspicions: SituationSuspicion[] = [];
  const annotatedChapters: string[] = [];
  let total = 0;
  let resolved = 0;

  for (const ch of chapters) {
    const situation = situations.find((s) => s.chapter === ch.chapter);
    let text = ch.prose.normalize('NFC');

    /* — annotation longest-match-first, marqueurs temporaires anti-réentrée — */
    for (const s of surfaceMap) {
      const re = new RegExp(`(?<!\\p{L})(${s.surface.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')})(?!['’\\p{L}])(?!\\{\\{)`, 'gu');
      text = text.replace(re, (_m, name: string) => {
        total += 1;
        resolved += 1;
        const key = `${ch.chapter}|${s.surface}|${s.charId}`;
        const cur = mentionCounts.get(key);
        if (cur === undefined) mentionCounts.set(key, { chapter: ch.chapter, surface: s.surface, charId: s.charId, count: 1 });
        else mentionCounts.set(key, { ...cur, count: cur.count + 1 });
        return `${name}{{${s.charId}}}`;
      });
    }

    /* — noms propres restants = UNRESOLVED (jamais silencieux) — */
    const NAME_RE = /(?<!\p{L})([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,}(?:-[A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})?)(?!['’\p{L}])(?!\{\{)/gu;
    const lowercaseVocab = new Set(ch.prose.normalize('NFC').split(/[\s,;:!?.…«»"()—]+/u).filter((w) => /^[a-zàâçéèêëîïôûùüÿ-]{3,}$/u.test(w)));
    for (const m of text.matchAll(NAME_RE)) {
      const name = m[1];
      if (name === undefined || lowercaseVocab.has(name.toLowerCase())) continue;
      total += 1;
      const key = `${ch.chapter}|${name}`;
      const cur = unresolvedCounts.get(key);
      if (cur === undefined) unresolvedCounts.set(key, { chapter: ch.chapter, name, count: 1 });
      else cur.count += 1;
    }

    /* — CONTRÔLE DE SITUATION (la demande exacte de l'Architecte) — */
    for (const e of entities) {
      const vital = situation?.vitalOverrides?.[e.charId] ?? e.vital;
      if (vital !== 'DEAD') continue;
      for (const surface of [e.canonical, ...e.aliases]) {
        const plain = ch.prose.normalize('NFC');
        if (SPEAK_NEAR(surface).test(plain)) {
          const m = SPEAK_NEAR(surface).exec(plain);
          suspicions.push({ chapter: ch.chapter, charId: e.charId, canonical: e.canonical, kind: 'DEAD_SPEAKS', evidence: `« ${plain.slice(Math.max(0, (m?.index ?? 0) - 35), (m?.index ?? 0) + 60).replace(/\s+/gu, ' ')} »` });
        } else if (ACT_NEAR(surface).test(plain)) {
          const m = ACT_NEAR(surface).exec(plain);
          suspicions.push({ chapter: ch.chapter, charId: e.charId, canonical: e.canonical, kind: 'DEAD_ACTS', evidence: `« ${plain.slice(Math.max(0, (m?.index ?? 0) - 35), (m?.index ?? 0) + 60).replace(/\s+/gu, ' ')} »` });
        }
      }
    }
    void byId;
    annotatedChapters.push(`## Chapitre ${ch.chapter}\n\n${text}`);
  }

  return ok({
    annotated: annotatedChapters.join('\n\n'),
    mentions: [...mentionCounts.values()].sort((a, b) => a.chapter - b.chapter || compareStrings(a.charId, b.charId)),
    unresolved: [...unresolvedCounts.values()].sort((a, b) => b.count - a.count || compareStrings(a.name, b.name)),
    suspicions,
    totalMentions: total,
    resolvedRate: total > 0 ? Number((resolved / total).toFixed(3)) : 1,
  });
}
