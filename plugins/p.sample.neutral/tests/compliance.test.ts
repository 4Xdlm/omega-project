/**
 * p.sample.neutral — Compliance Gate Tests v1.0
 * P4: Plugin neutre passe Compliance Gate → 10/10 PASS
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runComplianceGate } from '../../../packages/plugin-sdk/src/compliance/compliance-gate.js';
import { handleRequest } from '../src/adapter.js';
import type { PluginManifest, TextPayload } from '../../../packages/plugin-sdk/src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest: PluginManifest = JSON.parse(
  readFileSync(resolve(__dirname, '../PLUGIN_MANIFEST.json'), 'utf-8'),
);

const testPayload: TextPayload = {
  kind: 'text',
  content: 'Le soleil brillait sur la mer calme et étincelante. Les mouettes volaient dans le ciel bleu.',
  encoding: 'utf-8',
  metadata: {},
};

describe('Compliance Gate — p.sample.neutral', () => {
  it('passes all 10 checks (CG-01 → CG-10)', async () => {
    const report = await runComplianceGate({
      manifest,
      handler: handleRequest,
      testPayloads: [testPayload],
    });

    // Log each check for diagnostics
    for (const check of report.checks) {
      console.log(`  ${check.id} ${check.name}: ${check.passed ? 'PASS' : 'FAIL'} — ${check.detail}`);
    }

    expect(report.passed).toBe(true);
    expect(report.summary.total).toBe(10);
    expect(report.summary.passed_count).toBe(10);
    expect(report.summary.failed_count).toBe(0);
  });

  it('report has correct plugin_id', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    expect(report.plugin_id).toBe('p.sample.neutral');
  });

  it('report has valid timestamp', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
  });

  it('each check has required fields', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    for (const check of report.checks) {
      expect(check.id).toMatch(/^CG-\d{2}$/);
      expect(check.name.length).toBeGreaterThan(0);
      expect(check.law).toMatch(/^L\d+$/);
      expect(typeof check.passed).toBe('boolean');
      expect(check.detail.length).toBeGreaterThan(0);
      expect(check.duration_ms).toBeGreaterThanOrEqual(0);
    }
  });

  it('CG-01: Manifest valid', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg01 = report.checks.find(c => c.id === 'CG-01');
    expect(cg01!.passed).toBe(true);
  });

  it('CG-02: Schema IO valid', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg02 = report.checks.find(c => c.id === 'CG-02');
    expect(cg02!.passed).toBe(true);
  });

  it('CG-03: No forbidden capabilities', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg03 = report.checks.find(c => c.id === 'CG-03');
    expect(cg03!.passed).toBe(true);
  });

  it('CG-04: Determinism verified', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg04 = report.checks.find(c => c.id === 'CG-04');
    expect(cg04!.passed).toBe(true);
  });

  it('CG-05: Stateless verified', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg05 = report.checks.find(c => c.id === 'CG-05');
    expect(cg05!.passed).toBe(true);
  });

  it('CG-06: Fail-closed on invalid input', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg06 = report.checks.find(c => c.id === 'CG-06');
    expect(cg06!.passed).toBe(true);
  });

  it('CG-07: Timeout respected', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg07 = report.checks.find(c => c.id === 'CG-07');
    expect(cg07!.passed).toBe(true);
  });

  it('CG-08: Non-actuation verified', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg08 = report.checks.find(c => c.id === 'CG-08');
    expect(cg08!.passed).toBe(true);
  });

  it('CG-09: Proof hashes generated', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg09 = report.checks.find(c => c.id === 'CG-09');
    expect(cg09!.passed).toBe(true);
  });

  it('CG-10: Version compatible', async () => {
    const report = await runComplianceGate({ manifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg10 = report.checks.find(c => c.id === 'CG-10');
    expect(cg10!.passed).toBe(true);
  });

  it('rejects when no testPayloads', async () => {
    await expect(runComplianceGate({ manifest, handler: handleRequest, testPayloads: [] }))
      .rejects.toThrow('at least one testPayload');
  });

  it('fails CG-03 with forbidden capability', async () => {
    const badManifest: PluginManifest = { ...manifest, capabilities: ['read_text', 'filesystem_access'] };
    const report = await runComplianceGate({ manifest: badManifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg03 = report.checks.find(c => c.id === 'CG-03');
    expect(cg03!.passed).toBe(false);
    expect(report.passed).toBe(false);
  });

  it('fails CG-10 with incompatible version', async () => {
    const badManifest: PluginManifest = { ...manifest, api_version: '2.0.0' };
    const report = await runComplianceGate({ manifest: badManifest, handler: handleRequest, testPayloads: [testPayload] });
    const cg10 = report.checks.find(c => c.id === 'CG-10');
    expect(cg10!.passed).toBe(false);
    expect(report.passed).toBe(false);
  });
});
