/**
 * OMEGA Runner — Command Dispatch Tests
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for the command registry that replaced the hardcoded dispatch switch
 * in src/runner/main.ts.
 *
 * Covers:
 * - Registry exhaustiveness (every CliCommand has a handler)
 * - dispatchCommand routing + unknown-command guard (never throws)
 * - main() argument parsing -> exit code mapping
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  COMMAND_REGISTRY,
  dispatchCommand,
  main,
  type CommandHandler,
} from '../../src/runner/main';
import { ExitCode, DEFAULT_PROFILE, isCliCommand } from '../../src/runner/types';
import type { ParsedArgs, CliCommand } from '../../src/runner/types';

// The complete set of commands the CLI is expected to support.
const ALL_COMMANDS: readonly CliCommand[] = ['run', 'batch', 'verify', 'capsule', 'help'];

describe('Runner command dispatch — Phase I', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('COMMAND_REGISTRY', () => {
    it('has exactly one handler per CLI command', () => {
      const keys = Object.keys(COMMAND_REGISTRY).sort();
      expect(keys).toEqual([...ALL_COMMANDS].sort());
    });

    it('maps every CliCommand key to a callable handler', () => {
      for (const command of ALL_COMMANDS) {
        const handler: CommandHandler = COMMAND_REGISTRY[command];
        expect(typeof handler).toBe('function');
      }
    });

    it('is frozen (immutable single source of truth)', () => {
      expect(Object.isFrozen(COMMAND_REGISTRY)).toBe(true);
    });

    it('exposes only valid CLI command keys', () => {
      for (const key of Object.keys(COMMAND_REGISTRY)) {
        expect(isCliCommand(key)).toBe(true);
      }
    });
  });

  describe('dispatchCommand', () => {
    it('routes the help command to a PASS exit code', async () => {
      const code = await dispatchCommand({ command: 'help', profile: DEFAULT_PROFILE });
      expect(code).toBe(ExitCode.PASS);
      expect(logSpy).toHaveBeenCalled();
    });

    it('returns INTENT_INVALID for an unknown command without throwing', async () => {
      // Force an out-of-contract command to exercise the runtime guard.
      const rogue = { command: 'nope', profile: DEFAULT_PROFILE } as unknown as ParsedArgs;
      const code = await dispatchCommand(rogue);
      expect(code).toBe(ExitCode.INTENT_INVALID);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('routes run with a missing intent file to INTENT_INVALID', async () => {
      const args: ParsedArgs = {
        command: 'run',
        intentPath: 'does/not/exist/intent.json',
        profile: DEFAULT_PROFILE,
      };
      const code = await dispatchCommand(args);
      expect(code).toBe(ExitCode.INTENT_INVALID);
    });
  });

  describe('main', () => {
    it('returns PASS for the help command', async () => {
      const code = await main(['help']);
      expect(code).toBe(ExitCode.PASS);
    });

    it('returns PASS (help) when no arguments are provided', async () => {
      const code = await main([]);
      expect(code).toBe(ExitCode.PASS);
    });

    it('returns INTENT_INVALID for an unrecognised command', async () => {
      const code = await main(['bogus-command']);
      expect(code).toBe(ExitCode.INTENT_INVALID);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('returns INTENT_INVALID when run is missing --intent', async () => {
      const code = await main(['run']);
      expect(code).toBe(ExitCode.INTENT_INVALID);
    });

    it('returns INTENT_INVALID when run targets a non-existent intent', async () => {
      const code = await main(['run', '--intent', 'missing/intent.json']);
      expect(code).toBe(ExitCode.INTENT_INVALID);
    });
  });
});
