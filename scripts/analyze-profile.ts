#!/usr/bin/env npx tsx

/**
 * CPU Profile Analyzer
 * Standard: NASA-Grade L4
 *
 * Analyzes .cpuprofile files and extracts top functions by self time.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CPUProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount: number;
  children?: number[];
}

interface CPUProfile {
  nodes: CPUProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

interface FunctionStats {
  name: string;
  url: string;
  selfTime: number;
  totalHits: number;
}

function analyzeProfile(profilePath: string): void {
  console.log(`📊 Analyzing profile: ${profilePath}\n`);

  if (!fs.existsSync(profilePath)) {
    console.error(`Error: File not found: ${profilePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(profilePath, 'utf8');
  const profile: CPUProfile = JSON.parse(content);

  // Calculate total time
  const totalTime = profile.endTime - profile.startTime;
  const totalSamples = profile.samples.length;

  console.log(`Profile Duration: ${(totalTime / 1000000).toFixed(2)}s`);
  console.log(`Total Samples: ${totalSamples}`);
  console.log('');

  // Build node map
  const nodeMap = new Map<number, CPUProfileNode>();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
  }

  // Count samples per node
  const sampleCounts = new Map<number, number>();
  for (const sampleId of profile.samples) {
    sampleCounts.set(sampleId, (sampleCounts.get(sampleId) || 0) + 1);
  }

  // Calculate self time for each function
  const functionStats = new Map<string, FunctionStats>();

  for (const [nodeId, count] of sampleCounts) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const funcName = node.callFrame.functionName || '(anonymous)';
    const url = node.callFrame.url || '(native)';
    const key = `${funcName}@${url}:${node.callFrame.lineNumber}`;

    const existing = functionStats.get(key) || {
      name: funcName,
      url: url,
      selfTime: 0,
      totalHits: 0,
    };

    existing.selfTime += count;
    existing.totalHits += count;
    functionStats.set(key, existing);
  }

  // Sort by self time
  const sortedFunctions = Array.from(functionStats.values())
    .sort((a, b) => b.selfTime - a.selfTime)
    .slice(0, 20); // Top 20

  console.log('═'.repeat(80));
  console.log('TOP FUNCTIONS BY SELF TIME');
  console.log('═'.repeat(80));
  console.log('');
  console.log(
    '| Function'.padEnd(40) +
      '| Self Time %'.padEnd(15) +
      '| Samples'.padEnd(12) +
      '|'
  );
  console.log('|' + '-'.repeat(39) + '|' + '-'.repeat(14) + '|' + '-'.repeat(11) + '|');

  let cumulativePercent = 0;

  for (const func of sortedFunctions) {
    const percent = (func.selfTime / totalSamples) * 100;
    cumulativePercent += percent;

    const funcName =
      func.name.length > 35 ? func.name.substring(0, 32) + '...' : func.name;

    console.log(
      `| ${funcName.padEnd(38)}| ${percent.toFixed(2).padStart(10)}% | ${String(func.selfTime).padStart(9)} |`
    );
  }

  console.log('');
  console.log(`Top 20 functions account for ${cumulativePercent.toFixed(1)}% of CPU time`);
  console.log('');

  // Check for bottlenecks (>15% threshold)
  const bottlenecks = sortedFunctions.filter(
    (f) => (f.selfTime / totalSamples) * 100 > 15
  );

  if (bottlenecks.length > 0) {
    console.log('⚠️  BOTTLENECKS DETECTED (>15% CPU):');
    for (const b of bottlenecks) {
      const percent = (b.selfTime / totalSamples) * 100;
      console.log(`   - ${b.name}: ${percent.toFixed(1)}%`);
    }
    console.log('');
    console.log('→ Phase B.4 (Optimizations) MAY BE REQUIRED');
  } else {
    console.log('✅ No bottlenecks detected (all functions <15% CPU)');
    console.log('');
    console.log('→ Phase B.4 (Optimizations) NOT REQUIRED');
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('For detailed analysis, use Chrome DevTools:');
  console.log('  1. Open chrome://inspect');
  console.log('  2. Click "Open dedicated DevTools for Node"');
  console.log('  3. Go to "Profiler" tab');
  console.log('  4. Load profile: ' + path.resolve(profilePath));
  console.log('═'.repeat(80));
}

// Main
const profilePath = process.argv[2];

if (!profilePath) {
  console.log('CPU Profile Analyzer');
  console.log('');
  console.log('Usage: npx tsx scripts/analyze-profile.ts <profile.cpuprofile>');
  console.log('');
  console.log('Example:');
  console.log('  npx tsx scripts/analyze-profile.ts profiling-results/cpu-profile-20260120-120000.cpuprofile');
  process.exit(0);
}

analyzeProfile(profilePath);
