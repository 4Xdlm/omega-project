#!/usr/bin/env npx tsx
/**
 * OMEGA Signal Registry — Codegen from IDL
 * Reads signal-registry.idl.json, generates registry.ts
 *
 * Usage: npx tsx scripts/codegen-registry.ts
 * Verify: npx tsx scripts/codegen-registry.ts --verify
 *
 * --verify mode: compare generated output with existing registry.ts
 *                exit 0 if identical, exit 1 if drift detected
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDL_PATH = resolve(__dirname, '..', 'signal-registry.idl.json');
const REGISTRY_PATH = resolve(__dirname, '..', 'src', 'registry.ts');

interface IDLSignal {
  signal_id: string;
  producer: string;
  stability: 'stable' | 'experimental' | 'deprecated';
  required_params: string[];
  dimensions?: number;
  description: string;
}

interface IDLSchema {
  $schema: string;
  version: string;
  producers: string[];
  signals: IDLSignal[];
}

function loadIDL(): IDLSchema {
  const raw = readFileSync(IDL_PATH, 'utf-8');
  const idl: IDLSchema = JSON.parse(raw);

  // Validate
  if (!idl.$schema || !idl.$schema.startsWith('omega-signal-registry-idl')) {
    throw new Error('Invalid IDL: missing or wrong $schema');
  }
  if (!Array.isArray(idl.signals) || idl.signals.length === 0) {
    throw new Error('Invalid IDL: signals array empty or missing');
  }

  // Validate each signal
  const ids = new Set<string>();
  for (const s of idl.signals) {
    if (!s.signal_id || !s.producer || !s.stability || !s.description) {
      throw new Error(`Invalid signal: missing required field in ${JSON.stringify(s)}`);
    }
    if (!idl.producers.includes(s.producer)) {
      throw new Error(`Signal '${s.signal_id}' has unknown producer '${s.producer}'`);
    }
    if (ids.has(s.signal_id)) {
      throw new Error(`Duplicate signal_id: '${s.signal_id}'`);
    }
    ids.add(s.signal_id);
  }

  return idl;
}

function generateRegistryTS(idl: IDLSchema): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * OMEGA Signal Registry — Immutable Signal Catalog');
  lines.push(' * SSOT for all inter-engine signals.');
  lines.push(` * AUTO-GENERATED from signal-registry.idl.json v${idl.version}`);
  lines.push(' * DO NOT EDIT MANUALLY — run: npx tsx scripts/codegen-registry.ts');
  lines.push(' */');
  lines.push('');
  lines.push("import type { SignalDescriptor } from './types.js';");
  lines.push('');
  lines.push('/**');
  lines.push(' * OMEGA_SIGNAL_REGISTRY — The complete catalog of all signals.');
  lines.push(' * Immutable. Hashable. Auditable.');
  lines.push(' * Any signal not in this registry DOES NOT EXIST.');
  lines.push(' */');
  lines.push('export const OMEGA_SIGNAL_REGISTRY: readonly SignalDescriptor[] = [');

  // Group by section (determined by signal_id prefix and producer)
  interface Section {
    label: string;
    producer: string;
    signals: IDLSignal[];
  }

  const sections: Section[] = [];

  // Group omega-forge signals as EMOTION
  const omegaForgeSignals = idl.signals.filter(s => s.producer === 'omega-forge');
  if (omegaForgeSignals.length > 0) {
    sections.push({ label: 'EMOTION', producer: 'omega-forge', signals: omegaForgeSignals });
  }

  // Group sovereign-engine signals by prefix
  const tensionSignals = idl.signals.filter(s => s.producer === 'sovereign-engine' && s.signal_id.startsWith('tension'));
  if (tensionSignals.length > 0) {
    sections.push({ label: 'TENSION', producer: 'sovereign-engine', signals: tensionSignals });
  }

  const narrativeSignals = idl.signals.filter(s =>
    s.producer === 'sovereign-engine' &&
    (s.signal_id.startsWith('beats') || s.signal_id.startsWith('style') || s.signal_id.startsWith('symbol'))
  );
  if (narrativeSignals.length > 0) {
    sections.push({ label: 'NARRATIVE', producer: 'sovereign-engine', signals: narrativeSignals });
  }

  const scoringSignals = idl.signals.filter(s => s.producer === 'sovereign-engine' && s.signal_id.startsWith('scoring'));
  if (scoringSignals.length > 0) {
    sections.push({ label: 'SCORING', producer: 'sovereign-engine', signals: scoringSignals });
  }

  // Group config signals as META
  const configSignals = idl.signals.filter(s => s.producer === 'config');
  if (configSignals.length > 0) {
    sections.push({ label: 'META', producer: 'config', signals: configSignals });
  }

  let first = true;
  for (const section of sections) {
    if (!first) lines.push('');
    first = false;

    lines.push(`  // ── ${section.label} (producer: ${section.producer}) ──`);

    for (const s of section.signals) {
      lines.push('  {');
      lines.push(`    signal_id: '${s.signal_id}',`);
      lines.push(`    producer: '${s.producer}',`);
      lines.push(`    stability: '${s.stability}',`);
      lines.push(`    required_params: [${s.required_params.map(p => `'${p}'`).join(', ')}],`);
      if (s.dimensions !== undefined) {
        lines.push(`    dimensions: ${s.dimensions},`);
      }
      lines.push(`    description: '${s.description.replace(/'/g, "\\'")}',`);
      lines.push('  },');
    }
  }

  lines.push('] as const;');
  lines.push('');
  lines.push("/** All valid signal IDs as a union type */");
  lines.push("export type SignalId = typeof OMEGA_SIGNAL_REGISTRY[number]['signal_id'];");
  lines.push('');
  lines.push('/** All signal IDs as a set for O(1) lookup */');
  lines.push('export const SIGNAL_ID_SET: ReadonlySet<string> = new Set(');
  lines.push("  OMEGA_SIGNAL_REGISTRY.map((s) => s.signal_id),");
  lines.push(');');
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const isVerify = process.argv.includes('--verify');
const idl = loadIDL();

console.log(`[codegen] Loaded IDL v${idl.version}: ${idl.signals.length} signals`);

const generated = generateRegistryTS(idl);

if (isVerify) {
  // Compare with existing
  const existing = readFileSync(REGISTRY_PATH, 'utf-8');
  if (generated.trim() === existing.trim()) {
    console.log('[codegen] ✅ VERIFY PASS — registry.ts matches IDL');
    process.exit(0);
  } else {
    console.error('[codegen] ❌ VERIFY FAIL — registry.ts does NOT match IDL');
    console.error('[codegen] Run: npx tsx scripts/codegen-registry.ts to regenerate');
    process.exit(1);
  }
} else {
  // Write
  writeFileSync(REGISTRY_PATH, generated, 'utf-8');
  console.log(`[codegen] ✅ Generated ${REGISTRY_PATH}`);
  console.log(`[codegen] ${idl.signals.length} signals written`);
}
