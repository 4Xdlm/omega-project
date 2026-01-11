/**
 * @fileoverview Tests for output utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  ConsoleWriter,
  StringWriter,
  SilentWriter,
  createConsoleWriter,
  createStringWriter,
  createSilentWriter,
} from '../../src/index.js';

describe('StringWriter', () => {
  it('should capture info messages', () => {
    const writer = new StringWriter();
    writer.info('test message');
    expect(writer.getOutput()).toContain('[INFO] test message');
  });

  it('should capture success messages', () => {
    const writer = new StringWriter();
    writer.success('test success');
    expect(writer.getOutput()).toContain('[OK] test success');
  });

  it('should capture warning messages', () => {
    const writer = new StringWriter();
    writer.warn('test warning');
    expect(writer.getOutput()).toContain('[WARN] test warning');
  });

  it('should capture error messages', () => {
    const writer = new StringWriter();
    writer.error('test error');
    expect(writer.getOutput()).toContain('[ERROR] test error');
  });

  it('should capture write content', () => {
    const writer = new StringWriter();
    writer.write('raw content');
    expect(writer.getOutput()).toContain('raw content');
  });

  it('should capture writeln content', () => {
    const writer = new StringWriter();
    writer.writeln('line content');
    expect(writer.getOutput()).toContain('line content');
  });

  it('should clear buffer', () => {
    const writer = new StringWriter();
    writer.info('test');
    writer.clear();
    expect(writer.getOutput()).toBe('');
  });

  it('should accumulate multiple messages', () => {
    const writer = new StringWriter();
    writer.info('first');
    writer.info('second');
    writer.info('third');
    const output = writer.getOutput();
    expect(output).toContain('first');
    expect(output).toContain('second');
    expect(output).toContain('third');
  });
});

describe('SilentWriter', () => {
  it('should not throw on info', () => {
    const writer = new SilentWriter();
    expect(() => writer.info('test')).not.toThrow();
  });

  it('should not throw on success', () => {
    const writer = new SilentWriter();
    expect(() => writer.success('test')).not.toThrow();
  });

  it('should not throw on warn', () => {
    const writer = new SilentWriter();
    expect(() => writer.warn('test')).not.toThrow();
  });

  it('should not throw on error', () => {
    const writer = new SilentWriter();
    expect(() => writer.error('test')).not.toThrow();
  });

  it('should not throw on write', () => {
    const writer = new SilentWriter();
    expect(() => writer.write('test')).not.toThrow();
  });

  it('should not throw on writeln', () => {
    const writer = new SilentWriter();
    expect(() => writer.writeln('test')).not.toThrow();
  });
});

describe('ConsoleWriter', () => {
  it('should be constructible', () => {
    expect(() => new ConsoleWriter()).not.toThrow();
  });

  it('should implement OutputWriter interface', () => {
    const writer = new ConsoleWriter();
    expect(typeof writer.info).toBe('function');
    expect(typeof writer.success).toBe('function');
    expect(typeof writer.warn).toBe('function');
    expect(typeof writer.error).toBe('function');
    expect(typeof writer.write).toBe('function');
    expect(typeof writer.writeln).toBe('function');
  });
});

describe('Factory functions', () => {
  it('createConsoleWriter should return OutputWriter', () => {
    const writer = createConsoleWriter();
    expect(typeof writer.info).toBe('function');
    expect(typeof writer.success).toBe('function');
    expect(typeof writer.warn).toBe('function');
    expect(typeof writer.error).toBe('function');
  });

  it('createStringWriter should return StringWriter', () => {
    const writer = createStringWriter();
    expect(writer).toBeInstanceOf(StringWriter);
    expect(typeof writer.getOutput).toBe('function');
    expect(typeof writer.clear).toBe('function');
  });

  it('createSilentWriter should return OutputWriter', () => {
    const writer = createSilentWriter();
    expect(typeof writer.info).toBe('function');
    expect(typeof writer.success).toBe('function');
    expect(typeof writer.warn).toBe('function');
    expect(typeof writer.error).toBe('function');
  });
});
