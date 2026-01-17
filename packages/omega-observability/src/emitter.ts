// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA OBSERVABILITY — PROGRESS EMITTER
// packages/omega-observability/src/emitter.ts
// Version: 1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  ProgressPhase,
  ProgressEvent,
  ProgressCallback,
  ProgressOptions,
  PipelineStats,
} from "./types.js";
import { DEFAULT_PROGRESS_OPTIONS, isValidPhase } from "./types.js";
import { formatCli, formatJsonl, formatDoneSummary } from "./formatters.js";

/**
 * ProgressEmitter — Émetteur d'événements de progression
 * 
 * GARANTIES FONDAMENTALES:
 * - Thread-safe (single-threaded Node.js)
 * - Zero overhead si disabled (fast path)
 * - Fire-and-forget (pas de await, pas de blocage)
 * - Throttled (évite le spam d'événements)
 * - Readonly events (immutabilité garantie)
 * - Callback errors ignorés (pipeline ne crash jamais)
 * 
 * INVARIANT CRITIQUE:
 * - AUCUNE donnée de cet emitter n'entre dans les calculs de hash
 * - Le pipeline produit le même rootHash avec ou sans progress
 */
export class ProgressEmitter {
  private readonly options: Readonly<ProgressOptions>;
  private readonly startTime: number;
  private readonly lastEmitTime: Map<ProgressPhase, number> = new Map();
  private lastEmittedEvent: Readonly<ProgressEvent> | null = null;
  private eventCount = 0;
  
  /**
   * Crée un nouvel emitter avec les options spécifiées
   * 
   * @param options - Options partielles (fusionnées avec défauts)
   */
  constructor(options: Partial<ProgressOptions> = {}) {
    this.options = Object.freeze({
      ...DEFAULT_PROGRESS_OPTIONS,
      ...options,
    });
    
    // Start time pour elapsed_ms
    // NOTE: Utilisé UNIQUEMENT pour affichage, JAMAIS pour hash
    this.startTime = Date.now();
  }
  
  /**
   * Émet un événement de progression
   * 
   * IMPORTANT:
   * - Cette méthode est fire-and-forget
   * - Ne bloque JAMAIS le pipeline
   * - Exceptions dans callback sont ignorées
   * 
   * @param phase - Phase courante du pipeline
   * @param current - Unités traitées (bytes, segments, etc.)
   * @param total - Total si connu (undefined sinon)
   * @param extra - Propriétés additionnelles optionnelles
   */
  emit(
    phase: ProgressPhase,
    current: number,
    total?: number,
    extra?: Partial<Omit<ProgressEvent, "phase" | "current" | "total" | "elapsed_ms" | "percent" | "eta_ms">>
  ): void {
    // ══════════════════════════════════════════════════════════════════════
    // FAST PATH: Si disabled, retour immédiat (ZERO overhead)
    // ══════════════════════════════════════════════════════════════════════
    if (!this.options.enabled) {
      return;
    }
    
    // Validation phase (dev safety)
    if (!isValidPhase(phase)) {
      return;
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // THROTTLE CHECK: Évite le spam (sauf pour "done")
    // ══════════════════════════════════════════════════════════════════════
    const now = Date.now();
    const lastEmit = this.lastEmitTime.get(phase) ?? 0;
    
    if (phase !== "done" && phase !== "init" && now - lastEmit < this.options.throttle_ms) {
      return;
    }
    
    this.lastEmitTime.set(phase, now);
    
    // ══════════════════════════════════════════════════════════════════════
    // BUILD EVENT: Calcul des valeurs dérivées
    // ══════════════════════════════════════════════════════════════════════
    const elapsed_ms = now - this.startTime;
    
    // Calcul du pourcentage
    const percent = (total !== undefined && total > 0)
      ? Math.min(100, Math.round((current / total) * 100))
      : undefined;
    
    // Calcul de l'ETA (estimation temps restant)
    let eta_ms: number | undefined;
    if (this.options.show_eta && percent !== undefined && percent > 0 && percent < 100) {
      // ETA = (elapsed / percent) * remaining_percent
      const estimatedTotal = (elapsed_ms / percent) * 100;
      eta_ms = Math.max(0, Math.round(estimatedTotal - elapsed_ms));
    }
    
    // Construction de l'événement (FROZEN = immutable)
    const event: Readonly<ProgressEvent> = Object.freeze({
      phase,
      current,
      ...(total !== undefined && { total }),
      ...(percent !== undefined && { percent }),
      elapsed_ms,
      ...(eta_ms !== undefined && { eta_ms }),
      ...extra,
    });
    
    this.lastEmittedEvent = event;
    this.eventCount++;
    
    // ══════════════════════════════════════════════════════════════════════
    // OUTPUT: Formatage et écriture (synchrone mais non-bloquant)
    // ══════════════════════════════════════════════════════════════════════
    this.output(event);
    
    // ══════════════════════════════════════════════════════════════════════
    // CUSTOM CALLBACK: Fire-and-forget via queueMicrotask
    // ══════════════════════════════════════════════════════════════════════
    if (this.options.callback) {
      const cb = this.options.callback;
      queueMicrotask(() => {
        try {
          cb(event);
        } catch {
          // Silently ignore callback errors
          // INVARIANT: Pipeline never crashes due to progress callback
        }
      });
    }
  }
  
  /**
   * Émet l'événement final "done" avec le résumé
   * 
   * @param rootHash - Hash final du pipeline
   * @param stats - Statistiques optionnelles
   */
  done(rootHash: string, stats?: Partial<PipelineStats>): void {
    const elapsed_ms = Date.now() - this.startTime;
    
    this.emit("done", 1, 1, {
      message: formatDoneSummary(
        rootHash,
        elapsed_ms,
        stats?.segments_count ?? 0
      ),
      metadata: {
        root_hash: rootHash,
        duration_ms: elapsed_ms,
        ...stats,
      },
    });
    
    // Newline finale pour CLI (pour ne pas écraser la dernière ligne)
    if (this.options.format === "cli") {
      const stream = this.options.output ?? process.stderr;
      try {
        stream.write("\n");
      } catch {
        // Ignore write errors
      }
    }
  }
  
  /**
   * Raccourci pour émettre un événement d'initialisation
   * 
   * @param message - Message d'initialisation
   */
  init(message = "Initializing pipeline..."): void {
    this.emit("init", 0, undefined, { message });
  }
  
  /**
   * Raccourci pour émettre un événement de lecture
   * 
   * @param bytesRead - Bytes lus
   * @param totalBytes - Total bytes (si connu)
   * @param file - Fichier en cours (optionnel)
   */
  read(bytesRead: number, totalBytes?: number, file?: string): void {
    this.emit("read", bytesRead, totalBytes, file ? { file } : undefined);
  }
  
  /**
   * Raccourci pour émettre un événement de segmentation
   * 
   * @param segmentIndex - Index du segment (0-based)
   * @param totalSegments - Total segments (si connu)
   */
  segment(segmentIndex: number, totalSegments?: number): void {
    this.emit("segment", segmentIndex + 1, totalSegments);
  }
  
  /**
   * Raccourci pour émettre un événement d'analyse
   * 
   * @param analyzedCount - Nombre de segments analysés
   * @param totalSegments - Total segments
   */
  analyze(analyzedCount: number, totalSegments: number): void {
    this.emit("analyze", analyzedCount, totalSegments);
  }
  
  /**
   * Raccourci pour émettre un événement DNA
   * 
   * @param dnaCount - Nombre de DNA construits
   * @param totalSegments - Total segments
   */
  dna(dnaCount: number, totalSegments: number): void {
    this.emit("dna", dnaCount, totalSegments);
  }
  
  /**
   * Raccourci pour émettre un événement d'agrégation
   * 
   * @param step - "start" ou "end"
   * @param message - Message optionnel
   */
  aggregate(step: "start" | "end", message?: string): void {
    this.emit("aggregate", step === "end" ? 1 : 0, 1, {
      message: message ?? (step === "start" ? "Building Merkle tree..." : "Aggregation complete"),
    });
  }
  
  /**
   * Raccourci pour émettre un événement d'écriture
   * 
   * @param file - Fichier écrit
   */
  write(file: string): void {
    this.emit("write", 1, 1, { file, message: `Writing ${file}` });
  }
  
  /**
   * Retourne les options courantes (lecture seule)
   */
  getOptions(): Readonly<ProgressOptions> {
    return this.options;
  }
  
  /**
   * Retourne le dernier événement émis (lecture seule, null si aucun)
   */
  getLastEvent(): Readonly<ProgressEvent> | null {
    return this.lastEmittedEvent;
  }
  
  /**
   * Retourne le nombre d'événements émis
   */
  getEventCount(): number {
    return this.eventCount;
  }
  
  /**
   * Retourne le temps écoulé depuis le début
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * Vérifie si l'emitter est activé
   */
  isEnabled(): boolean {
    return this.options.enabled;
  }
  
  /**
   * Output interne - formate et écrit l'événement
   */
  private output(event: Readonly<ProgressEvent>): void {
    try {
      switch (this.options.format) {
        case "cli": {
          const stream = this.options.output ?? process.stderr;
          const formatted = formatCli(event, this.options);
          stream.write(formatted);
          break;
        }
        
        case "jsonl": {
          const stream = this.options.output ?? process.stdout;
          const formatted = formatJsonl(event);
          stream.write(formatted + "\n");
          break;
        }
        
        case "none":
        default:
          // Pas d'output, seulement callback
          break;
      }
    } catch {
      // Silently ignore output errors
      // INVARIANT: Pipeline never crashes due to progress output
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory pour créer un emitter désactivé (ZERO overhead)
 * Utilisé en mode quiet ou quand progress non demandé
 */
export function createNoopEmitter(): ProgressEmitter {
  return new ProgressEmitter({ enabled: false });
}

/**
 * Factory pour créer un emitter CLI (développement local)
 * 
 * @param throttle_ms - Throttle en ms (default: 100)
 */
export function createCliEmitter(throttle_ms = 100): ProgressEmitter {
  return new ProgressEmitter({
    enabled: true,
    format: "cli",
    throttle_ms,
    show_eta: true,
    show_rate: true,
  });
}

/**
 * Factory pour créer un emitter CI/CD (JSONL)
 * Throttle plus élevé pour ne pas spammer les logs
 */
export function createCiEmitter(): ProgressEmitter {
  return new ProgressEmitter({
    enabled: true,
    format: "jsonl",
    throttle_ms: 1000, // CI: moins fréquent
    show_eta: true,
    show_rate: false,
  });
}

/**
 * Factory pour créer un emitter avec callback custom uniquement
 * 
 * @param callback - Callback à appeler pour chaque événement
 * @param throttle_ms - Throttle en ms (default: 0 = pas de throttle)
 */
export function createCallbackEmitter(
  callback: ProgressCallback,
  throttle_ms = 0
): ProgressEmitter {
  return new ProgressEmitter({
    enabled: true,
    format: "none",
    throttle_ms,
    callback,
    show_eta: false,
    show_rate: false,
  });
}

/**
 * Factory pour créer un emitter de test (collecte tous les events)
 * 
 * @returns Tuple [emitter, events array]
 */
export function createTestEmitter(): [ProgressEmitter, ProgressEvent[]] {
  const events: ProgressEvent[] = [];
  const emitter = new ProgressEmitter({
    enabled: true,
    format: "none",
    throttle_ms: 0, // Pas de throttle pour tests
    callback: (e) => events.push(e),
    show_eta: true,
    show_rate: true,
  });
  return [emitter, events];
}
