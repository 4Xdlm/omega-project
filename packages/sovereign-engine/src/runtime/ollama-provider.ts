/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — OLLAMA PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/ollama-provider.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * SovereignProvider implementation using local Ollama API.
 * Uses synchronous HTTP via execSync (mirrors anthropic-provider pattern).
 * Fail-closed: API errors throw immediately.
 *
 * Usage: OMEGA_PROVIDER=ollama OLLAMA_MODEL=mistral OLLAMA_URL=http://localhost:11434
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import type { SovereignProvider, CorrectionPitch } from '../types.js';

export interface OllamaProviderConfig {
  readonly model: string;           // e.g. 'mistral', 'llama3.1:8b'
  readonly baseUrl: string;         // e.g. 'http://localhost:11434'
  readonly draftTemperature: number;
  readonly judgeTemperature: number;
  readonly draftMaxTokens?: number;
  readonly judgeMaxTokens?: number;
  /**
   * P8-FIX: Ollama repeat_penalty — penalizes token repetition.
   * Default 1.4 (Ollama default is 1.1, raised aggressively after ch01 test
   * showed qwen3:32b still looping catastrophically at 1.15).
   * Range: 1.0 (no penalty) to 2.0 (max penalty).
   */
  readonly repeatPenalty?: number;
  /**
   * P8-FIX: Ollama frequency_penalty — reduces probability of repeated tokens.
   * Default 0.6 (raised from 0.3 — insufficient for qwen3:32b loops).
   * Range: 0.0 to 2.0.
   */
  readonly frequencyPenalty?: number;
  /**
   * P8-FIX: Ollama repeat_last_n — how many tokens to look back for repetition.
   * Default 256 (Ollama default is 64, too short for multi-paragraph loops).
   * Range: 0 (disabled) to context_size.
   */
  readonly repeatLastN?: number;
}

/**
 * Call Ollama API synchronously via execSync (mirrors anthropic-provider).
 */
function callOllamaSync(
  systemPrompt: string,
  userPrompt: string,
  config: OllamaProviderConfig,
  temperature?: number,
  maxTokensOverride?: number,
): string {
  const temp = temperature ?? config.judgeTemperature;
  const maxTokens = maxTokensOverride ?? config.judgeMaxTokens ?? 512;

  // CRITIQUE : think: false obligatoire pour les modèles avec mode thinking
  // (qwen3, gemma4, etc.) sinon le thinking consomme tout num_predict → 0 mots de sortie.
  // Appliqué à TOUS les modèles — le flag est ignoré par ceux qui ne le supportent pas.
  const requestBody = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    think: false,
    // F-T31-1: empêche eviction qwen3:32b entre chunks (KEEP_ALIVE default=5m insuffisant)
    // Per-request override → zéro side-effect cross-project (Ollama partagé entre projets)
    // Référence : NCR_OLLAMA_TIMEOUT_600S DRAFT, traite H2 (eviction). H1 (timeout 600s) reste à valider post-bench.
    keep_alive: '24h',
    options: {
      temperature: temp,
      num_predict: maxTokens,
      top_p: 0.92,
      // P8-FIX: Anti-repetition penalties for local LLMs (qwen3, llama, etc.)
      // Raised aggressively after ch01 test: qwen3:32b looped at 1.15/0.3
      // ("tombe. elle tombe." ×446, "il a vu" ×208, ratios 0.76-0.83)
      repeat_penalty: config.repeatPenalty ?? 1.4,
      frequency_penalty: config.frequencyPenalty ?? 0.6,
      repeat_last_n: config.repeatLastN ?? 256,
    },
  });

  const script = `
    const http = require('http');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const url = new URL('${config.baseUrl}/api/chat');
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 600000,
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            process.stderr.write('Ollama error ' + res.statusCode + ': ' + data);
            process.exit(1);
          }
          try {
            const parsed = JSON.parse(data);
            process.stdout.write(parsed.message?.content || '');
          } catch (e) {
            process.stderr.write('JSON parse error: ' + e.message + '\\nRaw: ' + data.slice(0, 500));
            process.exit(1);
          }
        });
      });
      req.on('error', (e) => {
        process.stderr.write('Ollama connection error: ' + e.message);
        process.exit(1);
      });
      req.on('timeout', () => {
        req.destroy();
        process.stderr.write('Ollama timeout after 600s');
        process.exit(1);
      });
      req.write(stdinBuf);
      req.end();
    });
  `;

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = execSync(
        `node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        {
          input: requestBody,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 660_000,
        },
      );
      return result.trim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        const delay = 2000 * (attempt + 1);
        console.error(`[OLLAMA] Error — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms: ${msg.slice(0, 200)}`);
        // Windows-compatible sleep: node -e with setTimeout
        execSync(`node -e "setTimeout(()=>{},${delay})"`, { timeout: delay + 5000 });
        continue;
      }
      throw new Error(`[OLLAMA] Failed after ${MAX_RETRIES + 1} attempts: ${msg.slice(0, 500)}`);
    }
  }
  throw new Error('[OLLAMA] Unreachable');
}

function stripFences(text: string): string {
  return text
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();
}

function extractScore(text: string, label: string): number {
  // Try labeled format: "LABEL: XX/100" or "LABEL = XX"
  const patterns = [
    new RegExp(`${label}[\\s:=]+([0-9]{1,3})`, 'i'),
    new RegExp(`\\b([0-9]{1,3})\\s*/\\s*100`, 'i'),
    new RegExp(`\\b([0-9]{1,3})\\b`, 'i'),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 0 && n <= 100) return n;
    }
  }
  console.error(`[OLLAMA] extractScore failed for "${label}" in: ${text.slice(0, 200)}`);
  return 50; // fail-safe neutral
}

/**
 * Create Ollama SovereignProvider
 */
export function createOllamaProvider(config: OllamaProviderConfig): SovereignProvider {
  return {
    async scoreInteriority(
      prose: string,
      context: { readonly pov: string; readonly character_state: string },
    ): Promise<number> {
      const systemPrompt = `Tu es un évaluateur littéraire expert. Évalue la PROFONDEUR D'INTÉRIORITÉ du texte.
Critères : incarnation des pensées, flux de conscience, filtre perceptif, silence narratif, profondeur temporelle.
Réponds UNIQUEMENT par un nombre entre 0 et 100. Format: INTERIORITY: XX`;

      const userPrompt = `POV: ${context.pov}\nÉtat: ${context.character_state}\n\nTexte:\n${prose.slice(0, 3000)}`;
      const response = callOllamaSync(systemPrompt, userPrompt, config, 0.0);
      return extractScore(response, 'INTERIORITY');
    },

    async scoreSensoryDensity(prose: string, _sensoryCounts: Record<string, number>): Promise<number> {
      const systemPrompt = `Tu es un évaluateur littéraire expert. Évalue la DENSITÉ SENSORIELLE du texte.
Le texte doit engager les 5 sens (vue, ouïe, toucher, odorat, goût) avec des détails concrets et spécifiques.
Réponds UNIQUEMENT par un nombre entre 0 et 100. Format: SENSORY: XX`;

      const userPrompt = `Texte:\n${prose.slice(0, 3000)}`;
      const response = callOllamaSync(systemPrompt, userPrompt, config, 0.0);
      return extractScore(response, 'SENSORY');
    },

    async scoreNecessity(prose: string): Promise<number> {
      const systemPrompt = `Tu es un évaluateur littéraire expert. Évalue la NÉCESSITÉ NARRATIVE de chaque phrase.
Chaque phrase porte-t-elle un poids narratif irréductible ? Y a-t-il du remplissage, des transitions molles, des répétitions déguisées ?
Réponds UNIQUEMENT par un nombre entre 0 et 100. Format: NECESSITY: XX`;

      const userPrompt = `Texte:\n${prose.slice(0, 3000)}`;
      const response = callOllamaSync(systemPrompt, userPrompt, config, 0.0);
      return extractScore(response, 'NECESSITY');
    },

    async scoreImpact(prose: string): Promise<number> {
      const systemPrompt = `Tu es un évaluateur littéraire expert. Évalue l'IMPACT ÉMOTIONNEL du texte.
Le texte crée-t-il une réponse émotionnelle forte chez le lecteur ? La tension monte-t-elle ? Le climax est-il puissant ?
Réponds UNIQUEMENT par un nombre entre 0 et 100. Format: IMPACT: XX`;

      const userPrompt = `Texte:\n${prose.slice(0, 3000)}`;
      const response = callOllamaSync(systemPrompt, userPrompt, config, 0.0);
      return extractScore(response, 'IMPACT');
    },

    async applyPatch(
      prose: string,
      pitch: CorrectionPitch,
      _constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] },
    ): Promise<string> {
      const systemPrompt = `Tu es un éditeur littéraire expert. Corrige la prose française selon les instructions.
Retourne UNIQUEMENT la prose corrigée, sans commentaire.`;
      // P3.1.1 FIX: CorrectionPitch shape is items[], not flat (correction_text/target_axis = undefined at runtime).
      const correctionsBlock = pitch.items
        .map((item, i) => `${i + 1}. [${item.zone}] [axe=${item.expected_gain.axe}] ${item.instruction}`)
        .join('\n');
      const userPrompt = `Stratégie: ${pitch.strategy}\nCorrections à appliquer:\n${correctionsBlock}\n\nProse:\n${prose}`;
      const draftBudget = config.draftMaxTokens ?? 4096;
      return stripFences(callOllamaSync(systemPrompt, userPrompt, config, config.draftTemperature, draftBudget));
    },

    async generateDraft(prompt: string, mode: string, seed: string): Promise<string> {
      const systemPrompt = `Tu es un maître de la prose française littéraire — niveau prix Goncourt. Écris EXCLUSIVEMENT en français littéraire premium. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;
      const draftBudget = config.draftMaxTokens ?? 4096;
      return stripFences(callOllamaSync(systemPrompt, prompt, config, config.draftTemperature, draftBudget));
    },

    async generateStructuredJSON(prompt: string): Promise<unknown> {
      const systemPrompt = `Tu es un moteur d'extraction de données structurées. Retourne UNIQUEMENT du JSON valide, sans markdown, sans commentaire.`;
      const response = callOllamaSync(systemPrompt, prompt, config, 0.0, 800);
      const cleaned = stripFences(response);
      try {
        return JSON.parse(cleaned);
      } catch {
        console.error(`[OLLAMA] JSON parse failed: ${cleaned.slice(0, 200)}`);
        return [];
      }
    },

    async rewriteSentence(
      sentence: string,
      reason: string,
      context: { readonly prev_sentence: string; readonly next_sentence: string },
    ): Promise<string> {
      const systemPrompt = `Tu es un écrivain littéraire expert. Réécris la phrase selon l'instruction.
Retourne UNIQUEMENT la phrase réécrite.`;
      const contextStr = `[avant] ${context.prev_sentence}\n[après] ${context.next_sentence}`;
      const userPrompt = `Contexte:\n${contextStr}\n\nPhrase originale: "${sentence}"\n\nInstruction: ${reason}`;
      return stripFences(callOllamaSync(systemPrompt, userPrompt, config, config.draftTemperature, 200));
    },
  };
}
