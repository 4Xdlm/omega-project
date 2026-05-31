/**
 * OMEGA METROLOGY — scan-git-churn.ts  (D7 git / churn / age)
 * ----------------------------------------------------------------------------
 * READ-ONLY. Single `git log --numstat` pass, aggregated per file in JS.
 * Joins per-file complexity (OMEGA_METROLOGY_PERFILE.json) to compute hotspots
 * (churn × cyclomatic complexity). Emits OMEGA_METROLOGY_CHURN.json
 * Run: npx tsx scripts/metrology/scan-git-churn.ts
 *
 * Limits: no --follow (renames break file lineage) — documented in METHOD.md.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { REPO_ROOT, pkgOf, EXCLUDE_RE } from './lib-metrology.ts';

const OUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology');
const SCOPE_RE = /^(packages|src|gateway)\//;

interface Churn {
  rel: string; pkg: string; commits: number; added: number; removed: number;
  authors: Set<string>; firstISO: string; lastISO: string;
}
const map = new Map<string, Churn>();

// pretty format: marker line then numstat lines until next marker
const SEP = '';
const raw = execFileSync('git',
  ['log', '--no-merges', '--numstat', `--pretty=format:${SEP}%H${SEP}%an${SEP}%aI`],
  { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 * 512, encoding: 'utf8' });

let curAuthor = '', curISO = '';
for (const line of raw.split('\n')) {
  if (line.startsWith(SEP)) {
    const parts = line.split(SEP); // ['', hash, author, iso]
    curAuthor = parts[2] ?? '';
    curISO = parts[3] ?? '';
    continue;
  }
  if (!line.trim()) continue;
  const mt = line.match(/^(\S+)\t(\S+)\t(.+)$/);
  if (!mt) continue;
  const added = mt[1] === '-' ? 0 : parseInt(mt[1]!, 10);
  const removed = mt[2] === '-' ? 0 : parseInt(mt[2]!, 10);
  let file = mt[3]!;
  // handle rename "old => new" / "dir/{a => b}/x"
  if (file.includes('=>')) {
    file = file.replace(/\{[^}]*=>\s*([^}]*)\}/g, '$1').replace(/\s*=>\s*/g, '').replace(/\s+/g, ' ').trim();
    file = file.split(' ').pop() || file;
  }
  file = file.replace(/\\/g, '/');
  if (!SCOPE_RE.test(file)) continue;
  if (EXCLUDE_RE.test('/' + file)) continue;
  if (!/\.(ts|json|md)$/.test(file)) continue;
  let c = map.get(file);
  if (!c) {
    c = { rel: file, pkg: pkgOf(file), commits: 0, added: 0, removed: 0,
          authors: new Set(), firstISO: curISO, lastISO: curISO };
    map.set(file, c);
  }
  c.commits++; c.added += added; c.removed += removed;
  if (curAuthor) c.authors.add(curAuthor);
  // log is newest-first → first seen = last touched, last seen = created
  if (curISO < c.firstISO) c.firstISO = curISO;
  if (curISO > c.lastISO) c.lastISO = curISO;
}

// join complexity
const perFilePath = path.join(OUT_DIR, 'OMEGA_METROLOGY_PERFILE.json');
const complexity = new Map<string, number>();
if (fs.existsSync(perFilePath)) {
  const pf = JSON.parse(fs.readFileSync(perFilePath, 'utf8'));
  for (const f of pf.files) complexity.set(f.rel, f.sumCyclo || 0);
}

const NOW = process.env.METRO_NOW ? new Date(process.env.METRO_NOW) : new Date(0);
const nowMs = NOW.getTime();
const DAY = 86400000;

const files = [...map.values()].map((c) => {
  const ageDays = nowMs > 0 ? Math.round((nowMs - new Date(c.lastISO).getTime()) / DAY) : null;
  const lifeDays = Math.round((new Date(c.lastISO).getTime() - new Date(c.firstISO).getTime()) / DAY);
  const cx = complexity.get(c.rel) ?? 0;
  return {
    rel: c.rel, pkg: c.pkg, commits: c.commits, added: c.added, removed: c.removed,
    net: c.added - c.removed, authors: c.authors.size,
    firstISO: c.firstISO, lastISO: c.lastISO, lifeDays,
    ageSinceLastCommitDays: ageDays,
    sumCyclo: cx, hotspot: c.commits * cx,
  };
});

// per-package aggregation
const pkgMap = new Map<string, { commits: number; files: number; authors: Set<string>; lastISOs: string[] }>();
for (const f of files) {
  const e = pkgMap.get(f.pkg) || { commits: 0, files: 0, authors: new Set<string>(), lastISOs: [] };
  e.commits += f.commits; e.files++; e.lastISOs.push(f.lastISO);
  pkgMap.set(f.pkg, e);
}
const byPackage = [...pkgMap.entries()].map(([pkg, e]) => {
  const ages = nowMs > 0 ? e.lastISOs.map((iso) => (nowMs - new Date(iso).getTime()) / DAY) : [];
  const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;
  const staleCount = ages.filter((a) => a > 90).length;
  return { pkg, files: e.files, commits: e.commits, avgAgeDays: avgAge, filesStale90d: staleCount };
}).sort((a, b) => b.commits - a.commits);

const out = {
  meta: {
    tool: 'scan-git-churn.ts', domain: 'D7-git-churn-age',
    stamp: process.env.METRO_STAMP || 'UNSTAMPED',
    nowRef: process.env.METRO_NOW || 'unset (age fields null)',
    note: 'git log without --follow; renames collapsed heuristically, lineage may break across renames',
    filesTracked: files.length,
  },
  totals: {
    commitsObserved: files.reduce((a, f) => a + f.commits, 0),
    distinctAuthors: new Set(files.flatMap((f) => Array.from({ length: f.authors }, (_, i) => `${f.rel}#${i}`))).size,
  },
  topChurn: [...files].sort((a, b) => b.commits - a.commits).slice(0, 25),
  topHotspots: [...files].sort((a, b) => b.hotspot - a.hotspot).slice(0, 25),
  staleCandidates90d: nowMs > 0
    ? [...files].filter((f) => (f.ageSinceLastCommitDays ?? 0) > 90).sort((a, b) => b.ageSinceLastCommitDays! - a.ageSinceLastCommitDays!).slice(0, 30)
    : [],
  byPackage,
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'OMEGA_METROLOGY_CHURN.json'), JSON.stringify(out, null, 2), 'utf8');
process.stderr.write(`[churn] tracked ${files.length} files, ${out.totals.commitsObserved} file-commits | ` +
  `top hotspot: ${out.topHotspots[0]?.rel} (${out.topHotspots[0]?.hotspot})\n`);
