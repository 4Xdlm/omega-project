/**
 * @fileoverview Phase 3.2 - Error Path Tests for Validator
 * Tests error handling behavior in validation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  validateExport,
  validatePackageExports,
  runIntegrationTest,
  runIntegrationTests,
  validateCallable,
  validateInstantiable,
  validateRequiredExports,
  createCrossPackageValidation,
  getExportType,
} from '../../src/index.js';
import type { IntegrationTest } from '../../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - runIntegrationTest
// ═══════════════════════════════════════════════════════════════════════════════

describe('runIntegrationTest - Error Paths', () => {
  it('should handle non-Error thrown objects', async () => {
    const test: IntegrationTest = {
      name: 'throws-string',
      packages: ['pkg1'],
      test: () => {
        throw 'string error';
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Unknown error');
  });

  it('should handle thrown null', async () => {
    const test: IntegrationTest = {
      name: 'throws-null',
      packages: ['pkg1'],
      test: () => {
        throw null;
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Unknown error');
  });

  it('should handle thrown undefined', async () => {
    const test: IntegrationTest = {
      name: 'throws-undefined',
      packages: ['pkg1'],
      test: () => {
        throw undefined;
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
  });

  it('should handle thrown number', async () => {
    const test: IntegrationTest = {
      name: 'throws-number',
      packages: ['pkg1'],
      test: () => {
        throw 42;
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Unknown error');
  });

  it('should handle thrown object without message', async () => {
    const test: IntegrationTest = {
      name: 'throws-object',
      packages: ['pkg1'],
      test: () => {
        throw { code: 'ERR_CUSTOM' };
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Unknown error');
  });

  it('should preserve Error message', async () => {
    const test: IntegrationTest = {
      name: 'throws-error',
      packages: ['pkg1'],
      test: () => {
        throw new Error('Specific error message');
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Specific error message');
  });

  it('should handle async rejection with Error', async () => {
    const test: IntegrationTest = {
      name: 'async-reject-error',
      packages: ['pkg1'],
      test: async () => {
        return Promise.reject(new Error('Async error'));
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Async error');
  });

  it('should handle async rejection with string', async () => {
    const test: IntegrationTest = {
      name: 'async-reject-string',
      packages: ['pkg1'],
      test: async () => {
        return Promise.reject('async string error');
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('Unknown error');
  });

  it('should handle TypeError', async () => {
    const test: IntegrationTest = {
      name: 'type-error',
      packages: ['pkg1'],
      test: () => {
        const obj: any = null;
        obj.method(); // TypeError
        return true;
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle RangeError', async () => {
    const test: IntegrationTest = {
      name: 'range-error',
      packages: ['pkg1'],
      test: () => {
        const arr = new Array(-1);
        return arr.length > 0;
      },
    };

    const result = await runIntegrationTest(test);

    expect(result.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - runIntegrationTests (multiple)
// ═══════════════════════════════════════════════════════════════════════════════

describe('runIntegrationTests - Error Isolation', () => {
  it('should continue after one test fails', async () => {
    const tests: IntegrationTest[] = [
      { name: 'pass1', packages: ['p1'], test: () => true },
      { name: 'fail', packages: ['p2'], test: () => { throw new Error('fail'); } },
      { name: 'pass2', packages: ['p3'], test: () => true },
    ];

    const results = await runIntegrationTests(tests);

    expect(results.length).toBe(3);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
    expect(results[2].valid).toBe(true);
  });

  it('should handle all tests failing', async () => {
    const tests: IntegrationTest[] = [
      { name: 'fail1', packages: ['p1'], test: () => { throw 'error1'; } },
      { name: 'fail2', packages: ['p2'], test: () => { throw 'error2'; } },
    ];

    const results = await runIntegrationTests(tests);

    expect(results.every(r => !r.valid)).toBe(true);
  });

  it('should handle empty test array', async () => {
    const results = await runIntegrationTests([]);
    expect(results.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - validateInstantiable
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateInstantiable - Error Paths', () => {
  it('should handle constructor throwing non-Error', () => {
    class ThrowsString {
      constructor() {
        throw 'string error';
      }
    }

    const result = validateInstantiable(ThrowsString);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Instantiation failed');
  });

  it('should handle constructor throwing null', () => {
    class ThrowsNull {
      constructor() {
        throw null;
      }
    }

    const result = validateInstantiable(ThrowsNull);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Instantiation failed');
  });

  it('should preserve Error message from constructor', () => {
    class ThrowsError {
      constructor() {
        throw new Error('Constructor failed');
      }
    }

    const result = validateInstantiable(ThrowsError);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Constructor failed');
  });

  it('should handle constructor with bad args', () => {
    class RequiresArgs {
      constructor(required: string) {
        if (!required) throw new Error('Required arg missing');
      }
    }

    const result = validateInstantiable(RequiresArgs);

    expect(result.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - validateCallable
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCallable - Edge Cases', () => {
  it('should reject null', () => {
    const result = validateCallable(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Not a function');
  });

  it('should reject undefined', () => {
    const result = validateCallable(undefined);
    expect(result.valid).toBe(false);
  });

  it('should reject objects', () => {
    const result = validateCallable({});
    expect(result.valid).toBe(false);
  });

  it('should reject arrays', () => {
    const result = validateCallable([]);
    expect(result.valid).toBe(false);
  });

  it('should accept arrow functions', () => {
    const result = validateCallable(() => {});
    expect(result.valid).toBe(true);
  });

  it('should accept async functions', () => {
    const result = validateCallable(async () => {});
    expect(result.valid).toBe(true);
  });

  it('should accept generator functions', () => {
    function* gen() { yield 1; }
    const result = validateCallable(gen);
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - validateRequiredExports
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateRequiredExports - Edge Cases', () => {
  it('should handle empty required list', () => {
    const result = validateRequiredExports({ foo: 1 }, []);
    expect(result.valid).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it('should handle empty exports', () => {
    const result = validateRequiredExports({}, ['foo']);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('foo');
  });

  it('should report all missing exports', () => {
    const result = validateRequiredExports({}, ['a', 'b', 'c']);
    expect(result.missing.length).toBe(3);
    expect(result.missing).toContain('a');
    expect(result.missing).toContain('b');
    expect(result.missing).toContain('c');
  });

  it('should accept export with undefined value', () => {
    const result = validateRequiredExports({ foo: undefined }, ['foo']);
    expect(result.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - getExportType
// ═══════════════════════════════════════════════════════════════════════════════

describe('getExportType - Edge Cases', () => {
  it('should detect async function as function', () => {
    const type = getExportType(async () => {});
    expect(type).toBe('function');
  });

  it('should detect generator as function', () => {
    function* gen() {}
    const type = getExportType(gen);
    expect(type).toBe('function');
  });

  it('should handle null', () => {
    const type = getExportType(null);
    expect(type).toBe('const');
  });

  it('should handle undefined', () => {
    const type = getExportType(undefined);
    expect(type).toBe('const');
  });

  it('should handle Symbol', () => {
    const type = getExportType(Symbol('test'));
    expect(type).toBe('const');
  });

  it('should handle BigInt', () => {
    const type = getExportType(BigInt(42));
    expect(type).toBe('const');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR PATH TESTS - createCrossPackageValidation
// ═══════════════════════════════════════════════════════════════════════════════

describe('createCrossPackageValidation - Edge Cases', () => {
  it('should handle empty arrays', () => {
    const result = createCrossPackageValidation([], []);
    expect(result.valid).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it('should be invalid if any package invalid', () => {
    const packages = [
      { name: 'p1', version: '1.0.0', valid: true, exports: [], errors: [] },
      { name: 'p2', version: '1.0.0', valid: false, exports: [], errors: ['err'] },
    ];
    const result = createCrossPackageValidation(packages, []);
    expect(result.valid).toBe(false);
  });

  it('should be invalid if any integration invalid', () => {
    const packages = [
      { name: 'p1', version: '1.0.0', valid: true, exports: [], errors: [] },
    ];
    const integrations = [
      { name: 'int1', packages: ['p1'], valid: false, errors: ['err'] },
    ];
    const result = createCrossPackageValidation(packages, integrations);
    expect(result.valid).toBe(false);
  });
});
