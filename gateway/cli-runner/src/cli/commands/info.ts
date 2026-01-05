/**
 * OMEGA CLI_RUNNER — Info Commands
 * Phase 16.0 — NASA-Grade
 * 
 * Version and system information commands.
 * Routing: DIRECT (pure info, no audit)
 */

import type { CLICommand, CLIResult, ParsedArgs } from '../types.js';
import { EXIT_CODES, ROUTING, CLI_VERSION, CLI_NAME, CLI_DESCRIPTION } from '../constants.js';

// ============================================================================
// VERSION COMMAND
// ============================================================================

export const versionCommand: CLICommand = {
  name: 'version',
  description: 'Affiche la version',
  usage: 'version',
  args: [],
  options: [],
  routing: ROUTING.DIRECT,
  execute: executeVersion,
};

async function executeVersion(_args: ParsedArgs): Promise<CLIResult> {
  const startTime = performance.now();
  
  const output = `${CLI_NAME} v${CLI_VERSION}`;
  
  return {
    success: true,
    exitCode: EXIT_CODES.SUCCESS,
    output,
    duration: performance.now() - startTime,
  };
}

// ============================================================================
// INFO COMMAND
// ============================================================================

export const infoCommand: CLICommand = {
  name: 'info',
  description: 'Informations système',
  usage: 'info',
  args: [],
  options: [],
  routing: ROUTING.DIRECT,
  execute: executeInfo,
};

async function executeInfo(_args: ParsedArgs): Promise<CLIResult> {
  const startTime = performance.now();
  
  // Gather system information
  const info = {
    cli: {
      name: CLI_NAME,
      version: CLI_VERSION,
      description: CLI_DESCRIPTION,
    },
    omega: {
      coreVersion: '3.15.0-NEXUS_CORE-STABLE',
      sanctuarized: true,
      invariants: 8,
      tests: 226,
    },
    runtime: {
      platform: typeof process !== 'undefined' ? process.platform : 'unknown',
      arch: typeof process !== 'undefined' ? process.arch : 'unknown',
      nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
    },
    commands: [
      'analyze  - Analyse émotionnelle',
      'compare  - Comparaison de textes',
      'export   - Export de projets',
      'batch    - Traitement batch',
      'health   - Diagnostic système',
      'version  - Affiche la version',
      'info     - Informations système',
    ],
    routing: {
      NEXUS: ['analyze', 'compare', 'batch'],
      DIRECT: ['export', 'health', 'version', 'info'],
    },
    timestamp: new Date().toISOString(),
  };
  
  // Format as readable text
  const output = formatInfo(info);
  
  return {
    success: true,
    exitCode: EXIT_CODES.SUCCESS,
    output,
    duration: performance.now() - startTime,
    metadata: { systemInfo: info },
  };
}

// ============================================================================
// INFO FORMATTER
// ============================================================================

interface SystemInfo {
  cli: {
    name: string;
    version: string;
    description: string;
  };
  omega: {
    coreVersion: string;
    sanctuarized: boolean;
    invariants: number;
    tests: number;
  };
  runtime: {
    platform: string;
    arch: string;
    nodeVersion: string;
  };
  commands: string[];
  routing: {
    NEXUS: string[];
    DIRECT: string[];
  };
  timestamp: string;
}

function formatInfo(info: SystemInfo): string {
  const lines = [
    '╔═══════════════════════════════════════════════════════════════╗',
    '║                    OMEGA CLI Information                       ║',
    '╚═══════════════════════════════════════════════════════════════╝',
    '',
    '📦 CLI',
    `   Name:        ${info.cli.name}`,
    `   Version:     v${info.cli.version}`,
    `   Description: ${info.cli.description}`,
    '',
    '🔒 OMEGA Core',
    `   Core Version:  ${info.omega.coreVersion}`,
    `   Sanctuarized:  ${info.omega.sanctuarized ? 'YES' : 'NO'}`,
    `   Invariants:    ${info.omega.invariants}`,
    `   Tests:         ${info.omega.tests}`,
    '',
    '💻 Runtime',
    `   Platform:  ${info.runtime.platform}`,
    `   Arch:      ${info.runtime.arch}`,
    `   Node:      ${info.runtime.nodeVersion}`,
    '',
    '📋 Commands',
    ...info.commands.map(cmd => `   • ${cmd}`),
    '',
    '🔀 Routing Policy',
    `   NEXUS (audit):  ${info.routing.NEXUS.join(', ')}`,
    `   DIRECT (local): ${info.routing.DIRECT.join(', ')}`,
    '',
    `⏰ ${info.timestamp}`,
    '',
  ];
  
  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export { formatInfo };
