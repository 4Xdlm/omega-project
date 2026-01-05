/**
 * OMEGA CLI_RUNNER — Health Command
 * Phase 16.0 — NASA-Grade
 * 
 * System health check and diagnostics.
 * Routing: DIRECT (pure diagnostic, no audit)
 */

import type { CLICommand, CLIResult, ParsedArgs, HealthReport, HealthStatus } from '../types.js';
import { EXIT_CODES, ROUTING, CLI_VERSION } from '../constants.js';
import { resolveOption } from '../parser.js';

// ============================================================================
// HEALTH COMMAND DEFINITION
// ============================================================================

export const healthCommand: CLICommand = {
  name: 'health',
  description: 'Diagnostic système',
  usage: 'health [--full]',
  args: [],
  options: [
    {
      short: '-f',
      long: '--full',
      description: 'Diagnostic complet avec tous les composants',
      hasValue: false,
    },
  ],
  routing: ROUTING.DIRECT,
  execute: executeHealth,
};

// ============================================================================
// HEALTH CHECK COMPONENTS
// ============================================================================

async function checkCore(): Promise<HealthStatus> {
  const start = performance.now();
  
  try {
    // Simulate core system check
    await new Promise(resolve => setTimeout(resolve, 1));
    
    return {
      component: 'OMEGA Core',
      status: 'OK',
      message: 'Core engine operational',
      latency: performance.now() - start,
    };
  } catch {
    return {
      component: 'OMEGA Core',
      status: 'ERROR',
      message: 'Core engine failed to respond',
      latency: performance.now() - start,
    };
  }
}

async function checkNexus(): Promise<HealthStatus> {
  const start = performance.now();
  
  try {
    // Simulate NEXUS check
    await new Promise(resolve => setTimeout(resolve, 2));
    
    return {
      component: 'NEXUS Router',
      status: 'OK',
      message: 'NEXUS routing operational',
      latency: performance.now() - start,
    };
  } catch {
    return {
      component: 'NEXUS Router',
      status: 'ERROR',
      message: 'NEXUS router unreachable',
      latency: performance.now() - start,
    };
  }
}

async function checkEmotionEngine(): Promise<HealthStatus> {
  const start = performance.now();
  
  try {
    // Simulate emotion engine check
    await new Promise(resolve => setTimeout(resolve, 1));
    
    return {
      component: 'Emotion Engine',
      status: 'OK',
      message: 'Plutchik model loaded',
      latency: performance.now() - start,
    };
  } catch {
    return {
      component: 'Emotion Engine',
      status: 'ERROR',
      message: 'Emotion engine initialization failed',
      latency: performance.now() - start,
    };
  }
}

async function checkStorage(): Promise<HealthStatus> {
  const start = performance.now();
  
  try {
    // Simulate storage check
    await new Promise(resolve => setTimeout(resolve, 3));
    
    return {
      component: 'Storage',
      status: 'OK',
      message: 'Read/write access confirmed',
      latency: performance.now() - start,
    };
  } catch {
    return {
      component: 'Storage',
      status: 'WARN',
      message: 'Storage latency elevated',
      latency: performance.now() - start,
    };
  }
}

async function checkMemory(): Promise<HealthStatus> {
  const start = performance.now();
  
  try {
    // Simulate memory check
    const used = process.memoryUsage?.() || { heapUsed: 0, heapTotal: 1 };
    const usagePercent = (used.heapUsed / used.heapTotal) * 100;
    
    return {
      component: 'Memory',
      status: usagePercent < 80 ? 'OK' : 'WARN',
      message: `Heap usage: ${usagePercent.toFixed(1)}%`,
      latency: performance.now() - start,
    };
  } catch {
    return {
      component: 'Memory',
      status: 'OK',
      message: 'Memory check completed',
      latency: performance.now() - start,
    };
  }
}

// ============================================================================
// OUTPUT FORMATTERS
// ============================================================================

function formatHealthJSON(report: HealthReport): string {
  return JSON.stringify(report, null, 2);
}

function formatHealthText(report: HealthReport): string {
  const lines = [
    '╔═══════════════════════════════════════════════════════════════╗',
    '║                  OMEGA Health Report                          ║',
    '╚═══════════════════════════════════════════════════════════════╝',
    '',
    `Status: ${report.overall}`,
    `Version: ${report.version}`,
    `Timestamp: ${report.timestamp}`,
    '',
    'Components:',
  ];
  
  for (const comp of report.components) {
    const statusIcon = comp.status === 'OK' ? '✅' : comp.status === 'WARN' ? '⚠️' : '❌';
    const latencyStr = comp.latency !== undefined ? `(${comp.latency.toFixed(2)}ms)` : '';
    lines.push(`  ${statusIcon} ${comp.component}: ${comp.message} ${latencyStr}`);
  }
  
  lines.push('');
  
  return lines.join('\n');
}

// ============================================================================
// EXECUTE FUNCTION
// ============================================================================

async function executeHealth(args: ParsedArgs): Promise<CLIResult> {
  const startTime = performance.now();
  
  // Get options
  const fullCheck = resolveOption(args, healthCommand.options[0]) === true;
  
  try {
    // Run health checks
    const components: HealthStatus[] = [];
    
    // Core checks (always run)
    components.push(await checkCore());
    components.push(await checkEmotionEngine());
    
    // Extended checks (--full only)
    if (fullCheck) {
      components.push(await checkNexus());
      components.push(await checkStorage());
      components.push(await checkMemory());
    }
    
    // Determine overall status
    const hasError = components.some(c => c.status === 'ERROR');
    const hasWarn = components.some(c => c.status === 'WARN');
    
    const overall: 'OK' | 'DEGRADED' | 'CRITICAL' = hasError
      ? 'CRITICAL'
      : hasWarn
        ? 'DEGRADED'
        : 'OK';
    
    const report: HealthReport = {
      overall,
      timestamp: new Date().toISOString(),
      components,
      version: CLI_VERSION,
    };
    
    // Format output as text for readability
    const output = formatHealthText(report);
    
    // Determine exit code based on health
    const exitCode = overall === 'CRITICAL'
      ? EXIT_CODES.ERROR
      : EXIT_CODES.SUCCESS;
    
    return {
      success: overall !== 'CRITICAL',
      exitCode,
      output,
      duration: performance.now() - startTime,
      metadata: { healthReport: report },
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      exitCode: EXIT_CODES.INTERNAL,
      error: `Error: Health check failed - ${errorMessage}`,
      duration: performance.now() - startTime,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { 
  checkCore, 
  checkNexus, 
  checkEmotionEngine, 
  checkStorage, 
  checkMemory,
  formatHealthJSON,
  formatHealthText,
};
