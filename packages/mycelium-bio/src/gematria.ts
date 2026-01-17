// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — GÉMATRIE v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Formule canonique: G(word) = Σ(value(letter[i])) où A=1, B=2, ..., Z=26
// Source: 01_GLOSSARY_MASTER.md §GÉMATRIE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Table de valeurs gématriques (A=1 .. Z=26)
 * Prégénérée pour performance
 */
const GEMATRIA_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 10, K: 11, L: 12, M: 13, N: 14, O: 15, P: 16, Q: 17, R: 18,
  S: 19, T: 20, U: 21, V: 22, W: 23, X: 24, Y: 25, Z: 26
};

/**
 * Calcule la valeur gématrique d'un mot
 * 
 * Formule: G(word) = Σ(value(letter[i])) où A=1..Z=26
 * 
 * Exemple: "OMEGA" = O(15) + M(13) + E(5) + G(7) + A(1) = 41
 * 
 * @param word - Mot à analyser
 * @returns Somme gématrique (0 si aucune lettre)
 */
export function computeGematria(word: string): number {
  if (!word || word.length === 0) {
    return 0;
  }

  const upper = word.toUpperCase();
  let sum = 0;

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const value = GEMATRIA_VALUES[char];
    if (value !== undefined) {
      sum += value;
    }
    // Les non-lettres (espaces, chiffres, ponctuation) sont ignorées
  }

  return sum;
}

/**
 * Calcule la gématrie moyenne par lettre
 * Utile pour comparer des mots de longueurs différentes
 * 
 * @param word - Mot à analyser
 * @returns Valeur moyenne (0 si aucune lettre)
 */
export function computeGematriaAverage(word: string): number {
  if (!word || word.length === 0) {
    return 0;
  }

  const upper = word.toUpperCase();
  let sum = 0;
  let count = 0;

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const value = GEMATRIA_VALUES[char];
    if (value !== undefined) {
      sum += value;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Calcule la gématrie d'une phrase (somme de tous les mots)
 * 
 * @param text - Texte à analyser
 * @returns Somme gématrique totale
 */
export function computeGematriaText(text: string): number {
  return computeGematria(text);
}

/**
 * Calcule la densité gématrique (gématrie / longueur texte)
 * 
 * @param text - Texte à analyser
 * @returns Densité (0-26 théoriquement)
 */
export function computeGematriaDensity(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  const gematria = computeGematria(text);
  const letterCount = text.replace(/[^a-zA-Z]/g, "").length;

  return letterCount > 0 ? gematria / letterCount : 0;
}

/**
 * Décompose un mot en ses valeurs gématriques individuelles
 * 
 * @param word - Mot à analyser
 * @returns Tableau de {letter, value} pour chaque lettre
 */
export function decomposeGematria(word: string): Array<{ letter: string; value: number }> {
  const upper = word.toUpperCase();
  const result: Array<{ letter: string; value: number }> = [];

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const value = GEMATRIA_VALUES[char];
    if (value !== undefined) {
      result.push({ letter: char, value });
    }
  }

  return result;
}

/**
 * Calcule le branchWeight basé sur gématrie (pour Mycélium)
 * 
 * Formule: branchWeight = log1p(gematriaSum) × (1 + 0.15 × punctDensity)
 * 
 * @param text - Texte du nœud
 * @returns Poids de branche
 */
export function computeBranchWeight(text: string): number {
  const gematria = computeGematria(text);
  
  // Densité de ponctuation (0-1)
  const totalChars = text.length;
  const punctCount = (text.match(/[.,;:!?'"()[\]{}\-—]/g) || []).length;
  const punctDensity = totalChars > 0 ? punctCount / totalChars : 0;

  // Formule: log1p pour éviter log(0)
  return Math.log1p(gematria) * (1 + 0.15 * punctDensity);
}

/**
 * Calcule l'épaisseur visuelle basée sur gématrie (pour mots niveau 3)
 * 
 * Formule: thickness = clamp(gematria / 100, 0.1, 1.0)
 * 
 * @param word - Mot
 * @returns Épaisseur 0.1-1.0
 */
export function computeThickness(word: string): number {
  const gematria = computeGematria(word);
  // Clamp entre 0.1 et 1.0
  return Math.min(1.0, Math.max(0.1, gematria / 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-test du module gématrie
 */
export function selfTest(): boolean {
  const tests: Array<{ word: string; expected: number }> = [
    // Cas canonique du glossaire
    { word: "OMEGA", expected: 41 },
    
    // Lettres simples
    { word: "A", expected: 1 },
    { word: "Z", expected: 26 },
    { word: "M", expected: 13 },
    
    // Mots complets
    { word: "ABC", expected: 6 },       // 1+2+3
    { word: "XYZ", expected: 75 },      // 24+25+26
    
    // Case insensitive
    { word: "omega", expected: 41 },
    { word: "OmEgA", expected: 41 },
    
    // Avec non-lettres (ignorées)
    { word: "O.M.E.G.A", expected: 41 },
    { word: "OMEGA 123", expected: 41 },
    { word: "  OMEGA  ", expected: 41 },
    
    // Edge cases
    { word: "", expected: 0 },
    { word: "123", expected: 0 },
    { word: "...", expected: 0 },
  ];

  for (const test of tests) {
    const result = computeGematria(test.word);
    if (result !== test.expected) {
      console.error(`FAIL: computeGematria("${test.word}")`);
      console.error(`  Expected: ${test.expected}`);
      console.error(`  Got: ${result}`);
      return false;
    }
  }

  // Test déterminisme
  const baseline = computeGematria("MYCELIUM");
  for (let i = 0; i < 100; i++) {
    if (computeGematria("MYCELIUM") !== baseline) {
      console.error("FAIL: Determinism test failed");
      return false;
    }
  }

  // Test branchWeight
  const bw = computeBranchWeight("Hello, World!");
  if (bw <= 0 || !Number.isFinite(bw)) {
    console.error("FAIL: computeBranchWeight returned invalid value:", bw);
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  compute: computeGematria,
  average: computeGematriaAverage,
  text: computeGematriaText,
  density: computeGematriaDensity,
  decompose: decomposeGematria,
  branchWeight: computeBranchWeight,
  thickness: computeThickness,
  selfTest,
  VALUES: GEMATRIA_VALUES
};
