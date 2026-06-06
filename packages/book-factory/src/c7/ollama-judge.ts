/**
 * OMEGA — C8 — JUGE PAIRWISE OLLAMA RÉEL (BF-08) — l'instrument derrière le JudgePort.
 * Implémente PairwiseJudge avec le COUPLE EXACT gravé au registre (PAIRWISE_APPROVED,
 * signature Architecte 2026-06-06) : modèle + PERSONA_PROMPT figé + temp 0 + sortie A|B.
 * Power-On Self-Test (EMP-19) : à la CONSTRUCTION, le hash du prompt embarqué est
 * recomparé à la constante du registre — divergence ⇒ throw (jamais de juge dérivé).
 * LIMITES : appels réseau locaux (latence ~5-20 s/duel) — réservé étage B/offline ;
 * toute réponse hors {A,B} = TIE (jamais d'interprétation).
 */

import { sha256 } from '@omega/canon-kernel';

import type { PairwiseJudge } from '../loop/judge-port.js';
import { PERSONA_PROMPT, PERSONA_PROMPT_EXPECTED_SHA256 } from './persona-prompt.js';

export class OllamaPairwiseJudge implements PairwiseJudge {
  constructor(
    private readonly model: string,
    private readonly url = 'http://localhost:11434',
    private readonly timeoutMs = 90_000,
  ) {
    // Power-On Self-Test : l'instrument refuse de naître si le prompt a dérivé.
    // RÈGLE DE HASH UNIQUE : sha256 du prompt BRUT (= registre/profils, node crypto utf8).
    const actual = sha256(PERSONA_PROMPT);
    if (actual !== PERSONA_PROMPT_EXPECTED_SHA256) {
      throw new Error(`PERSONA_PROMPT dérivé (sha ${actual.slice(0, 12)}≠${PERSONA_PROMPT_EXPECTED_SHA256.slice(0, 12)}) — recalibration EMP-19 requise`);
    }
  }

  async compare(a: string, b: string): Promise<'A' | 'B' | 'TIE'> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.url}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          stream: false,
          think: false,
          options: { temperature: 0, num_predict: 8 },
          messages: [
            { role: 'system', content: PERSONA_PROMPT },
            { role: 'user', content: `EXTRAIT A :\n${a}\n\nEXTRAIT B :\n${b}\n\nTa réponse (A ou B) :` },
          ],
        }),
      });
      if (!res.ok) return 'TIE'; // panne = neutre, jamais un verdict inventé
      const data = (await res.json()) as { message?: { content?: string } };
      const raw = (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim().toUpperCase();
      const m = /\b([AB])\b/.exec(raw);
      return m?.[1] === 'A' ? 'A' : m?.[1] === 'B' ? 'B' : 'TIE';
    } finally {
      clearTimeout(timer);
    }
  }
}
