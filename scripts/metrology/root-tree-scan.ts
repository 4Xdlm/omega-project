/**
 * OMEGA ARCHAEOLOGY PHASE 1 — root-tree-scan.ts (deterministic signals for
 * 01_ROOT_TREE_CLASSIFICATION.csv). READ-ONLY measurement (tooling, gated).
 * ----------------------------------------------------------------------------
 * For every top-level repo directory: volumetry + git first/last commit +
 * workspace membership + tsconfig presence + engine/scoring markers +
 * provisional class heuristic. The CSV is a measured SCAFFOLD; final class
 * verdicts come from the human ENGINE_INVENTORY synthesis (+ Explore agents).
 * Run: npx tsx scripts/metrology/root-tree-scan.ts
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO = path.resolve(process.cwd());
const OUT_DIR = path.join(REPO, 'docs', 'audit', 'archaeo');
const SKIP_TOP = new Set(['.git', 'node_modules']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const MARKER_RE = /\b(generate|scribe|weave|weaveLLM|forge|K2|judge|oracle|scorer|R6|Dedale|Dédale|truth|canon|memory|style|emotion|rewrite|pipeline|runner|14D)\b/i;

function git(args: string[]): string {
  try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 }).trim(); }
  catch { return ''; }
}

// workspace packages from root package.json
const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const workspaceGlobs: string[] = rootPkg.workspaces || [];
const workspaceTops = new Set(workspaceGlobs.map((w) => w.split('/')[0]));

interface RootRec {
  dir: string; files: number; tsFiles: number; testFiles: number; jsonFiles: number;
  mdFiles: number; bytes: number; maxDepth: number;
  firstCommit: string; lastCommit: string; commits: number;
  isWorkspaceTop: boolean; hasTsconfig: boolean; hasPackageJson: boolean;
  filesWithMarkers: number; markerHits: string;
  provisionalClass: string; adjudicated?: string;
}

function walkDir(abs: string): { files: number; ts: number; test: number; json: number; md: number; bytes: number; maxDepth: number; markerFiles: number; markers: Set<string> } {
  let files = 0, ts = 0, test = 0, json = 0, md = 0, bytes = 0, maxDepth = 0, markerFiles = 0;
  const markers = new Set<string>();
  const stack: { p: string; d: number }[] = [{ p: abs, d: 0 }];
  while (stack.length) {
    const { p, d } = stack.pop()!;
    let ents: fs.Dirent[];
    try { ents = fs.readdirSync(p, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      const full = path.join(p, e.name);
      if (e.isDirectory()) { stack.push({ p: full, d: d + 1 }); if (d + 1 > maxDepth) maxDepth = d + 1; }
      else if (e.isFile()) {
        files++;
        const ext = path.extname(e.name).toLowerCase();
        try { bytes += fs.statSync(full).size; } catch { /* */ }
        if (/\.(test|spec)\.tsx?$/.test(e.name)) test++;
        else if (ext === '.ts' || ext === '.tsx') ts++;
        else if (ext === '.json') json++;
        else if (ext === '.md') md++;
        // marker scan only for code/doc files, capped
        if ((CODE_EXT.has(ext) || ext === '.md') && bytes < 5e8) {
          try {
            const txt = fs.readFileSync(full, 'utf8');
            const m = txt.match(MARKER_RE);
            if (m) { markerFiles++; const mm = txt.match(new RegExp(MARKER_RE, 'gi')); mm?.slice(0, 50).forEach((x) => markers.add(x.toLowerCase())); }
          } catch { /* binary */ }
        }
      }
    }
  }
  return { files, ts, test, json, md, bytes, maxDepth, markerFiles, markers };
}

// Human-adjudicated verdicts (Phase 1, evidence in 01_ENGINE_INVENTORY.md).
// Dirs not listed here keep the measured heuristic class (= PROVISIONAL, pending adjudication).
const ADJUDICATED: Record<string, string> = {
  src: 'LEGACY_ANCESTOR',
  gateway: 'ACTIVE_RUNTIME',
  packages: 'ACTIVE_RUNTIME',
  OMEGA_SENTINEL_SUPREME: 'DORMANT',
  'omega-phase23': 'SNAPSHOT',
  'genius-integration': 'PATCH_STAGED',
};

function classify(r: Omit<RootRec, 'provisionalClass'>): string {
  const d = r.dir;
  if (/^(packages|src|gateway|apps|tools|nexus|scripts|config|schemas|bin)$/.test(d) === false) {
    // archive-looking top dirs
    if (/OMEGA_SNAPSHOTS|OMEGA_MASTER_DOSSIER|OMEGA_PHASE|omega-v44|titanium|_titanium|SPRINT|sprint28|archives|releases|history|deposit|EXPORT_FULL_PACK/.test(d)) return 'SNAPSHOT?';
  }
  if (d === 'packages' || d === 'gateway') return 'ACTIVE_RUNTIME?';
  if (d === 'src') return 'LEGACY_OR_ANCESTOR?';
  if (r.tsFiles + r.testFiles === 0 && r.files > 0) return 'DATA_OR_DOC?';
  if (r.filesWithMarkers > 0 && r.commits > 0) return 'ENGINE_BEARING?';
  if (r.commits === 0) return 'UNTRACKED?';
  return 'UNKNOWN';
}

const tops = fs.readdirSync(REPO, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !SKIP_TOP.has(e.name))
  .map((e) => e.name).sort();

const recs: RootRec[] = [];
for (const dir of tops) {
  const abs = path.join(REPO, dir);
  const w = walkDir(abs);
  const first = git(['log', '--reverse', '--format=%aI', '--', dir + '/']).split('\n')[0] || '';
  const last = git(['log', '-1', '--format=%aI', '--', dir + '/']) || '';
  const commits = parseInt(git(['rev-list', '--count', 'HEAD', '--', dir + '/']) || '0', 10);
  const rec: Omit<RootRec, 'provisionalClass'> = {
    dir, files: w.files, tsFiles: w.ts, testFiles: w.test, jsonFiles: w.json, mdFiles: w.md,
    bytes: w.bytes, maxDepth: w.maxDepth,
    firstCommit: first.slice(0, 10), lastCommit: last.slice(0, 10), commits,
    isWorkspaceTop: workspaceTops.has(dir),
    hasTsconfig: fs.existsSync(path.join(abs, 'tsconfig.json')),
    hasPackageJson: fs.existsSync(path.join(abs, 'package.json')),
    filesWithMarkers: w.markerFiles,
    markerHits: [...w.markers].sort().join('|'),
  };
  const adjClass = ADJUDICATED[dir];
  recs.push({ ...rec, provisionalClass: adjClass ?? classify(rec), adjudicated: adjClass ? 'YES' : 'no' } as RootRec);
  process.stderr.write(`  ${dir}: ${w.files}f ts=${w.ts} markers=${w.markerFiles} ${rec.firstCommit}->${rec.lastCommit}\n`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const cols = ['dir', 'files', 'tsFiles', 'testFiles', 'jsonFiles', 'mdFiles', 'bytes', 'maxDepth',
  'firstCommit', 'lastCommit', 'commits', 'isWorkspaceTop', 'hasTsconfig', 'hasPackageJson',
  'filesWithMarkers', 'markerHits', 'provisionalClass', 'adjudicated'];
const rows = recs.map((r) => cols.map((c) => {
  const v = (r as any)[c];
  const s = String(v ?? '');
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(','));
fs.writeFileSync(path.join(OUT_DIR, '01_ROOT_TREE_CLASSIFICATION.csv'), [cols.join(','), ...rows].join('\n') + '\n', 'utf8');
// also JSON for the inventory synthesis
fs.writeFileSync(path.join(OUT_DIR, '01_ROOT_TREE_SIGNALS.json'),
  JSON.stringify({ meta: { tool: 'root-tree-scan.ts', stamp: process.env.METRO_STAMP || 'UNSTAMPED', topDirs: recs.length }, roots: recs }, null, 2), 'utf8');
process.stderr.write(`[root-tree] ${recs.length} root dirs classified -> 01_ROOT_TREE_CLASSIFICATION.csv\n`);
