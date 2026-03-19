/**
 * OMEGA spaCy Bridge — Subprocess bridge to Python spaCy for NLP features.
 * Phase Full-Coverage — 5 features that require POS tagging / lemmatization.
 *
 * OPTIONAL: If Python/spaCy is unavailable, the scorer works with 44/49 features.
 * The 5 features are simply absent from the Record<string, number>.
 *
 * Features computed:
 *   f18a_fragment_rate   — sentences without verbs (fragments)
 *   f18b_nominal_rate    — sentences without verbs but with nouns
 *   f5_lex_verb_count    — count of lexical verbs (VERB, not AUX)
 *   f5a_lex_verb_density — lexical verbs / total tokens
 *   style_f5a_thresh     — style regime threshold (0.04/0.07/0.14)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Path to the Python bridge script */
const BRIDGE_SCRIPT = path.resolve(__dirname, '../../../../omega-autopsie/spacy_features_bridge.py');

/** Path to the Python venv */
const VENV_PYTHON_WIN = path.resolve(__dirname, '../../../../omega-autopsie/.venv311/Scripts/python.exe');
const VENV_PYTHON_UNIX = path.resolve(__dirname, '../../../../omega-autopsie/.venv311/bin/python');

/** Timeout for subprocess (spaCy model loading can be slow first time) */
const SUBPROCESS_TIMEOUT_MS = 30_000;

/**
 * Resolves the Python executable path.
 * Checks venv first, then falls back to system python.
 */
function findPython(): string | null {
  if (process.platform === 'win32' && existsSync(VENV_PYTHON_WIN)) {
    return VENV_PYTHON_WIN;
  }
  if (process.platform !== 'win32' && existsSync(VENV_PYTHON_UNIX)) {
    return VENV_PYTHON_UNIX;
  }
  // Fallback: try system python
  try {
    execFileSync('python', ['--version'], { timeout: 5000, stdio: 'pipe' });
    return 'python';
  } catch {
    return null;
  }
}

/**
 * Computes the 5 spaCy-dependent features by calling a Python subprocess.
 *
 * @param text - The raw text to analyze
 * @param lang - Language code ('fr', 'en', 'es')
 * @returns Record of 5 feature values, or empty Record if bridge fails
 */
export async function computeSpacyFeatures(
  text: string,
  lang: 'fr' | 'en' | 'es' = 'fr',
): Promise<Record<string, number>> {
  // Check prerequisites
  if (!existsSync(BRIDGE_SCRIPT)) {
    return {};
  }

  const pythonPath = findPython();
  if (!pythonPath) {
    return {};
  }

  try {
    const stdout = execFileSync(
      pythonPath,
      [BRIDGE_SCRIPT, '--lang', lang],
      {
        input: text,
        timeout: SUBPROCESS_TIMEOUT_MS,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    const result = JSON.parse(stdout.trim()) as Record<string, unknown>;

    // Validate: all values must be numbers
    const features: Record<string, number> = {};
    const expectedKeys = [
      'f18a_fragment_rate',
      'f18b_nominal_rate',
      'f5_lex_verb_count',
      'f5a_lex_verb_density',
      'style_f5a_thresh',
    ];

    for (const key of expectedKeys) {
      const val = result[key];
      if (typeof val === 'number' && isFinite(val)) {
        features[key] = val;
      }
    }

    return features;
  } catch {
    // Bridge failed — return empty (scorer works with 44/49)
    return {};
  }
}

/**
 * Checks if the spaCy bridge is available (Python + script + model).
 * Does a lightweight check without actually loading spaCy.
 */
export function isSpacyBridgeAvailable(): boolean {
  if (!existsSync(BRIDGE_SCRIPT)) return false;
  return findPython() !== null;
}
