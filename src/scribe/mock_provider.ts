// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — MOCK PROVIDER
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠️ THIS MODULE IS FOR TESTING ONLY
// 
// Feature flag: Only include in test builds or with SCRIBE_MOCK feature
// In production: compilation should fail if used incorrectly
//
// ═══════════════════════════════════════════════════════════════════════════

import { sha256 } from './canonicalize';
import { ScribeError, providerError } from './errors';
import { SceneSpec, Tense } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provider interface (what SCRIBE expects from any LLM provider)
 */
export interface ScribeProvider {
  /**
   * Generate text from a prompt
   * @param prompt The constructed prompt
   * @returns Generated text
   * @throws ScribeError on failure
   */
  generate(prompt: string): Promise<string>;
  
  /**
   * Provider identifier
   */
  readonly providerId: string;
}

/**
 * Mock provider configuration
 */
export interface MockProviderConfig {
  seed: number;
  simulateDelay?: number;       // ms delay to simulate API call
  simulateError?: boolean;       // if true, throws error
  errorMessage?: string;         // custom error message
  outputTemplate?: string;       // custom output template
  deterministicFromPrompt?: boolean; // if true, uses prompt hash for variation
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default narrative templates (French, for OMEGA context)
 */
const DEFAULT_TEMPLATES = {
  PAST: [
    "La lumière filtrait à travers les stores vénitiens, projetant des ombres striées sur le mur.",
    "{POV} s'approcha de la fenêtre, le cœur battant. {PRONOUN} savait que ce qu'il s'apprêtait à découvrir changerait tout.",
    "Le document était là, posé sur le bureau, exactement comme on le lui avait décrit.",
    "Ses mains tremblèrent légèrement lorsqu'{PRONOUN} le saisit.",
    "\"C'est donc vrai,\" murmura-{PRONOUN} pour {PRONOUN_REFLEXIVE}.",
  ],
  PRESENT: [
    "La lumière filtre à travers les stores vénitiens, projetant des ombres striées sur le mur.",
    "{POV} s'approche de la fenêtre, le cœur battant. {PRONOUN} sait que ce qu'il s'apprête à découvrir va tout changer.",
    "Le document est là, posé sur le bureau, exactement comme on le lui a décrit.",
    "Ses mains tremblent légèrement lorsqu'{PRONOUN} le saisit.",
    "\"C'est donc vrai,\" murmure-{PRONOUN} pour {PRONOUN_REFLEXIVE}.",
  ]
};

/**
 * Pronoun mappings (simplified)
 */
const PRONOUNS = {
  masculine: { PRONOUN: 'il', PRONOUN_REFLEXIVE: 'lui-même' },
  feminine: { PRONOUN: 'elle', PRONOUN_REFLEXIVE: 'elle-même' },
  neutral: { PRONOUN: 'il', PRONOUN_REFLEXIVE: 'soi-même' }
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK PROVIDER CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MockScribeProvider — Deterministic mock for testing
 * 
 * @invariant Produces identical output for identical (prompt, seed) pairs
 * @invariant Output varies deterministically based on prompt hash
 * 
 * ⚠️ FOR TESTING ONLY - Use #[cfg(test)] or feature flag in production
 */
export class MockScribeProvider implements ScribeProvider {
  public readonly providerId: string;
  private readonly config: MockProviderConfig;
  
  constructor(config: Partial<MockProviderConfig> = {}) {
    this.config = {
      seed: config.seed ?? 42,
      simulateDelay: config.simulateDelay ?? 0,
      simulateError: config.simulateError ?? false,
      errorMessage: config.errorMessage ?? 'Simulated provider error',
      deterministicFromPrompt: config.deterministicFromPrompt ?? true,
      ...config
    };
    this.providerId = `mock_seed_${this.config.seed}`;
  }
  
  /**
   * Generate deterministic output
   * 
   * The output is determined by:
   * 1. The seed (fixed per provider instance)
   * 2. The prompt hash (if deterministicFromPrompt is true)
   * 
   * This ensures:
   * - Same prompt + same seed = identical output (determinism)
   * - Different prompts get different but consistent outputs
   */
  async generate(prompt: string): Promise<string> {
    // Simulate delay if configured
    if (this.config.simulateDelay && this.config.simulateDelay > 0) {
      await this.delay(this.config.simulateDelay);
    }
    
    // Simulate error if configured
    if (this.config.simulateError) {
      throw providerError(this.providerId, this.config.errorMessage!);
    }
    
    // Use custom template if provided
    if (this.config.outputTemplate) {
      return this.processTemplate(this.config.outputTemplate, prompt);
    }
    
    // Generate deterministic output based on prompt hash
    return this.generateFromPrompt(prompt);
  }
  
  /**
   * Generate output deterministically from prompt
   */
  private generateFromPrompt(prompt: string): string {
    // Extract info from prompt
    const tense = this.extractTense(prompt);
    const povName = this.extractPovName(prompt);
    
    // Get templates for tense
    const templates = tense === 'PRESENT' 
      ? DEFAULT_TEMPLATES.PRESENT 
      : DEFAULT_TEMPLATES.PAST;
    
    // Compute prompt-based variation
    const promptHash = sha256(prompt);
    const variation = this.config.deterministicFromPrompt
      ? parseInt(promptHash.substring(0, 8), 16) % 1000
      : 0;
    
    // Select and modify paragraphs based on seed + variation
    const numParagraphs = 3 + ((this.config.seed + variation) % 3); // 3-5 paragraphs
    const selectedParagraphs: string[] = [];
    
    for (let i = 0; i < numParagraphs && i < templates.length; i++) {
      const idx = (this.config.seed + i + variation) % templates.length;
      let paragraph = templates[idx];
      
      // Replace placeholders
      paragraph = paragraph.replace(/{POV}/g, povName);
      paragraph = paragraph.replace(/{PRONOUN}/g, PRONOUNS.neutral.PRONOUN);
      paragraph = paragraph.replace(/{PRONOUN_REFLEXIVE}/g, PRONOUNS.neutral.PRONOUN_REFLEXIVE);
      
      selectedParagraphs.push(paragraph);
    }
    
    // Add mock hash footer for verification
    const output = selectedParagraphs.join('\n\n') + 
      `\n\n[MOCK_HASH: ${promptHash.substring(0, 16)}]` +
      `\n[SEED: ${this.config.seed}]` +
      `\n[VARIATION: ${variation}]`;
    
    return output;
  }
  
  /**
   * Extract tense from prompt
   */
  private extractTense(prompt: string): Tense {
    if (prompt.includes('"tense":"PRESENT"') || prompt.includes('tense: PRESENT')) {
      return 'PRESENT';
    }
    return 'PAST'; // Default
  }
  
  /**
   * Extract POV name from prompt
   */
  private extractPovName(prompt: string): string {
    // Try to find entity_id in format CHAR:NAME
    const match = prompt.match(/entity_id["\s:]+["']?([A-Z]+):([A-Z0-9_]+)/i);
    if (match) {
      // Capitalize first letter of name
      const name = match[2].toLowerCase();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return 'Le personnage'; // Fallback
  }
  
  /**
   * Process custom template
   */
  private processTemplate(template: string, prompt: string): string {
    const promptHash = sha256(prompt);
    return template
      .replace(/{PROMPT_HASH}/g, promptHash)
      .replace(/{SEED}/g, String(this.config.seed))
      .replace(/{TIMESTAMP}/g, new Date().toISOString());
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a mock provider with default seed
 */
export function createMockProvider(seed: number = 42): MockScribeProvider {
  return new MockScribeProvider({ seed });
}

/**
 * Create a mock provider that simulates errors
 */
export function createErrorProvider(errorMessage: string = 'Simulated error'): MockScribeProvider {
  return new MockScribeProvider({
    seed: 0,
    simulateError: true,
    errorMessage
  });
}

/**
 * Create a mock provider with delay (for timeout testing)
 */
export function createSlowProvider(delayMs: number, seed: number = 42): MockScribeProvider {
  return new MockScribeProvider({
    seed,
    simulateDelay: delayMs
  });
}

/**
 * Create a mock provider with custom template
 */
export function createTemplateProvider(template: string, seed: number = 42): MockScribeProvider {
  return new MockScribeProvider({
    seed,
    outputTemplate: template
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test determinism of mock provider
 * 
 * @param provider Provider to test
 * @param prompt Test prompt
 * @param runs Number of runs (default 100)
 * @returns Test result
 */
export async function testProviderDeterminism(
  provider: ScribeProvider,
  prompt: string,
  runs: number = 100
): Promise<{ passed: boolean; firstOutput: string; inconsistencies: number }> {
  const firstOutput = await provider.generate(prompt);
  let inconsistencies = 0;
  
  for (let i = 0; i < runs; i++) {
    const output = await provider.generate(prompt);
    if (output !== firstOutput) {
      inconsistencies++;
    }
  }
  
  return {
    passed: inconsistencies === 0,
    firstOutput,
    inconsistencies
  };
}

/**
 * Verify mock provider produces different output for different prompts
 */
export async function testProviderVariation(
  provider: ScribeProvider,
  prompts: string[]
): Promise<{ allDifferent: boolean; outputs: string[] }> {
  const outputs: string[] = [];
  
  for (const prompt of prompts) {
    outputs.push(await provider.generate(prompt));
  }
  
  const uniqueOutputs = new Set(outputs);
  
  return {
    allDifferent: uniqueOutputs.size === outputs.length,
    outputs
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WARNING BANNER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ MOCK PROVIDER DETECTION
 * 
 * Call this to verify we're not accidentally using mock in production
 */
export function assertNotProduction(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.SCRIBE_ALLOW_MOCK) {
    throw new Error(
      'MockScribeProvider cannot be used in production!\n' +
      'Set SCRIBE_ALLOW_MOCK=true to override (for testing only).'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const MockProvider = {
  MockScribeProvider,
  createMockProvider,
  createErrorProvider,
  createSlowProvider,
  createTemplateProvider,
  testProviderDeterminism,
  testProviderVariation,
  assertNotProduction
};

export default MockProvider;
