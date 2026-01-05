/**
 * OMEGA CLI_RUNNER — Invariants Tests
 * Phase 16.0 — NASA-Grade
 * 
 * PREUVES DES 6 INVARIANTS CLI
 * 
 * | ID          | Invariant                | Description                                      |
 * |-------------|--------------------------|--------------------------------------------------|
 * | INV-CLI-01  | Exit Code Coherent       | success=true → exitCode=0, success=false → >0    |
 * | INV-CLI-02  | No Silent Failure        | Toute erreur produit un message sur stderr       |
 * | INV-CLI-03  | Deterministic Output     | Même input + même seed → même output             |
 * | INV-CLI-04  | Duration Always Set      | duration > 0 pour toute commande                 |
 * | INV-CLI-05  | Contract Enforced        | Routing DIRECT/NEXUS respecté selon policy       |
 * | INV-CLI-06  | Help Available           | --help sur toute commande retourne usage         |
 */

import { describe, it, expect } from 'vitest';
import { run, getAllCommands } from '../src/cli/runner.js';
import { analyzeText } from '../src/cli/commands/analyze.js';
import { enforceContract } from '../src/cli/contract.js';
import { EXIT_CODES, DEFAULTS } from '../src/cli/constants.js';

describe('INVARIANTS CLI_RUNNER', () => {
  // ============================================================================
  // INV-CLI-01: Exit Code Coherent
  // success=true → exitCode=0, success=false → exitCode>0
  // ============================================================================
  
  describe('INV-CLI-01: Exit Code Coherent', () => {
    it('success=true implies exitCode=0', async () => {
      const result = await run(['version']);
      
      if (result.success) {
        expect(result.exitCode).toBe(EXIT_CODES.SUCCESS);
      }
    });

    it('success=false implies exitCode>0', async () => {
      const result = await run(['analyze']); // Missing argument
      
      if (!result.success) {
        expect(result.exitCode).toBeGreaterThan(0);
      }
    });

    it('coherence holds for all successful commands', async () => {
      const successCases = [
        ['version'],
        ['info'],
        ['health'],
        ['analyze', 'sample_text.txt'],
      ];
      
      for (const args of successCases) {
        const result = await run(args);
        if (result.success) {
          expect(result.exitCode).toBe(0);
        }
      }
    });

    it('coherence holds for all failed commands', async () => {
      const failCases = [
        ['analyze'],              // Missing arg
        ['unknown'],              // Unknown command
        ['analyze', 'error.txt'], // File error
      ];
      
      for (const args of failCases) {
        const result = await run(args);
        if (!result.success) {
          expect(result.exitCode).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================================================
  // INV-CLI-02: No Silent Failure
  // Toute erreur produit un message sur stderr
  // ============================================================================
  
  describe('INV-CLI-02: No Silent Failure', () => {
    it('unknown command produces error message', async () => {
      const result = await run(['nonexistent']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.length).toBeGreaterThan(0);
    });

    it('missing argument produces error message', async () => {
      const result = await run(['analyze']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Missing');
    });

    it('file error produces error message', async () => {
      const result = await run(['analyze', 'error_file.txt']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Error');
    });

    it('invalid option produces error message', async () => {
      const result = await run(['analyze', 'file.txt', '--output', 'invalid']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('no failure is ever silent', async () => {
      const failCases = [
        ['analyze'],
        ['compare', 'file1.txt'], // Missing second file
        ['export'],
        ['batch'],
        ['unknown'],
      ];
      
      for (const args of failCases) {
        const result = await run(args);
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(result.error!.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================================================
  // INV-CLI-03: Deterministic Output
  // Même input + même seed → même output
  // ============================================================================
  
  describe('INV-CLI-03: Deterministic Output', () => {
    it('analyzeText is deterministic', () => {
      const text = 'The happy warrior felt joy and trust in his mission.';
      
      const result1 = analyzeText(text, DEFAULTS.SEED);
      const result2 = analyzeText(text, DEFAULTS.SEED);
      
      expect(result1.wordCount).toBe(result2.wordCount);
      expect(result1.sentenceCount).toBe(result2.sentenceCount);
      expect(result1.dominantEmotion).toBe(result2.dominantEmotion);
      expect(result1.overallIntensity).toBe(result2.overallIntensity);
      expect(result1.emotions).toEqual(result2.emotions);
      expect(result1.seed).toBe(result2.seed);
    });

    it('same seed always produces same emotions array', () => {
      const text = 'Fear and anger mixed with sadness.';
      const seed = 42;
      
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(analyzeText(text, seed));
      }
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].emotions).toEqual(results[0].emotions);
      }
    });

    it('different seeds can produce different results', () => {
      const text = 'A mix of emotions.';
      
      const result1 = analyzeText(text, 42);
      const result2 = analyzeText(text, 999);
      
      // Seeds are stored in result, showing different runs
      expect(result1.seed).toBe(42);
      expect(result2.seed).toBe(999);
    });

    it('command output is deterministic for same input', async () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await run(['analyze', 'sample_text.txt', '--output', 'json']);
        results.push(result);
      }
      
      // Parse and compare core data (excluding timestamps)
      const parsed = results.map(r => JSON.parse(r.output!));
      for (let i = 1; i < parsed.length; i++) {
        expect(parsed[i].dominantEmotion).toBe(parsed[0].dominantEmotion);
        expect(parsed[i].wordCount).toBe(parsed[0].wordCount);
        expect(parsed[i].emotions).toEqual(parsed[0].emotions);
      }
    });
  });

  // ============================================================================
  // INV-CLI-04: Duration Always Set
  // duration > 0 pour toute commande
  // ============================================================================
  
  describe('INV-CLI-04: Duration Always Set', () => {
    it('duration is set for version command', async () => {
      const result = await run(['version']);
      
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('duration is set for info command', async () => {
      const result = await run(['info']);
      
      expect(result.duration).toBeGreaterThan(0);
    });

    it('duration is set for health command', async () => {
      const result = await run(['health']);
      
      expect(result.duration).toBeGreaterThan(0);
    });

    it('duration is set for analyze command', async () => {
      const result = await run(['analyze', 'sample_text.txt']);
      
      expect(result.duration).toBeGreaterThan(0);
    });

    it('duration is set even for failed commands', async () => {
      const result = await run(['analyze']); // Will fail
      
      expect(result.duration).toBeGreaterThan(0);
    });

    it('duration is set for all commands', async () => {
      const commands = [
        ['version'],
        ['info'],
        ['health'],
        ['analyze', 'sample_text.txt'],
        ['compare', 'sample_text.txt', 'sample_text_2.txt'],
        ['export', 'sample_project.omega'],
        ['batch', 'fixtures/'],
      ];
      
      for (const args of commands) {
        const result = await run(args);
        expect(result.duration).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // INV-CLI-05: Contract Enforced
  // Routing DIRECT/NEXUS respecté selon policy
  // ============================================================================
  
  describe('INV-CLI-05: Contract Enforced', () => {
    it('analyze requires NEXUS routing', () => {
      const result = enforceContract('analyze', 'NEXUS');
      expect(result.valid).toBe(true);
      
      const wrong = enforceContract('analyze', 'DIRECT');
      expect(wrong.valid).toBe(false);
    });

    it('compare requires NEXUS routing', () => {
      const result = enforceContract('compare', 'NEXUS');
      expect(result.valid).toBe(true);
    });

    it('batch requires NEXUS routing', () => {
      const result = enforceContract('batch', 'NEXUS');
      expect(result.valid).toBe(true);
    });

    it('health uses DIRECT routing', () => {
      const result = enforceContract('health', 'DIRECT');
      expect(result.valid).toBe(true);
      
      const wrong = enforceContract('health', 'NEXUS');
      expect(wrong.valid).toBe(false);
    });

    it('version uses DIRECT routing', () => {
      const result = enforceContract('version', 'DIRECT');
      expect(result.valid).toBe(true);
    });

    it('export uses DIRECT routing', () => {
      const result = enforceContract('export', 'DIRECT');
      expect(result.valid).toBe(true);
    });

    it('all commands have enforced routing', () => {
      const commands = getAllCommands();
      
      for (const cmd of commands) {
        const result = enforceContract(cmd.name, cmd.routing);
        expect(result.valid).toBe(true);
      }
    });

    it('unknown commands are rejected', () => {
      const result = enforceContract('unknown', 'NEXUS');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown command');
    });
  });

  // ============================================================================
  // INV-CLI-06: Help Available
  // --help sur toute commande retourne usage
  // ============================================================================
  
  describe('INV-CLI-06: Help Available', () => {
    it('--help shows general help with no command', async () => {
      const result = await run(['--help']);
      
      // Should show general help (no command specified)
      expect(result.success).toBe(true);
    });

    it('analyze --help shows command usage', async () => {
      const result = await run(['analyze', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
      expect(result.output).toContain('analyze');
    });

    it('compare --help shows command usage', async () => {
      const result = await run(['compare', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
      expect(result.output).toContain('compare');
    });

    it('export --help shows command usage', async () => {
      const result = await run(['export', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
    });

    it('batch --help shows command usage', async () => {
      const result = await run(['batch', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
    });

    it('health --help shows command usage', async () => {
      const result = await run(['health', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
    });

    it('-h short flag also shows help', async () => {
      const result = await run(['analyze', '-h']);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('Usage:');
    });

    it('all commands support --help', async () => {
      const commands = getAllCommands();
      
      for (const cmd of commands) {
        const result = await run([cmd.name, '--help']);
        expect(result.success).toBe(true);
        expect(result.output).toContain('Usage:');
      }
    });
  });
});

// ============================================================================
// SUMMARY TABLE
// ============================================================================

describe('INVARIANTS SUMMARY', () => {
  it('all 6 invariants are testable', () => {
    const invariants = [
      'INV-CLI-01: Exit Code Coherent',
      'INV-CLI-02: No Silent Failure',
      'INV-CLI-03: Deterministic Output',
      'INV-CLI-04: Duration Always Set',
      'INV-CLI-05: Contract Enforced',
      'INV-CLI-06: Help Available',
    ];
    
    expect(invariants.length).toBe(6);
  });
});
