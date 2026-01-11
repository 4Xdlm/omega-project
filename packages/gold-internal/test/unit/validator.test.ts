/**
 * @fileoverview Tests for validator utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getExportType,
  validateExport,
  validatePackageExports,
  runIntegrationTest,
  runIntegrationTests,
  createCrossPackageValidation,
  validateRequiredExports,
  validateCallable,
  validateInstantiable,
} from '../../src/index.js';
import type { IntegrationTest } from '../../src/index.js';

describe('getExportType', () => {
  it('should detect function', () => {
    expect(getExportType(() => {})).toBe('function');
    expect(getExportType(function named() {})).toBe('function');
  });

  it('should detect class', () => {
    class TestClass {}
    expect(getExportType(TestClass)).toBe('class');
  });

  it('should detect object', () => {
    expect(getExportType({})).toBe('object');
    expect(getExportType({ key: 'value' })).toBe('object');
  });

  it('should detect const', () => {
    expect(getExportType('string')).toBe('const');
    expect(getExportType(42)).toBe('const');
    expect(getExportType(true)).toBe('const');
  });
});

describe('validateExport', () => {
  it('should validate function export', () => {
    const result = validateExport('myFn', () => {});
    expect(result.valid).toBe(true);
    expect(result.type).toBe('function');
  });

  it('should validate class export', () => {
    class TestClass {}
    const result = validateExport('TestClass', TestClass);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('class');
  });

  it('should validate object export', () => {
    const result = validateExport('config', { key: 'value' });
    expect(result.valid).toBe(true);
    expect(result.type).toBe('object');
  });
});

describe('validatePackageExports', () => {
  it('should validate all exports', () => {
    const exports = {
      fn: () => {},
      obj: {},
      val: 42,
    };

    const result = validatePackageExports('test-pkg', '1.0.0', exports);

    expect(result.name).toBe('test-pkg');
    expect(result.version).toBe('1.0.0');
    expect(result.valid).toBe(true);
    expect(result.exports.length).toBe(3);
  });

  it('should report errors', () => {
    const result = validatePackageExports('test-pkg', '1.0.0', {});
    expect(result.valid).toBe(true);
    expect(result.exports.length).toBe(0);
  });
});

describe('runIntegrationTest', () => {
  it('should run passing test', async () => {
    const test: IntegrationTest = {
      name: 'test',
      packages: ['pkg1', 'pkg2'],
      test: () => true,
    };

    const result = await runIntegrationTest(test);
    expect(result.valid).toBe(true);
    expect(result.name).toBe('test');
  });

  it('should run failing test', async () => {
    const test: IntegrationTest = {
      name: 'test',
      packages: ['pkg1'],
      test: () => false,
    };

    const result = await runIntegrationTest(test);
    expect(result.valid).toBe(false);
  });

  it('should handle test errors', async () => {
    const test: IntegrationTest = {
      name: 'test',
      packages: ['pkg1'],
      test: () => {
        throw new Error('test error');
      },
    };

    const result = await runIntegrationTest(test);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('test error');
  });

  it('should run async test', async () => {
    const test: IntegrationTest = {
      name: 'async test',
      packages: ['pkg1'],
      test: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return true;
      },
    };

    const result = await runIntegrationTest(test);
    expect(result.valid).toBe(true);
  });
});

describe('runIntegrationTests', () => {
  it('should run all tests', async () => {
    const tests: IntegrationTest[] = [
      { name: 'test1', packages: ['pkg1'], test: () => true },
      { name: 'test2', packages: ['pkg2'], test: () => true },
    ];

    const results = await runIntegrationTests(tests);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.valid)).toBe(true);
  });
});

describe('createCrossPackageValidation', () => {
  it('should create valid result when all pass', () => {
    const packages = [
      { name: 'pkg1', version: '1.0.0', valid: true, exports: [], errors: [] },
    ];
    const integrations = [
      { name: 'int1', packages: ['pkg1'], valid: true, errors: [] },
    ];

    const result = createCrossPackageValidation(packages, integrations);

    expect(result.valid).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it('should create invalid result when package fails', () => {
    const packages = [
      { name: 'pkg1', version: '1.0.0', valid: false, exports: [], errors: ['error'] },
    ];
    const integrations: never[] = [];

    const result = createCrossPackageValidation(packages, integrations);

    expect(result.valid).toBe(false);
  });

  it('should create invalid result when integration fails', () => {
    const packages = [
      { name: 'pkg1', version: '1.0.0', valid: true, exports: [], errors: [] },
    ];
    const integrations = [
      { name: 'int1', packages: ['pkg1'], valid: false, errors: ['error'] },
    ];

    const result = createCrossPackageValidation(packages, integrations);

    expect(result.valid).toBe(false);
  });
});

describe('validateRequiredExports', () => {
  it('should pass when all required exports present', () => {
    const exports = { fn1: () => {}, fn2: () => {} };
    const result = validateRequiredExports(exports, ['fn1', 'fn2']);

    expect(result.valid).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it('should fail when exports missing', () => {
    const exports = { fn1: () => {} };
    const result = validateRequiredExports(exports, ['fn1', 'fn2']);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('fn2');
  });
});

describe('validateCallable', () => {
  it('should validate function', () => {
    const result = validateCallable(() => {});
    expect(result.valid).toBe(true);
  });

  it('should reject non-function', () => {
    const result = validateCallable('not a function');
    expect(result.valid).toBe(false);
  });
});

describe('validateInstantiable', () => {
  it('should validate instantiable class', () => {
    class TestClass {}
    const result = validateInstantiable(TestClass);
    expect(result.valid).toBe(true);
  });

  it('should reject non-constructor', () => {
    const result = validateInstantiable('not a class');
    expect(result.valid).toBe(false);
  });

  it('should handle constructor with args', () => {
    class TestClass {
      constructor(public value: number) {}
    }
    const result = validateInstantiable(TestClass, [42]);
    expect(result.valid).toBe(true);
  });
});
