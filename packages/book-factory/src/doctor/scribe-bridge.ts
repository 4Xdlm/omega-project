/**
 * OMEGA Book-Factory — PONT SCRIBE→DOCTOR (BF-08) — NCR-M0B TRANCHÉE par
 * l'Architecte (2026-06-06) : « scribe-engine réorienté comme moteur de
 * micro-réécriture au service du Doctor. NE DÉTRUIT RIEN — pont additif. »
 *
 * V1 DU PONT (sobriété assumée) : le port SURGICAL génère via Ollama (recette
 * prouvée) sous directive FACTUELLE N2-like, puis applique des GARDE-FOUS
 * déterministes book-factory : (a) anti-coaching audité sur la directive ;
 * (b) ANTI-INVENTION : aucune nouvelle entité capitalisée inconnue dans la
 * réécriture (le SURGICAL répare une contradiction, il n'introduit personne) ;
 * (c) bornes de longueur (un segment réparé reste un segment) ;
 * (d) tout refus ⇒ SEGMENT ORIGINAL (no-op sûr — jamais de dégradation).
 *
 * V2 DOCUMENTÉE (chemin exact, scribe-engine INTACT) : passer la réécriture
 * dans les gates RÉELS du scribe — `segmentPlan`→`buildSkeleton`→ProseDoc puis
 * `runBanalityGate`/`runQualityGate` (exports vérifiés de
 * packages/scribe-engine/src/index.ts) — exige de construire un ProseDoc
 * conforme (paragraphs structurés, prose_hash) : chantier propre dédié, pas un
 * bricolage de structures internes ici. La présente V1 rend le SURGICAL
 * EXÉCUTABLE dès aujourd'hui sans rien casser.
 */

import type { LlmRepairPort } from './repair-executor.js';

export interface ScribeBridgeOptions {
  readonly ollamaUrl?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  /** Entités connues (cast validé + lieux) — tout NOUVEAU nom propre = refus. */
  readonly knownEntities: readonly string[];
  /** Bornes de taille relative du segment réécrit. EXPERIMENTAL_DEFAULTS. */
  readonly minRatio?: number;
  readonly maxRatio?: number;
}

const FORBIDDEN_COACHING = /\b(magnifique|sublime|génial|excellent|meilleur|qualité|beau|belle|émouvant|puissant|profond)\b/iu;

/** Mots grammaticaux FR fréquents en tête de phrase — jamais des entités
 *  (le filtre lowercase-presence ne suffit pas sur les segments COURTS). */
const SENTENCE_HEAD_STOPLIST: ReadonlySet<string> = new Set([
  'Elle', 'Elles', 'Ils', 'Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Mais', 'Et', 'Puis', 'Alors',
  'Dans', 'Sur', 'Sous', 'Avec', 'Sans', 'Pour', 'Par', 'Quand', 'Comme', 'Rien', 'Tout', 'Tous',
  'Personne', 'Cette', 'Ces', 'Son', 'Ses', 'Leur', 'Leurs', 'Nous', 'Vous', 'Aucun', 'Chaque',
  // Interrogatifs/démonstratifs en tête de RÉPLIQUE (« Qui peut… ? ») — jamais
  // des entités. Trou réel attrapé par la fixture du SEAM_SURGEON.
  'Qui', 'Que', 'Quoi', 'Pourquoi', 'Comment', 'Quel', 'Quelle', 'Quels', 'Quelles',
  'Est', 'Sont', 'Voilà', 'Voici', 'Cela', 'Ceci', 'Celui', 'Celle',
]);

/** Nouveaux noms propres dans `next` absents de `prev` ET des entités connues. */
export function inventedEntities(prev: string, next: string, known: readonly string[]): readonly string[] {
  const NAME_RE = /(?<!\p{L})([A-ZÀÂÉÈÊËÎÏÔÛÙÜ][a-zàâçéèêëîïôûùüÿ]{2,})(?!['’\p{L}])/gu;
  const knownSet = new Set(known.map((k) => k.normalize('NFC')));
  const prevNames = new Set([...prev.normalize('NFC').matchAll(NAME_RE)].map((m) => m[1] ?? ''));
  // Vocabulaire minuscule du contexte : exclut les mots de début de phrase.
  const lowercaseVocab = new Set(
    `${prev} ${next}`.normalize('NFC').split(/[\s,;:!?.…«»"()—]+/u).filter((w) => /^[a-zàâçéèêëîïôûùüÿ-]{3,}$/u.test(w)),
  );
  const out: string[] = [];
  for (const m of next.normalize('NFC').matchAll(NAME_RE)) {
    const name = m[1];
    if (name === undefined || prevNames.has(name) || knownSet.has(name) || lowercaseVocab.has(name.toLowerCase()) || SENTENCE_HEAD_STOPLIST.has(name)) continue;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/** Port SURGICAL réel — Ollama + garde-fous, no-op sûr sur tout refus. */
export class ScribeGatedRepairPort implements LlmRepairPort {
  private readonly url: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly known: readonly string[];
  private readonly minRatio: number;
  private readonly maxRatio: number;

  constructor(opts: ScribeBridgeOptions) {
    this.url = opts.ollamaUrl ?? 'http://127.0.0.1:11434';
    this.model = opts.model ?? 'qwen3.5:35b-a3b';
    this.timeoutMs = opts.timeoutMs ?? 120_000;
    this.known = opts.knownEntities;
    this.minRatio = opts.minRatio ?? 0.4;
    this.maxRatio = opts.maxRatio ?? 1.6;
  }

  async rewriteSegment(directive: string, segment: string): Promise<string> {
    // (a) la directive DOIT être factuelle — coaching esthétique = refus immédiat.
    if (FORBIDDEN_COACHING.test(directive)) return segment;

    let prose: string;
    try {
      const res = await fetch(`${this.url}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model, stream: false, think: false,
          messages: [{
            role: 'user',
            content: `Réécris ce passage en corrigeant UNIQUEMENT le problème indiqué. Conserve le style, les personnages, les faits. N'ajoute aucun personnage ni lieu nouveau.\n${directive}\nPassage : ${segment}\nRéponds UNIQUEMENT par le passage corrigé.`,
          }],
          options: { temperature: 0.4, num_predict: 400 },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) return segment;
      const json = (await res.json()) as { message?: { content?: string } };
      prose = (json.message?.content ?? '').trim();
    } catch {
      return segment; // daemon down ⇒ no-op sûr
    }
    if (prose.length === 0) return segment;

    // (b) anti-invention : zéro nouvelle entité.
    if (inventedEntities(segment, prose, this.known).length > 0) return segment;
    // (c) bornes de taille.
    const ratio = prose.split(/\s+/u).length / Math.max(1, segment.split(/\s+/u).length);
    if (ratio < this.minRatio || ratio > this.maxRatio) return segment;

    return prose;
  }
}
