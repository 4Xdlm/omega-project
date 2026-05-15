/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ANTHROPIC PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/anthropic-provider.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Real SovereignProvider implementation using Anthropic API.
 * Uses synchronous HTTP via execSync (no async cascade).
 * Fail-closed: API errors throw immediately.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import type { SovereignProvider, CorrectionPitch } from '../types.js';
import type { AnthropicProviderConfig } from './live-types.js';

/**
 * Call Claude API synchronously via execSync
 * Returns response text or throws on error
 */
function callClaudeSync(
  systemPrompt: string,
  userPrompt: string,
  config: AnthropicProviderConfig,
  structured: boolean = false,
  maxTokensOverride?: number,
): string {
  if (!config.apiKey) {
    throw new Error('Anthropic API key required');
  }

  const temperature = structured ? 0.0 : config.draftTemperature;
  const maxTokens = maxTokensOverride ?? config.judgeMaxTokens;

  const requestBody = JSON.stringify({
    model: config.model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const script = `
    const https = require('https');
    let stdinBuf = '';
    process.stdin.on('data', (chunk) => stdinBuf += chunk);
    process.stdin.on('end', () => {
      const input = JSON.parse(stdinBuf);
      const data = input.body;
      const apiKey = input.apiKey;
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            process.stderr.write('API error ' + res.statusCode + ': ' + body);
            process.exit(1);
          }
          const parsed = JSON.parse(body);
          const text = parsed.content[0].text;
          process.stdout.write(text);
        });
      });
      req.on('error', (e) => { process.stderr.write(e.message); process.exit(1); });
      req.write(data);
      req.end();
    });
  `.replace(/\n/g, ' ');

  const stdinPayload = JSON.stringify({ body: requestBody, apiKey: config.apiKey });

  const MAX_RETRIES = 4;
  const RETRY_BASE_MS = 3000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use absolute node path to avoid PATH resolution issues on Windows cmd.exe
      const nodeExe = process.execPath;
      const result = execSync(`"${nodeExe}" -e "${script.replace(/"/g, '\\"')}"`, {
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 20 * 1024 * 1024,
        input: stdinPayload,
      });
      return result.trim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      // 400 credit balance — abort immediately, do not retry
      if (msg.includes('credit balance is too low') || msg.includes('400')) {
        if (msg.includes('credit balance is too low')) {
          throw new CreditExhaustedError('Anthropic credit balance exhausted — aborting run');
        }
      }

      // 529 overloaded / 503 upstream / 500 internal — exponential backoff with jitter
      // INV-PROVIDER-RETRY-01: All transient API errors must be retried.
      // 529 = overloaded, 503 = upstream connect error, 500 = internal server error.
      // These are infrastructure failures, not request errors — always retryable.
      const isRetryable = msg.includes('529') || msg.includes('overloaded')
        || msg.includes('503') || msg.includes('upstream connect')
        || (msg.includes('500') && msg.includes('Internal server error'));
      if (isRetryable) {
        if (attempt < MAX_RETRIES) {
          const jitter = Math.floor(Math.random() * 1000);
          const delay = RETRY_BASE_MS * Math.pow(2, attempt) + jitter;
          process.stderr.write(`[OMEGA] API transient error — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms\n`);
          // Synchronous sleep via execSync
          const nodeExe = process.execPath;
          execSync(`"${nodeExe}" -e "setTimeout(()=>{},${delay})"`, { timeout: delay + 1000 });
          continue;
        }
        throw new Error(`Claude API transient error after ${MAX_RETRIES} retries: ${msg.slice(0, 200)}`);
      }

      // Other errors — throw immediately
      throw new Error(`Claude API call failed: ${msg}`);
    }
  }

  throw new Error('Claude API call failed: exhausted retry loop (unreachable)');
}

// ── Credit Exhausted Error — sentinel for benchmark abort ——————————————————————————————————

export class CreditExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreditExhaustedError';
  }
}

/**
 * Strip markdown fences and quotes from LLM response
 */
function stripFences(text: string): string {
  let result = text.trim();
  // Remove code fences
  const fenced = result.match(/^```(?:markdown|text|json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenced) result = fenced[1].trim();
  // Remove leading/trailing quotes
  if (result.startsWith('"') && result.endsWith('"')) {
    result = result.slice(1, -1);
  }
  return result;
}

/**
 * Extract numeric score from LLM response.
 * Tries multiple patterns; last resort = scan all numbers and pick one in [0,100].
 */
function extractScore(response: string): number {
  const trimmed = response.trim();

  // Pattern 1: "Score: 85" or "Score: 85/100"
  const p1 = trimmed.match(/Score\s*:\s*(\d+(?:\.\d+)?)/i);
  if (p1) return clamp(parseFloat(p1[1]));

  // Pattern 2: "85/100" or "85 / 100"
  const p2 = trimmed.match(/(\d+(?:\.\d+)?)\s*\/\s*100/);
  if (p2) return clamp(parseFloat(p2[1]));

  // Pattern 3: standalone number on its own line
  const lines = trimmed.split('\n').map(l => l.trim());
  for (const line of lines) {
    if (/^\d+(?:\.\d+)?$/.test(line)) return clamp(parseFloat(line));
  }

  // Pattern 4: last number in [0,100] found anywhere in text
  const allNums = [...trimmed.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map(m => parseFloat(m[1]))
    .filter(n => n >= 0 && n <= 100);
  if (allNums.length > 0) return clamp(allNums[allNums.length - 1]);

  throw new Error(`Failed to extract score from response: ${trimmed.slice(0, 100)}`);
}

/**
 * P5A-FIX: Extract labeled score from structured LLM response.
 * Looks for a specific "LABEL: [score]" line first — avoids Pattern 4 false matches.
 * The label is case-insensitive and matches "LABEL: 85", "LABEL : 85", "LABEL:85/100".
 *
 * MECHANISM: The generic extractScore() fallback (Pattern 4: last number in text)
 * can match beat_count or other incidental numbers when the LLM truncates or
 * reformats its output. By targeting the exact label, we eliminate this class of
 * false extraction. If the label is not found, we compute the average of all
 * NAMED criteria scores (JUSTESSE, COUVERTURE, etc.) as a robust fallback.
 *
 * FAILURE MODE: If neither the label nor any criteria scores are found,
 * falls back to generic extractScore() — which may still be wrong, but this
 * path should be extremely rare with well-formatted prompts.
 */
function extractLabeledScore(response: string, label: string, criteriaLabels?: readonly string[]): number {
  const trimmed = response.trim();

  // Primary: Look for the specific summary label (e.g., "NECESSITY: 83")
  const labelRegex = new RegExp(`${label}\\s*:\\s*(\\d+(?:\\.\\d+)?)`, 'i');
  const match = trimmed.match(labelRegex);
  if (match) return clamp(parseFloat(match[1]));

  // Secondary: If criteria labels provided, compute their average
  if (criteriaLabels && criteriaLabels.length > 0) {
    const scores: number[] = [];
    for (const cl of criteriaLabels) {
      const clRegex = new RegExp(`${cl}\\s*:\\s*(\\d+(?:\\.\\d+)?)`, 'i');
      const clMatch = trimmed.match(clRegex);
      if (clMatch) scores.push(clamp(parseFloat(clMatch[1])));
    }
    if (scores.length >= 3) {
      // At least 3 of 5 criteria found — average is reliable
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      console.log(`[extractLabeledScore] Label "${label}" not found, computed avg from ${scores.length} criteria: ${avg.toFixed(1)}`);
      return Math.round(avg * 10) / 10;
    }
  }

  // Tertiary: fall back to generic extraction
  console.log(`[extractLabeledScore] WARN: Label "${label}" not found, falling back to generic extraction`);
  return extractScore(response);
}

function clamp(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

/**
 * Create Anthropic SovereignProvider
 */
export function createAnthropicProvider(config: AnthropicProviderConfig): SovereignProvider {
  return {
    async scoreInteriority(
      prose: string,
      context: { readonly pov: string; readonly character_state: string },
    ): Promise<number> {
      // INV-JUDGE-INTERIORITY-01: Literary-calibrated interiority scoring.
      // V0 used minimal prompt ("Rate interiority depth 0-100") — no rubric,
      // high variance, no discrimination criteria.
      // V1 recalibrates with 5 French criteria aligned with OMEGA doctrine:
      //   - Incarnation (thoughts in the body, not abstract)
      //   - Flux de conscience (organic flow, not mechanical monologue)
      //   - Filtre perceptif (world through character's prism)
      //   - Silence narratif (what is NOT said matters)
      //   - Profondeur du temps (inner time ≠ action time)
      const systemPrompt = `Tu es un évaluateur littéraire expert en prose française. Tu évalues la PROFONDEUR D'INTÉRIORITÉ : le texte fait-il vivre la conscience du personnage de l'intérieur ?

Évalue ces 5 critères de 0 à 100 :
1. INCARNATION : Les pensées sont-elles logées dans le corps (sensations, gestes, perceptions) plutôt que déclarées abstraitement ?
2. FLUX_CONSCIENCE : Y a-t-il un flux de pensée organique (associations, digressions, retours) ou un monologue mécanique ?
3. FILTRE_PERCEPTIF : Le monde est-il perçu à travers le prisme du personnage (sa mémoire, ses obsessions, ses angles morts) ?
4. SILENCE_NARRATIF : Ce qui n'est PAS dit est-il aussi important que ce qui est dit (non-dits, ellipses, sous-entendus) ?
5. PROFONDEUR_TEMPS : Le temps intérieur (mémoire, anticipation, dilatation) est-il différent du temps de l'action ?

Format de sortie (strictement) :
INCARNATION: [score]
FLUX_CONSCIENCE: [score]
FILTRE_PERCEPTIF: [score]
SILENCE_NARRATIF: [score]
PROFONDEUR_TEMPS: [score]
INTERIORITY: [moyenne]`;

      const userPrompt = `Évalue la profondeur d'intériorité de cette prose littéraire française.\nPOV: ${context.pov}\nÉtat émotionnel: ${context.character_state}\n\nProse :\n${prose}`;

      const interiorityConfig = { ...config, judgeMaxTokens: 300 };
      const response = callClaudeSync(systemPrompt, userPrompt, interiorityConfig, config.judgeStable);
      // P5A-FIX: Use labeled extraction for interiority
      const INTERIORITY_CRITERIA = ['INCARNATION', 'FLUX_CONSCIENCE', 'FILTRE_PERCEPTIF', 'SILENCE_NARRATIF', 'PROFONDEUR_TEMPS'] as const;
      return extractLabeledScore(response, 'INTERIORITY', INTERIORITY_CRITERIA);
    },

    async scoreSensoryDensity(prose: string, sensory_counts: Record<string, number>): Promise<number> {
      const systemPrompt = `You are a literary scoring engine. Return ONLY a single integer between 0 and 100. No explanation. No text. Just the number.`;
      const userPrompt = `Rate sensory density (0-100) of this prose.\nSensory Counts: ${JSON.stringify(sensory_counts)}\n\nProse:\n${prose}\n\nReturn ONLY the integer score:`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, config.judgeStable);
      return extractScore(response);
    },

    async scoreNecessity(prose: string, beat_count: number, beat_actions?: string, scene_goal?: string, conflict_type?: string): Promise<number> {
      // INV-JUDGE-NECESSITY-02: Literary-calibrated necessity scoring.
      // V1 (INV-JUDGE-NECESSITY-01) used utilitarian criteria:
      //   "no filler", "compressed storytelling", "every word earns its place"
      // This penalized literary respiration, sensory construction, temporal dilation.
      // Result: NEC=54-75 on dense literary prose (Flaubert would score ~65).
      //
      // V2 recalibrates for literary prose:
      //   - Respiration and atmosphere ARE necessary
      //   - Sensory density IS information
      //   - Temporal dilation IS compressed (emotionally, not factually)
      //   - Prompt in French (matching the prose language)
      //   - Reference: Flaubert/Proust/Duras = 90+ in necessity
      const systemPrompt = `Tu es un évaluateur littéraire expert en prose française. Tu évalues la NÉCESSITÉ NARRATIVE : chaque phrase sert-elle la scène ?

IMPORTANT — En littérature, la nécessité n'est PAS la concision utilitaire.
Sont NÉCESSAIRES :
- La construction d'atmosphère (lumière, sons, odeurs, textures)
- La respiration narrative (ralentissements qui créent la tension ou l'émotion)
- La dilatation temporelle (une seconde qui dure un paragraphe = densité émotionnelle)
- Les échos intérieurs (pensées, sensations, mémoire involontaire)
- Le silence narratif (ce qui n'est pas dit mais est montré par le corps)

N'est PAS nécessaire :
- La redite (même information reformulée)
- Le remplissage décoratif sans ancrage émotionnel ou sensoriel
- Les transitions mécaniques ("Puis il...", "Ensuite elle...")
- Les explications de ce qui est déjà montré
- Les descriptions qui ne servent ni l'atmosphère ni l'émotion

Référence de calibration : un passage de Madame Bovary (Flaubert) ou de L'Amant (Duras) où chaque phrase construit l'atmosphère doit obtenir 85-95.

Évalue ces 5 critères de 0 à 100 :
1. JUSTESSE : Chaque phrase apporte quelque chose (émotion, sensation, tension, image) — pas de redite
2. COUVERTURE : Les beats narratifs de la scène sont traités (${beat_count} beats attendus)
3. DENSITÉ_LITTÉRAIRE : Haute densité sensorielle et émotionnelle par phrase (pas informationnelle)
4. PROGRESSION : La scène avance (en tension, en émotion, en compréhension) — même si l'intrigue ne bouge pas
5. IRRÉDUCTIBILITÉ : Retirer une phrase abîmerait le tissu narratif

Format de sortie (strictement) :
JUSTESSE: [score]
COUVERTURE: [score]
DENSITÉ_LITTÉRAIRE: [score]
PROGRESSION: [score]
IRRÉDUCTIBILITÉ: [score]
NECESSITY: [moyenne]`;

      const contextLines: string[] = [`Nombre de beats: ${beat_count}`];
      if (scene_goal) contextLines.push(`Objectif de la scène: ${scene_goal}`);
      if (conflict_type) contextLines.push(`Type de conflit: ${conflict_type}`);
      if (beat_actions) contextLines.push(`Actions des beats: ${beat_actions}`);
      const userPrompt = `Évalue la nécessité narrative de cette prose littéraire française.\n${contextLines.join('\n')}\n\nProse :\n${prose}`;

      const necessityConfig = { ...config, judgeMaxTokens: 300 };
      const response = callClaudeSync(systemPrompt, userPrompt, necessityConfig, config.judgeStable);
      // P5A-FIX: Use labeled extraction to avoid beat_count false match
      const NECESSITY_CRITERIA = ['JUSTESSE', 'COUVERTURE', 'DENSIT', 'PROGRESSION', 'IRRÉDUCTIBILITÉ'] as const;
      return extractLabeledScore(response, 'NECESSITY', NECESSITY_CRITERIA);
    },

    async scoreImpact(
      opening: string,
      closing: string,
      context: { readonly story_premise: string },
    ): Promise<number> {
      // INV-JUDGE-IMPACT-01: Rubric-based impact scoring.
      // Previous prompt ("Rate narrative impact 0-100") returned 87 on 18/24 scenes.
      // At temp=0, the LLM cannot differentiate between a BRUTAL action scene and
      // an INTERIOR contemplation — both get 87.
      // Fix: evaluate 5 specific impact dimensions that vary by archetype.
      const systemPrompt = `You are a literary scoring engine for French literary prose. You evaluate narrative impact of opening and closing passages using 5 criteria.

For each criterion, give a score from 0 to 100:
1. HOOK: Opening immediately creates tension, curiosity, or sensory immersion (not generic scene-setting)
2. RESONANCE: Closing echoes or subverts the opening, creating emotional completion
3. SURPRISE: At least one unexpected image, reversal, or word choice that resists prediction
4. EMOTIONAL_PAYLOAD: The combined effect hits viscerally — the reader feels something specific
5. MEMORABILITY: A phrase or image that would linger after reading, distinct from generic literary prose

Output format (strictly):
HOOK: [score]
RESONANCE: [score]
SURPRISE: [score]
EMOTIONAL_PAYLOAD: [score]
MEMORABILITY: [score]
IMPACT: [average]`;

      const userPrompt = `Evaluate narrative impact of these opening and closing passages.\nStory Premise: ${context.story_premise}\n\nOpening:\n${opening}\n\nClosing:\n${closing}`;

      const impactConfig = { ...config, judgeMaxTokens: 300 };
      const response = callClaudeSync(systemPrompt, userPrompt, impactConfig, config.judgeStable);
      // P5A-FIX: Use labeled extraction for impact too
      const IMPACT_CRITERIA = ['HOOK', 'RESONANCE', 'SURPRISE', 'EMOTIONAL_PAYLOAD', 'MEMORABILITY'] as const;
      return extractLabeledScore(response, 'IMPACT', IMPACT_CRITERIA);
    },

    async applyPatch(
      prose: string,
      pitch: CorrectionPitch,
      constraints: { readonly canon: readonly string[]; readonly beats: readonly string[] },
    ): Promise<string> {
      const systemPrompt = `You are an expert literary editor. Tu corriges de la prose française littéraire premium. Apply the requested correction to the prose while respecting all constraints. La sortie DOIT rester en français. Return ONLY the revised prose, no commentary.`;
      // P3.1.1 FIX: CorrectionPitch shape is items[], not flat (correction_text/target_axis = undefined at runtime).
      // Iterate items[] and build structured corrections block preserving zone + axe + instruction per item.
      const correctionsBlock = pitch.items
        .map((item, i) => `${i + 1}. [${item.zone}] [axe=${item.expected_gain.axe}] ${item.instruction}`)
        .join('\n');
      const userPrompt = `Canon:\n${constraints.canon.join('\n')}\n\nBeats:\n${constraints.beats.join('\n')}\n\nStrategy: ${pitch.strategy}\nCorrections to apply:\n${correctionsBlock}\n\nProse:\n${prose}\n\nProvide revised prose:`;

      // P0-FIX: patchMaxTokens séparé du budget judge — fallback draftMaxTokens → 8192
      const patchBudget = config.patchMaxTokens ?? config.draftMaxTokens ?? 8192;
      const response = callClaudeSync(systemPrompt, userPrompt, config, false, patchBudget);
      return stripFences(response);
    },

    async generateDraft(prompt: string, mode: string, seed: string): Promise<string> {
      const systemPrompt = `You are a master prose writer. Écris EXCLUSIVEMENT en français littéraire premium — niveau prix Goncourt. Zéro anglais. Prose émotionnellement résonnante, sensoriellement riche, narrativement dense. Mode: ${mode}. Seed: ${seed}`;
      const userPrompt = prompt;

      // P0-FIX: draftMaxTokens séparé du budget judge — default 8192 (~2500 mots FR)
      const draftBudget = config.draftMaxTokens ?? 8192;
      const response = callClaudeSync(systemPrompt, userPrompt, config, false, draftBudget);
      return stripFences(response);
    },

    async generateStructuredJSON(prompt: string): Promise<unknown> {
      const systemPrompt = `You are a structured data extraction engine. Return ONLY valid JSON, no markdown fences, no commentary.`;
      // U-META-01: generateStructuredJSON requires larger token budget than judge scoring calls.
      // judgeMaxTokens=200 truncates JSON → parse fails → FAIL-CLOSED returns [] → metaphor_novelty=70.
      // Fix: dedicated budget of 800 tokens for structured extraction.
      const structuredConfig = { ...config, judgeMaxTokens: 800 };
      const response = callClaudeSync(systemPrompt, prompt, structuredConfig, true);
      const cleaned = stripFences(response);
      try {
        return JSON.parse(cleaned);
      } catch {
        throw new Error(`Failed to parse structured JSON from LLM: ${cleaned.slice(0, 200)}`);
      }
    },

    async rewriteSentence(
      sentence: string,
      reason: string,
      context: { readonly prev_sentence: string; readonly next_sentence: string },
    ): Promise<string> {
      const systemPrompt = `Tu es un chirurgien littéraire français. Tu réécris UNE SEULE phrase pour corriger un défaut précis. Règles strictes :
- La phrase réécrite DOIT rester en français littéraire premium
- La longueur doit rester dans ±20% de l'original
- Le sens narratif doit être préservé
- Retourne UNIQUEMENT la phrase réécrite, rien d'autre`;
      const userPrompt = `Contexte précédent : "${context.prev_sentence}"
Phrase à corriger : "${sentence}"
Contexte suivant : "${context.next_sentence}"

Défaut à corriger : ${reason}

Phrase réécrite :`;

      const response = callClaudeSync(systemPrompt, userPrompt, config, false);
      return stripFences(response);
    },
  };
}
