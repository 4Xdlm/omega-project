/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — FULL OLLAMA PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 100% Ollama — prose + juges + corrections. 0€ API.
 * Même pipeline que anthropic-provider.ts, backend Ollama.
 *
 * Usage : OMEGA_OLLAMA_MODEL=qwen3:32b createOllamaProvider()
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import type { SovereignProvider, CorrectionPitch } from '../types.js';

export interface OllamaProviderConfig {
  readonly ollamaUrl?: string;
  readonly ollamaModel?: string;
  readonly draftTemperature?: number;
  readonly judgeTemperature?: number;
}

let _callCount = 0;

function callOllamaSync(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  ollamaUrl: string,
  temperature: number,
): string {
  _callCount++;
  const isQwen = model.toLowerCase().includes('qwen');
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    ...(isQwen ? { think: false } : {}),
    options: { temperature, num_predict: 8192, top_p: 0.92 },
  });

  const script = `
    const http = require('http');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const { body, url } = JSON.parse(stdinBuf);
      const parsed = new URL(url + '/api/chat');
      const req = http.request({
        hostname: parsed.hostname, port: parsed.port, path: parsed.pathname,
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) { process.stderr.write('Ollama error ' + res.statusCode + ': ' + data); process.exit(1); }
          const parsed = JSON.parse(data);
          process.stdout.write(parsed.message.content || '');
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(body);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, url: ollamaUrl });
  const nodeExe = process.execPath;
  const result = execSync(`"${nodeExe}" -e "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024, input: stdinPayload,
  });
  let cleaned = result.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return cleaned;
}

function stripFences(text: string): string {
  let result = text.trim();
  const fenced = result.match(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenced) result = fenced[1].trim();
  if (result.startsWith('"') && result.endsWith('"')) result = result.slice(1, -1);
  return result;
}

function clamp(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

function extractScore(response: string): number {
  const trimmed = response.trim();
  const p1 = trimmed.match(/Score\s*:\s*(\d+(?:\.\d+)?)/i);
  if (p1) return clamp(parseFloat(p1[1]));
  const p2 = trimmed.match(/(\d+(?:\.\d+)?)\s*\/\s*100/);
  if (p2) return clamp(parseFloat(p2[1]));
  const lines = trimmed.split('\n').map(l => l.trim());
  for (const line of lines) {
    if (/^\d+(?:\.\d+)?$/.test(line)) return clamp(parseFloat(line));
  }
  const allNums = [...trimmed.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map(m => parseFloat(m[1]))
    .filter(n => n >= 0 && n <= 100);
  if (allNums.length > 0) return clamp(allNums[allNums.length - 1]);
  console.warn(`[OLLAMA] Failed to extract score: ${trimmed.slice(0, 80)}`);
  return 50; // fallback — pas de crash
}

export function getOllamaCallCount(): number { return _callCount; }

export function createOllamaProvider(config?: OllamaProviderConfig): SovereignProvider {
  const url = config?.ollamaUrl ?? 'http://localhost:11434';
  const model = config?.ollamaModel ?? process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
  const draftTemp = config?.draftTemperature ?? 0.75;
  const judgeTemp = config?.judgeTemperature ?? 0.0;

  console.log(`[OLLAMA-PROVIDER] model=${model} url=${url} draftTemp=${draftTemp} judgeTemp=${judgeTemp}`);

  function draft(system: string, user: string): string {
    return callOllamaSync(system, user, model, url, draftTemp);
  }
  function judge(system: string, user: string): string {
    return callOllamaSync(system, user, model, url, judgeTemp);
  }

  return {
    async generateDraft(prompt: string, mode: string, seed: string): Promise<string> {
      console.log(`[OLLAMA] generateDraft mode=${mode} [#${_callCount + 1}]`);
      const sys = `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;
      return stripFences(draft(sys, prompt));
    },

    async scoreInteriority(prose: string, context: { readonly pov: string; readonly character_state: string }): Promise<number> {
      console.log(`[OLLAMA] scoreInteriority [#${_callCount + 1}]`);
      const sys = `Tu es un évaluateur littéraire expert. Évalue la PROFONDEUR D'INTÉRIORITÉ du texte (incarnation, flux de conscience, filtre perceptif, silence narratif, profondeur du temps). Réponds UNIQUEMENT par un score de 0 à 100. Format: "Score: XX"`;
      const user = `POV: ${context.pov}\nÉtat: ${context.character_state}\n\nTexte:\n${prose.slice(0, 3000)}`;
      return extractScore(judge(sys, user));
    },

    async scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number> {
      console.log(`[OLLAMA] scoreSensoryDensity [#${_callCount + 1}]`);
      const sys = `Tu es un évaluateur sensoriel. Évalue la RICHESSE SENSORIELLE du texte (vue, ouïe, toucher, odorat, goût, proprioception, intéroception). Score 0-100. Format: "Score: XX"`;
      const user = `Comptages sensoriels: ${JSON.stringify(sensory_counts)}\n\nTexte:\n${prose.slice(0, 3000)}`;
      return extractScore(judge(sys, user));
    },

    async scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number> {
      console.log(`[OLLAMA] scoreNecessity [#${_callCount + 1}]`);
      const sys = `Tu es un évaluateur narratif. Évalue la NÉCESSITÉ de chaque phrase : chaque phrase fait-elle avancer l'histoire, révèle-t-elle un personnage, ou intensifie-t-elle l'atmosphère ? Pénalise le remplissage, la redondance, les transitions mécaniques. Score 0-100. Format: "Score: XX"`;
      const user = `Beats attendus: ${beat_count}\nActions: ${beat_actions ?? 'N/A'}\nObjectif: ${scene_goal ?? 'N/A'}\nConflit: ${conflict_type ?? 'N/A'}\n\nTexte:\n${prose.slice(0, 3000)}`;
      return extractScore(judge(sys, user));
    },

    async scoreImpact(opening: string, closing: string, context: { readonly story_premise: string }): Promise<number> {
      console.log(`[OLLAMA] scoreImpact [#${_callCount + 1}]`);
      const sys = `Tu es un évaluateur littéraire. Évalue l'IMPACT émotionnel : le texte provoque-t-il une réaction viscérale, une surprise, une émotion forte ? Mesure la distance parcourue entre l'ouverture et la fermeture. Score 0-100. Format: "Score: XX"`;
      const user = `Prémisse: ${context.story_premise}\n\nOuverture:\n${opening}\n\nFermeture:\n${closing}`;
      return extractScore(judge(sys, user));
    },

    async applyPatch(prose: string, pitch: CorrectionPitch, constraints: { readonly canon: readonly string[] }): Promise<string> {
      console.log(`[OLLAMA] applyPatch strategy=${pitch.strategy} [#${_callCount + 1}]`);
      const sys = `Tu es un chirurgien de prose. Applique les corrections demandées en préservant la voix et le style. Retourne UNIQUEMENT le texte corrigé, sans explication.`;
      const items = pitch.items.map(i => `- Zone: ${i.zone} | Op: ${i.op} | Instruction: ${i.instruction}`).join('\n');
      const user = `Stratégie: ${pitch.strategy}\nCorrections:\n${items}\n\nTexte original:\n${prose.slice(0, 4000)}`;
      return stripFences(draft(sys, user));
    },

    async generateStructuredJSON(prompt: string): Promise<unknown> {
      console.log(`[OLLAMA] generateStructuredJSON [#${_callCount + 1}]`);
      const sys = `Tu es un assistant qui génère du JSON structuré. Réponds UNIQUEMENT avec du JSON valide. Pas de texte avant ou après. Pas de markdown fences.`;
      const raw = judge(sys, prompt);
      try {
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        return JSON.parse(cleaned);
      } catch {
        console.warn(`[OLLAMA] JSON parse failed, returning raw: ${raw.slice(0, 80)}`);
        return {};
      }
    },

    async rewriteSentence(sentence: string, reason: string, context: { readonly prev_sentence: string; readonly next_sentence: string }): Promise<string> {
      console.log(`[OLLAMA] rewriteSentence [#${_callCount + 1}]`);
      const sys = `Tu es un chirurgien de phrases. Réécris UNIQUEMENT la phrase demandée selon la raison donnée. Conserve le registre littéraire soutenu. Retourne UNIQUEMENT la phrase réécrite.`;
      const user = `Phrase précédente: ${context.prev_sentence}\nPhrase à réécrire: ${sentence}\nPhrase suivante: ${context.next_sentence}\nRaison: ${reason}`;
      return stripFences(draft(sys, user));
    },
  };
}
