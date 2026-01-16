/**
 * React Hooks for OMEGA UI IPC
 * @module lib/hooks
 * @description Custom hooks for Tauri IPC operations
 */

import { useState, useEffect, useCallback } from 'react';
import { healthCheck, getVersion, greet, isTauriAvailable } from './ipc';
import type { HealthCheckResponse, IPCResult } from '../types/ipc';

/**
 * Health status state
 */
interface HealthState {
  status: 'loading' | 'healthy' | 'unhealthy' | 'unavailable';
  data: HealthCheckResponse | null;
  error: string | null;
}

/**
 * Hook to monitor backend health
 * @param interval - Polling interval in ms (default: 30000)
 * @returns Health state and refresh function
 */
export function useHealth(interval = 30000): {
  health: HealthState;
  refresh: () => Promise<void>;
} {
  const [health, setHealth] = useState<HealthState>({
    status: 'loading',
    data: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!isTauriAvailable()) {
      setHealth({
        status: 'unavailable',
        data: null,
        error: 'Tauri not available (web mode)',
      });
      return;
    }

    const result = await healthCheck();
    if (result.success) {
      setHealth({
        status: result.data.status === 'healthy' ? 'healthy' : 'unhealthy',
        data: result.data,
        error: null,
      });
    } else {
      setHealth({
        status: 'unhealthy',
        data: null,
        error: result.error.message,
      });
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [refresh, interval]);

  return { health, refresh };
}

/**
 * Version state
 */
interface VersionState {
  version: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get backend version
 * @returns Version state
 */
export function useVersion(): VersionState {
  const [state, setState] = useState<VersionState>({
    version: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchVersion() {
      if (!isTauriAvailable()) {
        setState({
          version: '3.127.0-web',
          loading: false,
          error: null,
        });
        return;
      }

      const result = await getVersion();
      if (result.success) {
        setState({
          version: result.data,
          loading: false,
          error: null,
        });
      } else {
        setState({
          version: null,
          loading: false,
          error: result.error.message,
        });
      }
    }

    fetchVersion();
  }, []);

  return state;
}

/**
 * Greet state and function
 */
interface GreetState {
  greeting: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for greeting functionality
 * @returns Greet state and send function
 */
export function useGreet(): {
  state: GreetState;
  sendGreet: (name: string) => Promise<void>;
} {
  const [state, setState] = useState<GreetState>({
    greeting: null,
    loading: false,
    error: null,
  });

  const sendGreet = useCallback(async (name: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    if (!isTauriAvailable()) {
      setState({
        greeting: `OMEGA welcomes you, ${name}! (web mode)`,
        loading: false,
        error: null,
      });
      return;
    }

    const result = await greet(name);
    if (result.success) {
      setState({
        greeting: result.data,
        loading: false,
        error: null,
      });
    } else {
      setState({
        greeting: null,
        loading: false,
        error: result.error.message,
      });
    }
  }, []);

  return { state, sendGreet };
}
