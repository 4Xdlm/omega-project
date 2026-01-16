/**
 * Analysis Store for OMEGA UI
 * @module stores/analysisStore
 * @description Zustand store for analysis state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TextAnalysisResult, DNAFingerprint } from '../core/types';
import { analyzeText } from '../core/analyzer';
import { generateDNA } from '../core/dna';

/**
 * Analysis entry with metadata
 */
export interface AnalysisEntry {
  id: string;
  text: string;
  result: TextAnalysisResult;
  dna: DNAFingerprint;
  createdAt: string;
  name?: string;
}

/**
 * Analysis store state
 */
interface AnalysisState {
  currentText: string;
  currentAnalysis: TextAnalysisResult | null;
  currentDNA: DNAFingerprint | null;
  history: AnalysisEntry[];
  isAnalyzing: boolean;
  error: string | null;
  maxHistorySize: number;
}

/**
 * Analysis store actions
 */
interface AnalysisActions {
  setText: (text: string) => void;
  analyze: () => void;
  clearCurrent: () => void;
  saveToHistory: (name?: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
  setError: (error: string | null) => void;
}

/**
 * Full analysis store type
 */
export type AnalysisStore = AnalysisState & AnalysisActions;

/**
 * Default analysis state
 */
const defaultState: AnalysisState = {
  currentText: '',
  currentAnalysis: null,
  currentDNA: null,
  history: [],
  isAnalyzing: false,
  error: null,
  maxHistorySize: 50,
};

/**
 * Analysis store with persistence
 */
export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setText: (text: string) => {
        set({ currentText: text, error: null });
      },

      analyze: () => {
        const { currentText } = get();
        if (!currentText.trim()) {
          set({ error: 'No text to analyze' });
          return;
        }

        set({ isAnalyzing: true, error: null });

        try {
          const result = analyzeText(currentText);
          const dna = generateDNA(result);
          set({
            currentAnalysis: result,
            currentDNA: dna,
            isAnalyzing: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Analysis failed',
            isAnalyzing: false,
          });
        }
      },

      clearCurrent: () => {
        set({
          currentText: '',
          currentAnalysis: null,
          currentDNA: null,
          error: null,
        });
      },

      saveToHistory: (name?: string) => {
        const { currentText, currentAnalysis, currentDNA, history, maxHistorySize } = get();
        if (!currentAnalysis || !currentDNA) return;

        const entry: AnalysisEntry = {
          id: currentAnalysis.id,
          text: currentText,
          result: currentAnalysis,
          dna: currentDNA,
          createdAt: new Date().toISOString(),
          name,
        };

        const newHistory = [entry, ...history].slice(0, maxHistorySize);
        set({ history: newHistory });
      },

      removeFromHistory: (id: string) => {
        const { history } = get();
        set({ history: history.filter(entry => entry.id !== id) });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      loadFromHistory: (id: string) => {
        const { history } = get();
        const entry = history.find(e => e.id === id);
        if (entry) {
          set({
            currentText: entry.text,
            currentAnalysis: entry.result,
            currentDNA: entry.dna,
          });
        }
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'omega-analysis',
      partialize: (state) => ({
        history: state.history,
        maxHistorySize: state.maxHistorySize,
      }),
    }
  )
);
