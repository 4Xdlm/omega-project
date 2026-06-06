/**
 * OMEGA — C7 — CALIBRATION D'UN COUPLE JUGE CANDIDAT (EMP-19) — script BF-08.
 * Contexte : gemma4:31b (seul juge calibré) DÉSINSTALLÉ (constat 2026-06-06) ⇒ tout
 * jugement LLM futur exige la calibration d'un NOUVEAU couple {modèle+prompt+temp}.
 * Ce script exécute le MINI-PROTOCOLE (paires maître-vs-populaire FR, source-blind,
 * DEUX ordres par paire) et produit un PROFIL **PROPOSED** au format registre —
 * l'APPROBATION reste Architecte/Tribunal (jamais auto-approuvé).
 *
 * Mesures : accuracy vs vérité-terrain (maître attendu gagnant), position_bias
 * (P(choisit A) − 0.5), invalid_rate (réponses hors {A,B}). Disqualification franche
 * si |position_bias| > 0.15 ou invalid_rate > 0.15 (seuils EXPERIMENTAL_DEFAULTS,
 * hérités du protocole S1D).
 */

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

interface PairSide { readonly src: string; readonly text: string; }
interface Pair { readonly pair_id: string; readonly master: PairSide; readonly popular: PairSide; }
interface PairsFile { readonly protocol: string; readonly wlen: number; readonly pairs: readonly Pair[]; }

const MODEL = process.env['CALIB_MODEL'] ?? 'qwen3.5:35b-a3b';
const TEMPERATURE = 0;
const PAIRS_PATH = process.env['CALIB_PAIRS'] ?? 'runs/c7_calib_pairs.json';
const OUT = process.env['CALIB_OUT'] ?? 'runs/c7_calibration';

/** LE PROMPT EST L'INSTRUMENT (EMP-19) : source UNIQUE figée (partagée avec le juge runtime). */
import { PERSONA_PROMPT } from './persona-prompt.js';

async function judge(a: string, b: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      think: false,
      options: { temperature: TEMPERATURE, num_predict: 8 },
      messages: [
        { role: 'system', content: PERSONA_PROMPT },
        { role: 'user', content: `EXTRAIT A :\n${a}\n\nEXTRAIT B :\n${b}\n\nTa réponse (A ou B) :` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  const raw = (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim().toUpperCase();
  const m = /\b([AB])\b/.exec(raw);
  return m?.[1] ?? `INVALID(${raw.slice(0, 20)})`;
}

function sha256Hex(s: string): string {
  // hash léger pour empreinte de prompt (node:crypto)
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

async function main(): Promise<void> {
  const file = JSON.parse(readFileSync(PAIRS_PATH, 'utf8')) as PairsFile;
  const log = `${OUT}_log.jsonl`;
  let correct = 0;
  let total = 0;
  let chooseA = 0;
  let invalid = 0;
  for (const p of file.pairs) {
    for (const order of ['MP', 'PM'] as const) {
      const a = order === 'MP' ? p.master.text : p.popular.text;
      const b = order === 'MP' ? p.popular.text : p.master.text;
      const ans = await judge(a, b);
      const masterIs = order === 'MP' ? 'A' : 'B';
      const ok = ans === masterIs;
      if (ans === 'A') chooseA += 1;
      if (ans !== 'A' && ans !== 'B') invalid += 1;
      else {
        total += 1;
        if (ok) correct += 1;
      }
      appendFileSync(log, `${JSON.stringify({ pair: p.pair_id, order, answer: ans, master_is: masterIs, correct: ok })}\n`);
    }
  }
  const calls = file.pairs.length * 2;
  const accuracy = total > 0 ? correct / total : 0;
  const positionBias = calls > 0 ? chooseA / calls - 0.5 : 0;
  const invalidRate = calls > 0 ? invalid / calls : 0;
  const disqualified = Math.abs(positionBias) > 0.15 || invalidRate > 0.15;
  const profile = {
    status: 'PROPOSED', // l'approbation = Architecte/Tribunal, JAMAIS ce script
    role: 'persona-lecteur-editeur (juge pairwise qualité prose FR)',
    couple: {
      model: MODEL,
      provider: 'ollama-local',
      prompt_sha256: sha256Hex(PERSONA_PROMPT),
      temperature: TEMPERATURE,
      output_format: 'single-letter A|B',
      corpus: `pairs maître(Balzac/Maupassant)-vs-populaire(N.Roberts) FR, ${file.pairs.length} paires × 2 ordres, fenêtres ${file.wlen}w`,
    },
    measures: {
      calls,
      accuracy_vs_ground_truth: Number(accuracy.toFixed(3)),
      position_bias: Number(positionBias.toFixed(3)),
      invalid_rate: Number(invalidRate.toFixed(3)),
    },
    verdict_proposed: disqualified ? 'DISQUALIFIED_CANDIDATE' : 'CANDIDATE_OK_PENDING_FULL_PROTOCOL',
    caveats: [
      `mini-protocole N=${file.pairs.length} paires — le protocole COMPLET (Gold-Set, biais croisés) reste requis avant APPROVED`,
      'gemma4:31b absent du parc au moment du run (NCR_GEMMA4_ABSENT)',
    ],
    date: new Date().toISOString(),
  };
  writeFileSync(`${OUT}_profile_PROPOSED.json`, JSON.stringify(profile, null, 2), 'utf8');
  appendFileSync(log, `${JSON.stringify({ done: true, profile: profile.measures, verdict: profile.verdict_proposed })}\n`);
}

main().catch((e: unknown) => {
  appendFileSync(`${OUT}_log.jsonl`, `${JSON.stringify({ fatal: String(e) })}\n`);
  process.exitCode = 1;
});
