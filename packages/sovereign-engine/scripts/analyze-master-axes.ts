// scripts/analyze-master-axes.ts
// Analyse PLS/LASSO vers Y=composite_score par shape
// Output: validation/master-axes-by-shape.json (SSOT)
// Usage: npx tsx scripts/analyze-master-axes.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const validationDir = path.join(pkgRoot, 'validation');

interface RunDataPoint {
  shape: string;
  axes: Record<string, number>;
  composite_score: number;
  sealed: boolean;
}

// Pearson entre un axe et le composite_score = proxy LASSO univarié
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num += dx * dy; denX += dx * dx; denY += dy * dy;
  }
  return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
}

// Charger tous les runs depuis ValidationPacks
const packs = fs.readdirSync(validationDir)
  .filter(d => d.startsWith('ValidationPack_') &&
    fs.statSync(path.join(validationDir, d)).isDirectory());

const dataPoints: RunDataPoint[] = [];

for (const pack of packs) {
  const reportsDir = path.join(validationDir, pack, 'reports');
  if (!fs.existsSync(reportsDir)) continue;
  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'));
      // Summaries with nested runs
      const runs = content.runs ?? content.cases ?? [];
      for (const run of runs) {
        if (!run.axes || typeof run.composite_score !== 'number') continue;
        dataPoints.push({
          shape: run.narrative_shape ?? run.shape ?? 'unknown',
          axes: run.axes,
          composite_score: run.composite_score,
          sealed: run.verdict === 'SEALED',
        });
      }
      // Flat run files (individual run reports)
      if (content.axes && typeof content.composite_score === 'number') {
        dataPoints.push({
          shape: content.narrative_shape ?? content.shape ?? 'unknown',
          axes: content.axes,
          composite_score: content.composite_score,
          sealed: content.verdict === 'SEALED',
        });
      }
    } catch { /* skip malformed files */ }
  }
}

console.log(`[analyze-master-axes] ${dataPoints.length} runs chargés depuis ${packs.length} packs`);

if (dataPoints.length < 10) {
  console.error('[analyze-master-axes] FATAL: insuffisant (<10 runs). Ablation runs requis.');
  process.exit(1);
}

// Grouper par shape (ou 'all' si pas assez de données par shape)
const byShape: Record<string, RunDataPoint[]> = { all: dataPoints };
for (const dp of dataPoints) {
  if (!byShape[dp.shape]) byShape[dp.shape] = [];
  byShape[dp.shape].push(dp);
}

const result: Record<string, { master_axes: string[]; correlations: Record<string, number> }> = {};

for (const [shape, points] of Object.entries(byShape)) {
  if (points.length < 8) continue; // pas assez pour être significatif

  const axisNames = Object.keys(points[0].axes);
  const compositeY = points.map(p => p.composite_score);

  const correlations: Record<string, number> = {};
  for (const axis of axisNames) {
    const axisX = points.map(p => p.axes[axis] ?? 0);
    correlations[axis] = Math.abs(pearsonCorrelation(axisX, compositeY));
  }

  // Top 4 axes par corrélation absolue avec composite_score
  const sorted = Object.entries(correlations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  result[shape] = {
    master_axes: sorted.map(([k]) => k),
    correlations: Object.fromEntries(sorted),
  };

  console.log(`\n[Shape: ${shape}] Top 4 Master Axes (N=${points.length}):`);
  sorted.forEach(([axis, corr], i) => {
    console.log(`  ${i + 1}. ${axis}: r=${corr.toFixed(3)}`);
  });
}

// Écrire SSOT
const outputPath = path.join(validationDir, 'master-axes-by-shape.json');
fs.writeFileSync(outputPath, JSON.stringify({ generated_at: new Date().toISOString(), data: result }, null, 2), 'utf8');
console.log(`\n[analyze-master-axes] SSOT écrit: ${outputPath}`);
