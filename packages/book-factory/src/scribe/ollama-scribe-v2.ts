/**
 * OMEGA — le générateur de production qui utilise la chaîne SCRIBE V2.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LE CHAÎNON MANQUANT
 * ══════════════════════════════════════════════════════════════════════════════
 * `scribe-v2.ts` compose les quatre étages mais ne connaît aucun fournisseur —
 * c'est ce qui le rend testable. Ce fichier est l'adaptateur : il implémente
 * `ChapterGenerator`, l'interface que `book-orchestrator` consomme déjà, et
 * branche la chaîne sur Ollama.
 *
 * ADDITIF PAR CONSTRUCTION. `OllamaChapterGenerator` reste intact et reste le
 * défaut. Celui-ci s'active par injection, comme le prévoit l'architecture :
 *
 *     new BookOrchestrator({ generator: new OllamaScribeV2Generator({ registry }) })
 *
 * Rien ne change tant que personne ne l'injecte.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT QUE L'ANCIEN NE FAISAIT PAS
 * ══════════════════════════════════════════════════════════════════════════════
 *   • il génère N candidats au lieu d'un (N=7, scellé R7) ;
 *   • il ouvre l'opportunité de période longue quand la scène la déclare ;
 *   • il pose les deux gardes anti-gabarit (configuration B1c, la gagnante) ;
 *   • il refuse ce qui est mesurablement fautif au lieu de prendre le plus long ;
 *   • il refuse une ouverture de période déjà servie DANS CE LIVRE ;
 *   • il scelle la typographie ;
 *   • il rend un journal d'admission au lieu d'un simple texte.
 *
 * Le registre de têtes vit à l'échelle du LIVRE, pas du chapitre : c'est
 * l'instance qui le porte. Un générateur = un livre.
 */
import type { ChapterGenerator, GenRequest, GenResult } from '../chapter-generator.js';
import { PeriodHeadRegistry } from './scribe-gate.js';
import { freezeCandidate, type PackSink } from './candidate-pack.js';
import {
  writeChapter,
  buildDirectiveBlock,
  type AdmissionLog,
  type ScribeDirectives,
} from './scribe-v2.js';

const SYSTEM_PROMPT =
  "Tu es un romancier français de littérature de genre (polar, thriller). " +
  "Tu écris une prose sobre, tendue, concrète et sensorielle, en français impeccable. " +
  "Tu respectes l'objectif du chapitre et le contexte fournis. " +
  "Tu n'écris QUE la prose du chapitre (pas de titre, pas de notes, pas de méta-commentaire). " +
  "Tu ne révèles JAMAIS un indice qui n'est pas explicitement marqué « à faire éclater » ce chapitre.";

export interface ScribeV2Options {
  readonly model?: string;
  readonly url?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
  /** Candidats par tentative. Défaut 7 (N=7, scellé R7). */
  readonly candidates?: number;
  /** Tentatives avant fallback A. Défaut 3. */
  readonly maxAttempts?: number;
  /** Veto langue dur. Défaut true. `false` = mise en service progressive. */
  readonly strictLang?: boolean;
  /** Registre partagé sur la durée du livre. Fourni = réutilisé, sinon créé. */
  readonly registry?: PeriodHeadRegistry;
  /** Gel des candidats BRUTS (Candidate Pack) — chaque candidat généré passe
   *  par ce sink AVANT toute sélection. Absent = aucun archivage (rétro-compat). */
  readonly packSink?: PackSink;
  /** Identifiant du pack (défaut : horodaté). */
  readonly packId?: string;
}

/** Ce que `GenRequest` ne porte pas encore : la scène ouvre-t-elle l'opportunité ? */
export interface SceneDirectives extends ScribeDirectives {
  readonly chapterIndex: number;
}

export class OllamaScribeV2Generator implements ChapterGenerator {
  private readonly opts: ScribeV2Options;
  readonly registry: PeriodHeadRegistry;
  private readonly logs: AdmissionLog[] = [];
  /**
   * Scènes qui ouvrent l'opportunité, par index de chapitre. Vide = aucune :
   * l'opportunité se DÉCLARE au plan, elle ne s'improvise pas au générateur
   * (FORBID-006 v2 §5 — c'est le PLAN qui porte le budget syntaxique).
   */
  private readonly sceneMap = new Map<number, ScribeDirectives>();

  constructor(opts: ScribeV2Options = {}) {
    this.opts = opts;
    this.registry = opts.registry ?? new PeriodHeadRegistry();
  }

  /** Déclare qu'un chapitre ouvre l'opportunité de période longue. */
  declareScene(d: SceneDirectives): void {
    this.sceneMap.set(d.chapterIndex, {
      longTailOpportunity: d.longTailOpportunity,
      antiTemplateGuards: d.antiTemplateGuards,
    });
  }

  /** Journal d'admission accumulé — un enregistrement par chapitre écrit. */
  admissionLogs(): readonly AdmissionLog[] {
    return [...this.logs];
  }

  private buildUser(req: GenRequest, directives: string): string {
    return (
      `Contexte (ne pas recopier) :\n${req.digest}\n\n` +
      (req.previousTail !== undefined
        ? `Fin du chapitre précédent (enchaîne naturellement) :\n…${req.previousTail}\n\n`
        : '') +
      `Écris le chapitre ${req.spec.index} (~${req.intent.target_word_count} mots), ` +
      `émotion dominante « ${req.intent.core_emotion} ». Objectif : ${req.intent.premise}` +
      (req.directives !== undefined && req.directives.trim().length > 0
        ? `\n\nCONTRAINTES À RESPECTER DANS CE CHAPITRE :\n${req.directives.trim()}`
        : '') +
      (directives.length > 0 ? `\n\n${directives}` : '')
    );
  }

  private async callOllama(user: string, seed: number | undefined): Promise<string> {
    const model = this.opts.model ?? 'gemma4:31b';
    const base = this.opts.url ?? 'http://localhost:11434';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 300000);
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: user },
          ],
          stream: false,
          think: false,
          options: {
            temperature: this.opts.temperature ?? 0.88,
            num_predict: this.opts.maxTokens ?? 3200,
            top_p: 0.92,
            ...(seed !== undefined ? { seed } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { message?: { content?: string } };
      return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
    } finally {
      clearTimeout(timer);
    }
  }

  async generate(req: GenRequest): Promise<GenResult> {
    const scene = this.sceneMap.get(req.spec.index) ?? {
      longTailOpportunity: false,
      antiTemplateGuards: false,
    };
    const directiveBlock = buildDirectiveBlock(scene);
    const user = this.buildUser(req, directiveBlock);
    const n = this.opts.candidates ?? 7;
    const model = this.opts.model ?? 'gemma4:31b';
    const t0 = Date.now();

    const packId = this.opts.packId ?? `pack_${new Date().toISOString().slice(0, 10)}`;
    const result = await writeChapter(
      async (attempt) => {
        const out: string[] = [];
        for (let i = 0; i < n; i += 1) {
          // Le seed varie par candidat ET par tentative : sans cela une
          // régénération redemanderait exactement la même chose. Rappel A3 :
          // le seed n'assure PAS la reproductibilité a temperature > 0, il ne
          // sert ici qu'a ne pas répéter la requête a l'identique.
          const seed = req.seed !== undefined ? req.seed + attempt * 1000 + i : undefined;
          const prose = await this.callOllama(user, seed);
          // Gel AVANT sélection : le pack contient aussi ce qui sera refusé —
          // c'est toute la valeur du rejeu contrefactuel.
          this.opts.packSink?.(
            freezeCandidate({
              packId,
              chapterIndex: req.spec.index,
              attempt,
              candidateIndex: i,
              prose,
              seed,
              model,
            }),
          );
          out.push(prose);
        }
        return out;
      },
      this.registry,
      {
        candidatesPerAttempt: n,
        maxAttempts: this.opts.maxAttempts ?? 3,
        ...(this.opts.strictLang !== undefined ? { strictLang: this.opts.strictLang } : {}),
      },
    );

    this.logs.push(result.log);
    return {
      prose: result.prose,
      words: result.log.words,
      model,
      ms: Date.now() - t0,
    };
  }
}
