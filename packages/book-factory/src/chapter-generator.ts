/**
 * OMEGA Book-Factory — P2 — chapter generators
 *
 * A pluggable generator interface so the book-orchestrator loop is testable hors-LLM
 * (DeterministicChapterGenerator) and runnable with a real LLM (OllamaChapterGenerator,
 * gemma4:31b via Ollama REST, the proven local path — think:false, stream:false).
 *
 * The STRUCTURE (events / Bible) comes from the plan (deterministic, reliable); the generator
 * produces the PROSE. Extracting *new* events from prose (the hard NLP step) is deferred (P2+),
 * guarded by the SKEPTIC + EMP-19 calibration.
 */

import type { ChapterIntent } from './chapter-spec-to-intent.js';
import type { ChapterSpec } from './book-planner.js';

export interface GenRequest {
  readonly intent: ChapterIntent;
  readonly digest: string;
  readonly spec: ChapterSpec;
  readonly previousTail?: string; // last ~150 words of the previous chapter (local continuity)
}

export interface GenResult {
  readonly prose: string;
  readonly words: number;
  readonly model: string;
  readonly ms: number;
}

export interface ChapterGenerator {
  generate(req: GenRequest): Promise<GenResult>;
}

function countWords(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

/** Deterministic reference generator — proves the loop without any LLM. */
export class DeterministicChapterGenerator implements ChapterGenerator {
  async generate(req: GenRequest): Promise<GenResult> {
    const prose =
      `[CH${req.spec.index} · acte ${req.spec.act} · émotion ${req.intent.core_emotion} · ` +
      `cible ${req.intent.target_word_count} mots]\n` +
      `${req.intent.premise}\n` +
      (req.spec.seeds_to_plant.length > 0 ? `(graines plantées: ${req.spec.seeds_to_plant.join(', ')})\n` : '') +
      (req.spec.seeds_to_bloom.length > 0 ? `(graines récoltées: ${req.spec.seeds_to_bloom.join(', ')})\n` : '') +
      `--- digest ---\n${req.digest}`;
    return { prose, words: countWords(prose), model: 'deterministic', ms: 0 };
  }
}

const SYSTEM_PROMPT =
  "Tu es un romancier français de littérature de genre (polar, thriller). " +
  "Tu écris une prose sobre, tendue, concrète et sensorielle, en français impeccable. " +
  "Tu respectes l'objectif du chapitre et le contexte fournis. " +
  "Tu n'écris QUE la prose du chapitre (pas de titre, pas de notes, pas de méta-commentaire). " +
  "Tu ne révèles JAMAIS un indice qui n'est pas explicitement marqué « à faire éclater » ce chapitre.";

export interface OllamaOptions {
  readonly model?: string; // default gemma4:31b
  readonly url?: string; // default http://localhost:11434
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
}

/** Real LLM generator via local Ollama (POST /api/chat). gemma4:31b, think:false. */
export class OllamaChapterGenerator implements ChapterGenerator {
  constructor(private readonly opts: OllamaOptions = {}) {}

  async generate(req: GenRequest): Promise<GenResult> {
    const model = this.opts.model ?? 'gemma4:31b';
    const base = this.opts.url ?? 'http://localhost:11434';
    const user =
      `Contexte (ne pas recopier) :\n${req.digest}\n\n` +
      (req.previousTail !== undefined ? `Fin du chapitre précédent (enchaîne naturellement) :\n…${req.previousTail}\n\n` : '') +
      `Écris le chapitre ${req.spec.index} (~${req.intent.target_word_count} mots), ` +
      `émotion dominante « ${req.intent.core_emotion} ». Objectif : ${req.intent.premise}`;

    const body = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      stream: false,
      think: false,
      options: {
        temperature: this.opts.temperature ?? 0.8,
        num_predict: this.opts.maxTokens ?? 2048,
        top_p: 0.92,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 300000);
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { message?: { content?: string } };
      const raw = data.message?.content ?? '';
      const prose = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (prose.length === 0) throw new Error(`Ollama returned empty prose (model ${model}); ensure think:false.`);
      return { prose, words: countWords(prose), model, ms: Date.now() - t0 };
    } finally {
      clearTimeout(timer);
    }
  }
}
