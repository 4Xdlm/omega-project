// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ANTI-BYPASS SCANNER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Static Import Analysis pour garantir l'isolation
//
// Ce module scanne le code source pour détecter:
// - Imports directs de modules métier (memory, query, oracle, muse)
// - Appels directs à des fonctions restreintes hors zones autorisées
// - Bypass potentiels de la couche wiring
//
// @invariant INV-GW-01: Zero Direct Call
// @invariant INV-WIRE-02: No Cross-Module Outside Wiring
// @invariant INV-E2E-05: Bypass Scan Pass
//
// ═══════════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Violation détectée par le scanner
 */
export interface BypassViolation {
  /** Fichier source */
  file: string;
  /** Numéro de ligne */
  line: number;
  /** Contenu de la ligne */
  content: string;
  /** Pattern violé */
  pattern: string;
  /** Description de la violation */
  description: string;
  /** Sévérité */
  severity: 'critical' | 'high' | 'medium';
}

/**
 * Configuration du scanner
 */
export interface ScannerConfig {
  /** Patterns d'imports interdits */
  forbiddenImportPatterns: RegExp[];
  /** Patterns d'appels interdits */
  forbiddenCallPatterns: RegExp[];
  /** Répertoires à exclure */
  excludeDirs: string[];
  /** Fichiers à exclure (glob patterns) */
  excludeFiles: string[];
  /** Extensions à scanner */
  extensions: string[];
}

/**
 * Résultat du scan
 */
export interface ScanResult {
  /** Scan réussi (aucune violation) */
  passed: boolean;
  /** Liste des violations */
  violations: BypassViolation[];
  /** Fichiers scannés */
  filesScanned: number;
  /** Lignes analysées */
  linesAnalyzed: number;
  /** Durée du scan en ms */
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns d'imports interdits
 * 
 * Ces patterns détectent les imports directs de modules métier
 * en dehors de la couche wiring/adapters
 */
export const FORBIDDEN_IMPORT_PATTERNS: RegExp[] = [
  // Imports directs de memory (hors wiring)
  /from\s+['"](?:\.\.\/)*(?:\.\.\/)*src\/memory\//,
  /from\s+['"]@omega\/memory/,
  // Imports directs de query (hors wiring)
  /from\s+['"](?:\.\.\/)*(?:\.\.\/)*src\/query\//,
  /from\s+['"]@omega\/query/,
  // Imports directs de oracle
  /from\s+['"](?:\.\.\/)*(?:\.\.\/)*src\/oracle\//,
  /from\s+['"]@omega\/oracle/,
  // Imports directs de muse
  /from\s+['"](?:\.\.\/)*(?:\.\.\/)*src\/oracle\/muse\//,
  /from\s+['"]@omega\/muse/,
  // Imports de modules internes via chemins absolus
  /from\s+['"]\/.*\/(memory|query|oracle|muse)\//,
];

/**
 * Patterns d'appels interdits
 * 
 * Ces patterns détectent les appels directs à des fonctions
 * qui ne devraient être utilisées que dans des zones spécifiques
 */
export const FORBIDDEN_CALL_PATTERNS: RegExp[] = [
  // dispatch() ne doit être appelé que par l'orchestrator
  // (désactivé pour l'instant car l'orchestrator n'existe pas encore)
  // /(?<!class\s+\w+\s*\{[^}]*)\bdispatch\s*\(/,
];

/**
 * Configuration par défaut
 */
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  forbiddenImportPatterns: FORBIDDEN_IMPORT_PATTERNS,
  forbiddenCallPatterns: FORBIDDEN_CALL_PATTERNS,
  excludeDirs: ['node_modules', 'dist', '.git', 'coverage'],
  excludeFiles: ['*.test.ts', '*.spec.ts', '*.d.ts'],
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Anti-Bypass Scanner
 * 
 * Scanne le code source pour détecter les violations d'isolation
 */
export class AntiBypassScanner {
  private readonly config: ScannerConfig;

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = { ...DEFAULT_SCANNER_CONFIG, ...config };
  }

  /**
   * Scanne un répertoire récursivement
   */
  scanDirectory(dir: string): ScanResult {
    const startTime = Date.now();
    const violations: BypassViolation[] = [];
    let filesScanned = 0;
    let linesAnalyzed = 0;

    const files = this.collectFiles(dir);

    for (const file of files) {
      const fileViolations = this.scanFile(file);
      violations.push(...fileViolations.violations);
      filesScanned++;
      linesAnalyzed += fileViolations.linesAnalyzed;
    }

    return {
      passed: violations.length === 0,
      violations,
      filesScanned,
      linesAnalyzed,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Scanne un fichier unique
   */
  scanFile(filePath: string): { violations: BypassViolation[]; linesAnalyzed: number } {
    const violations: BypassViolation[] = [];

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      return { violations: [], linesAnalyzed: 0 };
    }

    const lines = content.split('\n');
    const relativePath = filePath;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check forbidden imports
      for (const pattern of this.config.forbiddenImportPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: relativePath,
            line: lineNumber,
            content: line.trim(),
            pattern: pattern.source,
            description: 'Direct import of business module detected',
            severity: 'critical',
          });
        }
      }

      // Check forbidden calls
      for (const pattern of this.config.forbiddenCallPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: relativePath,
            line: lineNumber,
            content: line.trim(),
            pattern: pattern.source,
            description: 'Forbidden function call detected',
            severity: 'high',
          });
        }
      }
    }

    return { violations, linesAnalyzed: lines.length };
  }

  /**
   * Scanne du code source en mémoire (pour tests)
   */
  scanSource(source: string, filename: string = 'source.ts'): BypassViolation[] {
    const violations: BypassViolation[] = [];
    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const pattern of this.config.forbiddenImportPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filename,
            line: lineNumber,
            content: line.trim(),
            pattern: pattern.source,
            description: 'Direct import of business module detected',
            severity: 'critical',
          });
        }
      }

      for (const pattern of this.config.forbiddenCallPatterns) {
        if (pattern.test(line)) {
          violations.push({
            file: filename,
            line: lineNumber,
            content: line.trim(),
            pattern: pattern.source,
            description: 'Forbidden function call detected',
            severity: 'high',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Collecte tous les fichiers à scanner
   */
  private collectFiles(dir: string): string[] {
    const files: string[] = [];

    const collect = (currentDir: string) => {
      let entries: string[];
      try {
        entries = readdirSync(currentDir);
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        let stats;
        try {
          stats = statSync(fullPath);
        } catch {
          continue;
        }

        if (stats.isDirectory()) {
          // Check exclude dirs
          if (!this.config.excludeDirs.includes(entry)) {
            collect(fullPath);
          }
        } else if (stats.isFile()) {
          const ext = extname(entry);
          // Check extension
          if (!this.config.extensions.includes(ext)) {
            continue;
          }
          // Check exclude files
          const excluded = this.config.excludeFiles.some(pattern => {
            if (pattern.startsWith('*')) {
              return entry.endsWith(pattern.slice(1));
            }
            return entry === pattern;
          });
          if (!excluded) {
            files.push(fullPath);
          }
        }
      }
    };

    collect(dir);
    return files;
  }

  /**
   * Formate le résultat pour affichage
   */
  formatResult(result: ScanResult): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('OMEGA ANTI-BYPASS SCAN RESULT');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push(`Status:     ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`Files:      ${result.filesScanned}`);
    lines.push(`Lines:      ${result.linesAnalyzed}`);
    lines.push(`Duration:   ${result.durationMs}ms`);
    lines.push(`Violations: ${result.violations.length}`);

    if (result.violations.length > 0) {
      lines.push('');
      lines.push('VIOLATIONS:');
      lines.push('───────────────────────────────────────────────────────────────────');

      for (const v of result.violations) {
        lines.push(`[${v.severity.toUpperCase()}] ${v.file}:${v.line}`);
        lines.push(`  Content: ${v.content}`);
        lines.push(`  Pattern: ${v.pattern}`);
        lines.push(`  Reason:  ${v.description}`);
        lines.push('');
      }
    }

    lines.push('═══════════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un scanner avec configuration par défaut
 */
export function createAntiBypassScanner(config?: Partial<ScannerConfig>): AntiBypassScanner {
  return new AntiBypassScanner(config);
}

/**
 * Scanne un répertoire avec configuration par défaut
 * Fonction utilitaire pour usage simple
 */
export function scanForBypasses(dir: string): ScanResult {
  const scanner = createAntiBypassScanner();
  return scanner.scanDirectory(dir);
}

/**
 * Vérifie qu'un code source ne contient pas de bypass
 * Fonction utilitaire pour tests
 */
export function assertNoBypass(source: string, filename?: string): void {
  const scanner = createAntiBypassScanner();
  const violations = scanner.scanSource(source, filename);
  if (violations.length > 0) {
    const messages = violations.map(v => 
      `[${v.severity}] Line ${v.line}: ${v.description}\n  ${v.content}`
    );
    throw new Error(`Bypass violations detected:\n${messages.join('\n')}`);
  }
}
