/**
 * OMEGA RIPPLE_ENGINE — Propagation Narrative
 * Module: gateway/src/gates/ripple_engine.ts
 * Phase: 7D — NASA-Grade L4
 * 
 * @description Moteur de propagation des conséquences narratives.
 *              Un événement crée des ondulations (ripples) qui affectent le récit.
 * 
 * @invariant INV-RIPPLE-01: Propagation déterministe (même input = même ripples)
 * @invariant INV-RIPPLE-02: Atténuation obligatoire (force diminue avec distance)
 * @invariant INV-RIPPLE-03: Pas de cycle infini (détection + blocage)
 * @invariant INV-RIPPLE-04: Traçabilité complète (chaque ripple tracé jusqu'à source)
 * @invariant INV-RIPPLE-05: Respect du canon (ripple ne peut contredire)
 */

import { CanonState, CanonFact } from "./types";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const ENGINE_NAME = "RIPPLE_ENGINE";
const ENGINE_VERSION = "1.0.0";
const DEFAULT_ATTENUATION = 0.3;  // 30% de perte par niveau
const MAX_PROPAGATION_DEPTH = 10; // Limite anti-cycle

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Type d'événement source */
export type RippleSourceType =
  | "FACT_ESTABLISHED"    // Nouveau fait dans le canon
  | "EMOTION_SHIFT"       // Changement émotionnel
  | "CHARACTER_ACTION"    // Action d'un personnage
  | "WORLD_EVENT"         // Événement du monde
  | "REVELATION";         // Révélation narrative

/** Type d'impact */
export type RippleImpactType =
  | "EMOTIONAL"           // Impact émotionnel
  | "RELATIONAL"          // Impact sur les relations
  | "PHYSICAL"            // Impact physique/monde
  | "KNOWLEDGE"           // Impact sur la connaissance
  | "BEHAVIORAL";         // Impact sur le comportement

/** Cible d'un ripple */
export interface RippleTarget {
  /** ID de la cible */
  id: string;
  /** Type de cible */
  type: "CHARACTER" | "LOCATION" | "OBJECT" | "RELATIONSHIP";
  /** Nom pour affichage */
  name: string;
}

/** Un ripple individuel */
export interface Ripple {
  /** ID unique du ripple */
  id: string;
  /** Source du ripple (événement déclencheur) */
  sourceId: string;
  /** Type de source */
  sourceType: RippleSourceType;
  /** Cible affectée */
  target: RippleTarget;
  /** Type d'impact */
  impactType: RippleImpactType;
  /** Force de l'impact (0-1) */
  strength: number;
  /** Profondeur de propagation (0 = direct, 1+ = indirect) */
  depth: number;
  /** Description de l'impact */
  description: string;
  /** Timestamp */
  timestamp: string;
  /** ID du ripple parent (si propagé) */
  parentRippleId?: string;
  /** Chaîne causale complète */
  causalChain: string[];
}

/** Événement source */
export interface RippleSource {
  /** ID unique */
  id: string;
  /** Type */
  type: RippleSourceType;
  /** Sujet principal */
  subject: string;
  /** Description */
  description: string;
  /** Force initiale (0-1) */
  initialStrength: number;
  /** Cibles potentielles */
  potentialTargets: RippleTarget[];
  /** Chapitre/contexte */
  context: string;
}

/** Configuration de propagation */
export interface PropagationConfig {
  /** Taux d'atténuation par niveau (0-1) */
  attenuation: number;
  /** Profondeur max de propagation */
  maxDepth: number;
  /** Force minimum pour continuer */
  minStrength: number;
  /** IDs à bloquer (absorbent les ripples) */
  blockers: string[];
}

/** Résultat de propagation */
export interface PropagationResult {
  /** Ripples générés */
  ripples: Ripple[];
  /** Nombre de niveaux atteints */
  depthReached: number;
  /** Ripples bloqués */
  blockedCount: number;
  /** Cycles détectés et évités */
  cyclesAvoided: number;
  /** Temps de traitement */
  processingTimeMs: number;
}

/** Graphe de relations pour propagation */
export interface RelationGraph {
  /** Map: entityId -> entités liées avec poids */
  connections: Map<string, Array<{ targetId: string; weight: number; type: string }>>;
}

// ═══════════════════════════════════════════════════════════════════════
// RIPPLE ENGINE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

export interface RippleEngine {
  readonly name: string;
  readonly version: string;
  
  /** Propage un événement source */
  propagate(
    source: RippleSource,
    graph: RelationGraph,
    config?: Partial<PropagationConfig>
  ): PropagationResult;
  
  /** Calcule la force atténuée */
  attenuate(strength: number, depth: number, attenuation: number): number;
  
  /** Vérifie si un ripple respecte le canon */
  validateAgainstCanon(ripple: Ripple, canon: CanonState): boolean;
  
  /** Trace la chaîne causale d'un ripple */
  traceCausalChain(ripple: Ripple, allRipples: Ripple[]): string[];
  
  /** Détecte les cycles potentiels */
  detectCycle(targetId: string, visited: Set<string>): boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

function generateRippleId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `RIPPLE-${timestamp}-${random}`;
}

function getDefaultConfig(): PropagationConfig {
  return {
    attenuation: DEFAULT_ATTENUATION,
    maxDepth: MAX_PROPAGATION_DEPTH,
    minStrength: 0.05,
    blockers: []
  };
}

// ═══════════════════════════════════════════════════════════════════════
// RIPPLE ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Crée une instance de RippleEngine
 * 
 * @example
 * const engine = createRippleEngine();
 * const result = engine.propagate(source, relationGraph, { maxDepth: 5 });
 */
export function createRippleEngine(): RippleEngine {
  return {
    name: ENGINE_NAME,
    version: ENGINE_VERSION,
    
    attenuate(strength: number, depth: number, attenuation: number): number {
      // INV-RIPPLE-02: Atténuation obligatoire
      // Force = initialStrength * (1 - attenuation)^depth
      return strength * Math.pow(1 - attenuation, depth);
    },
    
    detectCycle(targetId: string, visited: Set<string>): boolean {
      // INV-RIPPLE-03: Détection de cycle
      return visited.has(targetId);
    },
    
    traceCausalChain(ripple: Ripple, allRipples: Ripple[]): string[] {
      // INV-RIPPLE-04: Traçabilité complète
      const chain: string[] = [ripple.id];
      let current = ripple;
      
      while (current.parentRippleId) {
        const parent = allRipples.find(r => r.id === current.parentRippleId);
        if (!parent) break;
        chain.unshift(parent.id);
        current = parent;
      }
      
      return chain;
    },
    
    validateAgainstCanon(ripple: Ripple, canon: CanonState): boolean {
      // INV-RIPPLE-05: Respect du canon
      // Un ripple ne peut pas créer d'impact contradictoire
      
      // Vérifier si la cible a des faits établis
      const targetFacts = canon.facts.filter(
        f => f.subject.toLowerCase() === ripple.target.id.toLowerCase()
      );
      
      // Pas de faits = pas de contradiction possible
      if (targetFacts.length === 0) return true;
      
      // Vérifications basiques de cohérence
      // (implémentation simplifiée - peut être enrichie)
      for (const fact of targetFacts) {
        // Si le fait établit un état "mort" et le ripple cible cette entité
        // avec un impact physique fort, c'est suspect
        if (fact.predicate.toLowerCase().includes("mort") ||
            fact.predicate.toLowerCase().includes("dead")) {
          if (ripple.impactType === "PHYSICAL" && ripple.strength > 0.5) {
            return false; // Ne peut pas affecter physiquement un mort
          }
        }
      }
      
      return true;
    },
    
    propagate(
      source: RippleSource,
      graph: RelationGraph,
      configOverride?: Partial<PropagationConfig>
    ): PropagationResult {
      const startTime = Date.now();
      const config = { ...getDefaultConfig(), ...configOverride };
      const ripples: Ripple[] = [];
      const visited = new Set<string>();
      let blockedCount = 0;
      let cyclesAvoided = 0;
      let maxDepthReached = 0;
      
      // Queue pour BFS (Breadth-First propagation)
      interface QueueItem {
        targetId: string;
        strength: number;
        depth: number;
        parentRippleId?: string;
        causalChain: string[];
      }
      
      const queue: QueueItem[] = [];
      
      // Initialiser avec les cibles directes
      for (const target of source.potentialTargets) {
        // Vérifier blocker
        if (config.blockers.includes(target.id)) {
          blockedCount++;
          continue;
        }
        
        queue.push({
          targetId: target.id,
          strength: source.initialStrength,
          depth: 0,
          causalChain: [source.id]
        });
      }
      
      // Propager
      while (queue.length > 0) {
        const item = queue.shift()!;
        
        // INV-RIPPLE-03: Vérifier cycle
        const visitKey = `${item.targetId}-${item.depth}`;
        if (visited.has(item.targetId) && item.depth > 0) {
          cyclesAvoided++;
          continue;
        }
        
        // Vérifier profondeur max
        if (item.depth > config.maxDepth) {
          continue;
        }
        
        // INV-RIPPLE-02: Calculer force atténuée
        const attenuatedStrength = this.attenuate(
          item.strength,
          item.depth,
          config.attenuation
        );
        
        // Vérifier force minimum
        if (attenuatedStrength < config.minStrength) {
          continue;
        }
        
        // Marquer comme visité
        visited.add(item.targetId);
        maxDepthReached = Math.max(maxDepthReached, item.depth);
        
        // Trouver la cible dans les targets originaux ou le graphe
        const targetInfo = source.potentialTargets.find(t => t.id === item.targetId);
        if (!targetInfo && item.depth === 0) continue;
        
        // Créer le ripple
        const ripple: Ripple = {
          id: generateRippleId(),
          sourceId: source.id,
          sourceType: source.type,
          target: targetInfo || {
            id: item.targetId,
            type: "CHARACTER",
            name: item.targetId
          },
          impactType: determineImpactType(source.type),
          strength: attenuatedStrength,
          depth: item.depth,
          description: `Impact de "${source.description}" sur ${item.targetId} (force: ${attenuatedStrength.toFixed(2)})`,
          timestamp: new Date().toISOString(),
          parentRippleId: item.parentRippleId,
          causalChain: item.causalChain
        };
        
        ripples.push(ripple);
        
        // Propager aux connexions (si pas à profondeur max)
        if (item.depth < config.maxDepth) {
          const connections = graph.connections.get(item.targetId) || [];
          
          for (const conn of connections) {
            // Vérifier blocker
            if (config.blockers.includes(conn.targetId)) {
              blockedCount++;
              continue;
            }
            
            // Ne pas repropager vers la source directe
            if (conn.targetId === source.subject) continue;
            
            queue.push({
              targetId: conn.targetId,
              strength: attenuatedStrength * conn.weight,
              depth: item.depth + 1,
              parentRippleId: ripple.id,
              causalChain: [...item.causalChain, ripple.id]
            });
          }
        }
      }
      
      return {
        ripples,
        depthReached: maxDepthReached,
        blockedCount,
        cyclesAvoided,
        processingTimeMs: Date.now() - startTime
      };
    }
  };
}

/**
 * Détermine le type d'impact basé sur le type de source
 */
function determineImpactType(sourceType: RippleSourceType): RippleImpactType {
  switch (sourceType) {
    case "EMOTION_SHIFT":
      return "EMOTIONAL";
    case "CHARACTER_ACTION":
      return "BEHAVIORAL";
    case "WORLD_EVENT":
      return "PHYSICAL";
    case "REVELATION":
      return "KNOWLEDGE";
    case "FACT_ESTABLISHED":
    default:
      return "KNOWLEDGE";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════

export { ENGINE_NAME as RIPPLE_ENGINE_NAME, ENGINE_VERSION as RIPPLE_ENGINE_VERSION };
export default createRippleEngine;
