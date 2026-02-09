/**
 * OMEGA Release — SBOM Generator
 * Phase G.0 — Software Bill of Materials (CycloneDX 1.4)
 */

import type { SBOM, SBOMComponent } from './types.js';

/** Generate SBOM for OMEGA */
export function generateSBOM(version: string, components?: readonly SBOMComponent[]): SBOM {
  const defaultComponents: SBOMComponent[] = [
    { type: 'application', name: '@omega/genesis-planner', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/scribe-engine', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/style-emergence-engine', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/creation-pipeline', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/omega-forge', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/omega-runner', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/omega-governance', version, licenses: ['MIT'] },
    { type: 'application', name: '@omega/omega-release', version, licenses: ['MIT'] },
    { type: 'library', name: '@omega/canon-kernel', version, licenses: ['MIT'] },
  ];

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    components: components ?? defaultComponents,
  };
}

/** Validate SBOM structure */
export function validateSBOM(sbom: SBOM): boolean {
  if (sbom.bomFormat !== 'CycloneDX') return false;
  if (sbom.specVersion !== '1.4') return false;
  if (!Array.isArray(sbom.components)) return false;
  for (const comp of sbom.components) {
    if (!comp.name || !comp.version || !comp.type) return false;
  }
  return true;
}
