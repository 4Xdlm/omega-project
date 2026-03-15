/**
 * compile-retro-results.ts — Phase R : Compile results into report
 * Phase R — Retro-Engineering Cognitif
 *
 * Reads all JSON results from retro-engineering/results/ and produces
 * a convergence matrix + diff with V3 prompt + final report.
 *
 * 0 API — pure analysis.
 *
 * Usage:
 *   npx tsx scripts/compile-retro-results.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RETRO_DIR = resolve(__dirname, '..', 'retro-engineering');
const RESULTS_DIR = resolve(RETRO_DIR, 'results');

// ── Types ───────────────────────────────────────────────────────────────────

interface ABResponse {
  Q1_format_preference: { preferred: string; justification: string };
  Q2_ingestion_order: { ranked_elements: { rank: number; element: string; reason: string }[] };
  Q3_saturation_point: { max_simultaneous_constraints: number; explanation: string; what_breaks_first: string };
  Q4_top5_constraints: { constraint: string; why_essential: string }[];
  Q5_harmful_instructions: { instruction_type: string; why_harmful: string }[];
  Q6_implicit_vs_explicit: { must_be_explicit: string[]; must_stay_implicit: string[]; reason: string };
  Q7_exemplar_vs_rules: { preference: string; ideal_exemplar_length_words: number; explanation: string };
  Q8_ideal_prompt: { prompt_text: string; token_count_estimate: number };
}

interface CResponse {
  QC1_fundamental_lacks: string[];
  QC2_instructions_that_would_prevent: { defect: string; instruction_needed: string }[];
  QC3_constraint_diagnosis: { too_many_or_too_few: string; explanation: string };
  QC4_top3_phrases_to_fix: { phrase_index: number; original: string; problem: string; suggested_fix: string }[];
}

interface ResultFile {
  corpus_id: string;
  corpus_file: string;
  word_count: number;
  family: string;
  response: ABResponse | CResponse | { raw_response: string; parse_error: boolean };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function countOccurrences<T>(items: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

function isABResponse(r: unknown): r is ABResponse {
  return !!r && typeof r === 'object' && 'Q1_format_preference' in (r as any);
}

function isCResponse(r: unknown): r is CResponse {
  return !!r && typeof r === 'object' && 'QC1_fundamental_lacks' in (r as any);
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  if (!existsSync(RESULTS_DIR)) {
    console.error('[COMPILE] No results directory found. Run run-retro-engineering.ts first.');
    process.exit(1);
  }

  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('_responses.json'));
  if (files.length === 0) {
    console.error('[COMPILE] No result files found.');
    process.exit(1);
  }

  console.log(`[COMPILE] Found ${files.length} result files\n`);

  const abResults: { id: string; wordCount: number; response: ABResponse }[] = [];
  const cResults: { id: string; wordCount: number; response: CResponse }[] = [];

  for (const file of files) {
    const data: ResultFile = JSON.parse(readFileSync(resolve(RESULTS_DIR, file), 'utf-8'));
    if (isABResponse(data.response)) {
      abResults.push({ id: data.corpus_id, wordCount: data.word_count, response: data.response });
    } else if (isCResponse(data.response)) {
      cResults.push({ id: data.corpus_id, wordCount: data.word_count, response: data.response });
    } else {
      console.warn(`[COMPILE] SKIP ${file} — parse error or unknown format`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD REPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const lines: string[] = [];

  lines.push('# OMEGA — RETRO-ENGINEERING COGNITIF LLM — RAPPORT R-FINAL');
  lines.push('');
  lines.push(`Date : ${new Date().toISOString()}`);
  lines.push(`Textes analysés : ${abResults.length} (Famille A+B) + ${cResults.length} (Famille C)`);
  lines.push('');

  // ── 1. Corpus ─────────────────────────────────────────────────────────────

  lines.push('## 1. Corpus analysé');
  lines.push('');
  lines.push('| ID | Mots | Famille |');
  lines.push('|----|------|---------|');
  for (const r of [...abResults, ...cResults]) {
    const family = cResults.some(c => c.id === r.id) ? 'C' : 'A/B';
    lines.push(`| ${r.id} | ${r.wordCount} | ${family} |`);
  }
  lines.push('');

  // ── 2. Matrice de convergence ─────────────────────────────────────────────

  lines.push('## 2. Matrice de convergence');
  lines.push('');

  if (abResults.length > 0) {
    // Q1 — Format
    lines.push('### Q1 — Format préféré');
    const formats = abResults.map(r => r.response.Q1_format_preference.preferred);
    const formatCounts = countOccurrences(formats);
    lines.push('| Format | Votes | % |');
    lines.push('|--------|-------|---|');
    for (const [fmt, count] of [...formatCounts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${fmt} | ${count} | ${Math.round(count / abResults.length * 100)}% |`);
    }
    lines.push('');

    // Q2 — Ordre d'ingestion
    lines.push('### Q2 — Ordre d\'ingestion optimal');
    const top3Elements: string[] = [];
    for (const r of abResults) {
      const ranked = r.response.Q2_ingestion_order.ranked_elements;
      for (const el of ranked.slice(0, 3)) {
        top3Elements.push(el.element);
      }
    }
    const elementCounts = countOccurrences(top3Elements);
    lines.push('| Élément | Fréquence top 3 |');
    lines.push('|---------|-----------------|');
    for (const [el, count] of [...elementCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`| ${el} | ${count}/${abResults.length} |`);
    }
    lines.push('');

    // Q3 — Saturation
    lines.push('### Q3 — Seuil de saturation');
    const saturations = abResults.map(r => r.response.Q3_saturation_point.max_simultaneous_constraints);
    const avgSat = saturations.reduce((s, x) => s + x, 0) / saturations.length;
    lines.push(`- Moyenne : ${avgSat.toFixed(1)} contraintes simultanées max`);
    lines.push(`- Min : ${Math.min(...saturations)} | Max : ${Math.max(...saturations)}`);
    lines.push('');
    lines.push('Ce qui casse en premier :');
    for (const r of abResults) {
      lines.push(`- ${r.id} : "${r.response.Q3_saturation_point.what_breaks_first}"`);
    }
    lines.push('');

    // Q4 — Top contraintes
    lines.push('### Q4 — Top contraintes (les plus citées)');
    const allConstraints: string[] = [];
    for (const r of abResults) {
      for (const c of r.response.Q4_top5_constraints) {
        allConstraints.push(c.constraint);
      }
    }
    const constraintCounts = countOccurrences(allConstraints);
    lines.push('| Contrainte | Fréquence |');
    lines.push('|------------|-----------|');
    for (const [c, count] of [...constraintCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      lines.push(`| ${c} | ${count} |`);
    }
    lines.push('');

    // Q5 — Nuisibles
    lines.push('### Q5 — Contraintes nuisibles');
    lines.push('| Type | Source | Pourquoi |');
    lines.push('|------|--------|----------|');
    for (const r of abResults) {
      for (const h of r.response.Q5_harmful_instructions) {
        lines.push(`| ${h.instruction_type} | ${r.id} | ${h.why_harmful} |`);
      }
    }
    lines.push('');

    // Q6 — Implicite vs Explicite
    lines.push('### Q6 — Implicite vs Explicite');
    const allExplicit: string[] = [];
    const allImplicit: string[] = [];
    for (const r of abResults) {
      allExplicit.push(...r.response.Q6_implicit_vs_explicit.must_be_explicit);
      allImplicit.push(...r.response.Q6_implicit_vs_explicit.must_stay_implicit);
    }
    lines.push('**Doit être explicite :**');
    for (const [item, count] of [...countOccurrences(allExplicit).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`- ${item} (${count}x)`);
    }
    lines.push('');
    lines.push('**Doit rester implicite :**');
    for (const [item, count] of [...countOccurrences(allImplicit).entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      lines.push(`- ${item} (${count}x)`);
    }
    lines.push('');

    // Q7 — Exemplar vs Rules
    lines.push('### Q7 — Exemplar vs Rules');
    const prefs = abResults.map(r => r.response.Q7_exemplar_vs_rules.preference);
    const prefCounts = countOccurrences(prefs);
    lines.push('| Préférence | Votes |');
    lines.push('|------------|-------|');
    for (const [p, count] of [...prefCounts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${p} | ${count} |`);
    }
    const exemplarLengths = abResults.map(r => r.response.Q7_exemplar_vs_rules.ideal_exemplar_length_words);
    lines.push(`Taille idéale exemplar : ${Math.round(exemplarLengths.reduce((s, x) => s + x, 0) / exemplarLengths.length)} mots (moyenne)`);
    lines.push('');

    // Q8 — Prompts idéaux
    lines.push('### Q8 — Prompts idéaux (extraits)');
    for (const r of abResults) {
      lines.push(`#### ${r.id}`);
      lines.push('```');
      lines.push(r.response.Q8_ideal_prompt.prompt_text);
      lines.push('```');
      lines.push(`Tokens estimés : ${r.response.Q8_ideal_prompt.token_count_estimate}`);
      lines.push('');
    }
  }

  // ── 3. DIFF V3 actuel vs LLM idéal ───────────────────────────────────────

  lines.push('## 3. DIFF : V3 actuel vs LLM idéal');
  lines.push('');

  const promptPath = resolve(RETRO_DIR, 'REF_prompt_v3_actuel.txt');
  if (existsSync(promptPath)) {
    const promptText = readFileSync(promptPath, 'utf-8');

    // Extract section IDs from the dump
    const sectionMatches = promptText.match(/──── SECTION: (\S+) ────/g) ?? [];
    const sectionIds = sectionMatches.map(m => m.replace(/──── SECTION: /, '').replace(/ ────/, ''));

    lines.push('### Sections du prompt V3 actuel');
    lines.push(`Total : ${sectionIds.length} sections`);
    lines.push('');
    for (const sid of sectionIds) {
      lines.push(`- \`${sid}\``);
    }
    lines.push('');

    // Cross-reference with Q4 (essential) and Q5 (harmful)
    if (abResults.length > 0) {
      lines.push('### Analyse croisée Q4 (essentielles) × Q5 (nuisibles) × sections V3');
      lines.push('');
      lines.push('*(Cette section sera enrichie manuellement après lecture des résultats Q4/Q5)*');
      lines.push('');

      // Check for mentions of V3 concepts in Q5 harmful
      const harmfulTypes = abResults.flatMap(r => r.response.Q5_harmful_instructions.map(h => h.instruction_type));
      if (harmfulTypes.length > 0) {
        lines.push('### Instructions jugées NUISIBLES par le LLM');
        for (const h of harmfulTypes) {
          lines.push(`- ${h}`);
        }
        lines.push('');
      }
    }

    // Prompt size analysis
    const promptChars = promptText.length;
    const promptTokens = Math.ceil(promptChars / 4);
    lines.push(`### Taille du prompt V3`);
    lines.push(`- Caractères : ${promptChars}`);
    lines.push(`- Tokens estimés : ${promptTokens}`);
    lines.push('');

    if (abResults.length > 0) {
      const idealTokens = abResults.map(r => r.response.Q8_ideal_prompt.token_count_estimate);
      const avgIdeal = Math.round(idealTokens.reduce((s, x) => s + x, 0) / idealTokens.length);
      lines.push(`### Taille du prompt idéal LLM`);
      lines.push(`- Tokens moyen demandé : ${avgIdeal}`);
      lines.push(`- Ratio V3/idéal : ${(promptTokens / avgIdeal).toFixed(1)}x`);
      lines.push('');
    }
  } else {
    lines.push('*(REF_prompt_v3_actuel.txt non trouvé — lancer dump-v3-prompt.ts)*');
    lines.push('');
  }

  // ── 4. DIFF Templates E1/E3 ──────────────────────────────────────────────

  lines.push('## 4. DIFF : Templates E1/E3 vs LLM idéal');
  lines.push('');

  for (const tpl of ['REF_E1_template.json', 'REF_E3_template.json']) {
    const tplPath = resolve(RETRO_DIR, tpl);
    if (existsSync(tplPath)) {
      const tplData = JSON.parse(readFileSync(tplPath, 'utf-8'));
      const tplStr = JSON.stringify(tplData, null, 2);
      lines.push(`### ${tpl}`);
      lines.push(`- Taille : ${tplStr.length} chars`);
      lines.push(`- Clés : ${Object.keys(tplData).join(', ')}`);
      lines.push('');
    }
  }

  lines.push('*(Comparaison manuelle avec Q8 prompts idéaux recommandée)*');
  lines.push('');

  // ── 5. Contre-exemples ────────────────────────────────────────────────────

  lines.push('## 5. Analyse des contre-exemples (Famille C)');
  lines.push('');

  if (cResults.length > 0) {
    lines.push('### Défauts les plus cités');
    const allLacks: string[] = [];
    for (const r of cResults) {
      allLacks.push(...r.response.QC1_fundamental_lacks);
    }
    for (const [lack, count] of [...countOccurrences(allLacks).entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${lack} (${count}x)`);
    }
    lines.push('');

    lines.push('### Diagnostic contraintes');
    for (const r of cResults) {
      lines.push(`- ${r.id} : ${r.response.QC3_constraint_diagnosis.too_many_or_too_few} — ${r.response.QC3_constraint_diagnosis.explanation}`);
    }
    lines.push('');

    lines.push('### Instructions manquantes identifiées');
    for (const r of cResults) {
      for (const instr of r.response.QC2_instructions_that_would_prevent) {
        lines.push(`- **${instr.defect}** → ${instr.instruction_needed} *(${r.id})*`);
      }
    }
    lines.push('');
  } else {
    lines.push('*(Aucun résultat Famille C)*');
    lines.push('');
  }

  // ── 6. Recommandations ────────────────────────────────────────────────────

  lines.push('## 6. RECOMMANDATIONS');
  lines.push('');
  lines.push('### R-Q1 : Restructurer le prompt ?');
  lines.push('*(À remplir après analyse des résultats Q1/Q2)*');
  lines.push('');
  lines.push('### R-Q2 : Ajouter des exemplars ?');
  lines.push('*(À remplir après analyse Q7)*');
  lines.push('');
  lines.push('### R-Q3 : Changer l\'ordre des sections ?');
  lines.push('*(À remplir après analyse Q2)*');
  lines.push('');
  lines.push('### R-Q4 : Réduire la densité de contraintes ?');
  lines.push('*(À remplir après analyse Q3)*');
  lines.push('');
  lines.push('### R-Q5 : Le compilateur V3 est-il aligné ?');
  lines.push('*(À remplir après diff V3/idéal)*');
  lines.push('');

  // ── 7. Prompt idéal synthétique ───────────────────────────────────────────

  lines.push('## 7. PROMPT IDÉAL SYNTHÉTIQUE');
  lines.push('');
  if (abResults.length > 0) {
    lines.push('*(Fusion des Q8 les plus convergents — voir section Q8 ci-dessus)*');
    lines.push('');
    lines.push('Le prompt de référence sera construit à partir des éléments convergents');
    lines.push('identifiés dans les Q8 de chaque texte analysé.');
  } else {
    lines.push('*(En attente des résultats d\'interrogation)*');
  }
  lines.push('');

  // ── Write report ──────────────────────────────────────────────────────────

  const reportPath = resolve(RETRO_DIR, 'RETRO_ENGINEERING_REPORT.md');
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`[COMPILE] Report written to ${reportPath}`);
  console.log(`[COMPILE] ${abResults.length} A/B results + ${cResults.length} C results compiled.`);
}

main();
