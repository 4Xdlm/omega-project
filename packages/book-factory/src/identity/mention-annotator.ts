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

/** Type d'entité pointée — extension Architecte 2026-06-07 : « le système de
 *  marqueur par personnage peut très bien être développé sur les ÉVÉNEMENTS,
 *  moments importants, LIEUX, etc. » Même machinerie, pointeurs TYPÉS — c'est
 *  la nourriture du Radar GPS (un danger/route par charId, par lieu, par seed). */
export type EntityKind = 'CHARACTER' | 'PLACE' | 'EVENT' | 'OBJECT';

export interface AnnotatorEntity {
  /** Pointeur chiffrable stable (CharId minté C1, ou id de plan). */
  readonly charId: string;
  readonly canonical: string;
  readonly aliases: readonly string[];
  /** Situation par défaut (contrôle) — extensible par chapitre via situations.
   *  N'a de sens que pour CHARACTER (un lieu ne « meurt » pas — V1). */
  readonly vital: 'ALIVE' | 'DEAD' | 'MISSING';
  /** Type du pointeur. Défaut CHARACTER (rétro-compatible). */
  readonly kind?: EntityKind;
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
  readonly kind: EntityKind;
  readonly count: number;
}

/** Carte de PRÉSENCE par chapitre — qui/où/quoi est cité, par type. C'est le
 *  « contrôle de chapitre sur la situation » étendu aux lieux et événements. */
export interface ChapterPresence {
  readonly chapter: number;
  readonly characters: readonly string[];
  readonly places: readonly string[];
  readonly events: readonly string[];
  readonly objects: readonly string[];
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
  /** Présence par chapitre et par type (personnages / lieux / événements / objets). */
  readonly presence: readonly ChapterPresence[];
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
  const surfaceMap: { surface: string; charId: string; canonical: string; kind: EntityKind }[] = [];
  for (const e of entities) {
    const kind: EntityKind = e.kind ?? 'CHARACTER';
    surfaceMap.push({ surface: e.canonical, charId: e.charId, canonical: e.canonical, kind });
    for (const a of e.aliases) surfaceMap.push({ surface: a, charId: e.charId, canonical: e.canonical, kind });
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

    /* — annotation longest-match-first, marqueurs temporaires anti-réentrée.
     *   CHARACTER = sensible à la casse (un nom EST sa casse) ; lieux/événements/
     *   objets = insensibles (« Lettre » en tête de phrase = « lettre ») — */
    for (const s of surfaceMap) {
      const flags = s.kind === 'CHARACTER' ? 'gu' : 'giu';
      const re = new RegExp(`(?<!\\p{L})(${s.surface.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')})(?!['’\\p{L}])(?!\\{\\{)`, flags);
      text = text.replace(re, (_m, name: string) => {
        total += 1;
        resolved += 1;
        const key = `${ch.chapter}|${s.surface}|${s.charId}`;
        const cur = mentionCounts.get(key);
        if (cur === undefined) mentionCounts.set(key, { chapter: ch.chapter, surface: s.surface, charId: s.charId, kind: s.kind, count: 1 });
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

    /* — CONTRÔLE DE SITUATION (la demande exacte de l'Architecte) —
     *   vital n'a de sens que pour les PERSONNAGES (V1). */
    for (const e of entities) {
      if ((e.kind ?? 'CHARACTER') !== 'CHARACTER') continue;
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

  /* — carte de PRÉSENCE par chapitre et par type — */
  const allMentions = [...mentionCounts.values()];
  const presence: ChapterPresence[] = chapters.map((ch) => {
    const at = allMentions.filter((m) => m.chapter === ch.chapter);
    const ids = (k: EntityKind): readonly string[] => [...new Set(at.filter((m) => m.kind === k).map((m) => m.charId))].sort(compareStrings);
    return { chapter: ch.chapter, characters: ids('CHARACTER'), places: ids('PLACE'), events: ids('EVENT'), objects: ids('OBJECT') };
  });

  return ok({
    annotated: annotatedChapters.join('\n\n'),
    mentions: allMentions.sort((a, b) => a.chapter - b.chapter || compareStrings(a.charId, b.charId)),
    unresolved: [...unresolvedCounts.values()].sort((a, b) => b.count - a.count || compareStrings(a.name, b.name)),
    suspicions,
    presence,
    totalMentions: total,
    resolvedRate: total > 0 ? Number((resolved / total).toFixed(3)) : 1,
  });
}
