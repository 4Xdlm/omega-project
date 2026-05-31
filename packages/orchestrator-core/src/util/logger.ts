/**
 * OMEGA Orchestrator Core -- Canonical Logger (DEC-20260531-006 ACCEPTED)
 *
 * Unifie les deux loggers preexistants :
 *  - omega-runner (deterministe, SANS timestamp -> sortie hashable)
 *  - headless-runner (affichage, AVEC timestamp + context via Clock)
 *
 * Buffer d'entrees + sink optionnel. Mode DETERMINISTE par defaut (aucun timestamp
 * sauf si un Clock est injecte). NE JAMAIS appeler Date.now()/console.* directement
 * sur le chemin hashe -- injecter ce logger (cf regle cardinale DETERMINISM).
 */
import type { Clock } from './clock.js';
import { stableStringify } from './stableJson.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: Record<string, unknown>;
  /** Present uniquement si un Clock est injecte (mode affichage). Absent = mode deterministe. */
  readonly timestamp?: string;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  /** Entrees bufferisees, dans l'ordre d'emission. */
  getEntries(): readonly LogEntry[];
  /** Rendu texte deterministe (context trie via stableStringify). */
  toText(): string;
}

export interface CreateLoggerOptions {
  /** Niveau minimal emis (defaut 'info'). */
  readonly minLevel?: LogLevel;
  /** Si fourni, ajoute un timestamp ISO (mode affichage). Absent = deterministe (pas de timestamp). */
  readonly clock?: Clock;
  /** Sink optionnel appele a chaque entree emise (ex: consoleSink). Absent = buffer pur. */
  readonly sink?: (entry: LogEntry) => void;
}

/** Rendu texte d'une entree (deterministe : context serialise par stableStringify). */
export function formatEntry(entry: LogEntry): string {
  const ts = entry.timestamp !== undefined ? `[${entry.timestamp}] ` : '';
  const ctx = entry.context !== undefined ? ` ${stableStringify(entry.context)}` : '';
  return `${ts}[${entry.level.toUpperCase().padEnd(5)}] ${entry.message}${ctx}`;
}

/** Sink ecrivant vers console.{level} -- pour remplacer les console.* d'affichage. */
export function consoleSink(entry: LogEntry): void {
  const line = formatEntry(entry);
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Cree un logger canonique. */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const minLevel = options.minLevel ?? 'info';
  const minIdx = LEVEL_ORDER.indexOf(minLevel);
  const entries: LogEntry[] = [];

  const emit = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (LEVEL_ORDER.indexOf(level) < minIdx) {
      return;
    }
    const entry: LogEntry = {
      level,
      message,
      ...(context !== undefined ? { context } : {}),
      ...(options.clock !== undefined ? { timestamp: options.clock.nowISO() } : {}),
    };
    entries.push(entry);
    options.sink?.(entry);
  };

  return {
    debug: (message, context) => emit('debug', message, context),
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
    getEntries: () => entries,
    toText: () => entries.map(formatEntry).join('\n'),
  };
}