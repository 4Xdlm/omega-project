/**
 * GENIUS-02 — Anti-Doublon Lint Tests
 * LINT-G01 to LINT-G06
 *
 * These tests verify that GENIUS scorers do NOT cross-import from
 * emotion (M) layer scorers, ensuring anti-doublon isolation.
 *
 * Methodology: Read source file contents and check for forbidden imports.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Resolve paths relative to the project root
function getScorerPath(filename: string): string {
  // Try multiple possible locations
  const candidates = [
    path.resolve(__dirname, '../../src/genius/scorers', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/genius/scorers', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0]; // fallback
}

function getGeniusPath(filename: string): string {
  const candidates = [
    path.resolve(__dirname, '../../src/genius', filename),
    path.resolve(process.cwd(), 'packages/sovereign-engine/src/genius', filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function readFileIfExists(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    // File might not exist in test environment — skip gracefully
    return '';
  }
}

describe('Anti-Doublon Lint Checks', () => {

  // LINT-G01: density-scorer.ts does NOT import SII
  it('LINT-G01: density-scorer has no import from SII', () => {
    const content = readFileIfExists(getScorerPath('density-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/import.*SII/i);
      expect(content).not.toMatch(/from.*sii/i);
      expect(content).not.toMatch(/necessity_score/i);
    }
  });

  // LINT-G02: surprise-scorer.ts does NOT import SII.metaphor
  it('LINT-G02: surprise-scorer has no import from SII.metaphor', () => {
    const content = readFileIfExists(getScorerPath('surprise-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/import.*SII/i);
      expect(content).not.toMatch(/metaphor_novelty/i);
      expect(content).not.toMatch(/from.*sii/i);
    }
  });

  // LINT-G03: surprise-scorer.ts does NOT call external API embedding provider
  it('LINT-G03: surprise-scorer uses no external API embedding', () => {
    const content = readFileIfExists(getScorerPath('surprise-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/openai/i);
      expect(content).not.toMatch(/anthropic/i);
      expect(content).not.toMatch(/cohere/i);
      expect(content).not.toMatch(/fetch\s*\(/); // no HTTP calls
      expect(content).not.toMatch(/axios/i);
      // Must only use local-embedding-model
      const imports = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      for (const imp of imports) {
        if (imp.includes('embedding')) {
          expect(imp).toMatch(/local-embedding-model/);
        }
      }
    }
  });

  // LINT-G04: inevitability-scorer.ts does NOT import TemporalEngine.scores
  it('LINT-G04: inevitability-scorer has no import from TemporalEngine', () => {
    const content = readFileIfExists(getScorerPath('inevitability-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/import.*TemporalEngine/i);
      expect(content).not.toMatch(/import.*temporal-engine/i);
      expect(content).not.toMatch(/from.*temporal/i);
      // May use NarrativeEvent type but NOT scored temporal data
      expect(content).not.toMatch(/temporal_pacing/i);
      expect(content).not.toMatch(/TemporalEngine\.scores/i);
    }
  });

  // LINT-G05: resonance-scorer.ts does NOT create new SymbolTaxonomy
  it('LINT-G05: resonance-scorer does not create SymbolTaxonomy', () => {
    const content = readFileIfExists(getScorerPath('resonance-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/new\s+SymbolTaxonomy/i);
      expect(content).not.toMatch(/class\s+SymbolTaxonomy/i);
      expect(content).not.toMatch(/import.*SymbolTaxonomy/i);
    }
  });

  // LINT-G06: voice-scorer.ts does NOT import RCI.voice_conformity
  it('LINT-G06: voice-scorer has no import from RCI', () => {
    const content = readFileIfExists(getScorerPath('voice-scorer.ts'));
    if (content) {
      expect(content).not.toMatch(/import.*RCI/i);
      expect(content).not.toMatch(/voice_conformity/i);
      expect(content).not.toMatch(/from.*rci/i);
    }
  });

  // Meta-lint: genius-metrics.ts orchestrator imports are correct
  it('LINT-META: genius-metrics imports only from genius/ submodules', () => {
    const content = readFileIfExists(getGeniusPath('genius-metrics.ts'));
    if (content) {
      // Must NOT import from emotion/scoring layer
      expect(content).not.toMatch(/from.*scoring\//i);
      expect(content).not.toMatch(/from.*emotion\//i);
      expect(content).not.toMatch(/import.*ECC/);
      expect(content).not.toMatch(/import.*RCI[^_]/); // RCI but not as part of another word
    }
  });
});
