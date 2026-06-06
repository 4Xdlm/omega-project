/**
 * OMEGA Book-Factory — C15 STYLE EXTRACTOR (BF-08) — le flux manquant :
 * texte de référence → fingerprint de style 10 paramètres [0,1].
 *
 * STRUCTURE-COMPATIBLE VoiceGenome (sovereign-engine, CODÉ/calibré Camus-
 * Proust-Simon) : MÊMES 10 champs, MÊME domaine [0,1] — la jonction future est
 * un passage de structure, zéro adaptation. sovereign-engine N'EST PAS modifié
 * ni importé (package séparé hors alias — couche, BF-04 esprit). L'extraction
 * exige un RightsTicket ANALYZE_STYLE (BF-14 : même l'analyse est gatée).
 *
 * MÉCANISME par champ (CALC, bornés par clamp01 sur des plages observées FR) :
 * longueurs de phrases, ratio dialogue, densité métaphorique (proxy comparatifs/
 * « comme »), registre (proxy mots longs), ironie (proxy antiphrases — FAIBLE,
 * documenté), ellipses, abstraction (suffixes -tion/-té/-isme), ponctuation
 * expressive, rythme de paragraphes, variété d'attaques de phrases.
 * LIMITES : l'ironie et le registre sont les proxys les plus faibles (V2 :
 * calibration corpus) ; fiable en COMPARAISON de textes, pas en absolu.
 */

import type { RightsTicket } from './rights-gate.js';
import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';

/** Mêmes 10 champs que VoiceGenome (sovereign-engine) — jonction sans friction. */
export interface StyleFingerprint {
  readonly phrase_length_mean: number;
  readonly dialogue_ratio: number;
  readonly metaphor_density: number;
  readonly language_register: number;
  readonly irony_level: number;
  readonly ellipsis_rate: number;
  readonly abstraction_ratio: number;
  readonly punctuation_style: number;
  readonly paragraph_rhythm: number;
  readonly opening_variety: number;
}

export type ExtractError = { readonly code: 'TEXT_TOO_SHORT'; readonly detail: string };

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Extrait le fingerprint d'un texte. EXIGE un ticket ANALYZE_STYLE (BF-14). */
export function extractStyleFingerprint(ticket: RightsTicket, text: string): Result<StyleFingerprint, ExtractError> {
  void ticket; // la PRÉSENCE du brand est la garantie — il ne peut venir que d'assertRights
  const t = text.normalize('NFC');
  const words = t.split(/\s+/u).filter((w) => w.length > 0);
  if (words.length < 200) return err({ code: 'TEXT_TOO_SHORT', detail: `${words.length} mots < 200 (fingerprint non significatif)` });

  const sentences = t.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter((s) => s.length > 0);
  const paragraphs = t.split(/\r?\n\s*\r?\n/u).filter((p) => p.trim().length > 0);
  const per1000 = (hits: number): number => (hits / words.length) * 1000;
  const count = (re: RegExp): number => (t.match(re) ?? []).length;

  // 1. Longueur de phrase moyenne — plage FR observée [5, 45] mots → [0,1].
  const meanLen = sentences.reduce((s, x) => s + x.split(/\s+/u).length, 0) / Math.max(1, sentences.length);
  // 2. Ratio dialogue — lignes ouvrant par tiret/guillemet.
  const dialogueLines = sentences.filter((s) => /^[«"—–-]/u.test(s)).length;
  // 3. Métaphore (proxy) : comparatifs + verbes d'image — densité [0, 12]/1000.
  const metaphor = per1000(count(/\b(comme (?:un|une|des|le|la|les)|pareil(?:le)? à|tel(?:le)?s? (?:un|une|que)|semblable à|on aurait dit)\b/giu));
  // 4. Registre (proxy) : part de mots ≥ 9 lettres — plage [0.05, 0.25].
  const longWords = words.filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 9).length / words.length;
  // 5. Ironie (proxy FAIBLE, documenté) : marqueurs d'antiphrase — [0, 3]/1000.
  const irony = per1000(count(/\b(évidemment|bien sûr|naturellement|sans doute|comme il se doit|à l'évidence)\b/giu));
  // 6. Ellipses — « … » et points de suspension — [0, 5]/1000.
  const ellipsis = per1000(count(/(?:\.\.\.|…)/gu));
  // 7. Abstraction : suffixes nominaux abstraits — plage [0.5, 6]/1000... mesuré /1000 [0, 60] → norm.
  const abstraction = per1000(count(/\b\p{L}+(?:tion|sion|té|isme|ance|ence|itude)s?\b/giu));
  // 8. Ponctuation expressive : ! ? ; : tirets — [0, 40]/1000.
  const punct = per1000(count(/[!?;:—–]/gu));
  // 9. Rythme de paragraphes : CV des longueurs (variété) — [0, 1.2].
  const pLens = paragraphs.map((p) => p.split(/\s+/u).length);
  const pMean = pLens.reduce((s, x) => s + x, 0) / Math.max(1, pLens.length);
  const pSd = Math.sqrt(pLens.reduce((s, x) => s + (x - pMean) ** 2, 0) / Math.max(1, pLens.length));
  const pCv = pMean > 0 ? pSd / pMean : 0;
  // 10. Variété d'attaques : premiers mots distincts / phrases — [0.2, 1].
  const openings = new Set(sentences.map((s) => (s.split(/\s+/u)[0] ?? '').toLowerCase().replace(/[^\p{L}]/gu, '')));
  const openingVariety = openings.size / Math.max(1, sentences.length);

  return ok({
    phrase_length_mean: clamp01((meanLen - 5) / 40),
    dialogue_ratio: clamp01(dialogueLines / Math.max(1, sentences.length) / 0.6),
    metaphor_density: clamp01(metaphor / 12),
    language_register: clamp01((longWords - 0.05) / 0.2),
    irony_level: clamp01(irony / 3),
    ellipsis_rate: clamp01(ellipsis / 5),
    abstraction_ratio: clamp01(abstraction / 60),
    punctuation_style: clamp01(punct / 40),
    paragraph_rhythm: clamp01(pCv / 1.2),
    opening_variety: clamp01((openingVariety - 0.2) / 0.8),
  });
}
