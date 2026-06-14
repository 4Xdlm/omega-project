/**
 * OMEGA — Phase C pilote : génération d'UN chapitre neuf de respiration (NEW-A : Garcia seul
 * sur la côte). gemma4 via Ollama, voix littéraire + tics bannis, garde densité-tics + langue +
 * longueur. Multi-seed, garde le 1er qui passe. Écrit un candidat à juger (pas d'auto-promotion).
 *   tsx packages/book-factory/src/c7/gen-v4-pilot.ts   (cwd = packages/book-factory)
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { measureRepetition } from '../coherence/repetition-sensor.js';

const OUT = 'runs/atlas/v4_slots';
const SRC = 'runs/atlas/MANUSCRIT_V3_COH1.md';
const MODEL = process.env['PATCH_MODEL'] ?? 'gemma4:31b';
const SEEDS = [7, 42, 123];

const BANNED = ['esquissa un sourire', 'sourire sans joie', 'qui n\'atteignait pas', 'le temps diffère', 'le temps différé', 's\'étirent comme du caoutchouc', 'mâchoire', 'silence lourd', 'silence électrique', 'silence palpable', 'comme un coup de feu', 'tabac froid', 'cuir craquelé', 'monocorde', 'tranchante comme une lame'];

const SYSTEM = "Tu es un romancier français de polar littéraire (registre Simenon, Vargas maritime). Prose sobre, tenue, concrète, sensorielle au compte-gouttes, français impeccable. Tu écris un chapitre de SOLITUDE et d'intériorité — AUCUNE confrontation, AUCun dialogue d'interrogatoire, AUCun salon. Tu n'écris QUE la prose du chapitre (ni titre, ni note, ni méta). Tu ne révèles aucun secret central de l'intrigue.";

function tail(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(-n).join(' '); }
function head(s: string, n: number): string { return s.split(/\s+/u).filter((w) => w.length > 0).slice(0, n).join(' '); }
function chapters(md: string): Array<{ n: number; prose: string }> {
  const parts = md.split(/(?:^|\n)#{1,3}\s*Chapitre\s+(\d+)\s*\n/);
  const out: Array<{ n: number; prose: string }> = [];
  for (let i = 1; i < parts.length; i += 2) out.push({ n: Number(parts[i]), prose: (parts[i + 1] ?? '').trim() });
  return out;
}

async function gemma(user: string, seed: number): Promise<string> {
  const body = { model: MODEL, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], stream: false, think: false, options: { temperature: 0.85, top_p: 0.92, num_predict: 2600, seed } };
  const res = await fetch('http://localhost:11434/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gu, '').trim();
}

function guard(text: string): { ok: boolean; words: number; ticDensity: number; banned: string[]; english: number } {
  const words = text.split(/\s+/u).filter((w) => w.length > 0).length;
  const banned = BANNED.filter((b) => new RegExp(`(?<![\\p{L}])${b.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'iu').test(text));
  const rep = measureRepetition(text);
  const totalTics = rep.families.reduce((a, f) => a + f.total, 0);
  const ticDensity = words > 0 ? (totalTics / words) * 1000 : 0;
  const english = (text.match(/\b(the|and|with|standing|something|nothing|silence(?=\s+was))\b/giu) ?? []).length;
  const ok = words >= 1100 && words <= 1900 && banned.length === 0 && ticDensity <= 3.5 && english === 0;
  return { ok, words, ticDensity: Number(ticDensity.toFixed(2)), banned, english };
}

async function main(): Promise<void> {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const chs = chapters(readFileSync(SRC, 'utf8'));
  const prev = chs.find((c) => c.n === 2)?.prose ?? '';
  const next = chs.find((c) => c.n === 4)?.prose ?? '';
  const brief = `CONTEXTE : roman noir breton, Ker-Morvan. L'inspecteur Garcia enquête sur le meurtre du gardien de phare (Dubois). Il vient de découvrir le corps et une lettre énigmatique. Le village se tait.\n\nÉCRIS un chapitre de ~1500 mots : GARCIA SEUL, le long de la côte, après la scène de crime. Sa marche, le doute, sa méthode d'enquêteur, le village vu de l'extérieur et son hostilité feutrée. Intériorité, pas d'action. Personne d'autre ne parle (au plus une silhouette lointaine). Fais respirer le texte : un moment de calme et de beauté rêche avant que l'étau ne se resserre.\n\nTICS INTERDITS (ne JAMAIS écrire) : ${BANNED.join(' ; ')}.\nVarie les sensations, n'en mets pas à chaque phrase. Une seule odeur bien placée vaut mieux qu'un catalogue.\n\n— Fin du chapitre précédent (continuité, ne pas recopier) : …${tail(prev, 110)}\n— Début du chapitre suivant (continuité) : ${head(next, 70)}…\n\nÉcris UNIQUEMENT la prose du chapitre.`;

  const lg = `${OUT}/PILOT_NEW-A_LEDGER.jsonl`;
  writeFileSync(lg, '');
  let best: { seed: number; text: string; g: ReturnType<typeof guard> } | null = null;
  for (const seed of SEEDS) {
    let cand = '';
    try { cand = await gemma(brief, seed); } catch (e) { appendFileSync(lg, `${JSON.stringify({ seed, err: String(e) })}\n`, 'utf8'); continue; }
    const g = guard(cand);
    appendFileSync(lg, `${JSON.stringify({ seed, ...g })}\n`, 'utf8');
    if (g.ok) { best = { seed, text: cand, g }; break; }
    if (best === null) best = { seed, text: cand, g };
  }
  if (best) {
    writeFileSync(`${OUT}/NEW-A_pilot.md`, best.text, 'utf8');
    console.log(`PILOT_DONE seed=${best.seed} ok=${best.g.ok} words=${best.g.words} ticDensity=${best.g.ticDensity} banned=[${best.g.banned.join(',')}] english=${best.g.english}`);
  } else { console.log('PILOT_FAIL no candidate'); }
}
main().catch((e: unknown) => { console.error('FATAL', e); process.exitCode = 1; });
