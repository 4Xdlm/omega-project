#!/usr/bin/env npx tsx

/**
 * Performance Budget Tracker
 * Standard: NASA-Grade L4
 *
 * Compares benchmark results against defined budgets.
 * NOTE: Budgets are targets, not test assertions.
 */

import * as fs from 'fs';

// ============================================================================
// Budget Definitions
// ============================================================================

interface Budget {
  operation: string;
  target_p95_ms: number;
  category: string;
}

const budgets: Budget[] = [
  // Atlas Operations
  { operation: 'atlas_insert_1000_items', target_p95_ms: 500, category: 'Atlas' },
  { operation: 'atlas_query_10k_full_scan', target_p95_ms: 100, category: 'Atlas' },
  { operation: 'atlas_query_10k_with_filter', target_p95_ms: 100, category: 'Atlas' },
  { operation: 'atlas_query_10k_with_index', target_p95_ms: 100, category: 'Atlas' },
  { operation: 'atlas_get_by_id_10k', target_p95_ms: 10, category: 'Atlas' },

  // Raw Storage Operations
  { operation: 'raw_store_1000_small_items', target_p95_ms: 200, category: 'Raw' },
  { operation: 'raw_retrieve_1000_items', target_p95_ms: 150, category: 'Raw' },
  { operation: 'raw_store_1mb_file', target_p95_ms: 100, category: 'Raw' },
  { operation: 'raw_store_10mb_file', target_p95_ms: 1000, category: 'Raw' },
  { operation: 'raw_list_1000_items', target_p95_ms: 50, category: 'Raw' },
  { operation: 'raw_store_1mb_compressed', target_p95_ms: 500, category: 'Raw' },

  // Proof Utils Operations
  { operation: 'proof_build_manifest_100_files', target_p95_ms: 300, category: 'Proof' },
  { operation: 'proof_verify_manifest_100_files', target_p95_ms: 200, category: 'Proof' },
  { operation: 'proof_build_manifest_10_large_files', target_p95_ms: 500, category: 'Proof' },
  { operation: 'proof_verify_manifest_10_large_files', target_p95_ms: 500, category: 'Proof' },
];

// ============================================================================
// Types
// ============================================================================

interface BenchResult {
  name: string;
  p95_ms: number;
  mean_ms: number;
}

interface BenchSuite {
  results: BenchResult[];
  timestamp: string;
  version: string;
}

interface TrackingResult {
  operation: string;
  category: string;
  actual_p95_ms: number;
  target_p95_ms: number;
  percent_of_budget: number;
  status: 'OK' | 'WARNING' | 'EXCEEDED';
}

// ============================================================================
// Tracking Logic
// ============================================================================

function trackPerformance(resultsPath: string): void {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           PERFORMANCE BUDGET TRACKING                       ║');
  console.log('║           Standard: NASA-Grade L4                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  if (!fs.existsSync(resultsPath)) {
    console.error(`Error: Results file not found: ${resultsPath}`);
    console.log('');
    console.log('Run benchmarks first: npm run bench');
    process.exit(1);
  }

  const suite: BenchSuite = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const results: BenchResult[] = suite.results;

  console.log(`Results from: ${resultsPath}`);
  console.log(`Timestamp: ${suite.timestamp}`);
  console.log(`Version: ${suite.version}`);
  console.log('');

  const trackingResults: TrackingResult[] = [];
  let violations = 0;
  let warnings = 0;

  // Track each budget
  for (const budget of budgets) {
    const result = results.find((r) => r.name === budget.operation);

    if (!result) {
      console.log(`⚠️  ${budget.operation}: NO DATA`);
      continue;
    }

    const percentOfBudget = (result.p95_ms / budget.target_p95_ms) * 100;

    let status: 'OK' | 'WARNING' | 'EXCEEDED';
    if (percentOfBudget <= 50) {
      status = 'OK';
    } else if (percentOfBudget <= 100) {
      status = 'WARNING';
      warnings++;
    } else {
      status = 'EXCEEDED';
      violations++;
    }

    trackingResults.push({
      operation: budget.operation,
      category: budget.category,
      actual_p95_ms: result.p95_ms,
      target_p95_ms: budget.target_p95_ms,
      percent_of_budget: percentOfBudget,
      status,
    });
  }

  // Group by category
  const categories = ['Atlas', 'Raw', 'Proof'];

  for (const category of categories) {
    const categoryResults = trackingResults.filter((r) => r.category === category);

    if (categoryResults.length === 0) continue;

    console.log(`─── ${category} ───`);
    console.log('');

    for (const tr of categoryResults) {
      const indicator =
        tr.status === 'OK' ? '✅' : tr.status === 'WARNING' ? '⚠️' : '❌';
      const opName = tr.operation.replace(`${category.toLowerCase()}_`, '');
      const paddedName = opName.padEnd(35);
      const actualStr = tr.actual_p95_ms.toFixed(2).padStart(8);
      const budgetPct = tr.percent_of_budget.toFixed(1).padStart(5);

      console.log(
        `${indicator} ${paddedName} ${actualStr}ms  (${budgetPct}% of budget)`
      );
    }

    console.log('');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('');
  console.log('Summary:');
  console.log(`  Total operations tracked: ${trackingResults.length}`);
  console.log(`  Within budget (≤50%):     ${trackingResults.filter((r) => r.status === 'OK').length}`);
  console.log(`  Approaching budget (≤100%): ${warnings}`);
  console.log(`  Exceeded budget (>100%):  ${violations}`);
  console.log('');

  if (violations > 0) {
    console.log('❌ BUDGET VIOLATIONS DETECTED');
    console.log('');
    console.log('Note: Budgets are targets, not hard limits.');
    console.log('Review PERFORMANCE_BUDGETS.md for guidance.');
  } else if (warnings > 0) {
    console.log('⚠️  Some operations approaching budget limits.');
    console.log('Consider monitoring these operations.');
  } else {
    console.log('✅ All operations well within budget!');
  }

  console.log('');
}

// ============================================================================
// Main
// ============================================================================

const resultsPath = process.argv[2] || 'bench-results/latest.json';
trackPerformance(resultsPath);
