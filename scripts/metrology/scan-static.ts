/**
 * OMEGA METROLOGY — scan-static.ts  (D1 volumetry, D2 dep-graph, D6 typing, D8 duplication)
 * ---------------------------------------------------------------------------------------
 * READ-ONLY. Emits docs/audit/metrology/OMEGA_METROLOGY_DATASET.json
 * Run: npx tsx scripts/metrology/scan-static.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  REPO_ROOT, discover, classifyLines, charStats, analyzeAst, dist, sha256, round,
  type FileRec, type Dist,
} from './lib-metrology.ts';

const OUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'metrology');
const STAMP = process.env.METRO_STAMP || 'UNSTAMPED'; // injected by runner for determinism

// ---------- 1. discover ----------
const recs = discover();
const codeRecs = recs.filter((r) => r.kind === 'src' || r.kind === 'test');
process.stderr.write(`[scan-static] discovered ${recs.length} files; ${codeRecs.length} ts (src+test)\n`);

// ---------- per-file analysis ----------
interface PerFile extends FileRec {
  lines: ReturnType<typeof classifyLines>;
  chars: ReturnType<typeof charStats>;
  ast: ReturnType<typeof analyzeAst> | null;
}
const perFile: PerFile[] = [];
let parseErrors = 0;
for (const r of codeRecs) {
  if (r.kind === 'dts') continue;
  let text = '';
  try { text = fs.readFileSync(r.abs, 'utf8'); } catch { parseErrors++; continue; }
  let ast: PerFile['ast'] = null;
  try { ast = analyzeAst(text, r.abs); } catch { parseErrors++; }
  perFile.push({ ...r, lines: classifyLines(text), chars: charStats(text), ast });
}
process.stderr.write(`[scan-static] analyzed ${perFile.length} ts files (${parseErrors} parse/read errors)\n`);

// ---------- 2. dependency graph (package level) ----------
// build package-name map from packages/*/package.json
const pkgNameToFolder = new Map<string, string>();
const folderToPkgName = new Map<string, string>();
const pkgsDir = path.join(REPO_ROOT, 'packages');
if (fs.existsSync(pkgsDir)) {
  for (const folder of fs.readdirSync(pkgsDir)) {
    const pj = path.join(pkgsDir, folder, 'package.json');
    if (fs.existsSync(pj)) {
      try {
        const name = JSON.parse(fs.readFileSync(pj, 'utf8')).name;
        if (typeof name === 'string') { pkgNameToFolder.set(name, folder); folderToPkgName.set(folder, name); }
      } catch { /* ignore */ }
    }
  }
}

function resolveRelImport(fromAbs: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromAbs), spec);
  const cands = [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
                 base.replace(/\.js$/, '.ts')];
  for (const c of cands) { try { if (fs.statSync(c).isFile()) return c; } catch { /* */ } }
  return null;
}

const fileByAbs = new Map(perFile.map((f) => [path.normalize(f.abs), f]));
// package edges: pkg -> Set(pkg)
const pkgOut = new Map<string, Set<string>>();
const allPkgs = new Set(perFile.map((f) => f.pkg));
for (const p of allPkgs) pkgOut.set(p, new Set());
let externalImports = 0;
const edgeWeights = new Map<string, { symbols: number; sites: number }>(); // "src->dst"

for (const f of perFile) {
  if (!f.ast) continue;
  for (const spec of f.ast.importSpecifiers) {
    let targetPkg: string | null = null;
    if (spec.startsWith('.')) {
      const resolved = resolveRelImport(f.abs, spec);
      if (resolved) {
        const tf = fileByAbs.get(path.normalize(resolved));
        if (tf) targetPkg = tf.pkg;
      }
    } else {
      // bare: match workspace package name (longest prefix)
      let best: string | null = null;
      for (const name of pkgNameToFolder.keys()) {
        if (spec === name || spec.startsWith(name + '/')) { if (!best || name.length > best.length) best = name; }
      }
      if (best) targetPkg = pkgNameToFolder.get(best)!;
    }
    if (targetPkg && targetPkg !== f.pkg) {
      pkgOut.get(f.pkg)!.add(targetPkg);
      const key = `${f.pkg}->${targetPkg}`;
      const w = edgeWeights.get(key) || { symbols: 0, sites: 0 };
      w.sites++; w.symbols += 1; // each import decl = 1 site; symbols approximated below
      edgeWeights.set(key, w);
    } else if (!spec.startsWith('.') && !targetPkg) {
      externalImports++;
    }
  }
}
// fan-in
const pkgIn = new Map<string, Set<string>>();
for (const p of allPkgs) pkgIn.set(p, new Set());
for (const [src, dsts] of pkgOut) for (const d of dsts) pkgIn.get(d)?.add(src);

// cycle detection (package DAG) + longest path
function detectCyclesAndDepth(): { cycles: string[][]; maxDepth: number } {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const cycles: string[][] = [];
  const stack: string[] = [];
  for (const p of allPkgs) color.set(p, WHITE);
  const dfs = (u: string) => {
    color.set(u, GRAY); stack.push(u);
    for (const v of pkgOut.get(u) || []) {
      if (color.get(v) === WHITE) dfs(v);
      else if (color.get(v) === GRAY) {
        const idx = stack.indexOf(v);
        if (idx >= 0) cycles.push(stack.slice(idx).concat(v));
      }
    }
    stack.pop(); color.set(u, BLACK);
  };
  for (const p of allPkgs) if (color.get(p) === WHITE) dfs(p);
  // longest path via memo DFS (treat cycles as depth cap)
  const memo = new Map<string, number>();
  const onStack = new Set<string>();
  const depth = (u: string): number => {
    if (memo.has(u)) return memo.get(u)!;
    if (onStack.has(u)) return 0; // cycle guard
    onStack.add(u);
    let best = 0;
    for (const v of pkgOut.get(u) || []) best = Math.max(best, 1 + depth(v));
    onStack.delete(u);
    memo.set(u, best);
    return best;
  };
  let maxDepth = 0;
  for (const p of allPkgs) maxDepth = Math.max(maxDepth, depth(p));
  return { cycles, maxDepth };
}
const graphAnalysis = detectCyclesAndDepth();

// ---------- 8. duplication (line-window rolling hash, jscpd-approximation) ----------
const WIN = 6;
const windowMap = new Map<string, { pkg: string; rel: string; line: number }[]>();
function normLine(l: string): string { return l.replace(/\s+/g, ' ').trim(); }
for (const f of perFile) {
  let text = '';
  try { text = fs.readFileSync(f.abs, 'utf8'); } catch { continue; }
  // code lines only (skip blank + obvious comment lines)
  const lines = text.split(/\r\n|\r|\n/);
  const codeLines: { n: string; idx: number }[] = [];
  let inBlock = false;
  lines.forEach((raw, i) => {
    const t = raw.trim();
    if (inBlock) { if (t.includes('*/')) inBlock = false; return; }
    if (t === '' || t.startsWith('//')) return;
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; return; }
    codeLines.push({ n: normLine(raw), idx: i + 1 });
  });
  for (let i = 0; i + WIN <= codeLines.length; i++) {
    const slice = codeLines.slice(i, i + WIN).map((c) => c.n).join('\n');
    const h = sha256(slice);
    if (!windowMap.has(h)) windowMap.set(h, []);
    windowMap.get(h)!.push({ pkg: f.pkg, rel: f.rel, line: codeLines[i]!.idx });
  }
}
let dupWindows = 0, intraPkgDup = 0, interPkgDup = 0;
let biggestClone = { size: 0, locs: [] as string[] };
const dupLinesByPkg = new Map<string, number>();
for (const [, locs] of windowMap) {
  if (locs.length < 2) continue;
  dupWindows++;
  const pkgs = new Set(locs.map((l) => l.pkg));
  if (pkgs.size > 1) interPkgDup++; else intraPkgDup++;
  for (const l of locs) dupLinesByPkg.set(l.pkg, (dupLinesByPkg.get(l.pkg) || 0) + WIN);
  if (locs.length > biggestClone.size) {
    biggestClone = { size: locs.length, locs: locs.slice(0, 6).map((l) => `${l.rel}:${l.line}`) };
  }
}
const totalCodeLines = perFile.reduce((a, f) => a + f.lines.code, 0);
const dupRatioPct = totalCodeLines ? round((dupWindows * WIN / totalCodeLines) * 100, 2) : 0;

// ---------- aggregation per package ----------
interface PkgAgg {
  pkg: string;
  files_src: number; files_test: number; files_json: number; files_md: number;
  bytes_src: number; bytes_test: number;
  loc_total: number; loc_code: number; loc_comment: number; loc_blank: number;
  chars_total: number; maxLineLen: number;
  functions: number; classes: number; interfaces: number; typeAliases: number; enums: number;
  exports: number; imports: number;
  fnLoc: Dist; fnParams: Dist; fnCyclo: Dist; fnNesting: Dist;
  asAny: number; asUnknown: number; tsIgnore: number; tsNocheck: number; tsExpectError: number;
  nonNull: number; eslintDisable: number; anyKeyword: number;
  fanIn: number; fanOut: number; instability: number;
  dupLines: number; testToCodeRatio: number;
}

const byPkg = new Map<string, PerFile[]>();
for (const f of perFile) { if (!byPkg.has(f.pkg)) byPkg.set(f.pkg, []); byPkg.get(f.pkg)!.push(f); }
// also count json/md per package from full recs
const jsonMdByPkg = new Map<string, { json: number; md: number }>();
for (const r of recs) {
  if (r.kind !== 'json' && r.kind !== 'md') continue;
  const e = jsonMdByPkg.get(r.pkg) || { json: 0, md: 0 };
  if (r.kind === 'json') e.json++; else e.md++;
  jsonMdByPkg.set(r.pkg, e);
}

const pkgAggs: PkgAgg[] = [];
for (const [pkg, files] of byPkg) {
  const srcF = files.filter((f) => f.kind === 'src');
  const testF = files.filter((f) => f.kind === 'test');
  const allFns = files.flatMap((f) => f.ast?.fns ?? []);
  const sum = (sel: (f: PerFile) => number) => files.reduce((a, f) => a + sel(f), 0);
  const astSum = (sel: (a: NonNullable<PerFile['ast']>) => number) =>
    files.reduce((a, f) => a + (f.ast ? sel(f.ast) : 0), 0);
  const locCodeSrc = srcF.reduce((a, f) => a + f.lines.code, 0);
  const locCodeTest = testF.reduce((a, f) => a + f.lines.code, 0);
  const jm = jsonMdByPkg.get(pkg) || { json: 0, md: 0 };
  const fanOut = pkgOut.get(pkg)?.size ?? 0;
  const fanIn = pkgIn.get(pkg)?.size ?? 0;
  pkgAggs.push({
    pkg,
    files_src: srcF.length, files_test: testF.length, files_json: jm.json, files_md: jm.md,
    bytes_src: srcF.reduce((a, f) => a + f.bytes, 0),
    bytes_test: testF.reduce((a, f) => a + f.bytes, 0),
    loc_total: sum((f) => f.lines.total), loc_code: sum((f) => f.lines.code),
    loc_comment: sum((f) => f.lines.comment), loc_blank: sum((f) => f.lines.blank),
    chars_total: sum((f) => f.chars.chars),
    maxLineLen: Math.max(0, ...files.map((f) => f.chars.maxLineLen)),
    functions: astSum((a) => a.functions), classes: astSum((a) => a.classes),
    interfaces: astSum((a) => a.interfaces), typeAliases: astSum((a) => a.typeAliases),
    enums: astSum((a) => a.enums), exports: astSum((a) => a.exports), imports: astSum((a) => a.imports),
    fnLoc: dist(allFns.map((x) => x.loc)), fnParams: dist(allFns.map((x) => x.params)),
    fnCyclo: dist(allFns.map((x) => x.cyclo)), fnNesting: dist(allFns.map((x) => x.nesting)),
    asAny: astSum((a) => a.asAny), asUnknown: astSum((a) => a.asUnknown),
    tsIgnore: astSum((a) => a.tsIgnore), tsNocheck: astSum((a) => a.tsNocheck),
    tsExpectError: astSum((a) => a.tsExpectError), nonNull: astSum((a) => a.nonNull),
    eslintDisable: astSum((a) => a.eslintDisable), anyKeyword: astSum((a) => a.anyKeyword),
    fanIn, fanOut, instability: (fanIn + fanOut) ? round(fanOut / (fanIn + fanOut), 3) : 0,
    dupLines: dupLinesByPkg.get(pkg) || 0,
    testToCodeRatio: locCodeSrc ? round(locCodeTest / locCodeSrc, 3) : 0,
  });
}
pkgAggs.sort((a, b) => b.loc_code - a.loc_code);

// ---------- repo-wide aggregates ----------
const allFns = perFile.flatMap((f) => f.ast?.fns ?? []);
const repo = {
  files: {
    ts_src: codeRecs.filter((r) => r.kind === 'src').length,
    ts_test: codeRecs.filter((r) => r.kind === 'test').length,
    json: recs.filter((r) => r.kind === 'json').length,
    md: recs.filter((r) => r.kind === 'md').length,
    total_in_scope: recs.length,
  },
  bytes: {
    ts_src: recs.filter((r) => r.kind === 'src').reduce((a, r) => a + r.bytes, 0),
    ts_test: recs.filter((r) => r.kind === 'test').reduce((a, r) => a + r.bytes, 0),
    total_in_scope: recs.reduce((a, r) => a + r.bytes, 0),
  },
  loc: {
    total: perFile.reduce((a, f) => a + f.lines.total, 0),
    code: totalCodeLines,
    comment: perFile.reduce((a, f) => a + f.lines.comment, 0),
    blank: perFile.reduce((a, f) => a + f.lines.blank, 0),
    commentRatio: round(perFile.reduce((a, f) => a + f.lines.comment, 0) / Math.max(1, totalCodeLines), 3),
  },
  chars: { total: perFile.reduce((a, f) => a + f.chars.chars, 0) },
  declarations: {
    functions: allFns.length,
    classes: perFile.reduce((a, f) => a + (f.ast?.classes ?? 0), 0),
    interfaces: perFile.reduce((a, f) => a + (f.ast?.interfaces ?? 0), 0),
    typeAliases: perFile.reduce((a, f) => a + (f.ast?.typeAliases ?? 0), 0),
    enums: perFile.reduce((a, f) => a + (f.ast?.enums ?? 0), 0),
    exports: perFile.reduce((a, f) => a + (f.ast?.exports ?? 0), 0),
    imports: perFile.reduce((a, f) => a + (f.ast?.imports ?? 0), 0),
  },
  functionDist: {
    loc: dist(allFns.map((x) => x.loc)),
    params: dist(allFns.map((x) => x.params)),
    cyclomatic: dist(allFns.map((x) => x.cyclo)),
    nesting: dist(allFns.map((x) => x.nesting)),
  },
  fileSizeDist: dist(codeRecs.map((r) => r.bytes)),
  lineLenDist: dist(perFile.map((f) => f.chars.maxLineLen)),
  typing: {
    asAny: perFile.reduce((a, f) => a + (f.ast?.asAny ?? 0), 0),
    asUnknown: perFile.reduce((a, f) => a + (f.ast?.asUnknown ?? 0), 0),
    tsIgnore: perFile.reduce((a, f) => a + (f.ast?.tsIgnore ?? 0), 0),
    tsNocheck: perFile.reduce((a, f) => a + (f.ast?.tsNocheck ?? 0), 0),
    tsExpectError: perFile.reduce((a, f) => a + (f.ast?.tsExpectError ?? 0), 0),
    nonNull: perFile.reduce((a, f) => a + (f.ast?.nonNull ?? 0), 0),
    eslintDisable: perFile.reduce((a, f) => a + (f.ast?.eslintDisable ?? 0), 0),
    anyKeyword: perFile.reduce((a, f) => a + (f.ast?.anyKeyword ?? 0), 0),
  },
  graph: {
    nodes: allPkgs.size,
    edges: [...pkgOut.values()].reduce((a, s) => a + s.size, 0),
    density: allPkgs.size > 1
      ? round([...pkgOut.values()].reduce((a, s) => a + s.size, 0) / (allPkgs.size * (allPkgs.size - 1)), 4) : 0,
    maxDagDepth: graphAnalysis.maxDepth,
    cycleCount: graphAnalysis.cycles.length,
    cycles: graphAnalysis.cycles.slice(0, 25),
    externalImportRefs: externalImports,
    orphans: [...allPkgs].filter((p) => (pkgIn.get(p)?.size ?? 0) === 0 && (pkgOut.get(p)?.size ?? 0) === 0).sort(),
    topFanIn: [...pkgIn.entries()].map(([p, s]) => ({ pkg: p, fanIn: s.size }))
      .sort((a, b) => b.fanIn - a.fanIn).slice(0, 15),
    topFanOut: [...pkgOut.entries()].map(([p, s]) => ({ pkg: p, fanOut: s.size }))
      .sort((a, b) => b.fanOut - a.fanOut).slice(0, 15),
    edgeList: [...edgeWeights.entries()].map(([k, w]) => {
      const [source, target] = k.split('->');
      return { source, target, importSites: w.sites, importedSymbols: w.symbols };
    }).sort((a, b) => b.importSites - a.importSites),
  },
  duplication: {
    windowSize: WIN,
    dupWindowGroups: dupWindows,
    intraPkgGroups: intraPkgDup,
    interPkgGroups: interPkgDup,
    approxDupLines: dupWindows * WIN,
    dupRatioPct,
    biggestClone,
    note: 'line-window rolling-hash approximation (jscpd-grade), [RECONSTRUCTION]',
  },
};

// ---------- top-N extremes ----------
const fileWithFns = perFile.map((f) => ({
  rel: f.rel, pkg: f.pkg, bytes: f.bytes, loc: f.lines.total,
  maxCyclo: Math.max(0, ...(f.ast?.fns ?? []).map((x) => x.cyclo)),
  maxNest: Math.max(0, ...(f.ast?.fns ?? []).map((x) => x.nesting)),
  maxLineLen: f.chars.maxLineLen,
}));
const extremes = {
  largestFilesByBytes: [...fileWithFns].sort((a, b) => b.bytes - a.bytes).slice(0, 20),
  largestFilesByLoc: [...fileWithFns].sort((a, b) => b.loc - a.loc).slice(0, 20),
  mostComplexFiles: [...fileWithFns].sort((a, b) => b.maxCyclo - a.maxCyclo).slice(0, 20),
  deepestNesting: [...fileWithFns].sort((a, b) => b.maxNest - a.maxNest).slice(0, 20),
  longestLines: [...fileWithFns].sort((a, b) => b.maxLineLen - a.maxLineLen).slice(0, 20),
};

// ---------- emit ----------
const dataset = {
  meta: {
    tool: 'scan-static.ts',
    domain: 'D1-volumetry D2-depgraph D6-typing D8-duplication',
    repoRoot: REPO_ROOT,
    stamp: STAMP,
    scope: ['packages', 'src', 'gateway'],
    excludes: ['node_modules', 'dist', '.git', 'coverage'],
    method: 'TypeScript compiler PARSER only (ts.createSourceFile), no type-checker',
    filesAnalyzed: perFile.length,
    parseErrors,
    workspacePackages: pkgNameToFolder.size,
  },
  repo,
  extremes,
  packages: pkgAggs,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, 'OMEGA_METROLOGY_DATASET.json');
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2), 'utf8');

// compact per-file table (consumed by churn join for D7 hotspots + CSV builders)
const perFileTable = perFile.map((f) => ({
  rel: f.rel, pkg: f.pkg, kind: f.kind, bytes: f.bytes,
  loc: f.lines.total, locCode: f.lines.code, locComment: f.lines.comment,
  fns: f.ast?.functions ?? 0,
  maxCyclo: Math.max(0, ...(f.ast?.fns ?? []).map((x) => x.cyclo)),
  sumCyclo: (f.ast?.fns ?? []).reduce((a, x) => a + x.cyclo, 0),
  maxNest: Math.max(0, ...(f.ast?.fns ?? []).map((x) => x.nesting)),
  casts: (f.ast?.asAny ?? 0) + (f.ast?.asUnknown ?? 0),
  nonNull: f.ast?.nonNull ?? 0,
  maxLineLen: f.chars.maxLineLen,
}));
fs.writeFileSync(path.join(OUT_DIR, 'OMEGA_METROLOGY_PERFILE.json'),
  JSON.stringify({ meta: dataset.meta, files: perFileTable }, null, 2), 'utf8');
process.stderr.write(`[scan-static] wrote ${outPath} (${fs.statSync(outPath).size} bytes)\n`);
process.stderr.write(`[scan-static] repo: ${repo.files.ts_src} src + ${repo.files.ts_test} test ts | ` +
  `${repo.loc.code} LOC code | ${repo.declarations.functions} fns | ` +
  `graph ${repo.graph.nodes}n/${repo.graph.edges}e cycles=${repo.graph.cycleCount} | dup ${dupRatioPct}%\n`);
