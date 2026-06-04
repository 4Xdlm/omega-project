/**
 * N5-RUN — Activation RÉELLE du hook SHADOW bge-m3 radar sur prose OMEGA générée.
 * Exécute le VRAI chemin de production : OMEGA_BGEM3_RADAR=shadow + shadowLogBgem3Radar()
 * sur les chapitres BOOK_FULL (prose OMEGA réelle), avec un provider bge-m3 Ollama réel.
 * Collecte la télémétrie + agrège (où se situe la prose OMEGA sur le radar maître-vs-pulp).
 * Lecture seule sur la prose ; zéro impact moteur. Lancer via : npx tsx n5_shadow_run.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  shadowLogBgem3Radar, radarScore, interpretRadar,
  type RadarProvider, type RadarCentroids, type RadarBand,
} from '../../packages/sovereign-engine/src/oracle/intrinsic-quality/bgem3-radar.ts';

const SESSIONS = String.raw`C:\Users\elric\omega-project\packages\sovereign-engine\sessions`;
const CENTROIDS = String.raw`C:\Users\elric\omega-project\packages\sovereign-engine\src\oracle\intrinsic-quality\data\bgem3-radar-centroids.json`;
const OUT = String.raw`C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology\N5_SHADOW_TELEMETRY.json`;

// Active le VRAI mode shadow (chemin de production du hook).
process.env.OMEGA_BGEM3_RADAR = 'shadow';

const centroidsRaw = JSON.parse(fs.readFileSync(CENTROIDS, 'utf-8')) as {
  master_centroid: number[]; low_centroid: number[];
};
const centroids: RadarCentroids = {
  master_centroid: centroidsRaw.master_centroid,
  low_centroid: centroidsRaw.low_centroid,
};

/** Provider bge-m3 réel via Ollama local (déterministe : embedding). */
const provider: RadarProvider = {
  async embed(text: string): Promise<number[]> {
    const r = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', prompt: text.slice(0, 6000) }),
    });
    const j = (await r.json()) as { embedding?: number[] };
    if (!j.embedding) throw new Error('no embedding');
    return j.embedding;
  },
};

function middleWindow(txt: string, n = 1500): string {
  const w = txt.split(/\s+/).filter((x) => x.length > 0);
  if (w.length <= n) return w.join(' ');
  const s = Math.floor((w.length - n) / 2);
  return w.slice(s, s + n).join(' ');
}

function listChapters(): { session: string; file: string; path: string }[] {
  const out: { session: string; file: string; path: string }[] = [];
  for (const d of fs.readdirSync(SESSIONS)) {
    if (!d.startsWith('BOOK_FULL')) continue;
    const dir = path.join(SESSIONS, d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/^chapter_\d+\.txt$/.test(f)) out.push({ session: d, file: f, path: path.join(dir, f) });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const chapters = listChapters();
  console.error(`[N5-RUN] ${chapters.length} chapitres OMEGA, mode=${process.env.OMEGA_BGEM3_RADAR}`);
  const rows: { scene: string; score: number; band: RadarBand; dim: number; words: number }[] = [];
  let i = 0;
  for (const c of chapters) {
    const raw = fs.readFileSync(c.path, 'utf-8');
    const prose = middleWindow(raw);
    const words = raw.split(/\s+/).filter((x) => x.length > 0).length;
    const sceneId = `${c.session}/${c.file}`;
    // VRAI hook shadow (émet la ligne de télémétrie [BGEM3_RADAR shadow]) :
    await shadowLogBgem3Radar(prose, centroids, sceneId, provider);
    // Agrégat parallèle :
    try {
      const r = await radarScore(prose, centroids, provider);
      rows.push({ scene: sceneId, score: r.score, band: r.band, dim: r.dim, words });
    } catch (e) {
      rows.push({ scene: sceneId, score: Number.NaN, band: 'invalid', dim: 0, words });
    }
    if (++i % 10 === 0) console.error(`[N5-RUN] ${i}/${chapters.length}`);
  }
  const valid = rows.filter((r) => Number.isFinite(r.score));
  const scores = valid.map((r) => r.score).sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const median = scores.length ? scores[Math.floor(scores.length / 2)]! : Number.NaN;
  const bandCount: Record<string, number> = {};
  for (const r of valid) bandCount[r.band] = (bandCount[r.band] ?? 0) + 1;
  const summary = {
    run: 'N5 shadow bge-m3 radar sur prose OMEGA (BOOK_FULL)',
    mode: process.env.OMEGA_BGEM3_RADAR,
    n_chapters: rows.length,
    n_valid: valid.length,
    score_mean: +mean.toFixed(4),
    score_median: +Number(median).toFixed(4),
    score_min: scores[0] ?? null,
    score_max: scores[scores.length - 1] ?? null,
    band_distribution: bandCount,
    interpretation:
      'score = cos(prose, master_centroid) - cos(prose, low_centroid). >0 = géométriquement plus proche des maîtres.',
    rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2), 'utf-8');
  console.error(`[N5-RUN] DONE -> ${OUT}`);
  console.error(JSON.stringify({ ...summary, rows: undefined }, null, 2));
}

main().catch((e) => {
  console.error('[N5-RUN] FATAL', e);
  process.exit(1);
});
