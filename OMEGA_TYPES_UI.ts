// ═══════════════════════════════════════════════════════════════════════════
// OMEGA DESKTOP — TYPES CENTRAUX
// Version: 1.0
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH (Santé globale)
// ─────────────────────────────────────────────────────────────────────────────

export enum HealthLevel {
  GREEN = "green",
  YELLOW = "yellow",
  RED = "red"
}

export const HealthUI = {
  [HealthLevel.GREEN]: {
    color: "var(--green)",
    bgColor: "var(--green-bg)",
    label: "OK",
    icon: "check"
  },
  [HealthLevel.YELLOW]: {
    color: "var(--yellow)",
    bgColor: "var(--yellow-bg)",
    label: "À vérifier",
    icon: "alert"
  },
  [HealthLevel.RED]: {
    color: "var(--red)",
    bgColor: "var(--red-bg)",
    label: "Critique",
    icon: "error"
  }
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE & VIEW MODES
// ─────────────────────────────────────────────────────────────────────────────

export type EngineMode = "standard" | "turbo";
export type ViewMode = "zen" | "cockpit";

export const EngineModeUI = {
  standard: {
    label: "Standard",
    description: "Offline optimisé",
    icon: "offline"
  },
  turbo: {
    label: "Turbo ⚡",
    description: "Cloud direct, qualité max",
    icon: "cloud"
  }
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RUN (Exécution)
// ─────────────────────────────────────────────────────────────────────────────

export type RunObjective = 
  | "STANDARD" 
  | "EXPLORATION" 
  | "PREPUB" 
  | "REWRITE" 
  | "AUDIT_ONLY";

export type StageName = 
  | "memory" 
  | "genesis" 
  | "scribe" 
  | "voice" 
  | "holograph";

export type StageStatus = 
  | "pending" 
  | "running" 
  | "completed" 
  | "error" 
  | "skipped";

export interface StageUpdate {
  name: StageName;
  status: StageStatus;
  duration_ms?: number;
  detail?: string;
  progress?: number; // 0-100
}

export type TonePreset = 
  | "neutral" 
  | "dark" 
  | "light" 
  | "tense" 
  | "poetic" 
  | "free";

export const ToneUI = {
  neutral: { label: "Neutre", emoji: "⚪" },
  dark: { label: "Sombre", emoji: "🌙" },
  light: { label: "Lumineux", emoji: "☀️" },
  tense: { label: "Tendu", emoji: "⚡" },
  poetic: { label: "Poétique", emoji: "🌸" },
  free: { label: "Libre", emoji: "✨" }
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// RUN REQUEST / RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

export interface RunRequest {
  input_text: string;
  tone: TonePreset;
  objective: RunObjective;
  engine: EngineMode;
  scaffold_enabled?: boolean;
  view: ViewMode;
  
  // Cockpit overrides
  provider_id?: string;
  model_id?: string;
  creativity?: number; // 0.0-1.0
}

export interface RunResult {
  run_id: string;
  status: "COMPLETE" | "CANCELLED" | "FAILED";
  output_text?: string;
  assumptions?: Assumption[];
  budget?: BudgetSnapshot;
  decisions?: Decision[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────────────────────────────────────

export interface BudgetSnapshot {
  tokens_estimated_before?: number;
  tokens_real_after?: number;
  euro_estimated_before?: number;
  euro_real_after?: number;
  display: {
    value: number;
    approx: boolean; // true = affiche "~"
    currency: "EUR";
  };
}

export interface BudgetState {
  daily_limit: number;
  used_today: number;
  remaining: number;
  currency_estimate_eur: number;
  circuit_breaker_triggered: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL & ALERTS
// ─────────────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  level: HealthLevel;
  message: string;
  actionable?: boolean;
  action_id?: string;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  module: StageName;
  title: string;
  message: string;
  actionable: boolean;
  assumption?: Assumption;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface Assumption {
  id: string;
  label: string;
  context?: string;
  choices?: AssumptionChoice[];
  default_choice_id?: string;
}

export interface AssumptionChoice {
  id: string;
  label: string;
  value?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISIONS (Cortex)
// ─────────────────────────────────────────────────────────────────────────────

export interface Decision {
  stage: StageName;
  action: string;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAUGES
// ─────────────────────────────────────────────────────────────────────────────

export type GaugeType = "memory" | "coherence" | "style" | "budget";

export interface GaugeState {
  type: GaugeType;
  level: HealthLevel;
  score: number; // 0-100
  message?: string;
}

export interface ProjectHealth {
  global_status: HealthLevel;
  metrics: {
    memory: GaugeState;
    coherence: GaugeState;
    style: GaugeState;
    budget: GaugeState;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS (SSE & Internal)
// ─────────────────────────────────────────────────────────────────────────────

export type RunEvent =
  | { 
      type: "RUN_STARTED"; 
      run_id: string; 
      ts: number; 
      view: ViewMode; 
      engine: EngineMode; 
      objective: RunObjective;
    }
  | { 
      type: "STAGE_UPDATE"; 
      run_id: string; 
      ts: number; 
      stage: StageUpdate;
    }
  | { 
      type: "TEXT_CHUNK_PARAGRAPH"; 
      run_id: string; 
      ts: number; 
      paragraph_index: number; 
      text: string;
      is_final?: boolean;
    }
  | { 
      type: "TEXT_STREAM"; 
      run_id: string; 
      ts: number; 
      delta: string;
    }
  | { 
      type: "ASSUMPTION_MADE"; 
      run_id: string; 
      ts: number; 
      assumption: Assumption;
    }
  | { 
      type: "ALERT"; 
      run_id: string; 
      ts: number; 
      alert: Alert;
    }
  | { 
      type: "HEALTH_UPDATE"; 
      run_id: string; 
      ts: number; 
      health: ProjectHealth;
    }
  | { 
      type: "BUDGET_ESTIMATE"; 
      run_id: string; 
      ts: number; 
      budget: BudgetSnapshot;
    }
  | { 
      type: "BUDGET_FINAL"; 
      run_id: string; 
      ts: number; 
      budget: BudgetSnapshot;
    }
  | { 
      type: "RUN_COMPLETED"; 
      run_id: string; 
      ts: number; 
      output_text: string;
      decisions: Decision[];
      zen_journal: JournalEntry[];
    }
  | { 
      type: "RUN_CANCELLED"; 
      run_id: string; 
      ts: number;
    }
  | { 
      type: "RUN_FAILED"; 
      run_id: string; 
      ts: number; 
      error: { code: string; message: string; recoverable: boolean };
    };

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT
// ─────────────────────────────────────────────────────────────────────────────

export type AuditModule = "voice" | "holograph" | "canon" | "diff";

export interface AuditRequest {
  text: string;
  context_chapter?: number;
  modules: AuditModule[];
  use_llm: boolean;
}

export interface AuditIssue {
  severity: AlertSeverity;
  module: AuditModule;
  message: string;
  position?: { start: number; end: number };
  resolution?: AuditResolution;
}

export interface AuditResolution {
  entity: string;
  fact_a: string;
  fact_b: string;
  choices: AssumptionChoice[];
}

export interface AuditResult {
  status: "COMPLETE" | "FAILED";
  tokens_used: number;
  issues: AuditIssue[];
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface GaugeProps {
  type: GaugeType;
  level: HealthLevel;
  value: number;
  label: string;
  onClick?: () => void;
}

export interface GlobalHealthProps {
  level: HealthLevel;
  visible: boolean;
  onClick: () => void;
}

export interface ProgressBarProps {
  percent: number;
  label: string;
  variant: "zen" | "cockpit";
}

export interface PipelineProps {
  stages: StageUpdate[];
}

export interface MiniJournalProps {
  entries: JournalEntry[];
  onDismiss: () => void;
  onAction?: (actionId: string) => void;
}

export interface AlertProps {
  severity: AlertSeverity;
  title: string;
  message: string;
  choices?: AssumptionChoice[];
  assumption?: string;
  onChoice: (choiceId: string) => void;
  onDismiss?: () => void;
}

export interface EngineSwitchProps {
  value: EngineMode;
  onChange: (value: EngineMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

export interface ToneSelectorProps {
  selected: TonePreset;
  onChange: (tone: TonePreset) => void;
  variant: "chips" | "dropdown";
}

export interface BudgetDisplayProps {
  used: number;
  limit: number;
  isEstimate: boolean;
  warning?: boolean;
}
