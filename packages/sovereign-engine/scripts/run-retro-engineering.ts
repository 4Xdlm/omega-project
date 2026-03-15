/**
 * run-retro-engineering.ts — Phase R : Interrogation LLM
 * Phase R — Retro-Engineering Cognitif
 *
 * Reads corpus files and asks the LLM structured questions about
 * what instructions it would need to produce that quality of prose.
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-retro-engineering.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = resolve(__dirname, '..', 'retro-engineering');
const RESULTS_DIR = resolve(CORPUS_DIR, 'results');

// ── Configuration ───────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0.0;
const MAX_TOKENS = 4000;

// ── Prompts ─────────────────────────────────────────────────────────────────

function buildPromptAB(texte: string): string {
  return `Tu es un expert en prompt engineering pour la génération
de prose littéraire française. Tu vas analyser un texte et déterminer
rétrospectivement quelles instructions tu aurais eu besoin de recevoir
pour produire EXACTEMENT ce niveau de qualité toi-même.

NE GÉNÈRE PAS de prose. NE COMMENTE PAS la qualité littéraire.
CONCENTRE-TOI uniquement sur les INSTRUCTIONS dont tu aurais besoin.

═══ TEXTE À ANALYSER ═══
${texte}

═══ QUESTIONS (réponds à CHACUNE séparément, en JSON) ═══

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "Q1_format_preference": {
    "preferred": "(a) liste à puces hiérarchisée | (b) blocs XML/JSON | (c) paragraphes narratifs | (d) pseudo-code | (e) mix",
    "justification": "..."
  },
  "Q2_ingestion_order": {
    "ranked_elements": [
      {"rank": 1, "element": "...", "reason": "..."},
      {"rank": 2, "element": "...", "reason": "..."},
      {"rank": 3, "element": "...", "reason": "..."},
      {"rank": 4, "element": "...", "reason": "..."},
      {"rank": 5, "element": "...", "reason": "..."}
    ]
  },
  "Q3_saturation_point": {
    "max_simultaneous_constraints": 0,
    "explanation": "...",
    "what_breaks_first": "..."
  },
  "Q4_top5_constraints": [
    {"constraint": "...", "why_essential": "..."},
    {"constraint": "...", "why_essential": "..."},
    {"constraint": "...", "why_essential": "..."},
    {"constraint": "...", "why_essential": "..."},
    {"constraint": "...", "why_essential": "..."}
  ],
  "Q5_harmful_instructions": [
    {"instruction_type": "...", "why_harmful": "..."}
  ],
  "Q6_implicit_vs_explicit": {
    "must_be_explicit": ["...", "..."],
    "must_stay_implicit": ["...", "..."],
    "reason": "..."
  },
  "Q7_exemplar_vs_rules": {
    "preference": "exemplar | rules | both",
    "ideal_exemplar_length_words": 0,
    "explanation": "..."
  },
  "Q8_ideal_prompt": {
    "prompt_text": "... (le prompt EXACT que tu voudrais recevoir, max 400 tokens)",
    "token_count_estimate": 0
  }
}

IMPORTANT : Réponds UNIQUEMENT en JSON. Pas de texte avant ou après.
Pas de markdown. Pas de commentaires.`;
}

function buildPromptC(texte: string): string {
  return `Tu es un critique littéraire exigeant et un expert en
prompt engineering. Tu vas analyser un texte FAIBLE et déterminer ce
qui manque et quel type d'instruction aurait empêché les défauts.

═══ TEXTE FAIBLE À ANALYSER ═══
${texte}

═══ QUESTIONS (réponds en JSON) ═══

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "QC1_fundamental_lacks": ["...", "..."],
  "QC2_instructions_that_would_prevent": [
    {"defect": "...", "instruction_needed": "..."}
  ],
  "QC3_constraint_diagnosis": {
    "too_many_or_too_few": "too_many | too_few | wrong_type",
    "explanation": "..."
  },
  "QC4_top3_phrases_to_fix": [
    {"phrase_index": 1, "original": "...", "problem": "...", "suggested_fix": "..."},
    {"phrase_index": 2, "original": "...", "problem": "...", "suggested_fix": "..."},
    {"phrase_index": 3, "original": "...", "problem": "...", "suggested_fix": "..."}
  ]
}

IMPORTANT : Réponds UNIQUEMENT en JSON. Pas de texte avant ou après.
Pas de markdown. Pas de commentaires.`;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  mkdirSync(RESULTS_DIR, { recursive: true });

  const client = new Anthropic({ apiKey });

  // Discover corpus files
  const corpusFiles = readdirSync(CORPUS_DIR)
    .filter(f => f.endsWith('.txt') && (f.startsWith('A') || f.startsWith('B') || f.startsWith('C')))
    .sort();

  console.log(`[RETRO] Found ${corpusFiles.length} corpus files\n`);

  for (const file of corpusFiles) {
    const filePath = resolve(CORPUS_DIR, file);
    const texte = readFileSync(filePath, 'utf-8').trim();

    if (!texte || texte.length < 50) {
      console.log(`[RETRO] SKIP ${file} — too short (${texte.length} chars)`);
      continue;
    }

    const wordCount = texte.split(/\s+/).length;
    const family = file.startsWith('C') ? 'C' : 'AB';
    const id = basename(file, '.txt');

    console.log(`[RETRO] Analyzing ${id} (${wordCount} words, family ${family})...`);

    const prompt = family === 'C' ? buildPromptC(texte) : buildPromptAB(texte);

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content
        .filter(c => c.type === 'text')
        .map(c => (c as { type: 'text'; text: string }).text)
        .join('');

      // Try to parse JSON
      let parsed: unknown;
      try {
        // Strip potential markdown code fences
        const cleaned = responseText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.warn(`[RETRO] WARNING: ${id} — response is not valid JSON, saving raw`);
        parsed = { raw_response: responseText, parse_error: true };
      }

      // Log key findings
      if (family === 'AB' && parsed && typeof parsed === 'object' && !('parse_error' in (parsed as any))) {
        const p = parsed as any;
        const format = p.Q1_format_preference?.preferred ?? '?';
        const saturation = p.Q3_saturation_point?.max_simultaneous_constraints ?? '?';
        console.log(`[RETRO]   Q1 format: ${format}`);
        console.log(`[RETRO]   Q3 saturation: ${saturation} constraints max`);
      }

      // Save
      const outPath = resolve(RESULTS_DIR, `${id}_responses.json`);
      const result = {
        corpus_id: id,
        corpus_file: file,
        word_count: wordCount,
        family,
        model: MODEL,
        temperature: TEMPERATURE,
        response: parsed,
        created_at: new Date().toISOString(),
      };
      writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`[RETRO]   Done → results/${id}_responses.json\n`);

    } catch (err) {
      console.error(`[RETRO] ERROR on ${id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('[RETRO] All analyses complete.');
}

main().catch(err => {
  console.error('[RETRO] FATAL:', err);
  process.exit(1);
});
