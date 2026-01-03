// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA OBSERVABILITY — TYPES
// packages/omega-observability/src/types.ts
// Version: 1.0.0
// API STABILITY: FROZEN — Ne pas modifier après certification
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phases du pipeline OMEGA
 * Ordre garanti: init → read → segment → analyze → dna → aggregate → write → done
 */
export type ProgressPhase =
  | "init"      // Initialisation pipeline
  | "read"      // Lecture fichier (bytes)
  | "segment"   // Segmentation (segments produits)
  | "analyze"   // Analyse émotionnelle (segments traités)
  | "dna"       // Build DNA par segment
  | "aggregate" // Merkle + weighted average
  | "write"     // Écriture output
  | "done";     // Pipeline terminé

/**
 * Événement de progression
 * READONLY — Ne jamais muter cet objet
 * 
 * IMPORTANT: Ces données ne sont JAMAIS incluses dans les calculs de hash.
 * Le progress est un side-channel read-only.
 */
export interface ProgressEvent {
  /** Phase courante */
  readonly phase: ProgressPhase;
  
  /** Unités traitées (bytes, segments, fichiers) */
  readonly current: number;
  
  /** Total si connu (undefined si streaming sans taille connue) */
  readonly total?: number;
  
  /** Pourcentage [0-100] si total connu */
  readonly percent?: number;
  
  /** Temps écoulé depuis début pipeline (monotone, ms) */
  readonly elapsed_ms: number;
  
  /** Estimation temps restant (optionnel, ms) */
  readonly eta_ms?: number;
  
  /** Message humain optionnel */
  readonly message?: string;
  
  /** Fichier courant (mode batch) */
  readonly file?: string;
  
  /** Index du fichier courant (mode batch, 0-based) */
  readonly file_index?: number;
  
  /** Nombre total de fichiers (mode batch) */
  readonly files_total?: number;
  
  /** Métadonnées additionnelles (non hashées, read-only) */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Callback de progression
 * 
 * IMPORTANT: 
 * - Ne jamais faire await sur ce callback (fire-and-forget)
 * - Ne jamais muter l'event reçu (Readonly<T>)
 * - Exceptions sont silencieusement ignorées (pipeline ne crash pas)
 */
export type ProgressCallback = (event: Readonly<ProgressEvent>) => void;

/**
 * Format de sortie pour le progress
 */
export type ProgressFormat = "cli" | "jsonl" | "none";

/**
 * Options de configuration progress
 */
export interface ProgressOptions {
  /** Active/désactive le progress (default: false) */
  enabled: boolean;
  
  /** Format de sortie (default: "none") */
  format: ProgressFormat;
  
  /** Throttle minimum entre events en ms (default: 100) */
  throttle_ms: number;
  
  /** Callback custom (appelé en plus du format) */
  callback?: ProgressCallback;
  
  /** Stream de sortie (default: process.stderr pour cli, process.stdout pour jsonl) */
  output?: NodeJS.WritableStream;
  
  /** Afficher ETA (default: true) */
  show_eta: boolean;
  
  /** Afficher rate bytes/s (default: true) */
  show_rate: boolean;
}

/**
 * Options par défaut — READ-ONLY
 */
export const DEFAULT_PROGRESS_OPTIONS: Readonly<ProgressOptions> = Object.freeze({
  enabled: false,
  format: "none" as ProgressFormat,
  throttle_ms: 100,
  show_eta: true,
  show_rate: true,
});

/**
 * Statistiques finales du pipeline (incluses dans event "done")
 */
export interface PipelineStats {
  /** Durée totale en ms */
  readonly duration_ms: number;
  
  /** Nombre de segments traités */
  readonly segments_count: number;
  
  /** Taille input en bytes */
  readonly input_bytes: number;
  
  /** Taille output en bytes */
  readonly output_bytes: number;
  
  /** Vitesse de traitement (segments/s) */
  readonly throughput_segments_per_sec: number;
  
  /** Vitesse de traitement (bytes/s) */
  readonly throughput_bytes_per_sec: number;
  
  /** Mode streaming utilisé */
  readonly streaming_mode: boolean;
  
  /** Chunk size si streaming */
  readonly chunk_size?: number;
  
  /** Root hash final (pour vérification) */
  readonly root_hash: string;
}

/**
 * Phases valides pour validation
 */
export const VALID_PHASES: ReadonlySet<ProgressPhase> = new Set([
  "init", "read", "segment", "analyze", "dna", "aggregate", "write", "done"
]);

/**
 * Vérifie si une phase est valide
 */
export function isValidPhase(phase: string): phase is ProgressPhase {
  return VALID_PHASES.has(phase as ProgressPhase);
}
