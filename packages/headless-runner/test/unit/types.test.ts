/**
 * @fileoverview Unit tests for types module.
 */

import { describe, it, expect } from 'vitest';
import { ExitCode } from '../../src/types.js';

describe('ExitCode', () => {
  it('should have SUCCESS as 0', () => {
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it('should have GENERAL_ERROR as 1', () => {
    expect(ExitCode.GENERAL_ERROR).toBe(1);
  });

  it('should have PLAN_NOT_FOUND as 2', () => {
    expect(ExitCode.PLAN_NOT_FOUND).toBe(2);
  });

  it('should have PLAN_INVALID as 3', () => {
    expect(ExitCode.PLAN_INVALID).toBe(3);
  });

  it('should have EXECUTION_FAILED as 4', () => {
    expect(ExitCode.EXECUTION_FAILED).toBe(4);
  });

  it('should have DETERMINISM_FAILED as 5', () => {
    expect(ExitCode.DETERMINISM_FAILED).toBe(5);
  });

  it('should have TIMEOUT as 6', () => {
    expect(ExitCode.TIMEOUT).toBe(6);
  });

  it('should have INVALID_ARGS as 7', () => {
    expect(ExitCode.INVALID_ARGS).toBe(7);
  });

  it('should have all unique values', () => {
    const values = Object.values(ExitCode).filter((v) => typeof v === 'number');
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
