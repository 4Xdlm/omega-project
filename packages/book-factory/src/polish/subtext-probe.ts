/**
 * OMEGA — PE-5 : sonde SOUS-TEXTE (proxy CALC honnête + micro-bench gemma4).
 * Le sous-texte (dire X, signifier Y) est SÉMANTIQUE — au bord du mesurable.
 * Proxy faible mais réel : densité de marqueurs d'ESQUIVE / DÉFLEXION / litote /
 * question-retour dans le dialogue. On NE prétend PAS mesurer le sous-texte ;
 * on mesure si le dialogue REFUSE de tout dire. Verdict honnête après bench.
 */

import { appendFileSync, writeFileSync } from 'node:fs';

const EVASION_RE = /\b(ça ne (?:te|vous) regarde pas|parlons d'autre chose|peu importe|qu'est-ce que ça change|je n'ai rien à (?:dire|ajouter)|tu le sais (?:déjà|bien)|à ton avis|ce n'est pas (?:le moment|tes affaires)|tu poses trop de questions|laisse(?:-moi)? tranquille|on verra)\b/iu;
const DIALOGUE_LINE_RE = /^[«"—-]/u;

/** Densité d'esquive / 100 répliques + question-retour + trail-off. */
export function subtextProxy(prose: string): { dialogueLines: number; evasions: number; questionReturns: number; trailOffs: number; evasionPer100: number } {
  const lines = prose.split(/\r?\n/u).map((l) => l.trim()).filter((l) => DIALOGUE_LINE_RE.test(l));
  let ev = 0; let qr = 0; let to = 0; let prevQ = false;
  for (const l of lines) {
    if (EVASION_RE.test(l)) ev += 1;
    const isQ = /\?\s*[»"]?\s*$/u.test(l);
    if (isQ && prevQ) qr += 1;
    if (/…\s*[»"]?\s*$/u.test(l)) to += 1;
    prevQ = isQ;
  }
  return { dialogueLines: lines.length, evasions: ev, questionReturns: qr, trailOffs: to, evasionPer100: lines.length ? Number(((ev + qr + to) * 100 / lines.length).toFixed(1)) : 0 };
}

/* ————— micro-bench gemma4 : directive franche vs exemplar sous-texte ————— */
const OUT = 'runs/subtext_probe';
const MODEL = process.env['S0_MODEL'] ?? 'gemma4:31b';
const FIXED = 'Personnages : Léna et Garcia, dans la cale du bateau. Écris une SCÈNE DIALOGUÉE d\'environ 250 mots en français : Léna soupçonne Garcia de cacher quelque chose sur le naufrage.';
const D = `${FIXED}\n\nCONTRAINTE : un dialogue tendu et direct.\n\nScène :`;
const EX = `${FIXED}\n\nEXEMPLE du registre attendu (sous-texte : on n'avoue rien, on esquive, on ment à demi) :\n« — Tu étais sur le quai cette nuit-là.\n— Qu'est-ce que ça change ?\n— Réponds-moi.\n— Tu poses trop de questions, Léna. Certaines portes, on ne les rouvre pas. »\n\nCONTRAINTE : Garcia ESQUIVE, dévie, ne confirme jamais directement ; Léna insiste. Le non-dit pèse plus que les mots.\n\nScène neuve :`;

async function ollama(prompt: string, seed: number): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, prompt, stream: false, think: false, options: { temperature: 0.8, seed, num_predict: 420 } }) });
  return ((await res.json()) as { response?: string }).response ?? '';
}

async function main(): Promise<void> {
  const seeds = [101, 202, 303];
  const cells: Array<{ cond: 'D' | 'E'; seed: number; evasionPer100: number; evasions: number }> = [];
  for (const cond of ['D', 'E'] as const) {
    for (const seed of seeds) {
      let prose = ''; try { prose = await ollama(cond === 'D' ? D : EX, seed); } catch (e) { appendFileSync(`${OUT}/progress.log`, `ERR ${cond}${seed}: ${String(e)}\n`, 'utf8'); continue; }
      const p = subtextProxy(prose);
      cells.push({ cond, seed, evasionPer100: p.evasionPer100, evasions: p.evasions });
      writeFileSync(`${OUT}/scene_${cond}_${seed}.txt`, prose, 'utf8');
      appendFileSync(`${OUT}/progress.log`, `[${cond} s${seed}] evasion/100=${p.evasionPer100} ev=${p.evasions} qr=${p.questionReturns} to=${p.trailOffs} lines=${p.dialogueLines}\n`, 'utf8');
    }
  }
  const mean = (c: string): number => { const s = cells.filter((x) => x.cond === c); return s.length ? Number((s.reduce((a, b) => a + b.evasionPer100, 0) / s.length).toFixed(1)) : 0; };
  const dMean = mean('D'); const eMean = mean('E');
  const verdict = eMean >= dMean * 1.5 && eMean >= 5
    ? `FEW_SHOT_MORD — l'exemplar sous-texte augmente l'esquive (${dMean}→${eMean}/100). Levier réinjectable (escalade dialogue).`
    : `PROXY_FAIBLE/HORS_PORTEE — l'esquive mécanique ne discrimine pas nettement (D=${dMean}, E=${eMean}). Le sous-texte reste un axe 3IA_REVIEW (au-delà du CALC actuel) — honnêteté, pas de faux levier.`;
  writeFileSync(`${OUT}/SUBTEXT_PROBE.json`, JSON.stringify({ model: MODEL, dMean, eMean, cells, verdict }, null, 2), 'utf8');
  console.log(JSON.stringify({ dMean, eMean, verdict }, null, 1));
}
main().catch((e: unknown) => { appendFileSync(`${OUT}/progress.log`, `FATAL ${String(e)}\n`, 'utf8'); process.exitCode = 1; });
