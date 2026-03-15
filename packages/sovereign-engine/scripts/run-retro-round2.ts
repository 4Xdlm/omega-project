/**
 * run-retro-round2.ts — Phase R Round 2 : Prompts complets
 * 
 * Pour chaque texte du corpus, demander au LLM de rédiger
 * le prompt COMPLET et DÉTAILLÉ qu'il aurait voulu recevoir
 * pour produire exactement cette prose.
 * 
 * Usage :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-retro-round2.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = resolve(__dirname, '..', 'retro-engineering');
const RESULTS_DIR = resolve(CORPUS_DIR, 'results-round2');

const MODEL = 'claude-sonnet-4-20250514';
const TEMPERATURE = 0;
const MAX_TOKENS = 8000;

mkdirSync(RESULTS_DIR, { recursive: true });

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  const client = new Anthropic({ apiKey });

  const corpusFiles = readdirSync(CORPUS_DIR)
    .filter(f => f.endsWith('.txt') && !f.startsWith('REF_'))
    .filter(f => f.startsWith('A') || f.startsWith('B'))
    .sort();

  console.log(`[RETRO-R2] Found ${corpusFiles.length} corpus files for round 2\n`);

  for (const file of corpusFiles) {
    const corpusId = file.replace('.txt', '');
    const text = readFileSync(resolve(CORPUS_DIR, file), 'utf-8').trim();
    const wordCount = text.split(/\s+/).length;

    console.log(`[RETRO-R2] Analyzing ${corpusId} (${wordCount} words)...`);

    const prompt = `Tu es un architecte de systèmes de génération littéraire IA.
Tu vas recevoir un texte littéraire de très haute qualité.

Ta mission : rédiger le PROMPT COMPLET et DÉTAILLÉ que tu aurais voulu
recevoir pour produire EXACTEMENT cette qualité de prose, ce rythme,
cette tension, cette densité, ce souffle.

Ce prompt doit être OPÉRATIONNEL — pas théorique. Un autre LLM qui
recevrait ton prompt devrait être capable de produire un texte de
qualité comparable (pas identique, mais de même niveau).

═══ TEXTE À REPRODUIRE ═══

${text}

═══ INSTRUCTIONS ═══

Rédige ta réponse en JSON avec cette structure EXACTE :

{
  "analysis": {
    "what_makes_this_text_exceptional": "...(2-3 phrases max)",
    "core_technique": "...(la technique littéraire dominante en 1 phrase)",
    "voice_signature": "...(ce qui rend cette voix unique en 1 phrase)"
  },
  "complete_prompt": {
    "system_instruction": "...(le rôle/persona à donner au LLM, 1-2 phrases)",
    "scene_context": "...(le contexte narratif complet : qui, où, quand, quoi, enjeux)",
    "emotional_trajectory": "...(la courbe émotionnelle en langage naturel, pas de chiffres)",
    "style_directives": [
      "...(directive 1 — la plus importante)",
      "...(directive 2)",
      "...(directive 3)",
      "...(max 5-7 directives, classées par importance)"
    ],
    "voice_anchor": "...(1 phrase qui capture le TON exact — l'ancre vocale)",
    "exemplar": "...(2-3 phrases EXTRAITES du texte qui servent d'exemple de qualité — le LLM les utilise comme calibration)",
    "interdictions": [
      "...(interdit 1 — le piège le plus dangereux)",
      "...(interdit 2)",
      "...(max 3 interdictions, pas plus)"
    ],
    "final_instruction": "...(la dernière phrase du prompt — celle qui reste en mémoire)"
  },
  "prompt_as_single_text": "...(le prompt complet assemblé en un seul texte fluide, prêt à copier-coller, entre 200 et 500 tokens)",
  "meta": {
    "estimated_tokens": <number>,
    "format_used": "...(narratif / structuré / mix)",
    "key_insight": "...(la chose la plus importante que ce prompt fait différemment d'un prompt standard)"
  }
}

RÈGLES :
- Le prompt doit être en FRANÇAIS (même langue que le texte cible).
- Le prompt doit être CONCIS mais COMPLET (200-500 tokens assemblé).
- Inclus un EXEMPLAR (extrait du texte) de 2-3 phrases comme ancre de qualité.
- Max 7 directives stylistiques. Max 3 interdictions. Pas plus.
- Le prompt doit être OPÉRATIONNEL — pas un essai littéraire SUR le texte.
- Le "prompt_as_single_text" est le livrable principal : le prompt prêt à l'emploi.

Réponds UNIQUEMENT en JSON valide. Pas de markdown. Pas de commentaires.`;

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '';
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { raw_response: raw, parse_error: true };
      }

      if (parsed.meta) {
        console.log(`[RETRO-R2]   Tokens: ${parsed.meta.estimated_tokens}`);
        console.log(`[RETRO-R2]   Format: ${parsed.meta.format_used}`);
        console.log(`[RETRO-R2]   Insight: ${(parsed.meta.key_insight || '').slice(0, 80)}...`);
      }
      if (parsed.prompt_as_single_text) {
        const promptWords = parsed.prompt_as_single_text.split(/\s+/).length;
        console.log(`[RETRO-R2]   Prompt: ${promptWords} mots`);
      }

      const result = {
        corpus_id: corpusId,
        corpus_file: file,
        word_count: wordCount,
        model: MODEL,
        temperature: TEMPERATURE,
        response: parsed,
        created_at: new Date().toISOString(),
      };

      const outPath = resolve(RESULTS_DIR, `${corpusId}_round2.json`);
      writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`[RETRO-R2]   Done → results-round2/${corpusId}_round2.json\n`);

    } catch (err: any) {
      console.error(`[RETRO-R2]   ERROR: ${err.message}`);
    }
  }

  // === COMPILATION ===
  console.log('[RETRO-R2] === COMPILATION ===\n');
  
  const resultFiles = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json')).sort();
  
  let report = '# PHASE R — ROUND 2 : PROMPTS COMPLETS\n\n';
  report += `Date : ${new Date().toISOString()}\nTextes analysés : ${resultFiles.length}\n\n---\n\n`;

  const allPrompts: { id: string; tokens: number; prompt: string; insight: string }[] = [];

  for (const rf of resultFiles) {
    const data = JSON.parse(readFileSync(resolve(RESULTS_DIR, rf), 'utf-8'));
    const r = data.response;
    
    if (r.parse_error) {
      report += `## ${data.corpus_id} — PARSE ERROR\n\n`;
      continue;
    }

    report += `## ${data.corpus_id} (${data.word_count} mots)\n\n`;
    
    if (r.analysis) {
      report += `**Ce qui rend ce texte exceptionnel** : ${r.analysis.what_makes_this_text_exceptional}\n\n`;
      report += `**Technique dominante** : ${r.analysis.core_technique}\n\n`;
      report += `**Signature vocale** : ${r.analysis.voice_signature}\n\n`;
    }

    if (r.complete_prompt) {
      const cp = r.complete_prompt;
      report += `### Directives stylistiques\n`;
      if (cp.style_directives) {
        for (const d of cp.style_directives) { report += `- ${d}\n`; }
      }
      report += '\n';
      if (cp.interdictions) {
        report += `### Interdictions\n`;
        for (const i of cp.interdictions) { report += `- ❌ ${i}\n`; }
        report += '\n';
      }
      if (cp.voice_anchor) {
        report += `### Ancre vocale\n> ${cp.voice_anchor}\n\n`;
      }
    }

    if (r.prompt_as_single_text) {
      report += `### PROMPT COMPLET (prêt à l'emploi)\n`;
      report += '```\n' + r.prompt_as_single_text + '\n```\n\n';
      allPrompts.push({
        id: data.corpus_id,
        tokens: r.meta?.estimated_tokens ?? 0,
        prompt: r.prompt_as_single_text,
        insight: r.meta?.key_insight ?? '',
      });
    }

    if (r.meta?.key_insight) {
      report += `**Insight clé** : ${r.meta.key_insight}\n\n`;
    }
    report += '---\n\n';
  }

  report += '## SYNTHÈSE\n\n';
  report += '| Texte | Tokens prompt | Insight |\n';
  report += '|-------|--------------|--------|\n';
  for (const p of allPrompts) {
    report += `| ${p.id} | ${p.tokens} | ${p.insight.slice(0, 60)}... |\n`;
  }
  
  if (allPrompts.length > 0) {
    const avgTokens = Math.round(allPrompts.reduce((s, p) => s + p.tokens, 0) / allPrompts.length);
    report += `\n**Moyenne tokens prompt** : ${avgTokens}\n`;
    report += `**Prompt V3 actuel** : ~15 476 tokens\n`;
    report += `**Ratio** : ${(15476 / avgTokens).toFixed(1)}x\n`;
  }

  const reportPath = resolve(CORPUS_DIR, 'RETRO_ROUND2_PROMPTS.md');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`[RETRO-R2] Report → retro-engineering/RETRO_ROUND2_PROMPTS.md`);
  console.log('[RETRO-R2] Complete.');
}

main().catch(err => {
  console.error('[RETRO-R2] FATAL:', err);
  process.exit(1);
});
