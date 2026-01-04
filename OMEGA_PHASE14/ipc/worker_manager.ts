/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Worker Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Process lifecycle management with strict state machine.
 * INV-IPC-04: Clear state transitions, no zombie processes.
 * 
 * @module worker_manager
 * @version 3.14.0
 */

import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import * as readline from 'node:readline';
import { EventEmitter } from 'node:events';
import type { BridgeConfig, WorkerState } from './types.js';
import { VALID_TRANSITIONS } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER MANAGER CLASS - INV-IPC-04
// ═══════════════════════════════════════════════════════════════════════════════

export class WorkerManager extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private state: WorkerState = 'STOPPED';
  private rl: readline.Interface | null = null;
  private startTime: number = 0;
  private pid: number | null = null;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT - INV-IPC-04
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get current state
   */
  getState(): WorkerState {
    return this.state;
  }
  
  /**
   * Get process ID
   */
  getPid(): number | null {
    return this.pid;
  }
  
  /**
   * Get uptime in ms
   */
  getUptime(): number {
    if (this.startTime === 0) return 0;
    return Date.now() - this.startTime;
  }
  
  /**
   * Transition to new state - INV-IPC-04
   * @throws Error if transition is invalid
   */
  private transition(newState: WorkerState): void {
    const validNext = VALID_TRANSITIONS[this.state];
    if (!validNext.includes(newState)) {
      throw new Error(
        `Invalid state transition: ${this.state} → ${newState}. ` +
        `Valid: ${validNext.join(', ')}`
      );
    }
    
    const oldState = this.state;
    this.state = newState;
    this.emit('state_change', { from: oldState, to: newState });
  }
  
  /**
   * Check if worker is alive
   */
  isAlive(): boolean {
    return this.proc !== null && !this.proc.killed;
  }
  
  /**
   * Check if worker can accept requests
   */
  canAcceptRequests(): boolean {
    return this.state === 'READY' || this.state === 'RUNNING';
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Start the Python worker process
   */
  async start(
    cfg: BridgeConfig,
    onStdoutLine: (line: string) => void,
    onStderrLine?: (line: string) => void
  ): Promise<void> {
    if (this.state !== 'STOPPED' && this.state !== 'CRASHED') {
      throw new Error(`Cannot start worker in state: ${this.state}`);
    }
    
    this.transition('STARTING');
    this.startTime = Date.now();
    
    // Spawn with unbuffered Python (-u flag)
    this.proc = spawn(cfg.pythonPath, ['-u', cfg.scriptPath], {
      cwd: cfg.cwd,
      env: { ...process.env, ...(cfg.env ?? {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    
    this.pid = this.proc.pid ?? null;
    
    // Handle process events
    this.proc.on('error', (err) => {
      this.emit('error', err);
      if (this.state !== 'STOPPING' && this.state !== 'STOPPED') {
        this.transition('CRASHED');
      }
    });
    
    this.proc.on('exit', (code, signal) => {
      this.emit('exit', { code, signal });
      if (this.state === 'STOPPING') {
        this.transition('STOPPED');
      } else if (this.state !== 'STOPPED') {
        this.transition('CRASHED');
      }
      this.cleanup();
    });
    
    // Setup stdout line reader (NDJSON)
    this.rl = readline.createInterface({ 
      input: this.proc.stdout,
      crlfDelay: Infinity 
    });
    
    this.rl.on('line', (line) => {
      onStdoutLine(line);
    });
    
    // Setup stderr (for logs, non-protocol)
    if (onStderrLine) {
      const stderrRl = readline.createInterface({ input: this.proc.stderr });
      stderrRl.on('line', onStderrLine);
    }
  }
  
  /**
   * Mark worker as ready (after handshake)
   */
  markReady(): void {
    if (this.state === 'STARTING') {
      this.transition('READY');
    }
  }
  
  /**
   * Mark worker as running (first request sent)
   */
  markRunning(): void {
    if (this.state === 'READY') {
      this.transition('RUNNING');
    }
  }
  
  /**
   * Mark worker as ready again (after processing)
   */
  markIdle(): void {
    if (this.state === 'RUNNING') {
      this.transition('READY');
    }
  }
  
  /**
   * Stop the worker gracefully
   */
  async stop(timeout_ms: number = 5000): Promise<void> {
    if (this.state === 'STOPPED') {
      return;
    }
    
    if (!this.proc) {
      this.state = 'STOPPED';
      return;
    }
    
    this.transition('STOPPING');
    
    // Send SIGTERM for graceful shutdown
    this.proc.kill('SIGTERM');
    
    // Wait for exit or force kill
    await new Promise<void>((resolve) => {
      const forceKillTimer = setTimeout(() => {
        if (this.proc && !this.proc.killed) {
          this.proc.kill('SIGKILL');
        }
        resolve();
      }, timeout_ms);
      
      if (this.proc) {
        this.proc.once('exit', () => {
          clearTimeout(forceKillTimer);
          resolve();
        });
      } else {
        clearTimeout(forceKillTimer);
        resolve();
      }
    });
    
    this.cleanup();
    this.state = 'STOPPED';
  }
  
  /**
   * Force kill (emergency)
   */
  forceKill(): void {
    if (this.proc && !this.proc.killed) {
      this.proc.kill('SIGKILL');
    }
    this.cleanup();
    this.state = 'CRASHED';
  }
  
  /**
   * Cleanup resources
   */
  private cleanup(): void {
    try {
      this.rl?.close();
    } catch {
      // Ignore
    }
    this.rl = null;
    this.proc = null;
    this.pid = null;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // I/O
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Write to worker stdin
   */
  writeStdin(data: string): boolean {
    if (!this.proc || !this.proc.stdin.writable) {
      return false;
    }
    
    try {
      this.proc.stdin.write(data, 'utf8');
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if stdin is writable
   */
  canWrite(): boolean {
    return this.proc !== null && 
           this.proc.stdin !== null && 
           this.proc.stdin.writable;
  }
}
