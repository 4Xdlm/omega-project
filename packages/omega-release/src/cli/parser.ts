/**
 * OMEGA Release — CLI Parser
 * Phase G.0 — Argument parsing
 */

export interface ParsedArgs {
  readonly command: string;
  readonly args: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

/** Parse CLI arguments */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const args = argv.slice(2); // Skip node + script
  const command = args[0] ?? 'help';
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const eqIdx = key.indexOf('=');
      if (eqIdx >= 0) {
        flags[key.slice(0, eqIdx)] = key.slice(eqIdx + 1);
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { command, args: positional, flags };
}

/** Available CLI commands */
export const COMMANDS = ['version', 'changelog', 'build', 'selftest', 'rollback', 'help'] as const;
export type Command = typeof COMMANDS[number];

/** Check if a command is valid */
export function isValidCommand(cmd: string): cmd is Command {
  return (COMMANDS as readonly string[]).includes(cmd);
}
