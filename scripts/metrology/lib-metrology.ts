/**
 * OMEGA METROLOGY — shared library (READ-ONLY measurement, EMP-14 tooling)
 * ---------------------------------------------------------------------------
 * Pure measurement helpers. No engine code touched. Deterministic.
 * Used by scan-static.ts / scan-git-churn.ts / aggregate-report.ts.
 *
 * Method note: AST metrics use the TypeScript compiler PARSER ONLY
 * (ts.createSourceFile) — no type-checker, no Program. This keeps the scan
 * fast + deterministic and requires zero external deps (typescript is already
 * a repo devDep). Limits documented in OMEGA_METROLOGY_METHOD.md.
 */
import ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export const REPO_ROOT = path.resolve(process.cwd());
export const SCOPE_DIRS = ['packages', 'src', 'gateway'];
export const EXCLUDE_RE = /[\\/](node_modules|dist|\.git|coverage|\.turbo|\.next)[\\/]/;

// ---------- file discovery ----------
export interface FileRec {
  abs: string;
  rel: string;          // posix-relative to repo root
  pkg: string;          // owning package/module bucket
  kind: 'src' | 'test' | 'dts' | 'json' | 'md' | 'other';
  bytes: number;
}

export function pkgOf(rel: string): string {
  const p = rel.replace(/\\/g, '/');
  const m = p.match(/^packages\/([^/]+)\//);
  if (m) return m[1];
  if (p.startsWith('src/')) return 'src(monolith)';
  if (p.startsWith('gateway/')) return 'gateway';
  return 'other';
}

export function classify(rel: string): FileRec['kind'] {
  if (/\.d\.ts$/.test(rel)) return 'dts';
  if (/\.(test|spec)\.ts$/.test(rel)) return 'test';
  if (/\.ts$/.test(rel)) return 'src';
  if (/\.json$/.test(rel)) return 'json';
  if (/\.md$/.test(rel)) return 'md';
  return 'other';
}

export function walk(dir: string, out: string[]): void {
  let ents: fs.Dirent[];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (EXCLUDE_RE.test(full + path.sep)) continue;
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile()) out.push(full);
  }
}

export function discover(): FileRec[] {
  const files: string[] = [];
  for (const d of SCOPE_DIRS) {
    const abs = path.join(REPO_ROOT, d);
    if (fs.existsSync(abs)) walk(abs, files);
  }
  const recs: FileRec[] = [];
  for (const abs of files) {
    const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, '/');
    let bytes = 0;
    try { bytes = fs.statSync(abs).size; } catch { /* ignore */ }
    recs.push({ abs, rel, pkg: pkgOf(rel), kind: classify(rel), bytes });
  }
  recs.sort((a, b) => a.rel.localeCompare(b.rel)); // deterministic order
  return recs;
}

// ---------- line classification (cloc-grade approximation) ----------
export interface LineStats { total: number; code: number; comment: number; blank: number; }

export function classifyLines(text: string): LineStats {
  const lines = text.split(/\r\n|\r|\n/);
  let code = 0, comment = 0, blank = 0;
  let inBlock = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inBlock) {
      comment++;
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (line === '') { blank++; continue; }
    if (line.startsWith('//')) { comment++; continue; }
    if (line.startsWith('/*')) {
      comment++;
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    code++;
  }
  return { total: lines.length, code, comment, blank };
}

// ---------- char stats ----------
export interface CharStats { chars: number; maxLineLen: number; avgLineLen: number; }
export function charStats(text: string): CharStats {
  const lines = text.split(/\r\n|\r|\n/);
  let maxLen = 0;
  for (const l of lines) if (l.length > maxLen) maxLen = l.length;
  const chars = text.length;
  return { chars, maxLineLen: maxLen, avgLineLen: lines.length ? chars / lines.length : 0 };
}

// ---------- AST metrics ----------
export interface FnMetric { loc: number; params: number; cyclo: number; nesting: number; }
export interface AstMetrics {
  functions: number; classes: number; interfaces: number; typeAliases: number;
  enums: number; exports: number; imports: number; importedSymbols: number;
  fns: FnMetric[];
  // typing safety
  asAny: number; asUnknown: number; tsIgnore: number; tsNocheck: number;
  tsExpectError: number; nonNull: number; eslintDisable: number; anyKeyword: number;
  // dep graph
  importSpecifiers: string[];
}

const FN_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor, ts.SyntaxKind.GetAccessor, ts.SyntaxKind.SetAccessor,
]);

function lineOf(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line;
}

export function analyzeAst(text: string, fileName: string): AstMetrics {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true,
    /\.tsx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const m: AstMetrics = {
    functions: 0, classes: 0, interfaces: 0, typeAliases: 0, enums: 0,
    exports: 0, imports: 0, importedSymbols: 0, fns: [],
    asAny: 0, asUnknown: 0, tsIgnore: 0, tsNocheck: 0, tsExpectError: 0,
    nonNull: 0, eslintDisable: 0, anyKeyword: 0, importSpecifiers: [],
  };

  // function-local cyclomatic + nesting (computed during dedicated walk)
  function fnMetrics(node: ts.Node): FnMetric {
    const startLine = lineOf(sf, node.getStart(sf));
    const endLine = lineOf(sf, node.getEnd());
    let cyclo = 1;
    let maxNest = 0;
    const body = (node as any).body ?? node;
    const visit = (n: ts.Node, depth: number) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CatchClause:
          cyclo++; break;
        case ts.SyntaxKind.CaseClause:
          cyclo++; break;
        case ts.SyntaxKind.BinaryExpression: {
          const op = (n as ts.BinaryExpression).operatorToken.kind;
          if (op === ts.SyntaxKind.AmpersandAmpersandToken ||
              op === ts.SyntaxKind.BarBarToken ||
              op === ts.SyntaxKind.QuestionQuestionToken) cyclo++;
          break;
        }
        default: break;
      }
      let nd = depth;
      if (n.kind === ts.SyntaxKind.Block || n.kind === ts.SyntaxKind.CaseBlock) {
        nd = depth + 1;
        if (nd > maxNest) maxNest = nd;
      }
      // do not descend into nested function bodies (counted separately)
      if (n !== body && FN_KINDS.has(n.kind)) return;
      ts.forEachChild(n, (c) => visit(c, nd));
    };
    if (body) ts.forEachChild(body, (c) => visit(c, 0));
    const params = (node as any).parameters ? (node as any).parameters.length : 0;
    return { loc: endLine - startLine + 1, params, cyclo, nesting: maxNest };
  }

  const walkNode = (node: ts.Node): void => {
    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.FunctionExpression:
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.Constructor:
      case ts.SyntaxKind.GetAccessor:
      case ts.SyntaxKind.SetAccessor:
        m.functions++;
        m.fns.push(fnMetrics(node));
        break;
      case ts.SyntaxKind.ClassDeclaration: m.classes++; break;
      case ts.SyntaxKind.InterfaceDeclaration: m.interfaces++; break;
      case ts.SyntaxKind.TypeAliasDeclaration: m.typeAliases++; break;
      case ts.SyntaxKind.EnumDeclaration: m.enums++; break;
      case ts.SyntaxKind.ImportDeclaration: {
        m.imports++;
        const id = node as ts.ImportDeclaration;
        if (ts.isStringLiteral(id.moduleSpecifier)) m.importSpecifiers.push(id.moduleSpecifier.text);
        const ic = id.importClause;
        if (ic) {
          if (ic.name) m.importedSymbols++;
          const nb = ic.namedBindings;
          if (nb) {
            if (ts.isNamedImports(nb)) m.importedSymbols += nb.elements.length;
            else m.importedSymbols++; // namespace import
          }
        }
        break;
      }
      case ts.SyntaxKind.NonNullExpression: m.nonNull++; break;
      case ts.SyntaxKind.AnyKeyword: m.anyKeyword++; break;
      case ts.SyntaxKind.AsExpression: {
        const t = (node as ts.AsExpression).type;
        if (t.kind === ts.SyntaxKind.AnyKeyword) m.asAny++;
        else if (t.kind === ts.SyntaxKind.UnknownKeyword) m.asUnknown++;
        break;
      }
      default: break;
    }
    // exported declarations
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (mods && mods.some((mm) => mm.kind === ts.SyntaxKind.ExportKeyword)) m.exports++;
    if (node.kind === ts.SyntaxKind.ExportDeclaration || node.kind === ts.SyntaxKind.ExportAssignment) m.exports++;
    ts.forEachChild(node, walkNode);
  };
  walkNode(sf);

  // text-based directive counts
  m.tsIgnore = (text.match(/@ts-ignore/g) || []).length;
  m.tsNocheck = (text.match(/@ts-nocheck/g) || []).length;
  m.tsExpectError = (text.match(/@ts-expect-error/g) || []).length;
  m.eslintDisable = (text.match(/eslint-disable/g) || []).length;

  return m;
}

// ---------- stats helpers ----------
export interface Dist { n: number; sum: number; mean: number; median: number; stddev: number; p95: number; max: number; min: number; }
export function dist(values: number[]): Dist {
  const n = values.length;
  if (n === 0) return { n: 0, sum: 0, mean: 0, median: 0, stddev: 0, p95: 0, max: 0, min: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = sorted[Math.floor((n - 1) / 2)]!;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const p95 = sorted[Math.min(n - 1, Math.floor(0.95 * (n - 1)))]!;
  return { n, sum, mean, median, stddev: Math.sqrt(variance), p95, max: sorted[n - 1]!, min: sorted[0]! };
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function round(x: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
