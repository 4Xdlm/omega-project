import { describe, it, expect } from 'vitest';
import {
  CanonError,
  CanonErrorCode,
  CanonErrors,
  absolutePath,
  corruptedData,
  fileExists,
  fileNotFound,
  hashMismatch,
  integrityCheckFailed,
  invalidJson,
  invalidSchema,
  invariantViolated,
  isCanonError,
  pathTraversal,
  pathUnsafe,
  projectAlreadyExists,
  projectLocked,
  projectNotFound,
  readFailed,
  versionMismatch,
  wrapError,
  writeFailed
} from './errors';

describe('errors.ts ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â CanonError + factories', () => {
  it('CanonError: should set core fields and default options', () => {
    const e = new CanonError(
      CanonErrorCode.UNKNOWN_ERROR,
      'boom',
      { path: 'x' }
    );

    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('CanonError');

    expect(e.code).toBe(CanonErrorCode.UNKNOWN_ERROR);
    expect(e.message).toBe('boom');

    // details passthrough
    expect(e.details.path).toBe('x');

    // context default: options.context || details.context || {}
    expect(e.context).toEqual({});

    // default
    expect(e.recoverable).toBe(false);

    // timestamp should exist and look like ISO
    expect(typeof e.timestamp).toBe('string');
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('CanonError: should use options.context over details.context', () => {
    const e = new CanonError(
      CanonErrorCode.INVALID_JSON,
      'bad json',
      { context: { a: 1 } },
      { context: { b: 2 } }
    );

    expect(e.context).toEqual({ b: 2 });
  });

  it('CanonError: should take details.context when options.context missing', () => {
    const e = new CanonError(
      CanonErrorCode.INVALID_JSON,
      'bad json',
      { context: { a: 1 } }
    );

    expect(e.context).toEqual({ a: 1 });
  });

  it('CanonError: should set recoverable when provided', () => {
    const e = new CanonError(
      CanonErrorCode.HASH_MISMATCH,
      'hash mismatch',
      {},
      { recoverable: true }
    );

    expect(e.recoverable).toBe(true);
  });

  it('CanonError: should set cause when provided', () => {
    const cause = new Error('root');
    const e = new CanonError(
      CanonErrorCode.READ_FAILED,
      'read failed',
      {},
      { cause }
    );

    // Error.cause is standard
    expect(e.cause).toBe(cause);
  });

  it('CanonError.toString(): should format as [CODE] message', () => {
    const e = new CanonError(CanonErrorCode.PATH_UNSAFE, 'nope');
    expect(e.toString()).toBe(`[${CanonErrorCode.PATH_UNSAFE}] nope`);
  });

  it('CanonError.toJSON(): should include main fields', () => {
    const e = new CanonError(
      CanonErrorCode.FILE_NOT_FOUND,
      'File not found: a.txt',
      { path: 'a.txt' },
      { recoverable: true, context: { x: 1 } }
    );

    const j = e.toJSON();

    expect(j.name).toBe('CanonError');
    expect(j.code).toBe(CanonErrorCode.FILE_NOT_FOUND);
    expect(j.message).toBe('File not found: a.txt');
    expect(j.details).toEqual(expect.objectContaining({ path: 'a.txt' }));
    expect(j.context).toEqual({ x: 1 });
    expect(j.recoverable).toBe(true);
    expect(typeof j.timestamp).toBe('string');

    // stack might be undefined in some runtimes, but usually present
    expect(j).toHaveProperty('stack');
  });

  it('factories: should create CanonError with correct code and useful details', () => {
    expect(fileNotFound('a')).toMatchObject({
      code: CanonErrorCode.FILE_NOT_FOUND,
      details: { path: 'a' }
    });

    expect(fileExists('b')).toMatchObject({
      code: CanonErrorCode.FILE_ALREADY_EXISTS,
      details: { path: 'b' }
    });

    const ioCause = new Error('disk');
    expect(writeFailed('c', ioCause)).toMatchObject({
      code: CanonErrorCode.WRITE_FAILED,
      details: { path: 'c', originalError: ioCause }
    });

    expect(readFailed('d', ioCause)).toMatchObject({
      code: CanonErrorCode.READ_FAILED,
      details: { path: 'd', originalError: ioCause }
    });

    expect(pathUnsafe('p', 'reason')).toMatchObject({
      code: CanonErrorCode.PATH_UNSAFE,
      details: { path: 'p', reason: 'reason' }
    });

    expect(pathTraversal('../x')).toMatchObject({
      code: CanonErrorCode.PATH_TRAVERSAL,
      details: { path: '../x' }
    });

    expect(absolutePath('C:\\x')).toMatchObject({
      code: CanonErrorCode.ABSOLUTE_PATH_REJECTED,
      details: { path: 'C:\\x' }
    });

    const lock = { pid: 123, hostname: 'pc', acquired_at: '2025-12-20T00:00:00.000Z' };
    const locked = projectLocked(lock);
    expect(locked.code).toBe(CanonErrorCode.PROJECT_LOCKED);
    expect(locked.details.lockHolder).toEqual(lock);
    expect(locked.message).toContain('PID 123');
    expect(locked.message).toContain('pc');

    expect(invalidSchema({ z: 1 })).toMatchObject({
      code: CanonErrorCode.INVALID_SCHEMA,
      details: { zodErrors: { z: 1 } }
    });

    const jsonCause = new Error('parse');
    expect(invalidJson('file.json', jsonCause)).toMatchObject({
      code: CanonErrorCode.INVALID_JSON,
      details: { path: 'file.json', originalError: jsonCause }
    });

    expect(integrityCheckFailed('aa', 'bb', 'x')).toMatchObject({
      code: CanonErrorCode.INTEGRITY_CHECK_FAILED,
      details: { expectedHash: 'aa', actualHash: 'bb', path: 'x' }
    });

    const hm = hashMismatch('a'.repeat(64), 'b'.repeat(64));
    expect(hm.code).toBe(CanonErrorCode.HASH_MISMATCH);
    expect(hm.recoverable).toBe(true);
    expect(hm.details).toMatchObject({
      expected: 'a'.repeat(64),
      actual: 'b'.repeat(64)
    });
    // message includes substring preview
    expect(hm.message).toContain('expected');
    expect(hm.message).toContain('got');

    const cd = corruptedData('corrupt', 'p');
    expect(cd.code).toBe(CanonErrorCode.CORRUPTED_DATA);
    expect(cd.recoverable).toBe(true);
    expect(cd.details.path).toBe('p');

    expect(versionMismatch('0.9', '1.0')).toMatchObject({
      code: CanonErrorCode.VERSION_MISMATCH,
      details: { found: '0.9', expected: '1.0' }
    });

    const inv = invariantViolated('X', 'bad');
    expect(inv.code).toBe(CanonErrorCode.INVARIANT_VIOLATED);
    expect(inv.details.invariantName).toBe('X');
    expect(inv.message).toContain('Invariant violated');

    expect(projectAlreadyExists('here')).toMatchObject({
      code: CanonErrorCode.PROJECT_ALREADY_EXISTS,
      details: { path: 'here' }
    });

    expect(projectNotFound('there')).toMatchObject({
      code: CanonErrorCode.PROJECT_NOT_FOUND,
      details: { path: 'there' }
    });
  });

  it('wrapError: should return same CanonError instance', () => {
    const e = fileNotFound('x');
    const w = wrapError(e, CanonErrorCode.READ_FAILED);
    expect(w).toBe(e);
  });

  it('wrapError: should wrap Error with fallback code and originalError', () => {
    const e = new Error('nope');
    const w = wrapError(e, CanonErrorCode.READ_FAILED);

    expect(w).toBeInstanceOf(CanonError);
    expect(w.code).toBe(CanonErrorCode.READ_FAILED);
    expect(w.message).toBe('nope');
    expect(w.details.originalError).toBe(e);
  });

  it('wrapError: should wrap non-Error values using String()', () => {
    const w = wrapError(123, CanonErrorCode.UNKNOWN_ERROR);
    expect(w.code).toBe(CanonErrorCode.UNKNOWN_ERROR);
    expect(w.message).toBe('123');
  });

  it('isCanonError: should be true only for CanonError', () => {
    expect(isCanonError(fileNotFound('x'))).toBe(true);
    expect(isCanonError(new Error('x'))).toBe(false);
    expect(isCanonError('x')).toBe(false);
  });

  it('CanonErrors group: should expose expected mappings and aliases', () => {
    expect(CanonErrors.pathUnsafe).toBe(pathUnsafe);
    expect(CanonErrors.pathTraversal).toBe(pathTraversal);
    expect(CanonErrors.absolutePath).toBe(absolutePath);

    expect(CanonErrors.fileNotFound).toBe(fileNotFound);
    expect(CanonErrors.fileExists).toBe(fileExists);

    // alias names
    expect(CanonErrors.corrupted).toBe(corruptedData);
    expect(CanonErrors.hashMismatch).toBe(hashMismatch);
    expect(CanonErrors.invalidJson).toBe(invalidJson);
    expect(CanonErrors.projectLocked).toBe(projectLocked);
    expect(CanonErrors.versionMismatch).toBe(versionMismatch);
    expect(CanonErrors.invariantViolation).toBe(invariantViolated);
  });
});
