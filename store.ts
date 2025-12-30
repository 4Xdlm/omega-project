// ═══════════════════════════════════════════════════════════════════════════
// OMEGA DESKTOP — STORE ZUSTAND
// Version: 1.0
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  HealthLevel,
  EngineMode,
  ViewMode,
  RunObjective,
  TonePreset,
  StageName,
  StageUpdate,
  BudgetSnapshot,
  JournalEntry,
  Assumption,
  Decision,
  RunEvent,
  RunRequest,
  ProjectHealth,
  GaugeState
} from './OMEGA_TYPES_UI';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface RunState {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  run_id?: string;
  progress_percent: number;
  current_stage?: StageName;
  stages: StageUpdate[];
  output_text: string;
  paragraphs: string[];
  healthLevel: HealthLevel;
  miniJournalEntries: JournalEntry[];
  assumptions: Assumption[];
  decisions: Decision[];
  budgetSnapshot?: BudgetSnapshot;
  error?: { code: string; message: string };
}

interface SettingsState {
  viewMode: ViewMode;
  engineMode: EngineMode;
  objective: RunObjective;
  tone: TonePreset;
  scaffold_enabled: boolean;
  creativity: number;
}

interface OmegaStore {
  // ─── Settings ───
  settings: SettingsState;
  setViewMode: (mode: ViewMode) => void;
  setEngineMode: (mode: EngineMode) => void;
  setObjective: (objective: RunObjective) => void;
  setTone: (tone: TonePreset) => void;
  setScaffold: (enabled: boolean) => void;
  setCreativity: (value: number) => void;
  
  // ─── Run State ───
  run: RunState;
  startRun: (request: RunRequest) => void;
  cancelRun: () => void;
  resetRun: () => void;
  
  // ─── Event Processing ───
  applyEvent: (event: RunEvent) => void;
  
  // ─── Health ───
  projectHealth: ProjectHealth;
  updateHealth: (health: ProjectHealth) => void;
  
  // ─── Assumptions ───
  resolveAssumption: (assumptionId: string, choiceId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATES
// ─────────────────────────────────────────────────────────────────────────────

const initialRunState: RunState = {
  status: 'idle',
  progress_percent: 0,
  stages: [],
  output_text: '',
  paragraphs: [],
  healthLevel: HealthLevel.GREEN,
  miniJournalEntries: [],
  assumptions: [],
  decisions: []
};

const initialSettings: SettingsState = {
  viewMode: 'zen',
  engineMode: 'standard',
  objective: 'STANDARD',
  tone: 'neutral',
  scaffold_enabled: false,
  creativity: 0.5
};

const initialHealth: ProjectHealth = {
  global_status: HealthLevel.GREEN,
  metrics: {
    memory: { type: 'memory', level: HealthLevel.GREEN, score: 100 },
    coherence: { type: 'coherence', level: HealthLevel.GREEN, score: 100 },
    style: { type: 'style', level: HealthLevel.GREEN, score: 100 },
    budget: { type: 'budget', level: HealthLevel.GREEN, score: 100 }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

function calculateHealthLevel(assumptions: Assumption[], hasError: boolean): HealthLevel {
  if (hasError) return HealthLevel.RED;
  if (assumptions.length > 0) return HealthLevel.YELLOW;
  return HealthLevel.GREEN;
}

function calculateGlobalHealth(metrics: ProjectHealth['metrics']): HealthLevel {
  const levels = Object.values(metrics).map(m => m.level);
  
  if (levels.includes(HealthLevel.RED)) return HealthLevel.RED;
  if (levels.includes(HealthLevel.YELLOW)) return HealthLevel.YELLOW;
  return HealthLevel.GREEN;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useOmegaStore = create<OmegaStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ─── Settings ───
        settings: initialSettings,
        
        setViewMode: (mode) => set(
          (state) => ({ settings: { ...state.settings, viewMode: mode } }),
          false,
          'setViewMode'
        ),
        
        setEngineMode: (mode) => set(
          (state) => ({ settings: { ...state.settings, engineMode: mode } }),
          false,
          'setEngineMode'
        ),
        
        setObjective: (objective) => set(
          (state) => ({ settings: { ...state.settings, objective } }),
          false,
          'setObjective'
        ),
        
        setTone: (tone) => set(
          (state) => ({ settings: { ...state.settings, tone } }),
          false,
          'setTone'
        ),
        
        setScaffold: (enabled) => set(
          (state) => ({ settings: { ...state.settings, scaffold_enabled: enabled } }),
          false,
          'setScaffold'
        ),
        
        setCreativity: (value) => set(
          (state) => ({ settings: { ...state.settings, creativity: value } }),
          false,
          'setCreativity'
        ),
        
        // ─── Run State ───
        run: initialRunState,
        
        startRun: (request) => {
          const run_id = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          set({
            run: {
              ...initialRunState,
              status: 'running',
              run_id,
              miniJournalEntries: [
                { level: HealthLevel.GREEN, message: 'Démarrage...' }
              ]
            }
          }, false, 'startRun');
        },
        
        cancelRun: () => set(
          (state) => ({
            run: {
              ...state.run,
              status: 'cancelled',
              miniJournalEntries: [
                ...state.run.miniJournalEntries,
                { level: HealthLevel.YELLOW, message: 'Annulé par l\'utilisateur' }
              ]
            }
          }),
          false,
          'cancelRun'
        ),
        
        resetRun: () => set({ run: initialRunState }, false, 'resetRun'),
        
        // ─── Event Processing ───
        applyEvent: (event) => {
          const state = get();
          
          switch (event.type) {
            case 'RUN_STARTED':
              set({
                run: {
                  ...state.run,
                  status: 'running',
                  run_id: event.run_id,
                  miniJournalEntries: [
                    { level: HealthLevel.GREEN, message: 'Mémoire chargée' }
                  ]
                }
              }, false, 'event/RUN_STARTED');
              break;
              
            case 'STAGE_UPDATE':
              const newStages = [...state.run.stages];
              const existingIndex = newStages.findIndex(s => s.name === event.stage.name);
              
              if (existingIndex >= 0) {
                newStages[existingIndex] = event.stage;
              } else {
                newStages.push(event.stage);
              }
              
              set({
                run: {
                  ...state.run,
                  stages: newStages,
                  current_stage: event.stage.name,
                  progress_percent: event.stage.progress ?? state.run.progress_percent
                }
              }, false, 'event/STAGE_UPDATE');
              break;
              
            case 'TEXT_CHUNK_PARAGRAPH':
              set({
                run: {
                  ...state.run,
                  paragraphs: [...state.run.paragraphs, event.text],
                  output_text: [...state.run.paragraphs, event.text].join('\n\n')
                }
              }, false, 'event/TEXT_CHUNK_PARAGRAPH');
              break;
              
            case 'TEXT_STREAM':
              set({
                run: {
                  ...state.run,
                  output_text: state.run.output_text + event.delta
                }
              }, false, 'event/TEXT_STREAM');
              break;
              
            case 'ASSUMPTION_MADE':
              const newAssumptions = [...state.run.assumptions, event.assumption];
              const newJournal = [
                ...state.run.miniJournalEntries,
                { 
                  level: HealthLevel.YELLOW, 
                  message: `Supposition : ${event.assumption.label}`,
                  actionable: true,
                  action_id: event.assumption.id
                }
              ];
              
              set({
                run: {
                  ...state.run,
                  assumptions: newAssumptions,
                  miniJournalEntries: newJournal.slice(-3), // Max 3 entries
                  healthLevel: HealthLevel.YELLOW
                }
              }, false, 'event/ASSUMPTION_MADE');
              break;
              
            case 'HEALTH_UPDATE':
              set({
                projectHealth: event.health,
                run: {
                  ...state.run,
                  healthLevel: event.health.global_status
                }
              }, false, 'event/HEALTH_UPDATE');
              break;
              
            case 'BUDGET_ESTIMATE':
              set({
                run: {
                  ...state.run,
                  budgetSnapshot: event.budget
                }
              }, false, 'event/BUDGET_ESTIMATE');
              break;
              
            case 'BUDGET_FINAL':
              set({
                run: {
                  ...state.run,
                  budgetSnapshot: {
                    ...event.budget,
                    display: {
                      ...event.budget.display,
                      approx: false // Plus d'estimation, valeur réelle
                    }
                  }
                }
              }, false, 'event/BUDGET_FINAL');
              break;
              
            case 'RUN_COMPLETED':
              set({
                run: {
                  ...state.run,
                  status: 'completed',
                  output_text: event.output_text,
                  decisions: event.decisions,
                  miniJournalEntries: event.zen_journal.slice(-3),
                  progress_percent: 100
                }
              }, false, 'event/RUN_COMPLETED');
              break;
              
            case 'RUN_FAILED':
              set({
                run: {
                  ...state.run,
                  status: 'failed',
                  error: event.error,
                  healthLevel: HealthLevel.RED,
                  miniJournalEntries: [
                    ...state.run.miniJournalEntries,
                    { level: HealthLevel.RED, message: event.error.message }
                  ].slice(-3)
                }
              }, false, 'event/RUN_FAILED');
              break;
              
            case 'RUN_CANCELLED':
              set({
                run: {
                  ...state.run,
                  status: 'cancelled'
                }
              }, false, 'event/RUN_CANCELLED');
              break;
          }
        },
        
        // ─── Health ───
        projectHealth: initialHealth,
        
        updateHealth: (health) => set({ projectHealth: health }, false, 'updateHealth'),
        
        // ─── Assumptions ───
        resolveAssumption: (assumptionId, choiceId) => {
          const state = get();
          const newAssumptions = state.run.assumptions.filter(a => a.id !== assumptionId);
          
          set({
            run: {
              ...state.run,
              assumptions: newAssumptions,
              healthLevel: calculateHealthLevel(newAssumptions, !!state.run.error),
              miniJournalEntries: state.run.miniJournalEntries.filter(
                j => j.action_id !== assumptionId
              )
            }
          }, false, 'resolveAssumption');
        }
      }),
      {
        name: 'omega-storage',
        partialize: (state) => ({
          settings: state.settings
        })
      }
    ),
    { name: 'OmegaStore' }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────────────────────

export const selectViewMode = (state: OmegaStore) => state.settings.viewMode;
export const selectEngineMode = (state: OmegaStore) => state.settings.engineMode;
export const selectRunStatus = (state: OmegaStore) => state.run.status;
export const selectIsRunning = (state: OmegaStore) => state.run.status === 'running';
export const selectParagraphs = (state: OmegaStore) => state.run.paragraphs;
export const selectHealthLevel = (state: OmegaStore) => state.run.healthLevel;
export const selectMiniJournal = (state: OmegaStore) => state.run.miniJournalEntries;
export const selectAssumptions = (state: OmegaStore) => state.run.assumptions;
export const selectBudget = (state: OmegaStore) => state.run.budgetSnapshot;
export const selectProgress = (state: OmegaStore) => state.run.progress_percent;

// Pour Zen: visible seulement si != green
export const selectShowHealthPill = (state: OmegaStore) => 
  state.settings.viewMode === 'zen' && state.run.healthLevel !== HealthLevel.GREEN;

export default useOmegaStore;
