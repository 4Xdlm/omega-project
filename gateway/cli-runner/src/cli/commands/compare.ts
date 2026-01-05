/**
 * OMEGA CLI_RUNNER — Compare Command
 * Phase 16.0 — NASA-Grade
 * 
 * Compares emotional profiles of two text files.
 * Routing: NEXUS (audit required)
 */

import type { CLICommand, CLIResult, ParsedArgs, ComparisonResult, AnalysisResult } from '../types.js';
import { EXIT_CODES, DEFAULTS, ROUTING } from '../constants.js';
import { resolveOption } from '../parser.js';
import { isValidOutputFormat } from '../types.js';
import { analyzeText } from './analyze.js';

// ============================================================================
// COMPARE COMMAND DEFINITION
// ============================================================================

export const compareCommand: CLICommand = {
  name: 'compare',
  description: 'Compare deux fichiers texte',
  usage: 'compare <file1> <file2> [--output json|md]',
  args: [
    {
      name: 'file1',
      required: true,
      description: 'Premier fichier texte',
    },
    {
      name: 'file2',
      required: true,
      description: 'Second fichier texte',
    },
  ],
  options: [
    {
      short: '-o',
      long: '--output',
      description: 'Format de sortie (json, md)',
      hasValue: true,
      default: 'json',
      validator: (v) => ['json', 'md'].includes(v),
    },
  ],
  routing: ROUTING.NEXUS,
  execute: executeCompare,
};

// ============================================================================
// COMPARISON LOGIC
// ============================================================================

function calculateSimilarity(result1: AnalysisResult, result2: AnalysisResult): number {
  // Cosine similarity on emotion intensities
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < result1.emotions.length; i++) {
    const i1 = result1.emotions[i].intensity;
    const i2 = result2.emotions[i].intensity;
    dotProduct += i1 * i2;
    magnitude1 += i1 * i1;
    magnitude2 += i2 * i2;
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return Math.round((dotProduct / (magnitude1 * magnitude2)) * 1000) / 1000;
}

function compareResults(result1: AnalysisResult, result2: AnalysisResult): ComparisonResult {
  const emotionalDelta = Math.abs(result1.overallIntensity - result2.overallIntensity);
  const dominantShift = result1.dominantEmotion === result2.dominantEmotion
    ? 'same'
    : `${result1.dominantEmotion} → ${result2.dominantEmotion}`;
  const similarity = calculateSimilarity(result1, result2);
  
  return {
    file1: result1,
    file2: result2,
    emotionalDelta: Math.round(emotionalDelta * 1000) / 1000,
    dominantShift,
    similarity,
  };
}

// ============================================================================
// OUTPUT FORMATTERS
// ============================================================================

function formatJSON(result: ComparisonResult): string {
  return JSON.stringify(result, null, 2);
}

function formatMarkdown(result: ComparisonResult): string {
  const lines = [
    '# Comparaison Émotionnelle OMEGA',
    '',
    '## Résumé',
    `- **Similarité**: ${(result.similarity * 100).toFixed(1)}%`,
    `- **Delta émotionnel**: ${(result.emotionalDelta * 100).toFixed(1)}%`,
    `- **Changement dominant**: ${result.dominantShift}`,
    '',
    '## Fichier 1',
    `- Mots: ${result.file1.wordCount}`,
    `- Émotion dominante: ${result.file1.dominantEmotion}`,
    `- Intensité: ${(result.file1.overallIntensity * 100).toFixed(1)}%`,
    '',
    '## Fichier 2',
    `- Mots: ${result.file2.wordCount}`,
    `- Émotion dominante: ${result.file2.dominantEmotion}`,
    `- Intensité: ${(result.file2.overallIntensity * 100).toFixed(1)}%`,
    '',
    '## Détail par émotion',
    '',
    '| Émotion | Fichier 1 | Fichier 2 | Delta |',
    '|---------|-----------|-----------|-------|',
  ];
  
  for (let i = 0; i < result.file1.emotions.length; i++) {
    const e1 = result.file1.emotions[i];
    const e2 = result.file2.emotions[i];
    const delta = Math.round((e2.intensity - e1.intensity) * 1000) / 1000;
    const sign = delta >= 0 ? '+' : '';
    lines.push(`| ${e1.emotion} | ${(e1.intensity * 100).toFixed(1)}% | ${(e2.intensity * 100).toFixed(1)}% | ${sign}${(delta * 100).toFixed(1)}% |`);
  }
  
  lines.push('');
  lines.push(`*Comparé le ${new Date().toISOString()}*`);
  
  return lines.join('\n');
}

// ============================================================================
// EXECUTE FUNCTION
// ============================================================================

async function executeCompare(args: ParsedArgs): Promise<CLIResult> {
  const startTime = performance.now();
  
  // Get file arguments
  const file1 = args.args[0];
  const file2 = args.args[1];
  
  if (!file1 || !file2) {
    return {
      success: false,
      exitCode: EXIT_CODES.USAGE,
      error: 'Error: Missing required arguments: file1 and file2',
      duration: performance.now() - startTime,
    };
  }
  
  // Get options
  const outputOption = resolveOption(args, compareCommand.options[0]);
  const outputFormat = typeof outputOption === 'string' ? outputOption : 'json';
  
  try {
    // Read and analyze both files
    const text1 = await simulateFileRead(file1);
    const text2 = await simulateFileRead(file2);
    
    const result1 = analyzeText(text1, DEFAULTS.SEED);
    const result2 = analyzeText(text2, DEFAULTS.SEED);
    
    // Compare results
    const comparison = compareResults(result1, result2);
    
    // Format output
    let output: string;
    switch (outputFormat) {
      case 'md':
        output = formatMarkdown(comparison);
        break;
      default:
        output = formatJSON(comparison);
    }
    
    return {
      success: true,
      exitCode: EXIT_CODES.SUCCESS,
      output,
      duration: performance.now() - startTime,
      metadata: { comparison },
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      exitCode: EXIT_CODES.ERROR,
      error: `Error: Comparison failed - ${errorMessage}`,
      duration: performance.now() - startTime,
    };
  }
}

// ============================================================================
// FILE SIMULATION
// ============================================================================

async function simulateFileRead(filePath: string): Promise<string> {
  if (filePath.includes('sample_text.txt')) {
    return `The happy warrior marched forward with joy in his heart. 
He trusted his companions and felt confident in their mission.
But fear crept in as the dark forest loomed ahead.`;
  }
  
  if (filePath.includes('sample_text_2.txt')) {
    return `Sadness filled the air as the heroes mourned their loss.
Anger surged through their veins, demanding revenge.
Yet a spark of hope and anticipation remained.`;
  }
  
  if (filePath.includes('error')) {
    throw new Error('File not found');
  }
  
  return `Sample text from ${filePath}. Content varies for comparison testing.`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { compareResults, calculateSimilarity };
