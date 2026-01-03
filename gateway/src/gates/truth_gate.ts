/**
 * OMEGA TRUTH_GATE — Barrière de Vérité
 * Module: gateway/src/gates/truth_gate.ts
 * Phase: 7A — NASA-Grade L4
 * 
 * @description Gate qui refuse toute incohérence narrative.
 *              Un bon gate dit NON souvent.
 * 
 * @invariant INV-TRUTH-01: Contradiction détectée = FAIL obligatoire
 * @invariant INV-TRUTH-02: Causalité stricte (effet sans cause = FAIL)
 * @invariant INV-TRUTH-03: Référence inconnue = FAIL en mode strict
 * @invariant INV-TRUTH-04: Verdict déterministe (même input = même output)
 */

import {
  TruthGate,
  TruthGateInput,
  TruthGateOutput,
  GateVerdict,
  Violation,
  ViolationType,
  CanonFact,
  CanonState,
  FactType
} from "./types";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const GATE_NAME = "TRUTH_GATE";
const GATE_VERSION = "1.0.0";
const DEFAULT_SEVERITY_THRESHOLD = 7;

// ═══════════════════════════════════════════════════════════════════════
// VIOLATION DETECTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Détecte les contradictions avec le canon établi
 * INV-TRUTH-01: Toute contradiction = violation
 */
function detectContradictions(
  text: string,
  canon: CanonState
): Violation[] {
  const violations: Violation[] = [];
  
  for (const fact of canon.facts) {
    // Recherche de négation directe du fait
    const negationPatterns = [
      `${fact.subject} n'est pas ${fact.predicate}`,
      `${fact.subject} n'a pas ${fact.predicate}`,
      `${fact.subject} ne ${fact.predicate} pas`,
      `${fact.subject} wasn't ${fact.predicate}`,
      `${fact.subject} isn't ${fact.predicate}`,
      `${fact.subject} never ${fact.predicate}`,
    ];
    
    const textLower = text.toLowerCase();
    const subjectLower = fact.subject.toLowerCase();
    const predicateLower = fact.predicate.toLowerCase();
    
    for (const pattern of negationPatterns) {
      if (textLower.includes(pattern.toLowerCase())) {
        violations.push({
          type: "CONTRADICTION",
          severity: 10, // Contradiction = toujours bloquant
          description: `Contradiction directe avec fait établi: "${fact.subject} ${fact.predicate}"`,
          source: text.substring(0, 100),
          target: fact.id,
          suggestion: `Respecter le fait établi au chapitre ${fact.establishedAt}`
        });
      }
    }
    
    // Détection de contradiction implicite (même sujet, prédicat incompatible)
    if (textLower.includes(subjectLower)) {
      // Pattern: "X est Y" quand canon dit "X est Z" (et Y ≠ Z)
      const statePattern = new RegExp(
        `${subjectLower}\\s+(est|is|was|était)\\s+(\\w+)`,
        "i"
      );
      const match = textLower.match(statePattern);
      if (match && fact.type === "STATE") {
        const newState = match[2].toLowerCase();
        if (newState !== predicateLower && !predicateLower.includes(newState)) {
          violations.push({
            type: "CONTRADICTION",
            severity: 9,
            description: `État contradictoire: "${fact.subject}" est "${newState}" mais canon dit "${fact.predicate}"`,
            source: match[0],
            target: fact.id,
            suggestion: `Vérifier la cohérence avec l'état établi`
          });
        }
      }
    }
  }
  
  return violations;
}

/**
 * Détecte les ruptures de causalité
 * INV-TRUTH-02: Effet sans cause = FAIL
 */
function detectCausalityBreaks(
  text: string,
  canon: CanonState
): Violation[] {
  const violations: Violation[] = [];
  
  // Patterns d'effets qui nécessitent une cause
  const effectPatterns = [
    { pattern: /soudain(ement)?/gi, requires: "événement déclencheur" },
    { pattern: /miraculeusement/gi, requires: "explication" },
    { pattern: /sans raison/gi, requires: "justification narrative" },
    { pattern: /somehow/gi, requires: "explanation" },
    { pattern: /magically/gi, requires: "established magic system" },
    { pattern: /inexplicablement/gi, requires: "cause établie" },
  ];
  
  for (const { pattern, requires } of effectPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push({
        type: "CAUSALITY_BREAK",
        severity: 6,
        description: `Effet potentiel sans cause: "${matches[0]}" nécessite ${requires}`,
        source: matches[0],
        suggestion: `Établir une cause avant cet effet ou reformuler`
      });
    }
  }
  
  // Détection Deus Ex Machina
  const deusPatterns = [
    /juste à temps/gi,
    /par chance/gi,
    /heureusement/gi,
    /just in time/gi,
    /luckily/gi,
    /fortunately/gi,
    /contre toute attente/gi,
  ];
  
  for (const pattern of deusPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push({
        type: "DEUS_EX_MACHINA",
        severity: 7,
        description: `Potentiel Deus Ex Machina détecté: "${matches[0]}"`,
        source: matches[0],
        suggestion: `Préparer cet événement plus tôt dans le récit (foreshadowing)`
      });
    }
  }
  
  return violations;
}

/**
 * Détecte les références à des éléments non établis
 * INV-TRUTH-03: Référence inconnue = FAIL en mode strict
 */
function detectUnknownReferences(
  text: string,
  canon: CanonState,
  strictMode: boolean
): Violation[] {
  const violations: Violation[] = [];
  
  // Extraire les noms propres du texte (simplification)
  const properNouns = text.match(/[A-Z][a-zàâäéèêëïîôùûüÿœæç]+/g) || [];
  const uniqueNouns = Array.from(new Set(properNouns));
  
  // Mots à ignorer (articles, débuts de phrase communs)
  const ignoreList = [
    "Le", "La", "Les", "Un", "Une", "Des", "Il", "Elle", "Ils", "Elles",
    "The", "A", "An", "He", "She", "They", "It", "This", "That",
    "Mais", "Donc", "Or", "Ni", "Car", "Puis", "Alors", "Quand"
  ];
  
  const knownSubjects = canon.facts.map(f => f.subject.toLowerCase());
  
  for (const noun of uniqueNouns) {
    if (ignoreList.includes(noun)) continue;
    
    const nounLower = noun.toLowerCase();
    const isKnown = knownSubjects.some(s => 
      s.includes(nounLower) || nounLower.includes(s)
    );
    
    if (!isKnown && strictMode) {
      violations.push({
        type: "UNKNOWN_REFERENCE",
        severity: 5,
        description: `Référence non établie dans le canon: "${noun}"`,
        source: noun,
        suggestion: `Établir "${noun}" avant de l'utiliser ou vérifier l'orthographe`
      });
    }
  }
  
  return violations;
}

// ═══════════════════════════════════════════════════════════════════════
// FACT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extrait les nouveaux faits du texte (si validation OK)
 */
function extractFacts(
  text: string,
  existingCanon: CanonState
): CanonFact[] {
  const facts: CanonFact[] = [];
  const timestamp = new Date().toISOString();
  
  // Pattern: "X est Y" / "X is Y" (état)
  const statePatterns = [
    /([A-Z][a-zàâäéèêëïîôùûüÿœæç]+)\s+(est|était)\s+(\w+)/g,
    /([A-Z][a-z]+)\s+(is|was)\s+(\w+)/g,
  ];
  
  for (const pattern of statePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [_, subject, verb, predicate] = match;
      
      // Vérifier si ce fait n'existe pas déjà
      const exists = existingCanon.facts.some(
        f => f.subject.toLowerCase() === subject.toLowerCase() &&
             f.predicate.toLowerCase() === predicate.toLowerCase()
      );
      
      if (!exists) {
        facts.push({
          id: `FACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "STATE",
          subject,
          predicate,
          establishedAt: "current",
          establishedTimestamp: timestamp,
          confidence: 0.8,
          proofHash: simpleHash(`${subject}:${predicate}:${timestamp}`)
        });
      }
    }
  }
  
  return facts;
}

/**
 * Hash simple pour preuve (à remplacer par SHA256 en production)
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

// ═══════════════════════════════════════════════════════════════════════
// TRUTH GATE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Crée une instance de TruthGate
 * 
 * @example
 * const gate = createTruthGate();
 * const result = await gate.execute(input);
 * if (result.verdict.status === "FAIL") {
 *   console.error("Vérité violée:", result.verdict.violations);
 * }
 */
export function createTruthGate(): TruthGate {
  return {
    name: GATE_NAME,
    version: GATE_VERSION,
    
    validate(input: TruthGateInput): boolean {
      if (!input.text || typeof input.text !== "string") return false;
      if (!input.canon || !Array.isArray(input.canon.facts)) return false;
      if (typeof input.strictMode !== "boolean") return false;
      return true;
    },
    
    async execute(input: TruthGateInput): Promise<TruthGateOutput> {
      const startTime = Date.now();
      const threshold = input.severityThreshold ?? DEFAULT_SEVERITY_THRESHOLD;
      
      // Collecter toutes les violations
      const violations: Violation[] = [
        ...detectContradictions(input.text, input.canon),
        ...detectCausalityBreaks(input.text, input.canon),
        ...detectUnknownReferences(input.text, input.canon, input.strictMode),
      ];
      
      // Calculer le verdict
      const maxSeverity = violations.length > 0
        ? Math.max(...violations.map(v => v.severity))
        : 0;
      
      const hasBlockingViolation = violations.some(v => v.severity >= threshold);
      const hasContradiction = violations.some(v => v.type === "CONTRADICTION");
      
      // INV-TRUTH-01: Contradiction = TOUJOURS FAIL
      const status = hasContradiction || hasBlockingViolation
        ? "FAIL"
        : violations.length > 0
          ? "WARN"
          : "PASS";
      
      const verdict: GateVerdict = {
        status,
        gate: GATE_NAME,
        reason: status === "PASS"
          ? "Aucune violation détectée"
          : status === "WARN"
            ? `${violations.length} violation(s) mineure(s) détectée(s)`
            : `${violations.length} violation(s) bloquante(s) - sévérité max: ${maxSeverity}`,
        timestamp: new Date().toISOString(),
        violations,
        details: {
          totalViolations: violations.length,
          maxSeverity,
          threshold,
          strictMode: input.strictMode
        }
      };
      
      // Extraire les faits seulement si PASS ou WARN
      const extractedFacts = status !== "FAIL"
        ? extractFacts(input.text, input.canon)
        : [];
      
      // Mettre à jour le canon si nouveaux faits
      let updatedCanon: CanonState | undefined;
      if (extractedFacts.length > 0 && status === "PASS") {
        updatedCanon = {
          ...input.canon,
          version: incrementVersion(input.canon.version),
          facts: [...input.canon.facts, ...extractedFacts],
          lastUpdated: new Date().toISOString(),
          rootHash: computeCanonHash([...input.canon.facts, ...extractedFacts])
        };
      }
      
      return {
        verdict,
        extractedFacts,
        updatedCanon,
        processingTimeMs: Date.now() - startTime
      };
    }
  };
}

/**
 * Incrémente la version du canon (patch)
 */
function incrementVersion(version: string): string {
  const parts = version.split(".").map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join(".");
}

/**
 * Calcule le hash Merkle du canon
 */
function computeCanonHash(facts: CanonFact[]): string {
  const sorted = [...facts].sort((a, b) => a.id.localeCompare(b.id));
  const concat = sorted.map(f => f.proofHash).join("");
  return simpleHash(concat);
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

export { GATE_NAME, GATE_VERSION };
export default createTruthGate;

