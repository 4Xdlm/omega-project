/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: loom-config.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4
 * Phase: R1 — Loom v1 Minimal
 *
 * Toggle principal : OMEGA_LOOM_ENABLED (ON par défaut depuis P4 bench PASS)
 *
 * INV-LOOM-01 : Loom OFF = pipeline identique bit-à-bit.
 *               Forcer OFF: OMEGA_LOOM_ENABLED=0
 *
 * P4 bench API : composite +1.12, ECC +6.34, 0 crash, 0 overhead.
 * Activation validée 2026-04-05.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface LoomConfig {
  /** Master toggle. ON par défaut (P4 validated). OMEGA_LOOM_ENABLED=0 to disable. */
  readonly ENABLED: boolean;

  /** Chemin de la DB ChromaDB (mode fichier local). */
  readonly DB_PATH: string;

  /** Identifiant du backend actif. Utilise LoomBackendId de loom-types. */
  readonly BACKEND: import('./loom-types.js').LoomBackendId;

  /** Nombre de scènes proches à récupérer (retrieval top-K). */
  readonly RETRIEVAL_TOP_K: number;

  /** Modèle d'embedding actif. */
  readonly EMBEDDING_MODEL: 'bag-of-words-v1' | 'onnx-v2-future';

  /** Seuil de similarité minimum pour inclure une scène dans le contexte. */
  readonly SIMILARITY_THRESHOLD: number;

  /** Nombre maximal de threads retournés par le reader. */
  readonly MAX_THREADS: number;

  /** Nombre maximal de motifs retournés par le reader. */
  readonly MAX_MOTIFS: number;

  /** Active l'extraction LLM secondaire dans le writer (true par défaut). */
  readonly EXTRACTION_ENABLED: boolean;

  /** LoomCoherence scoring — INTERDIT en v1. */
  readonly COHERENCE_SCORING_ENABLED: false;
}

/**
 * Configuration Loom résolue depuis les variables d'environnement.
 *
 * Variables :
 *   OMEGA_LOOM_ENABLED=0          → désactive le Loom (défaut: ON)
 *   OMEGA_LOOM_DB_PATH=./data/loom → chemin DB (défaut: ./data/loom)
 *   OMEGA_LOOM_TOP_K=5            → top-K retrieval (défaut: 5)
 *   OMEGA_LOOM_EXTRACTION=0       → désactive extraction LLM (défaut: 1)
 */
export function resolveLoomConfig(): LoomConfig {
  return {
    ENABLED: process.env.OMEGA_LOOM_ENABLED !== '0',
    DB_PATH: process.env.OMEGA_LOOM_DB_PATH || './data/loom',
    BACKEND: (process.env.OMEGA_LOOM_BACKEND as import('./loom-types.js').LoomBackendId) || 'jsonfile-v1',
    RETRIEVAL_TOP_K: parseInt(process.env.OMEGA_LOOM_TOP_K || '5', 10),
    EMBEDDING_MODEL: 'bag-of-words-v1',
    SIMILARITY_THRESHOLD: 0.3,
    MAX_THREADS: 10,
    MAX_MOTIFS: 5,
    EXTRACTION_ENABLED: process.env.OMEGA_LOOM_EXTRACTION !== '0',
    COHERENCE_SCORING_ENABLED: false,
  };
}

/** Singleton config — résolu une seule fois au démarrage. */
let _config: LoomConfig | null = null;

export function getLoomConfig(): LoomConfig {
  if (!_config) {
    _config = resolveLoomConfig();
  }
  return _config;
}

/** Reset config (pour tests uniquement). */
export function resetLoomConfig(): void {
  _config = null;
}
