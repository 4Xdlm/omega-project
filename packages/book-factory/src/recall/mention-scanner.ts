/**
 * OMEGA Book-Factory — C2 MENTION-SCANNER (BF-08, CALC PUR)
 * Repère dans un texte : (a) les surfaces CONNUES de l'index d'alias (priorité au
 * match LE PLUS LONG — « Léna Marchetti » avant « Léna »), (b) les séquences
 * capitalisées INCONNUES (candidates entité neuve → escalade, jamais silence).
 *
 * MÉCANISME : normalisation identique à C1 (NFC+casefold) sur une copie indexée —
 * les offsets retournés pointent dans le texte NORMALISÉ (déterministes, INV-RECALL-005).
 * Frontières de mot Unicode-FR : lettres+tirets+apostrophes. Zéro regex backtracking
 * pathologique (scan linéaire par tokens).
 * LIMITES : détection d'inconnus = heuristique capitalisation (FR) ; les majuscules de
 * début de phrase sont filtrées par liste de mots-fonction — un nom propre qui EST un
 * mot-fonction capitalisé en début de phrase peut échapper (déclaré ; le filet réel des
 * entités CONNUES ne dépend pas de cette heuristique).
 */

import type { ResolutionContext } from '../identity/identity-types.js';
import type { CharacterRegistry } from '../identity/character-registry.js';
import type { Mention, NormalizedText } from './recall-types.js';

/** Normalisation alignée sur asAliasSurface (C1) — même monde lexical. */
export function normalizeText(raw: string): NormalizedText {
  return raw.normalize('NFC').toLowerCase() as NormalizedText;
}

const WORD_CHAR = /[\p{L}\p{M}'’-]/u;
/** Mots-fonction FR fréquents en tête de phrase (filtre faux-inconnus). Liste FERMÉE, documentée. */
const FR_SENTENCE_STARTERS: ReadonlySet<string> = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd’', "d'", 'au', 'aux', 'ce', 'cet', 'cette', 'ces',
  'il', 'elle', 'ils', 'elles', 'on', 'nous', 'vous', 'je', 'tu', 'et', 'mais', 'or', 'ni', 'car', 'donc',
  'quand', 'lorsque', 'puis', 'alors', 'dans', 'sur', 'sous', 'vers', 'chez', 'pour', 'par', 'avec', 'sans',
  'si', 'comme', 'après', 'avant', 'depuis', 'pendant', 'entre', 'rien', 'tout', 'toute', 'personne',
]);

interface Token { readonly text: string; readonly start: number; }

function tokenize(normalized: string): readonly Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i] ?? '';
    if (WORD_CHAR.test(ch)) {
      const start = i;
      while (i < normalized.length && WORD_CHAR.test(normalized[i] ?? '')) i += 1;
      tokens.push({ text: normalized.slice(start, i), start });
    } else {
      i += 1;
    }
  }
  return tokens;
}

/**
 * Scan principal. `knownSurfaces` = ensemble des surfaces normalisées du registre,
 * `maxWords` = longueur max (en mots) d'une surface connue (borne le lookahead).
 */
export function scanMentions(
  rawText: string,
  registry: CharacterRegistry,
  knownSurfaces: ReadonlySet<string>,
  ctx: ResolutionContext,
  maxWords: number,
): readonly Mention[] {
  const normalized = normalizeText(rawText);
  const rawNFC = rawText.normalize('NFC'); // pour la détection de capitales (même indexation que normalized)
  const tokens = tokenize(String(normalized));
  const mentions: Mention[] = [];
  let t = 0;
  while (t < tokens.length) {
    // (a) surfaces CONNUES — match le plus long d'abord (déterministe).
    // NOTE doctrine (revue C2 §1) : les PRONOMS ne passent jamais par cette heuristique —
    // ils sont des surfaces fermées résolues PRONOUN_UNRESOLVED au niveau C1 (FR_PRONOUNS).
    let matched = 0;
    for (let len = Math.min(maxWords, tokens.length - t); len >= 1; len -= 1) {
      const slice = tokens.slice(t, t + len);
      const first = slice[0];
      const last = slice[len - 1];
      if (first === undefined || last === undefined) continue;
      const candidate = String(normalized).slice(first.start, last.start + last.text.length).replace(/\s+/gu, ' ');
      if (knownSurfaces.has(candidate)) {
        mentions.push({
          kind: 'KNOWN',
          surfaceRaw: candidate,
          offset: first.start,
          resolution: registry.resolve(candidate, ctx),
        });
        matched = len;
        break;
      }
    }
    if (matched > 0) {
      t += matched;
      continue;
    }
    // (b) candidats INCONNUS : token capitalisé dans le brut, hors mots-fonction de tête
    const tok = tokens[t];
    if (tok !== undefined) {
      const rawCh = rawNFC[tok.start] ?? '';
      const isCapital = rawCh !== rawCh.toLowerCase();
      const prevCh = tok.start > 0 ? rawNFC.slice(0, tok.start).trimEnd().slice(-1) : '';
      const sentenceStart = tok.start === 0 || prevCh === '.' || prevCh === '!' || prevCh === '?' || prevCh === '«';
      const isStarter = FR_SENTENCE_STARTERS.has(tok.text);
      if (isCapital && !(sentenceStart && isStarter) && !isStarter) {
        // étend aux tokens capitalisés contigus (« Antoine Vasseur »)
        let end = t + 1;
        while (end < tokens.length) {
          const nt = tokens[end];
          if (nt === undefined) break;
          const c = rawNFC[nt.start] ?? '';
          if (c !== c.toLowerCase() && !FR_SENTENCE_STARTERS.has(nt.text)) end += 1;
          else break;
        }
        const lastTok = tokens[end - 1];
        if (!sentenceStart && lastTok !== undefined) {
          const surface = String(normalized)
            .slice(tok.start, lastTok.start + lastTok.text.length)
            .replace(/\s+/gu, ' ');
          mentions.push({ kind: 'UNKNOWN_CANDIDATE', surfaceRaw: surface, offset: tok.start });
        }
        t = end;
        continue;
      }
    }
    t += 1;
  }
  return mentions; // ordre = offsets croissants par construction (INV-RECALL-005)
}
