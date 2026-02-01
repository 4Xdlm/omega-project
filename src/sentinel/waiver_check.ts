/**
 * WAIVER_CHECK — Vérifier expiration des waivers v1.1
 *
 * CORRECTION v1.1:
 * - Expiration FACTUELLE (tag git OU manifest existe)
 * - Pas de paramètre string déclaratif
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Waiver {
  waiver_id: string;
  phase: string;
  gap_id: string;
  severity: string;
  expires_on_phase: string;
}

// Vérifier si une phase est SEALED (FACTUEL - v1.1)
export function isPhaseSealed(phase: string): boolean {
  const phaseLower = phase.toLowerCase();

  // Méthode 1: Tag git existe
  try {
    const tagOutput = execSync(`git tag -l "phase-${phaseLower}-sealed"`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (tagOutput !== '') {
      return true;
    }
  } catch {
    // Git not available or error, continue to method 2
  }

  // Méthode 2: Manifest existe
  const proofDir = path.join(process.cwd(), 'nexus', 'proof');
  if (fs.existsSync(proofDir)) {
    const dirs = fs.readdirSync(proofDir).sort();
    for (const dir of dirs) {
      if (dir.startsWith(`phase_${phaseLower}`)) {
        const manifestPath = path.join(proofDir, dir, `${phase.toUpperCase()}_MANIFEST.sha256`);
        if (fs.existsSync(manifestPath)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Vérifier expiration des waivers (v1.1 - factuel)
export function checkWaiverExpiration(): {
  expired: Waiver[];
  active: Waiver[];
  sealedPhases: string[];
} {
  const waiverDir = path.join(process.cwd(), 'waivers');
  const expired: Waiver[] = [];
  const active: Waiver[] = [];
  const sealedPhases: string[] = [];

  if (!fs.existsSync(waiverDir)) {
    return { expired, active, sealedPhases };
  }

  const phaseDirs = fs.readdirSync(waiverDir).sort();

  for (const phaseDir of phaseDirs) {
    const phasePath = path.join(waiverDir, phaseDir);
    if (!fs.statSync(phasePath).isDirectory()) continue;

    const waiverFiles = fs.readdirSync(phasePath)
      .filter(f => f.startsWith('WAIVER_') && f.endsWith('.json'))
      .sort();

    for (const waiverFile of waiverFiles) {
      const waiverPath = path.join(phasePath, waiverFile);
      const waiver: Waiver = JSON.parse(fs.readFileSync(waiverPath, 'utf-8'));

      // v1.1: Vérification FACTUELLE
      if (isPhaseSealed(waiver.expires_on_phase)) {
        expired.push(waiver);
        if (!sealedPhases.includes(waiver.expires_on_phase)) {
          sealedPhases.push(waiver.expires_on_phase);
        }
      } else {
        active.push(waiver);
      }
    }
  }

  return { expired, active, sealedPhases };
}

// Générer rapport d'expiration
export function generateExpirationReport(): string {
  const { expired, active, sealedPhases } = checkWaiverExpiration();

  let report = `# WAIVER EXPIRATION REPORT (v1.1 - Factual Verification)\n\n`;
  report += `Generated at RUN_ID context (see EVIDENCE/RUN_ID.txt)\n\n`;

  report += `## Sealed Phases Detected\n\n`;
  if (sealedPhases.length === 0) {
    report += `None detected via tag or manifest.\n\n`;
  } else {
    for (const phase of sealedPhases) {
      report += `- Phase ${phase}: SEALED (verified via tag or manifest)\n`;
    }
    report += `\n`;
  }

  report += `## Expired Waivers (${expired.length})\n\n`;
  if (expired.length === 0) {
    report += `None\n\n`;
  } else {
    report += `| Waiver ID | Gap | Severity | Expired Because |\n`;
    report += `|-----------|-----|----------|----------------|\n`;
    for (const w of expired) {
      report += `| ${w.waiver_id} | ${w.gap_id} | ${w.severity} | Phase ${w.expires_on_phase} SEALED |\n`;
    }
    report += `\n`;
  }

  report += `## Active Waivers (${active.length})\n\n`;
  if (active.length === 0) {
    report += `None\n\n`;
  } else {
    report += `| Waiver ID | Gap | Expires When |\n`;
    report += `|-----------|-----|-------------|\n`;
    for (const w of active) {
      report += `| ${w.waiver_id} | ${w.gap_id} | Phase ${w.expires_on_phase} SEALED |\n`;
    }
  }

  report += `\n## Verification Method\n\n`;
  report += `Expiration is determined FACTUALLY:\n`;
  report += `1. Git tag \`phase-{X}-sealed\` exists, OR\n`;
  report += `2. File \`{X}_MANIFEST.sha256\` exists in proof directory\n`;
  report += `\nNo declarative string parameter is trusted.\n`;

  return report;
}
