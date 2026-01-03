// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA OBSERVABILITY — FORMATTERS
// packages/omega-observability/src/formatters.ts
// Version: 1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

import type { ProgressEvent, ProgressOptions } from "./types.js";

/**
 * Format CLI (single line, overwrites previous line)
 * 
 * Example output:
 * [analyze]  58% | 12031/20713 | 01:12 | ETA 00:51
 * 
 * @param event - Progress event (readonly)
 * @param options - Progress options
 * @returns Formatted string with carriage return (no newline)
 */
export function formatCli(
  event: Readonly<ProgressEvent>,
  options: Readonly<ProgressOptions>
): string {
  const { phase, current, total, percent, elapsed_ms, eta_ms, file } = event;
  
  const parts: string[] = [];
  
  // Phase (padded to 9 chars for alignment)
  parts.push(`[${phase.padEnd(9)}]`);
  
  // Percent (padded to 3 chars + %)
  if (percent !== undefined) {
    parts.push(`${percent.toString().padStart(3)}%`);
  } else {
    parts.push("  --%");
  }
  
  // Current/Total counter
  if (total !== undefined && total > 0) {
    parts.push(`| ${formatNumber(current)}/${formatNumber(total)}`);
  } else {
    parts.push(`| ${formatNumber(current)}`);
  }
  
  // Elapsed time
  parts.push(`| ${formatDuration(elapsed_ms)}`);
  
  // ETA (if enabled and available)
  if (options.show_eta && eta_ms !== undefined && eta_ms > 0 && isFinite(eta_ms)) {
    parts.push(`| ETA ${formatDuration(eta_ms)}`);
  }
  
  // File name (batch mode, truncated)
  if (file) {
    const shortFile = truncateFilename(file, 25);
    parts.push(`| ${shortFile}`);
  }
  
  // Message (if present and no file)
  if (!file && event.message) {
    const shortMsg = event.message.length > 30 
      ? event.message.slice(0, 27) + "..." 
      : event.message;
    parts.push(`| ${shortMsg}`);
  }
  
  // Carriage return to overwrite line (NOT newline)
  // Pad to 100 chars to clear previous longer lines
  return `\r${parts.join(" ").padEnd(100)}`;
}

/**
 * Format JSONL (one JSON object per line, machine-readable)
 * 
 * Example output:
 * {"phase":"analyze","current":12031,"total":20713,"percent":58,"elapsed_ms":72000}
 * 
 * @param event - Progress event (readonly)
 * @returns JSON string (no newline, caller adds it)
 */
export function formatJsonl(event: Readonly<ProgressEvent>): string {
  // Create clean object without undefined values
  const clean: Record<string, unknown> = {};
  
  // Always include phase and current
  clean.phase = event.phase;
  clean.current = event.current;
  
  // Conditionally include other fields
  if (event.total !== undefined) clean.total = event.total;
  if (event.percent !== undefined) clean.percent = event.percent;
  if (event.elapsed_ms !== undefined) clean.elapsed_ms = event.elapsed_ms;
  if (event.eta_ms !== undefined && isFinite(event.eta_ms)) clean.eta_ms = event.eta_ms;
  if (event.message !== undefined) clean.message = event.message;
  if (event.file !== undefined) clean.file = event.file;
  if (event.file_index !== undefined) clean.file_index = event.file_index;
  if (event.files_total !== undefined) clean.files_total = event.files_total;
  if (event.metadata !== undefined) clean.metadata = event.metadata;
  
  return JSON.stringify(clean);
}

/**
 * Format durée en MM:SS ou HH:MM:SS
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "--:--";
  
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * Format bytes en human-readable (KB, MB, GB)
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string with unit
 */
export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

/**
 * Format rate (items/s or bytes/s)
 * 
 * @param count - Number of items processed
 * @param ms - Time in milliseconds
 * @param unit - Unit name (default: "items")
 * @returns Formatted rate string
 */
export function formatRate(count: number, ms: number, unit = "items"): string {
  if (!isFinite(count) || !isFinite(ms) || ms <= 0) return `-- ${unit}/s`;
  
  const rate = (count / ms) * 1000;
  
  if (rate >= 1000) {
    return `${(rate / 1000).toFixed(1)}K ${unit}/s`;
  }
  return `${rate.toFixed(1)} ${unit}/s`;
}

/**
 * Format number with locale separators
 * 
 * @param n - Number to format
 * @returns Formatted string
 */
export function formatNumber(n: number): string {
  if (!isFinite(n)) return "--";
  return n.toLocaleString("en-US");
}

/**
 * Pad number to 2 digits
 */
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Truncate filename for display
 * 
 * @param filename - Full filename or path
 * @param maxLen - Maximum length
 * @returns Truncated filename
 */
function truncateFilename(filename: string, maxLen: number): string {
  if (filename.length <= maxLen) return filename;
  
  // Try to get just the filename
  const parts = filename.replace(/\\/g, "/").split("/");
  const name = parts[parts.length - 1];
  
  if (name.length <= maxLen) return name;
  
  // Truncate with ellipsis at start
  return "..." + name.slice(-(maxLen - 3));
}

/**
 * Create a summary line for the "done" phase
 * 
 * @param rootHash - Final root hash
 * @param duration_ms - Total duration
 * @param segments - Number of segments processed
 * @returns Formatted summary string
 */
export function formatDoneSummary(
  rootHash: string,
  duration_ms: number,
  segments: number
): string {
  const hashShort = rootHash.slice(0, 16);
  const duration = formatDuration(duration_ms);
  
  return `✅ Complete | ${segments} segments | ${duration} | hash: ${hashShort}...`;
}
