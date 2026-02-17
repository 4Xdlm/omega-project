/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — ROADMAP ART V2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: proofpack/roadmap-art-v2.ts
 * Sprint: 20.3
 * Invariant: ART-CERT-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Next-generation roadmap based on ART v1 results.
 * Identifies gaps, prioritizes improvements, defines next milestones.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RoadmapItem {
  readonly id: string;
  readonly priority: 'P0' | 'P1' | 'P2' | 'P3';
  readonly category: 'accuracy' | 'performance' | 'coverage' | 'innovation' | 'production';
  readonly title: string;
  readonly description: string;
  readonly estimated_sprints: number;
  readonly depends_on: readonly string[];
}

export interface RoadmapV2 {
  readonly version: '2.0';
  readonly generated_at: string;
  readonly art_v1_status: 'COMPLETED';
  readonly items: readonly RoadmapItem[];
  readonly phases: readonly RoadmapPhase[];
  readonly total_estimated_sprints: number;
}

export interface RoadmapPhase {
  readonly phase: string;
  readonly name: string;
  readonly items: readonly string[];
  readonly estimated_sprints: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROADMAP ITEMS
// ═══════════════════════════════════════════════════════════════════════════════

export const ROADMAP_V2_ITEMS: readonly RoadmapItem[] = [
  // P0 — Critical (immediate next)
  {
    id: 'ART2-001',
    priority: 'P0',
    category: 'accuracy',
    title: 'Live Benchmark avec lecteurs humains',
    description: 'Exécuter le protocole benchmark Sprint 17 avec 3+ lecteurs humains réels. Mesurer corrélation. Première validation objective.',
    estimated_sprints: 1,
    depends_on: [],
  },
  {
    id: 'ART2-002',
    priority: 'P0',
    category: 'accuracy',
    title: 'Calibration poids sur données réelles',
    description: 'Appliquer le weight-calibrator Sprint 18 sur les résultats du benchmark live. Ajuster poids axes si corrélation < 70%.',
    estimated_sprints: 1,
    depends_on: ['ART2-001'],
  },
  {
    id: 'ART2-003',
    priority: 'P0',
    category: 'production',
    title: 'Stress test LLM (20 runs concurrents)',
    description: 'Valider robustesse du pipeline avec 20 runs parallèles. Budget envelope, timeout handling, retry logic.',
    estimated_sprints: 1,
    depends_on: [],
  },

  // P1 — High (near-term)
  {
    id: 'ART2-004',
    priority: 'P1',
    category: 'accuracy',
    title: 'Cross-validation LLM vs CALC',
    description: 'Comparer scores LLM (interiority, impact, necessity, sensory_density) avec proxies CALC pour détecter biais systématique.',
    estimated_sprints: 2,
    depends_on: ['ART2-001'],
  },
  {
    id: 'ART2-005',
    priority: 'P1',
    category: 'coverage',
    title: 'Détection automatique genre',
    description: 'Classifier genre depuis la prose pour appliquer automatiquement les genre-thresholds Sprint 18.3.',
    estimated_sprints: 1,
    depends_on: [],
  },
  {
    id: 'ART2-006',
    priority: 'P1',
    category: 'accuracy',
    title: 'Activation physics_compliance',
    description: 'Après 20+ runs calibration, activer physics_compliance via gate Sprint 18.2. Target: level 2 (weight=0.7).',
    estimated_sprints: 1,
    depends_on: ['ART2-003'],
  },
  {
    id: 'ART2-007',
    priority: 'P1',
    category: 'innovation',
    title: 'Foreshadowing détection sémantique',
    description: 'Remplacer la détection par motif (naïve) par une analyse sémantique LLM des liens plant/resolve.',
    estimated_sprints: 2,
    depends_on: [],
  },

  // P2 — Medium (next quarter)
  {
    id: 'ART2-008',
    priority: 'P2',
    category: 'coverage',
    title: 'Multi-scene arc tracking',
    description: 'Étendre le temporal architect pour suivre les arcs narratifs sur plusieurs scènes/chapitres.',
    estimated_sprints: 3,
    depends_on: [],
  },
  {
    id: 'ART2-009',
    priority: 'P2',
    category: 'innovation',
    title: 'Style transfer benchmark',
    description: 'Mesurer M7 (AUTHOR_FINGERPRINT) : le style OMEGA est-il distinct de tout auteur humain connu ?',
    estimated_sprints: 2,
    depends_on: ['ART2-001'],
  },
  {
    id: 'ART2-010',
    priority: 'P2',
    category: 'performance',
    title: 'Semantic cache partagé',
    description: 'Cache LLM partagé entre runs pour réduire coût token de 78% à < 50%.',
    estimated_sprints: 2,
    depends_on: [],
  },

  // P3 — Long-term
  {
    id: 'ART2-011',
    priority: 'P3',
    category: 'innovation',
    title: 'Phonemizer intégration',
    description: 'Remplacer le cacophony detector CALC par un vrai phonemizer FR pour analyse phonétique complète.',
    estimated_sprints: 3,
    depends_on: [],
  },
  {
    id: 'ART2-012',
    priority: 'P3',
    category: 'coverage',
    title: 'Dialogue quality axis',
    description: 'Axe dédié à la qualité du dialogue (naturalité, sous-texte, différenciation voix personnages).',
    estimated_sprints: 2,
    depends_on: [],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PHASES
// ═══════════════════════════════════════════════════════════════════════════════

export const ROADMAP_V2_PHASES: readonly RoadmapPhase[] = [
  {
    phase: 'A',
    name: 'Validation & Production Hardening',
    items: ['ART2-001', 'ART2-002', 'ART2-003'],
    estimated_sprints: 3,
  },
  {
    phase: 'B',
    name: 'Accuracy & Coverage',
    items: ['ART2-004', 'ART2-005', 'ART2-006', 'ART2-007'],
    estimated_sprints: 6,
  },
  {
    phase: 'C',
    name: 'Advanced Features',
    items: ['ART2-008', 'ART2-009', 'ART2-010'],
    estimated_sprints: 7,
  },
  {
    phase: 'D',
    name: 'Long-term Innovation',
    items: ['ART2-011', 'ART2-012'],
    estimated_sprints: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Roadmap ART v2.
 */
export function generateRoadmapV2(): RoadmapV2 {
  const totalSprints = ROADMAP_V2_PHASES.reduce((s, p) => s + p.estimated_sprints, 0);

  return {
    version: '2.0',
    generated_at: new Date().toISOString(),
    art_v1_status: 'COMPLETED',
    items: ROADMAP_V2_ITEMS,
    phases: ROADMAP_V2_PHASES,
    total_estimated_sprints: totalSprints,
  };
}
