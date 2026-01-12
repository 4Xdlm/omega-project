#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — CLI
 * Command Line Interface for Nexus Operations
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module cli
 * @version 1.0.0
 * @description
 * Unified CLI for all Nexus operations:
 *   - omega-nexus init              Initialize nexus structure
 *   - omega-nexus seal              Create a new seal (interactive)
 *   - omega-nexus seal --auto       Create seal from session file
 *   - omega-nexus verify            Verify nexus integrity
 *   - omega-nexus verify --seal ID  Verify specific seal
 *   - omega-nexus atlas             Generate atlas views
 *   - omega-nexus export            Export for tribunal
 *   - omega-nexus status            Show nexus status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Import modules
import { getDate, getTimestamp, getNextId } from './registry.js';
import { parseFile, computeFileHash, getCanonicalPath } from './hash.js';
import { buildMerkleRoot, getFilesInScope, verifyMerkleRoot } from './merkle.js';
import { 
  createSession, closeSession, appendToSession,
  createEntity, createEvent, createManifest, createSeal
} from './seal.js';
import { verifyIntegrity, verifySeal, verifyChain, quickVerify, VERIFY_STATUS } from './verify.js';
import { validateNexus, validateBeforeSeal, RULE_STATUS } from './guardian.js';
import { buildAll, verifyAtlas, loadLedger, ATLAS_VERSION } from './atlas.js';
import { installGitHooks, createBackup, verifyBackup } from './automation.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const VERSION = '1.0.0';
const DEFAULT_BASE_DIR = process.cwd();

// Colors for output
const success = chalk.green;
const error = chalk.red;
const warn = chalk.yellow;
const info = chalk.blue;
const dim = chalk.dim;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get base directory from options or default
 * @param {object} options - Command options
 * @returns {string} Base directory path
 */
function getBaseDir(options) {
  return options.dir ? resolve(options.dir) : DEFAULT_BASE_DIR;
}

/**
 * Check if nexus exists at path
 * @param {string} baseDir - Base directory
 * @returns {boolean} True if nexus exists
 */
function nexusExists(baseDir) {
  return existsSync(join(baseDir, 'nexus', 'genesis'));
}

/**
 * Print a header
 * @param {string} title - Header title
 */
function printHeader(title) {
  console.log('');
  console.log(chalk.bold.cyan('═'.repeat(60)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.bold.cyan('═'.repeat(60)));
  console.log('');
}

/**
 * Print a status line
 * @param {string} status - PASS/FAIL/WARN
 * @param {string} message - Status message
 */
function printStatus(status, message) {
  if (status === 'PASS' || status === VERIFY_STATUS.PASS || status === RULE_STATUS.PASS) {
    console.log(success('  ✓ ') + message);
  } else if (status === 'FAIL' || status === VERIFY_STATUS.FAIL || status === RULE_STATUS.FAIL) {
    console.log(error('  ✗ ') + message);
  } else if (status === 'WARN' || status === VERIFY_STATUS.WARN || status === RULE_STATUS.WARN) {
    console.log(warn('  ⚠ ') + message);
  } else {
    console.log(dim('  - ') + message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize nexus structure
 */
async function cmdInit(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — INIT');
  
  if (nexusExists(baseDir) && !options.force) {
    console.log(warn('Nexus already exists at this location.'));
    console.log(dim('Use --force to reinitialize.'));
    return;
  }
  
  console.log(info('Creating nexus structure...'));
  console.log(dim(`  Base: ${baseDir}`));
  console.log('');
  
  // Create directories
  const dirs = [
    'nexus/genesis',
    'nexus/ledger/entities',
    'nexus/ledger/events',
    'nexus/ledger/links',
    'nexus/ledger/registry',
    'nexus/raw/sessions',
    'nexus/raw/logs/tests',
    'nexus/raw/logs/build',
    'nexus/raw/reports/coverage',
    'nexus/proof/seals',
    'nexus/proof/states',
    'nexus/proof/completeness',
    'nexus/proof/certificates',
    'nexus/proof/snapshots/manifests',
    'nexus/atlas/museum',
    'nexus/atlas/visions',
    'nexus/atlas/lessons'
  ];
  
  for (const dir of dirs) {
    const fullPath = join(baseDir, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      printStatus('PASS', `Created ${dir}`);
    } else {
      printStatus('WARN', `Exists ${dir}`);
    }
  }
  
  // Create genesis files if not exist
  const genesisPath = join(baseDir, 'nexus', 'genesis');
  
  if (!existsSync(join(genesisPath, 'THE_OATH.md'))) {
    writeFileSync(join(genesisPath, 'THE_OATH.md'), `# THE OATH

This Nexus serves as the immutable record of OMEGA project decisions.

Every entry is:
- Cryptographically sealed
- Permanently traceable
- Legally admissible

Truth above convenience.
Proof above assertion.
Integrity above speed.

Signed: The OMEGA Project
Date: ${getTimestamp()}
`);
    printStatus('PASS', 'Created THE_OATH.md');
  }
  
  if (!existsSync(join(genesisPath, 'LAWS.yaml'))) {
    const yaml = await import('yaml');
    writeFileSync(join(genesisPath, 'LAWS.yaml'), yaml.stringify({
      version: '1.0.0',
      created_at: getTimestamp(),
      laws: [
        'Every decision must be recorded',
        'Every record must be sealed',
        'Every seal must be verifiable',
        'No record may be deleted',
        'No seal may be broken'
      ]
    }));
    printStatus('PASS', 'Created LAWS.yaml');
  }
  
  if (!existsSync(join(genesisPath, 'IDENTITY.yaml'))) {
    const yaml = await import('yaml');
    writeFileSync(join(genesisPath, 'IDENTITY.yaml'), yaml.stringify({
      project: 'OMEGA',
      nexus_version: VERSION,
      created_at: getTimestamp(),
      purpose: 'Immutable project decision record'
    }));
    printStatus('PASS', 'Created IDENTITY.yaml');
  }
  
  console.log('');
  console.log(success('✓ Nexus initialized successfully'));
  console.log(dim(`  Run 'omega-nexus status' to see nexus state`));
}

/**
 * Create a seal
 */
async function cmdSeal(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — SEAL');
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found. Run `omega-nexus init` first.'));
    return;
  }
  
  // Run Guardian validation first
  console.log(info('Running Guardian validation...'));
  const guardianResult = validateBeforeSeal(baseDir);
  
  if (!guardianResult.valid) {
    console.log(error('Guardian validation FAILED'));
    console.log('');
    for (const failure of guardianResult.failures.slice(0, 5)) {
      console.log(error(`  File: ${failure.file}`));
      for (const err of failure.errors) {
        console.log(dim(`    - ${err.name}: ${err.message}`));
      }
    }
    if (guardianResult.failures.length > 5) {
      console.log(dim(`  ... and ${guardianResult.failures.length - 5} more`));
    }
    console.log('');
    console.log(warn('Fix validation errors before sealing.'));
    return;
  }
  
  printStatus('PASS', `Guardian: ${guardianResult.summary.passed} passed`);
  
  // Create session
  console.log('');
  console.log(info('Creating seal...'));
  
  const session = createSession({ baseDir, actor: 'cli' });
  printStatus('PASS', `Session: ${session.id}`);
  
  // Create manifest
  const files = getFilesInScope(baseDir, ['*.LOCK', 'ATLAS-RUN.json']);
  const manifest = createManifest({
    baseDir,
    session_id: session.id,
    files_in_scope: files
  });
  printStatus('PASS', `Manifest: ${manifest.id} (${manifest.manifest.file_count} files)`);
  
  // Compute root hash
  const rootHash = buildMerkleRoot(files, baseDir);
  
  // Create seal
  const seal = createSeal({
    baseDir,
    manifest_id: manifest.id,
    session_id: session.id,
    root_hash: rootHash,
    scope: 'FULL',
    sealed_by: 'omega-nexus-cli',
    notes: options.message || 'Seal created via CLI'
  });
  printStatus('PASS', `Seal: ${seal.id}`);
  printStatus('PASS', `Root Hash: ${rootHash}`);
  
  // Close session
  closeSession(session.path, session.id);
  printStatus('PASS', 'Session closed');
  
  console.log('');
  console.log(success('✓ Seal created successfully'));
  console.log(dim(`  Verify with: omega-nexus verify --seal ${seal.id}`));
}

/**
 * Verify nexus integrity
 */
async function cmdVerify(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — VERIFY');
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found. Run `omega-nexus init` first.'));
    return;
  }
  
  if (options.seal) {
    // Verify specific seal
    console.log(info(`Verifying seal: ${options.seal}`));
    console.log('');
    
    const result = verifySeal(options.seal, baseDir);
    
    printStatus(result.status, `Status: ${result.status}`);
    if (result.rootHash) {
      printStatus('PASS', `Root Hash: ${result.rootHash}`);
    }
    if (result.computedHash) {
      printStatus(result.status === VERIFY_STATUS.PASS ? 'PASS' : 'FAIL', 
        `Computed: ${result.computedHash}`);
    }
    if (result.message) {
      console.log(dim(`  ${result.message}`));
    }
    
    return;
  }
  
  // Full integrity check
  console.log(info('Running full integrity check...'));
  console.log('');
  
  // 1. Structure check
  console.log(chalk.bold('Structure:'));
  const integrityResult = verifyIntegrity(baseDir);
  for (const check of integrityResult.checks) {
    printStatus(check.status, check.message);
  }
  
  // 2. Guardian check
  console.log('');
  console.log(chalk.bold('Guardian:'));
  const guardianResult = validateNexus(baseDir);
  
  let rulesPassed = 0;
  let rulesFailed = 0;
  for (const [ruleId, counts] of Object.entries(guardianResult.rules)) {
    if (counts.fail > 0) {
      rulesFailed++;
      printStatus('FAIL', `${ruleId}: ${counts.fail} failures`);
    } else if (counts.pass > 0) {
      rulesPassed++;
    }
  }
  if (rulesFailed === 0) {
    printStatus('PASS', `All ${rulesPassed} rules passed`);
  }
  
  // 3. Chain check
  console.log('');
  console.log(chalk.bold('Seal Chain:'));
  const chainResult = verifyChain(baseDir);
  printStatus(chainResult.status, chainResult.message);
  if (chainResult.seals) {
    console.log(dim(`  ${chainResult.seals.length} seal(s) in chain`));
  }
  
  // 4. Quick verify (latest seal)
  console.log('');
  console.log(chalk.bold('Latest Seal:'));
  const quickResult = quickVerify(baseDir);
  printStatus(quickResult.status, quickResult.message);
  
  // Summary
  console.log('');
  const allPass = integrityResult.status === VERIFY_STATUS.PASS && 
                  guardianResult.status === RULE_STATUS.PASS &&
                  chainResult.status !== VERIFY_STATUS.FAIL;
  
  if (allPass) {
    console.log(success('✓ Nexus integrity verified'));
  } else {
    console.log(error('✗ Verification failed - see errors above'));
  }
}

/**
 * Generate atlas views
 */
async function cmdAtlas(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — ATLAS');
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found. Run `omega-nexus init` first.'));
    return;
  }
  
  if (options.verify) {
    console.log(info('Verifying atlas...'));
    const result = verifyAtlas(baseDir);
    
    if (result.valid) {
      printStatus('PASS', 'Atlas is up-to-date');
      console.log(dim(`  Meta hash: ${result.meta_hash}`));
    } else {
      printStatus('FAIL', result.reason);
    }
    return;
  }
  
  console.log(info('Generating atlas views...'));
  console.log('');
  
  const result = buildAll(baseDir, { dryRun: options.dryRun });
  
  printStatus('PASS', `Entities: ${result.ledger.entities}`);
  printStatus('PASS', `Events: ${result.ledger.events}`);
  printStatus('PASS', `Links: ${result.ledger.links}`);
  printStatus('PASS', `Seals: ${result.ledger.seals}`);
  
  console.log('');
  console.log(chalk.bold('Generated:'));
  for (const [name, path] of Object.entries(result.outputs)) {
    printStatus('PASS', `${name}: ${path.replace(baseDir, '.')}`);
  }
  
  console.log('');
  printStatus('PASS', `Meta Hash: ${result.meta_hash}`);
  
  if (options.dryRun) {
    console.log('');
    console.log(warn('Dry run - no files written'));
  } else {
    console.log('');
    console.log(success('✓ Atlas generated successfully'));
  }
}

/**
 * Export for tribunal
 */
async function cmdExport(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — EXPORT');
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found. Run `omega-nexus init` first.'));
    return;
  }
  
  console.log(info('Preparing export...'));
  
  // Load ledger
  const ledger = loadLedger(baseDir);
  
  // Get all seals
  const seals = ledger.seals;
  if (seals.length === 0) {
    console.log(warn('No seals found to export.'));
    return;
  }
  
  // Build export manifest
  const exportData = {
    export_version: '1.0.0',
    exported_at: getTimestamp(),
    nexus_path: baseDir,
    seal_count: seals.length,
    entity_count: ledger.entities.length,
    event_count: ledger.events.length,
    link_count: ledger.links.length,
    seals: seals.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      rootHash: s.rootHash,
      status: s.status
    })),
    latest_seal: seals[seals.length - 1]?.id,
    verification: {
      chain_verified: verifyChain(baseDir).status === VERIFY_STATUS.PASS,
      guardian_passed: validateNexus(baseDir).status === RULE_STATUS.PASS
    }
  };
  
  // Write export file
  const exportPath = options.output || join(baseDir, `nexus-export-${getDate()}.json`);
  writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  
  console.log('');
  printStatus('PASS', `Seals: ${exportData.seal_count}`);
  printStatus('PASS', `Entities: ${exportData.entity_count}`);
  printStatus('PASS', `Events: ${exportData.event_count}`);
  printStatus('PASS', `Chain verified: ${exportData.verification.chain_verified}`);
  printStatus('PASS', `Guardian passed: ${exportData.verification.guardian_passed}`);
  
  console.log('');
  console.log(success(`✓ Export saved to: ${exportPath}`));
}

/**
 * Show nexus status
 */
async function cmdStatus(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — STATUS');
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found at this location.'));
    console.log(dim(`  Path: ${baseDir}`));
    console.log(dim(`  Run 'omega-nexus init' to create one.`));
    return;
  }
  
  console.log(chalk.bold('Location:'));
  console.log(dim(`  ${baseDir}`));
  
  // Load ledger
  const ledger = loadLedger(baseDir);
  
  console.log('');
  console.log(chalk.bold('Ledger:'));
  console.log(`  Entities: ${ledger.entities.length}`);
  console.log(`  Events:   ${ledger.events.length}`);
  console.log(`  Links:    ${ledger.links.length}`);
  console.log(`  Seals:    ${ledger.seals.length}`);
  
  // Latest seal
  if (ledger.seals.length > 0) {
    const latest = ledger.seals[ledger.seals.length - 1];
    console.log('');
    console.log(chalk.bold('Latest Seal:'));
    console.log(`  ID:        ${latest.id}`);
    console.log(`  Timestamp: ${latest.timestamp}`);
    console.log(`  Status:    ${latest.status || 'VALID'}`);
    console.log(dim(`  Root Hash: ${latest.root_hash || latest.rootHash}`));
  }
  
  // Quick integrity check
  console.log('');
  console.log(chalk.bold('Integrity:'));
  const quickResult = quickVerify(baseDir);
  printStatus(quickResult.status, quickResult.message);
  
  // Atlas status
  const atlasResult = verifyAtlas(baseDir);
  if (atlasResult.valid) {
    printStatus('PASS', 'Atlas up-to-date');
  } else {
    printStatus('WARN', `Atlas: ${atlasResult.reason}`);
  }
  
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const program = new Command();

program
  .name('omega-nexus')
  .description('OMEGA NEXUS — Immutable Project Decision Record')
  .version(VERSION);

program
  .command('init')
  .description('Initialize nexus structure')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('-f, --force', 'Force reinitialization')
  .action(cmdInit);

program
  .command('seal')
  .description('Create a new seal')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('-m, --message <msg>', 'Seal message/notes')
  .option('--auto', 'Automatic mode (no prompts)')
  .action(cmdSeal);

program
  .command('verify')
  .description('Verify nexus integrity')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('-s, --seal <id>', 'Verify specific seal')
  .action(cmdVerify);

program
  .command('atlas')
  .description('Generate atlas views')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('--verify', 'Only verify atlas is up-to-date')
  .option('--dry-run', 'Do not write files')
  .action(cmdAtlas);

program
  .command('export')
  .description('Export for tribunal')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('-o, --output <file>', 'Output file path')
  .action(cmdExport);

program
  .command('status')
  .description('Show nexus status')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .action(cmdStatus);

program
  .command('hooks')
  .description('Install git hooks')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('--uninstall', 'Uninstall hooks')
  .action(cmdHooks);

program
  .command('backup')
  .description('Create or verify backup')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .option('-o, --output <path>', 'Backup output directory')
  .option('--verify <path>', 'Verify existing backup')
  .action(cmdBackup);

program
  .command('where')
  .description('Show current project state (phase, seals, entities)')
  .option('-d, --dir <path>', 'Base directory', DEFAULT_BASE_DIR)
  .action(cmdWhere);

// Parse and run
program.parse();

// ═══════════════════════════════════════════════════════════════════════════════
// WHERE COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdWhere(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — WHERE');
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found. Run `omega-nexus init` first.'));
    return;
  }
  
  const ledger = loadLedger(baseDir);
  
  // Find latest seal
  let latestSeal = null;
  if (ledger.seals.length > 0) {
    latestSeal = ledger.seals[ledger.seals.length - 1];
  }
  
  // Count entities by lifecycle
  const lifecycleCounts = {};
  for (const entity of ledger.entities) {
    const lc = entity.lifecycle || 'UNKNOWN';
    lifecycleCounts[lc] = (lifecycleCounts[lc] || 0) + 1;
  }
  
  // Count by type
  const typeCounts = {};
  for (const entity of ledger.entities) {
    const t = entity.type || 'UNKNOWN';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  
  // Find active entities (DRAFT or ACTIVE)
  const activeEntities = ledger.entities.filter(e => 
    e.lifecycle === 'ACTIVE' || e.lifecycle === 'DRAFT'
  );
  
  console.log(chalk.bold('📍 Current State'));
  console.log('');
  
  // Latest seal
  if (latestSeal) {
    console.log(success(`  Last Seal: ${latestSeal.id}`));
    console.log(dim(`    Date: ${latestSeal.timestamp}`));
    console.log(dim(`    Hash: ${latestSeal.root_hash}`));
  } else {
    console.log(warn('  No seals yet'));
  }
  
  console.log('');
  console.log(chalk.bold('📊 Entities'));
  console.log(`  Total: ${ledger.entities.length}`);
  
  // By lifecycle
  for (const [lc, count] of Object.entries(lifecycleCounts).sort()) {
    const icon = lc === 'ACTIVE' ? '✓' : lc === 'DRAFT' ? '◐' : '○';
    console.log(`    ${icon} ${lc}: ${count}`);
  }
  
  console.log('');
  console.log(chalk.bold('📋 By Type'));
  for (const [t, count] of Object.entries(typeCounts).sort()) {
    console.log(`    ${t}: ${count}`);
  }
  
  // Active work
  if (activeEntities.length > 0) {
    console.log('');
    console.log(chalk.bold('🎯 Active Work'));
    for (const entity of activeEntities.slice(0, 5)) {
      const status = entity.lifecycle === 'DRAFT' ? dim('[DRAFT]') : success('[ACTIVE]');
      console.log(`    ${entity.id} ${status}`);
      console.log(dim(`      ${entity.title}`));
    }
    if (activeEntities.length > 5) {
      console.log(dim(`    ... and ${activeEntities.length - 5} more`));
    }
  }
  
  // Events count
  console.log('');
  console.log(chalk.bold('📜 Events'));
  console.log(`  Total: ${ledger.events.length}`);
  
  // Seals count
  console.log('');
  console.log(chalk.bold('🔐 Seals'));
  console.log(`  Total: ${ledger.seals.length}`);
  
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdHooks(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — HOOKS');
  
  if (options.uninstall) {
    console.log(info('Uninstalling git hooks...'));
    console.log(warn('Manual removal required from .git/hooks/'));
    return;
  }
  
  console.log(info('Installing git hooks...'));
  
  const result = installGitHooks(baseDir);
  
  if (!result.success) {
    console.log(error(`Failed: ${result.error}`));
    return;
  }
  
  for (const hook of result.installed) {
    printStatus('PASS', `Installed: ${hook}`);
  }
  
  console.log('');
  console.log(success('✓ Git hooks installed'));
  console.log(dim('  Hooks will run automatically on git operations'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKUP COMMAND
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdBackup(options) {
  const baseDir = getBaseDir(options);
  printHeader('OMEGA NEXUS — BACKUP');
  
  if (options.verify) {
    console.log(info(`Verifying backup: ${options.verify}`));
    
    const result = verifyBackup(options.verify);
    
    if (result.valid) {
      printStatus('PASS', 'Backup integrity verified');
      console.log(dim(`  Root hash: ${result.manifest.root_hash}`));
      console.log(dim(`  Created: ${result.manifest.created_at}`));
    } else {
      printStatus('FAIL', `Verification failed: ${result.error}`);
    }
    return;
  }
  
  if (!nexusExists(baseDir)) {
    console.log(error('Nexus not found. Run `omega-nexus init` first.'));
    return;
  }
  
  const backupDir = options.output || join(baseDir, 'backups');
  
  console.log(info('Creating backup...'));
  console.log(dim(`  Source: ${baseDir}`));
  console.log(dim(`  Target: ${backupDir}`));
  console.log('');
  
  const result = createBackup(baseDir, backupDir);
  
  if (!result.success) {
    console.log(error(`Backup failed: ${result.error}`));
    return;
  }
  
  printStatus('PASS', `Files: ${result.manifest.file_count}`);
  printStatus('PASS', `Root hash: ${result.manifest.root_hash}`);
  printStatus('PASS', `Path: ${result.path}`);
  
  console.log('');
  console.log(success('✓ Backup created successfully'));
  console.log(dim(`  Verify with: omega-nexus backup --verify "${result.path}"`));
}
