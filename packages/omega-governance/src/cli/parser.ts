/**
 * OMEGA Governance — CLI Parser
 * Phase D.2 — Argument parsing (no external dependencies)
 */

export type GovCommand = 'compare' | 'drift' | 'bench' | 'certify' | 'history' | 'baseline' | 'replay' | 'ci' | 'badge' | 'help' | 'version';

export interface GovParsedArgs {
  readonly command: GovCommand;
  readonly runs?: string;
  readonly baseline?: string;
  readonly candidate?: string;
  readonly run?: string;
  readonly suite?: string;
  readonly log?: string;
  readonly out?: string;
  readonly since?: string;
  readonly until?: string;
  readonly format?: 'json' | 'md';
  // Phase F additions
  readonly action?: string;
  readonly baselinesDir?: string;
  readonly baselineVersion?: string;
  readonly baselineDir?: string;
  readonly seed?: string;
  readonly badgeOut?: string;
  readonly resultFile?: string;
}

/** Parse CLI arguments into structured args */
export function parseGovArgs(argv: readonly string[]): GovParsedArgs {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { command: 'help' };
  }

  if (args.includes('--version') || args.includes('-v')) {
    return { command: 'version' };
  }

  const subcommand = args[0];

  if (subcommand === 'govern' || subcommand === 'gov') {
    return parseGovSubcommand(args.slice(1));
  }

  return parseGovSubcommand(args);
}

function parseGovSubcommand(args: readonly string[]): GovParsedArgs {
  if (args.length === 0 || args.includes('--help')) {
    return { command: 'help' };
  }

  const command = args[0] as GovCommand;
  const validCommands: GovCommand[] = ['compare', 'drift', 'bench', 'certify', 'history', 'baseline', 'replay', 'ci', 'badge'];

  if (!validCommands.includes(command)) {
    return { command: 'help' };
  }

  const flags: Record<string, string | undefined> = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }

  return {
    command,
    runs: flags['runs'],
    baseline: flags['baseline'],
    candidate: flags['candidate'],
    run: flags['run'],
    suite: flags['suite'],
    log: flags['log'],
    out: flags['out'],
    since: flags['since'],
    until: flags['until'],
    format: flags['format'] as 'json' | 'md' | undefined,
    // Phase F
    action: flags['action'],
    baselinesDir: flags['baselines-dir'],
    baselineVersion: flags['baseline-version'],
    baselineDir: flags['baseline-dir'],
    seed: flags['seed'],
    badgeOut: flags['badge-out'],
    resultFile: flags['result-file'],
  };
}

/** Get help text */
export function getGovHelpText(): string {
  return [
    'OMEGA Governance — D.2 Analysis Layer',
    '',
    'Usage: omega-govern <command> [options]',
    '',
    'Commands:',
    '  compare   Compare N runs',
    '  drift     Detect drift vs baseline',
    '  bench     Execute benchmark suite',
    '  certify   Generate conformity certificate',
    '  history   Query event history',
    '',
    'Options:',
    '  --runs <dir1,dir2,...>   Runs to compare (compare)',
    '  --baseline <dir>        Baseline run directory (drift)',
    '  --candidate <dir>       Candidate run directory (drift)',
    '  --run <dir>             Run directory (certify)',
    '  --suite <dir>           Benchmark suite directory (bench)',
    '  --log <path>            NDJSON log path (history)',
    '  --out <path>            Output file path',
    '  --since <ISO>           Filter from date (history)',
    '  --until <ISO>           Filter until date (history)',
    '  --format <json|md>      Output format (default: json)',
    '  --help                  Show this help',
    '  --version               Show version',
    '',
    'Phase F — CI Commands:',
    '  baseline  Manage baselines (--action register|list|check|certify)',
    '  replay    Compare baseline vs candidate replay',
    '  ci        Run CI gates G0-G5',
    '  badge     Generate CI status badge',
    '',
    'Phase F Options:',
    '  --action <verb>         Baseline action (register, list, check, certify)',
    '  --baselines-dir <dir>   Baselines directory',
    '  --baseline-version <v>  Baseline version',
    '  --baseline-dir <dir>    Baseline run directory',
    '  --seed <seed>           Seed for replay',
    '  --badge-out <path>      Badge SVG output path',
    '  --result-file <path>    CI result JSON file (for badge)',
    '',
    'Exit Codes:',
    '  0  SUCCESS',
    '  1  GENERIC ERROR',
    '  2  USAGE ERROR',
    '  3  PROOFPACK INVALID',
    '  4  IO ERROR',
    '  5  INVARIANT BREACH',
    '  6  DRIFT DETECTED',
    '  7  CERTIFICATION FAIL',
  ].join('\n');
}
