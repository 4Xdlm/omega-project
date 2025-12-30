#!/usr/bin/env tsx
// ═══════════════════════════════════════════════════════════════════════════
// OMEGA UI Bootstrap — First Cycle Script (Standalone)
// Usage: npx tsx scripts/run_first_cycle.ts <workspace_path>
// ═══════════════════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';

interface RunResult {
  timestamp: string;
  workspace: string;
  status: 'PASS' | 'FAIL';
  duration_ms: number;
  summary: {
    tests: number | null;
    invariants: number | null;
    notes: string[];
  };
}

function log(msg: string): void {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${ts}] ${msg}`);
}

async function runFirstCycle(workspacePath: string): Promise<RunResult> {
  const startTime = Date.now();
  const notes: string[] = [];
  let invariantsCount = 0;
  let allPass = true;

  log(`Starting first cycle for: ${workspacePath}`);

  // ─── CHECK 1: Workspace exists ───
  if (!fs.existsSync(workspacePath)) {
    return {
      timestamp: new Date().toISOString(),
      workspace: workspacePath,
      status: 'FAIL',
      duration_ms: Date.now() - startTime,
      summary: {
        tests: null,
        invariants: 0,
        notes: ['Workspace path does not exist'],
      },
    };
  }
  notes.push('✓ Workspace exists');
  invariantsCount++;
  log('✓ Workspace exists');

  // ─── CHECK 2: Is a directory ───
  const stats = fs.statSync(workspacePath);
  if (!stats.isDirectory()) {
    notes.push('✗ Path is not a directory');
    allPass = false;
    log('✗ Path is not a directory');
  } else {
    notes.push('✓ Path is a directory');
    invariantsCount++;
    log('✓ Path is a directory');
  }

  // ─── CHECK 3: Contains package.json ───
  const packageJsonPath = path.join(workspacePath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    notes.push('✓ package.json found');
    invariantsCount++;
    log('✓ package.json found');

    // Try to read and validate
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.name) {
        notes.push(`  → Project: ${pkg.name}`);
        log(`  → Project: ${pkg.name}`);
      }
      if (pkg.version) {
        notes.push(`  → Version: ${pkg.version}`);
        log(`  → Version: ${pkg.version}`);
      }
    } catch {
      notes.push('⚠ package.json exists but could not be parsed');
      log('⚠ package.json exists but could not be parsed');
    }
  } else {
    notes.push('⚠ No package.json found');
    log('⚠ No package.json found');
  }

  // ─── CHECK 4: Contains OMEGA marker ───
  const omegaMarker = path.join(workspacePath, '.omega');
  const omegaJson = path.join(workspacePath, 'omega-project.json');
  if (fs.existsSync(omegaMarker) || fs.existsSync(omegaJson)) {
    notes.push('✓ OMEGA project marker found');
    invariantsCount++;
    log('✓ OMEGA project marker found');
  } else {
    notes.push('⚠ No OMEGA project marker');
    log('⚠ No OMEGA project marker (.omega or omega-project.json)');
  }

  // ─── CHECK 5: Contains src/ directory ───
  const srcDir = path.join(workspacePath, 'src');
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    notes.push('✓ src/ directory found');
    invariantsCount++;
    log('✓ src/ directory found');

    // Count TS files
    const files = fs.readdirSync(srcDir);
    const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    if (tsFiles.length > 0) {
      notes.push(`  → ${tsFiles.length} TypeScript files found`);
      invariantsCount++;
      log(`  → ${tsFiles.length} TypeScript files found`);
    }
  } else {
    notes.push('⚠ No src/ directory found');
    log('⚠ No src/ directory found');
  }

  // ─── CHECK 6: Contains tests ───
  const testsDir = path.join(workspacePath, 'tests');
  if (fs.existsSync(testsDir) && fs.statSync(testsDir).isDirectory()) {
    notes.push('✓ tests/ directory found');
    invariantsCount++;
    log('✓ tests/ directory found');
  } else {
    // Check for *_test.ts files in root
    const rootFiles = fs.readdirSync(workspacePath);
    const testFiles = rootFiles.filter(f => f.endsWith('_test.ts'));
    if (testFiles.length > 0) {
      notes.push(`✓ ${testFiles.length} test files in root`);
      invariantsCount++;
      log(`✓ ${testFiles.length} test files in root`);
    } else {
      notes.push('⚠ No tests found');
      log('⚠ No tests/ directory or test files found');
    }
  }

  // ─── CHECK 7: tsconfig.json ───
  const tsconfigPath = path.join(workspacePath, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    notes.push('✓ tsconfig.json found');
    invariantsCount++;
    log('✓ tsconfig.json found');
  }

  const duration = Date.now() - startTime;
  const status = allPass ? 'PASS' : 'FAIL';

  log('');
  log(`═══════════════════════════════════════`);
  log(`Status: ${status}`);
  log(`Duration: ${duration}ms`);
  log(`Invariants checked: ${invariantsCount}`);
  log(`═══════════════════════════════════════`);

  return {
    timestamp: new Date().toISOString(),
    workspace: workspacePath,
    status,
    duration_ms: duration,
    summary: {
      tests: null,
      invariants: invariantsCount,
      notes,
    },
  };
}

async function saveResult(result: RunResult): Promise<void> {
  const outputDir = path.join(process.cwd(), 'omega-ui-output');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  // Save JSON
  const jsonPath = path.join(outputDir, `${ts}_result.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  log(`Saved: ${jsonPath}`);

  // Save log
  const logPath = path.join(outputDir, `${ts}_run.log`);
  const logContent = `OMEGA UI First Cycle Log
========================
Timestamp: ${result.timestamp}
Workspace: ${result.workspace}
Status: ${result.status}
Duration: ${result.duration_ms}ms

Checks:
${result.summary.notes.join('\n')}

Invariants checked: ${result.summary.invariants ?? 0}
`;
  fs.writeFileSync(logPath, logContent);
  log(`Saved: ${logPath}`);
}

// ─── MAIN ───
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/run_first_cycle.ts <workspace_path>');
    process.exit(1);
  }

  const workspacePath = path.resolve(args[0]);
  
  try {
    const result = await runFirstCycle(workspacePath);
    await saveResult(result);
    
    process.exit(result.status === 'PASS' ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
