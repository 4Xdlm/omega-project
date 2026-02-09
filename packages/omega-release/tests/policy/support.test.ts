/**
 * OMEGA Release — Support Policy Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { calculateSupportStatus, createSupportPolicy, isSupported, formatSupportStatus } from '../../src/policy/support.js';

describe('calculateSupportStatus', () => {
  it('returns CURRENT for recent release', () => {
    const today = new Date('2026-02-10');
    expect(calculateSupportStatus('2026-02-01', today)).toBe('CURRENT');
  });

  it('returns MAINTENANCE after 12 months', () => {
    const today = new Date('2027-03-01');
    expect(calculateSupportStatus('2026-02-01', today)).toBe('MAINTENANCE');
  });

  it('returns EOL after 18 months', () => {
    const today = new Date('2027-09-01');
    expect(calculateSupportStatus('2026-02-01', today)).toBe('EOL');
  });
});

describe('createSupportPolicy', () => {
  it('creates policy with dates', () => {
    const policy = createSupportPolicy('1.0.0', '2026-02-10', new Date('2026-02-10'));
    expect(policy.version).toBe('1.0.0');
    expect(policy.status).toBe('CURRENT');
    expect(policy.maintenanceDate).toBeTruthy();
    expect(policy.eolDate).toBeTruthy();
  });

  it('maintenance date is ~365 days after release', () => {
    const policy = createSupportPolicy('1.0.0', '2026-02-10', new Date('2026-02-10'));
    expect(policy.maintenanceDate).toBe('2027-02-10');
  });
});

describe('isSupported', () => {
  it('true for CURRENT', () => {
    const policy = createSupportPolicy('1.0.0', '2026-02-10', new Date('2026-02-10'));
    expect(isSupported(policy)).toBe(true);
  });

  it('true for MAINTENANCE', () => {
    const policy = createSupportPolicy('1.0.0', '2026-02-10', new Date('2027-03-01'));
    expect(isSupported(policy)).toBe(true);
  });

  it('false for EOL', () => {
    const policy = createSupportPolicy('1.0.0', '2026-02-10', new Date('2027-09-01'));
    expect(isSupported(policy)).toBe(false);
  });
});

describe('formatSupportStatus', () => {
  it('formats status string', () => {
    const policy = createSupportPolicy('1.0.0', '2026-02-10', new Date('2026-02-10'));
    const formatted = formatSupportStatus(policy);
    expect(formatted).toContain('1.0.0');
    expect(formatted).toContain('CURRENT');
  });
});
