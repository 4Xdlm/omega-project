/**
 * OMEGA Plugin SDK — Compliance Gate v1.0
 * 10 mandatory checks. PASS or FAIL — never between.
 */

import { hashPayload, generateRequestId } from '../evidence.js';
import {
  OMEGA_PLUGIN_API_VERSION,
  FORBIDDEN_CAPABILITY_SET,
  DEFAULT_COMPLIANCE_TIMEOUT_MS,
  DETERMINISM_CHECK_ITERATIONS,
  SEMVER_PATTERN,
  PLUGIN_ID_PATTERN,
} from '../constants.js';
import type {
  ComplianceReport, ComplianceCheckResult, ComplianceGateInput,
  PluginManifest, PluginHandler, PluginPayload, PluginRequest, PluginResponse, TextPayload,
} from '../types.js';

function makeRequest(payload: PluginPayload, runId: string): PluginRequest {
  return {
    request_id: generateRequestId(),
    run_id: runId,
    timestamp: new Date().toISOString(),
    payload,
    context: {},
    policy: { deterministic_only: true, timeout_ms: DEFAULT_COMPLIANCE_TIMEOUT_MS, max_retries: 0 },
  };
}

function isCompatibleMajor(pluginApi: string, gatewayApi: string): boolean {
  const pMajor = parseInt(pluginApi.split('.')[0] ?? '0', 10);
  const gMajor = parseInt(gatewayApi.split('.')[0] ?? '0', 10);
  return pMajor === gMajor && pMajor >= 1;
}

async function invokeWithTimeout(handler: PluginHandler, req: PluginRequest, ms: number): Promise<PluginResponse> {
  return Promise.race([
    Promise.resolve(handler(req)),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('COMPLIANCE_TIMEOUT')), ms)),
  ]);
}

// ═══════════════ CG-01: Manifest valid ═══════════════
function checkCG01(m: PluginManifest): ComplianceCheckResult {
  const s = performance.now();
  const errs: string[] = [];
  if (!PLUGIN_ID_PATTERN.test(m.plugin_id)) errs.push(`plugin_id "${m.plugin_id}" invalid`);
  if (!SEMVER_PATTERN.test(m.version)) errs.push(`version "${m.version}" invalid`);
  if (!SEMVER_PATTERN.test(m.api_version)) errs.push(`api_version "${m.api_version}" invalid`);
  if (m.entrypoint.type !== 'worker') errs.push(`entrypoint.type must be "worker"`);
  if (m.name.length === 0) errs.push('name empty');
  if (m.vendor.length === 0) errs.push('vendor empty');
  if (m.capabilities.length === 0) errs.push('capabilities empty');
  if (m.io.inputs.length === 0) errs.push('io.inputs empty');
  if (m.io.outputs.length === 0) errs.push('io.outputs empty');
  return { id: 'CG-01', name: 'Manifest valid', law: 'L7', passed: errs.length === 0, detail: errs.length === 0 ? 'Manifest structurally valid' : errs.join('; '), duration_ms: Math.round(performance.now() - s) };
}

// ═══════════════ CG-02: Schema IO valid ═══════════════
function checkCG02(m: PluginManifest): ComplianceCheckResult {
  const s = performance.now();
  const errs: string[] = [];
  for (const inp of m.io.inputs) {
    if (inp.schema_ref.length === 0) errs.push(`Input kind="${inp.kind}" empty schema_ref`);
    if (inp.limits.max_bytes <= 0) errs.push(`Input kind="${inp.kind}" invalid max_bytes`);
  }
  for (const out of m.io.outputs) {
    if (out.schema_ref.length === 0) errs.push(`Output kind="${out.kind}" empty schema_ref`);
    if (out.limits.max_bytes <= 0) errs.push(`Output kind="${out.kind}" invalid max_bytes`);
  }
  return { id: 'CG-02', name: 'Schema IO valid', law: 'L7', passed: errs.length === 0, detail: errs.length === 0 ? 'All IO schemas valid' : errs.join('; '), duration_ms: Math.round(performance.now() - s) };
}

// ═══════════════ CG-03: Capabilities permitted ═══════════════
function checkCG03(m: PluginManifest): ComplianceCheckResult {
  const s = performance.now();
  const forbidden = m.capabilities.filter(c => FORBIDDEN_CAPABILITY_SET.has(c));
  return { id: 'CG-03', name: 'Capabilities permitted', law: 'L4', passed: forbidden.length === 0, detail: forbidden.length === 0 ? 'No forbidden capabilities' : `Forbidden: ${forbidden.join(', ')}`, duration_ms: Math.round(performance.now() - s) };
}

// ═══════════════ CG-04: Determinism check ═══════════════
async function checkCG04(m: PluginManifest, h: PluginHandler, p: PluginPayload): Promise<ComplianceCheckResult> {
  const s = performance.now();
  try {
    const hashes: string[] = [];
    for (let i = 0; i < DETERMINISM_CHECK_ITERATIONS; i++) {
      const res = await invokeWithTimeout(h, makeRequest(p, `cg04-${i}`), DEFAULT_COMPLIANCE_TIMEOUT_MS);
      if (res.status !== 'ok' || res.result === null) return { id: 'CG-04', name: 'Determinism check', law: 'L6', passed: false, detail: `Run ${i}: status=${res.status}`, duration_ms: Math.round(performance.now() - s) };
      hashes.push(hashPayload(res.result));
    }
    const same = hashes.every(h2 => h2 === hashes[0]);
    return { id: 'CG-04', name: 'Determinism check', law: 'L6', passed: same, detail: same ? `${DETERMINISM_CHECK_ITERATIONS} runs identical, hash=${hashes[0]!.slice(0, 16)}…` : `Hashes differ`, duration_ms: Math.round(performance.now() - s) };
  } catch (err) {
    return { id: 'CG-04', name: 'Determinism check', law: 'L6', passed: false, detail: `Error: ${err instanceof Error ? err.message : String(err)}`, duration_ms: Math.round(performance.now() - s) };
  }
}

// ═══════════════ CG-05: Stateless check ═══════════════
async function checkCG05(m: PluginManifest, h: PluginHandler, p: PluginPayload): Promise<ComplianceCheckResult> {
  const s = performance.now();
  try {
    const r1 = await invokeWithTimeout(h, makeRequest(p, 'cg05-1'), DEFAULT_COMPLIANCE_TIMEOUT_MS);
    const r2 = await invokeWithTimeout(h, makeRequest(p, 'cg05-2'), DEFAULT_COMPLIANCE_TIMEOUT_MS);
    if (r1.status !== 'ok' || r2.status !== 'ok') return { id: 'CG-05', name: 'Stateless check', law: 'L3', passed: false, detail: `Statuses: ${r1.status},${r2.status}`, duration_ms: Math.round(performance.now() - s) };
    const h1 = r1.result ? hashPayload(r1.result) : '';
    const h2 = r2.result ? hashPayload(r2.result) : '';
    return { id: 'CG-05', name: 'Stateless check', law: 'L3', passed: h1 === h2, detail: h1 === h2 ? 'No state leakage' : 'Results differ', duration_ms: Math.round(performance.now() - s) };
  } catch (err) {
    return { id: 'CG-05', name: 'Stateless check', law: 'L3', passed: false, detail: `Error: ${err instanceof Error ? err.message : String(err)}`, duration_ms: Math.round(performance.now() - s) };
  }
}

// ═══════════════ CG-06: Fail-closed check ═══════════════
async function checkCG06(m: PluginManifest, h: PluginHandler): Promise<ComplianceCheckResult> {
  const s = performance.now();
  const invalid: TextPayload = { kind: 'text', content: '', encoding: 'utf-8', metadata: {} };
  try {
    const res = await invokeWithTimeout(h, makeRequest(invalid, 'cg06'), DEFAULT_COMPLIANCE_TIMEOUT_MS);
    const ok = res.status === 'rejected';
    return { id: 'CG-06', name: 'Fail-closed check', law: 'L5', passed: ok, detail: ok ? 'Invalid input rejected' : `Expected rejected, got ${res.status}`, duration_ms: Math.round(performance.now() - s) };
  } catch (err) {
    return { id: 'CG-06', name: 'Fail-closed check', law: 'L5', passed: false, detail: `Crash on invalid input: ${err instanceof Error ? err.message : String(err)}`, duration_ms: Math.round(performance.now() - s) };
  }
}

// ═══════════════ CG-07: Timeout respect ═══════════════
async function checkCG07(m: PluginManifest, h: PluginHandler, p: PluginPayload): Promise<ComplianceCheckResult> {
  const s = performance.now();
  try {
    const res = await invokeWithTimeout(h, makeRequest(p, 'cg07'), m.limits.max_ms);
    const ok = res.duration_ms <= m.limits.max_ms;
    return { id: 'CG-07', name: 'Timeout respect', law: 'L5', passed: ok, detail: ok ? `${res.duration_ms}ms <= ${m.limits.max_ms}ms` : `${res.duration_ms}ms > ${m.limits.max_ms}ms`, duration_ms: Math.round(performance.now() - s) };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'COMPLIANCE_TIMEOUT';
    return { id: 'CG-07', name: 'Timeout respect', law: 'L5', passed: false, detail: isTimeout ? `Exceeded ${m.limits.max_ms}ms` : `Error: ${err instanceof Error ? err.message : String(err)}`, duration_ms: Math.round(performance.now() - s) };
  }
}

// ═══════════════ CG-08: Non-actuation check ═══════════════
async function checkCG08(m: PluginManifest, h: PluginHandler, p: PluginPayload): Promise<ComplianceCheckResult> {
  const s = performance.now();
  try {
    const res = await invokeWithTimeout(h, makeRequest(p, 'cg08'), DEFAULT_COMPLIANCE_TIMEOUT_MS);
    if (res.status !== 'ok' || res.result === null) return { id: 'CG-08', name: 'Non-actuation check', law: 'L1', passed: res.status === 'rejected', detail: `status=${res.status}`, duration_ms: Math.round(performance.now() - s) };
    const validKinds = new Set(['text', 'json', 'binary_ref', 'dataset_slice']);
    const ok = validKinds.has(res.result.kind);
    return { id: 'CG-08', name: 'Non-actuation check', law: 'L1', passed: ok, detail: ok ? `Output kind="${res.result.kind}" is data-only` : `Unknown kind="${res.result.kind}"`, duration_ms: Math.round(performance.now() - s) };
  } catch (err) {
    return { id: 'CG-08', name: 'Non-actuation check', law: 'L1', passed: false, detail: `Error: ${err instanceof Error ? err.message : String(err)}`, duration_ms: Math.round(performance.now() - s) };
  }
}

// ═══════════════ CG-09: Proof generation ═══════════════
async function checkCG09(m: PluginManifest, h: PluginHandler, p: PluginPayload): Promise<ComplianceCheckResult> {
  const s = performance.now();
  try {
    const res = await invokeWithTimeout(h, makeRequest(p, 'cg09'), DEFAULT_COMPLIANCE_TIMEOUT_MS);
    const hasIn = res.evidence_hashes.input_hash.length > 0;
    const hasOut = (res.status === 'ok' && res.result !== null) ? res.evidence_hashes.output_hash.length > 0 : true;
    const ok = hasIn && hasOut;
    return { id: 'CG-09', name: 'Proof generation', law: 'L9', passed: ok, detail: ok ? `Hashes present: in=${res.evidence_hashes.input_hash.slice(0, 16)}… out=${res.evidence_hashes.output_hash.slice(0, 16)}…` : `Missing: input=${hasIn}, output=${hasOut}`, duration_ms: Math.round(performance.now() - s) };
  } catch (err) {
    return { id: 'CG-09', name: 'Proof generation', law: 'L9', passed: false, detail: `Error: ${err instanceof Error ? err.message : String(err)}`, duration_ms: Math.round(performance.now() - s) };
  }
}

// ═══════════════ CG-10: Version compat ═══════════════
function checkCG10(m: PluginManifest): ComplianceCheckResult {
  const s = performance.now();
  const ok = isCompatibleMajor(m.api_version, OMEGA_PLUGIN_API_VERSION);
  return { id: 'CG-10', name: 'Version compat', law: 'L8', passed: ok, detail: ok ? `${m.api_version} compat with ${OMEGA_PLUGIN_API_VERSION}` : `${m.api_version} incompatible`, duration_ms: Math.round(performance.now() - s) };
}

// ═══════════════ MAIN RUNNER ═══════════════

export async function runComplianceGate(input: ComplianceGateInput): Promise<ComplianceReport> {
  const { manifest, handler, testPayloads } = input;
  if (testPayloads.length === 0) throw new Error('ComplianceGate: at least one testPayload required');
  const p = testPayloads[0]!;
  const checks: ComplianceCheckResult[] = [
    checkCG01(manifest),
    checkCG02(manifest),
    checkCG03(manifest),
    await checkCG04(manifest, handler, p),
    await checkCG05(manifest, handler, p),
    await checkCG06(manifest, handler),
    await checkCG07(manifest, handler, p),
    await checkCG08(manifest, handler, p),
    await checkCG09(manifest, handler, p),
    checkCG10(manifest),
  ];
  const passed_count = checks.filter(c => c.passed).length;
  return {
    plugin_id: manifest.plugin_id,
    timestamp: new Date().toISOString(),
    passed: passed_count === 10,
    checks,
    summary: { total: 10, passed_count, failed_count: 10 - passed_count },
  };
}
