/**
 * Theme System for OMEGA UI
 * @module lib/theme
 * @description Theme management utilities
 */

import { useEffect, useCallback } from 'react';
import { useSettingsStore, type Theme } from '../stores/settingsStore';

/**
 * Theme color tokens
 */
export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
}

/**
 * Light theme colors
 */
export const lightTheme: ThemeColors = {
  bg: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

/**
 * Dark theme colors
 */
export const darkTheme: ThemeColors = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  text: '#f5f5f5',
  muted: '#737373',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

/**
 * Apply theme to document
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  const colors = theme === 'light' ? lightTheme : darkTheme;
  const root = document.documentElement;

  root.style.setProperty('--omega-bg', colors.bg);
  root.style.setProperty('--omega-surface', colors.surface);
  root.style.setProperty('--omega-border', colors.border);
  root.style.setProperty('--omega-text', colors.text);
  root.style.setProperty('--omega-muted', colors.muted);
  root.style.setProperty('--omega-primary', colors.primary);
  root.style.setProperty('--omega-secondary', colors.secondary);
  root.style.setProperty('--omega-success', colors.success);
  root.style.setProperty('--omega-warning', colors.warning);
  root.style.setProperty('--omega-error', colors.error);

  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme);

  // Update meta theme-color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', colors.bg);
  }
}

/**
 * Get system preferred theme
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve effective theme
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Theme provider hook
 */
export function useTheme() {
  const { theme, setTheme } = useSettingsStore();

  const effectiveTheme = resolveTheme(theme);

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(effectiveTheme);
  }, [effectiveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [effectiveTheme, setTheme]);

  const cycleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }, [theme, setTheme]);

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    cycleTheme,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
    isSystem: theme === 'system',
  };
}

/**
 * Theme toggle button component
 */
export function ThemeToggle(): JSX.Element {
  const { effectiveTheme, cycleTheme, theme } = useTheme();

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg hover:bg-omega-surface transition-colors"
      title={`Theme: ${theme} (${effectiveTheme})`}
      aria-label="Toggle theme"
    >
      {effectiveTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
      {theme === 'system' && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-omega-primary rounded-full" />
      )}
    </button>
  );
}

/**
 * Sun icon for light mode
 */
function SunIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-omega-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

/**
 * Moon icon for dark mode
 */
function MoonIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-omega-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}
