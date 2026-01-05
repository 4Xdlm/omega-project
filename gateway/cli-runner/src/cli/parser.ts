/**
 * OMEGA CLI_RUNNER — Argument Parser
 * Phase 16.0 — NASA-Grade
 * 
 * Robust argument parser with validation.
 */

import type { ParsedArgs, CLICommand, CLIOption } from './types.js';
import { EXIT_CODES } from './constants.js';

// ============================================================================
// PARSER ERROR
// ============================================================================

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = EXIT_CODES.USAGE
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

// ============================================================================
// TOKENIZATION
// ============================================================================

interface Token {
  type: 'command' | 'arg' | 'short-opt' | 'long-opt' | 'value';
  value: string;
}

function tokenize(args: string[]): Token[] {
  const tokens: Token[] = [];
  let expectingValue = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (expectingValue) {
      tokens.push({ type: 'value', value: arg });
      expectingValue = false;
      continue;
    }
    
    if (arg.startsWith('--')) {
      // Long option: --output or --output=json
      if (arg.includes('=')) {
        const [opt, val] = arg.split('=', 2);
        tokens.push({ type: 'long-opt', value: opt.slice(2) });
        tokens.push({ type: 'value', value: val });
      } else {
        tokens.push({ type: 'long-opt', value: arg.slice(2) });
        expectingValue = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short option: -o or -ovalue
      const opt = arg[1];
      tokens.push({ type: 'short-opt', value: opt });
      if (arg.length > 2) {
        tokens.push({ type: 'value', value: arg.slice(2) });
      } else {
        expectingValue = true;
      }
    } else if (tokens.length === 0) {
      // First non-option is the command
      tokens.push({ type: 'command', value: arg });
    } else {
      // Positional argument
      tokens.push({ type: 'arg', value: arg });
    }
  }
  
  return tokens;
}

// ============================================================================
// PARSE FUNCTION
// ============================================================================

export function parse(args: string[]): ParsedArgs {
  const tokens = tokenize(args);
  
  let command = '';
  const positionalArgs: string[] = [];
  const options: Record<string, string | boolean> = {};
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    switch (token.type) {
      case 'command':
        command = token.value;
        break;
      
      case 'arg':
        positionalArgs.push(token.value);
        break;
      
      case 'short-opt':
      case 'long-opt': {
        const optName = token.value;
        const nextToken = tokens[i + 1];
        
        if (nextToken?.type === 'value') {
          options[optName] = nextToken.value;
          i++; // Skip the value token
        } else {
          // Boolean flag
          options[optName] = true;
        }
        break;
      }
      
      case 'value':
        // Orphan value (shouldn't happen with well-formed input)
        positionalArgs.push(token.value);
        break;
    }
  }
  
  return {
    command,
    args: positionalArgs,
    options,
    raw: args,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateArgs(
  parsed: ParsedArgs,
  command: CLICommand
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required positional arguments
  const requiredArgs = command.args.filter(a => a.required);
  if (parsed.args.length < requiredArgs.length) {
    const missing = requiredArgs
      .slice(parsed.args.length)
      .map(a => a.name)
      .join(', ');
    errors.push(`Missing required argument(s): ${missing}`);
  }
  
  // Validate positional arguments
  for (let i = 0; i < Math.min(parsed.args.length, command.args.length); i++) {
    const argDef = command.args[i];
    const argValue = parsed.args[i];
    
    if (argDef.validator && !argDef.validator(argValue)) {
      errors.push(`Invalid value for ${argDef.name}: ${argValue}`);
    }
  }
  
  // Check unknown options
  const knownOptions = new Set<string>();
  for (const opt of command.options) {
    knownOptions.add(opt.short.replace('-', ''));
    knownOptions.add(opt.long.replace('--', ''));
  }
  // Add standard help option
  knownOptions.add('h');
  knownOptions.add('help');
  
  for (const optName of Object.keys(parsed.options)) {
    if (!knownOptions.has(optName)) {
      errors.push(`Unknown option: --${optName}`);
    }
  }
  
  // Validate option values
  for (const opt of command.options) {
    const shortName = opt.short.replace('-', '');
    const longName = opt.long.replace('--', '');
    const value = parsed.options[longName] ?? parsed.options[shortName];
    
    if (value !== undefined && opt.validator && typeof value === 'string') {
      if (!opt.validator(value)) {
        errors.push(`Invalid value for ${opt.long}: ${value}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// OPTION RESOLUTION
// ============================================================================

export function resolveOption(
  parsed: ParsedArgs,
  option: CLIOption
): string | boolean | undefined {
  const shortName = option.short.replace('-', '');
  const longName = option.long.replace('--', '');
  
  // Long option takes precedence
  if (parsed.options[longName] !== undefined) {
    return parsed.options[longName];
  }
  if (parsed.options[shortName] !== undefined) {
    return parsed.options[shortName];
  }
  
  // Return default if defined
  if (option.default !== undefined) {
    return option.default;
  }
  
  return undefined;
}

// ============================================================================
// HELP MESSAGE GENERATION
// ============================================================================

export function generateHelp(command: CLICommand): string {
  const lines: string[] = [];
  
  lines.push(`Usage: omega ${command.usage}`);
  lines.push('');
  lines.push(command.description);
  lines.push('');
  
  if (command.args.length > 0) {
    lines.push('Arguments:');
    for (const arg of command.args) {
      const required = arg.required ? '(required)' : '(optional)';
      lines.push(`  ${arg.name}  ${arg.description} ${required}`);
    }
    lines.push('');
  }
  
  if (command.options.length > 0) {
    lines.push('Options:');
    for (const opt of command.options) {
      const defaultStr = opt.default ? ` [default: ${opt.default}]` : '';
      lines.push(`  ${opt.short}, ${opt.long}  ${opt.description}${defaultStr}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

// ============================================================================
// GENERAL HELP
// ============================================================================

export function generateGeneralHelp(commands: CLICommand[]): string {
  const lines: string[] = [];
  
  lines.push('OMEGA CLI — Emotional Analysis Engine for Novels');
  lines.push('');
  lines.push('Usage: omega <command> [options] [arguments]');
  lines.push('');
  lines.push('Commands:');
  
  for (const cmd of commands) {
    lines.push(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
  }
  
  lines.push('');
  lines.push('Run "omega <command> --help" for more information on a command.');
  lines.push('');
  
  return lines.join('\n');
}
