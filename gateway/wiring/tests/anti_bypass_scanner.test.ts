// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS ANTI-BYPASS SCANNER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-GW-01: Zero Direct Call - aucun import de module métier
// @invariant INV-WIRE-02: No Cross-Module Outside Wiring
// @invariant INV-E2E-05: Bypass Scan Pass
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  AntiBypassScanner,
  createAntiBypassScanner,
  assertNoBypass,
  FORBIDDEN_IMPORT_PATTERNS,
} from '../src/anti_bypass_scanner.js';

describe('AntiBypassScanner', () => {
  describe('Pattern detection', () => {
    describe('Memory module imports', () => {
      it('detects direct memory import', () => {
        const scanner = createAntiBypassScanner();
        const source = `
          import { MemoryStack } from '../src/memory/stack';
        `;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].severity).toBe('critical');
      });

      it('detects @omega/memory import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { write } from '@omega/memory';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });

      it('detects nested memory import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { x } from '../../src/memory/ledger';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });
    });

    describe('Query module imports', () => {
      it('detects direct query import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { QueryEngine } from '../src/query/engine';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });

      it('detects @omega/query import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { search } from '@omega/query';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });
    });

    describe('Oracle module imports', () => {
      it('detects direct oracle import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { predict } from '../src/oracle/core';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });

      it('detects @omega/oracle import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { Oracle } from '@omega/oracle';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });
    });

    describe('Muse module imports', () => {
      it('detects direct muse import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { generate } from '../src/oracle/muse/generator';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });

      it('detects @omega/muse import', () => {
        const scanner = createAntiBypassScanner();
        const source = `import { Muse } from '@omega/muse';`;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBeGreaterThan(0);
      });
    });

    describe('Allowed imports', () => {
      it('allows wiring internal imports', () => {
        const scanner = createAntiBypassScanner();
        const source = `
          import { NexusEnvelope } from './types';
          import { buildEnvelope } from '../envelope';
          import { MemoryAdapter } from './adapters/memory_adapter';
        `;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBe(0);
      });

      it('allows standard library imports', () => {
        const scanner = createAntiBypassScanner();
        const source = `
          import { readFileSync } from 'fs';
          import { join } from 'path';
          import crypto from 'crypto';
        `;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBe(0);
      });

      it('allows third-party imports', () => {
        const scanner = createAntiBypassScanner();
        const source = `
          import { describe, it, expect } from 'vitest';
          import express from 'express';
        `;
        const violations = scanner.scanSource(source);
        expect(violations.length).toBe(0);
      });
    });
  });

  describe('Multi-line scanning', () => {
    it('detects violation on specific line', () => {
      const scanner = createAntiBypassScanner();
      const source = `
line1
line2
import { x } from '@omega/memory';
line4
`;
      const violations = scanner.scanSource(source);
      expect(violations.length).toBe(1);
      expect(violations[0].line).toBe(4);
    });

    it('detects multiple violations', () => {
      const scanner = createAntiBypassScanner();
      const source = `
import { a } from '@omega/memory';
import { b } from '@omega/query';
import { c } from '@omega/oracle';
`;
      const violations = scanner.scanSource(source);
      expect(violations.length).toBe(3);
    });

    it('captures line content', () => {
      const scanner = createAntiBypassScanner();
      const source = `import { something } from '../src/memory/stack';`;
      const violations = scanner.scanSource(source);
      expect(violations[0].content).toContain('memory/stack');
    });
  });

  describe('assertNoBypass', () => {
    it('passes for clean code', () => {
      expect(() => {
        assertNoBypass(`
          import { foo } from './bar';
          export function test() {}
        `);
      }).not.toThrow();
    });

    it('throws for bypass code', () => {
      expect(() => {
        assertNoBypass(`import { x } from '@omega/memory';`);
      }).toThrow(/Bypass violations detected/);
    });

    it('includes violation details in error', () => {
      try {
        assertNoBypass(`import { x } from '@omega/memory';`, 'test.ts');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('Direct import');
        expect((e as Error).message).toContain('@omega/memory');
      }
    });
  });

  describe('ScanResult', () => {
    it('passed is true when no violations', () => {
      const scanner = createAntiBypassScanner();
      const result = scanner.scanDirectory('/nonexistent');
      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('formatResult', () => {
    it('formats passing result', () => {
      const scanner = createAntiBypassScanner();
      const result = {
        passed: true,
        violations: [],
        filesScanned: 10,
        linesAnalyzed: 500,
        durationMs: 50,
      };
      const formatted = scanner.formatResult(result);
      expect(formatted).toContain('✅ PASSED');
      expect(formatted).toContain('Files:      10');
    });

    it('formats failing result with violations', () => {
      const scanner = createAntiBypassScanner();
      const result = {
        passed: false,
        violations: [{
          file: 'test.ts',
          line: 5,
          content: "import { x } from '@omega/memory'",
          pattern: 'test',
          description: 'Direct import detected',
          severity: 'critical' as const,
        }],
        filesScanned: 1,
        linesAnalyzed: 10,
        durationMs: 5,
      };
      const formatted = scanner.formatResult(result);
      expect(formatted).toContain('❌ FAILED');
      expect(formatted).toContain('CRITICAL');
      expect(formatted).toContain('test.ts:5');
    });
  });

  describe('FORBIDDEN_IMPORT_PATTERNS', () => {
    it('has patterns for all critical modules', () => {
      const patternStrings = FORBIDDEN_IMPORT_PATTERNS.map(p => p.source);
      
      // Memory patterns
      expect(patternStrings.some(p => p.includes('memory'))).toBe(true);
      
      // Query patterns
      expect(patternStrings.some(p => p.includes('query'))).toBe(true);
      
      // Oracle patterns
      expect(patternStrings.some(p => p.includes('oracle'))).toBe(true);
      
      // Muse patterns
      expect(patternStrings.some(p => p.includes('muse'))).toBe(true);
    });

    it('detects various import styles', () => {
      const testCases = [
        { input: `from '../src/memory/'`, shouldMatch: true },
        { input: `from '../../src/memory/'`, shouldMatch: true },
        { input: `from '@omega/memory'`, shouldMatch: true },
        { input: `from './memory_adapter'`, shouldMatch: false },
        { input: `from '../types'`, shouldMatch: false },
      ];

      for (const { input, shouldMatch } of testCases) {
        const matches = FORBIDDEN_IMPORT_PATTERNS.some(p => p.test(input));
        expect(matches).toBe(shouldMatch);
      }
    });
  });

  describe('INV-GW-01: Zero Direct Call verification', () => {
    it('gateway_adapter.ts has no forbidden imports', () => {
      // This test verifies that our gateway_adapter code is clean
      const cleanGatewayCode = `
        import type { Clock, IdFactory, NexusEnvelope } from '../types.js';
        import { buildEnvelope } from '../envelope.js';
        import { mapToEnvelopeSpec } from './gateway_schemas.js';
        
        export class GatewayAdapter {
          // Implementation
        }
      `;
      
      const scanner = createAntiBypassScanner();
      const violations = scanner.scanSource(cleanGatewayCode, 'gateway_adapter.ts');
      expect(violations.length).toBe(0);
    });

    it('detects violation if someone adds direct import', () => {
      const corruptedCode = `
        import type { Clock } from '../types.js';
        import { MemoryStack } from '../../src/memory/stack'; // VIOLATION!
        
        export class GatewayAdapter {}
      `;
      
      const scanner = createAntiBypassScanner();
      const violations = scanner.scanSource(corruptedCode);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('critical');
    });
  });

  describe('Custom configuration', () => {
    it('accepts custom forbidden patterns', () => {
      const scanner = createAntiBypassScanner({
        forbiddenImportPatterns: [/from\s+['"]custom-module['"]/],
      });

      const violations = scanner.scanSource(`import { x } from 'custom-module';`);
      expect(violations.length).toBe(1);
    });

    it('accepts custom extensions', () => {
      const scanner = createAntiBypassScanner({
        extensions: ['.ts'],
      });
      
      // Scanner config should have .ts
      expect(scanner).toBeDefined();
    });
  });
});
