// ═══════════════════════════════════════════════════════════════════════════
// OMEGA DESKTOP — MOCK RUNNER
// Version: 1.0
// Date: 18 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import {
  RunEvent,
  RunRequest,
  HealthLevel,
  StageUpdate,
  Decision,
  JournalEntry
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface MockConfig {
  delayBetweenEvents: number;   // ms
  simulateAssumption: boolean;
  simulateError: boolean;
  errorAtStage?: string;
  paragraphCount: number;
}

const DEFAULT_CONFIG: MockConfig = {
  delayBetweenEvents: 500,
  simulateAssumption: true,
  simulateError: false,
  paragraphCount: 3
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PARAGRAPHS = [
  "Marcus s'approcha de la porte vermoulue. Le bois grinça sous ses doigts, révélant une obscurité plus dense que la nuit elle-même.",
  "Une odeur de poussière et de secrets oubliés s'échappa de l'ouverture. Il hésita un instant, puis franchit le seuil.",
  "La pièce était plus vaste qu'il ne l'avait imaginé. Des étagères couvertes de livres anciens tapissaient les murs, leurs reliures craquelées témoignant de siècles d'existence.",
  "Au centre, une table de chêne massif supportait ce qu'il cherchait depuis si longtemps : la fiole de verre bleu, intacte malgré les années.",
  "Ses mains tremblèrent légèrement quand il la saisit. Tout ce voyage, toutes ces épreuves, pour ce moment précis."
];

const MOCK_DECISIONS: Decision[] = [
  { stage: 'memory', action: 'Chargé 12 entités', reason: 'Contexte de la scène actuelle' },
  { stage: 'scribe', action: 'Ton SOMBRE appliqué', reason: 'Sélection utilisateur' },
  { stage: 'voice', action: 'Style maintenu', reason: 'Cohérence avec chapitres précédents' }
];

const MOCK_ASSUMPTION = {
  id: 'assumption_fiole_001',
  label: 'fiole = celle du Tome 1',
  context: 'Une fiole est mentionnée sans précision',
  choices: [
    { id: 'confirm', label: 'OK' },
    { id: 'correct', label: 'Corriger' }
  ],
  default_choice_id: 'confirm'
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Sleep
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK RUNNER (Generator)
// ─────────────────────────────────────────────────────────────────────────────

export async function* mockRunner(
  request: RunRequest,
  config: Partial<MockConfig> = {}
): AsyncGenerator<RunEvent> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const run_id = `mock_${Date.now()}`;
  const ts = () => Date.now();
  
  // ─── START ───
  yield {
    type: 'RUN_STARTED',
    run_id,
    ts: ts(),
    view: request.view,
    engine: request.engine,
    objective: request.objective
  };
  
  await sleep(cfg.delayBetweenEvents);
  
  // ─── BUDGET ESTIMATE ───
  yield {
    type: 'BUDGET_ESTIMATE',
    run_id,
    ts: ts(),
    budget: {
      tokens_estimated_before: 1500,
      euro_estimated_before: 0.02,
      display: { value: 0.02, approx: true, currency: 'EUR' }
    }
  };
  
  // ─── STAGES ───
  const stages: Array<{ name: string; duration: number }> = [
    { name: 'memory', duration: 200 },
    { name: 'genesis', duration: 400 },
    { name: 'scribe', duration: 1500 },
    { name: 'voice', duration: 300 },
    { name: 'holograph', duration: 200 }
  ];
  
  for (const stage of stages) {
    // Check for simulated error
    if (cfg.simulateError && cfg.errorAtStage === stage.name) {
      yield {
        type: 'RUN_FAILED',
        run_id,
        ts: ts(),
        error: {
          code: 'SIMULATED_ERROR',
          message: `Erreur simulée au stage ${stage.name}`,
          recoverable: true
        }
      };
      return;
    }
    
    // Stage started
    yield {
      type: 'STAGE_UPDATE',
      run_id,
      ts: ts(),
      stage: {
        name: stage.name as any,
        status: 'running',
        progress: 0
      }
    };
    
    await sleep(stage.duration);
    
    // ─── SCRIBE: Generate paragraphs ───
    if (stage.name === 'scribe') {
      const paragraphs = MOCK_PARAGRAPHS.slice(0, cfg.paragraphCount);
      
      for (let i = 0; i < paragraphs.length; i++) {
        // Progress update
        yield {
          type: 'STAGE_UPDATE',
          run_id,
          ts: ts(),
          stage: {
            name: 'scribe',
            status: 'running',
            progress: Math.round(((i + 1) / paragraphs.length) * 100),
            detail: `Paragraphe ${i + 1}/${paragraphs.length}`
          }
        };
        
        await sleep(cfg.delayBetweenEvents);
        
        // Paragraph complete
        yield {
          type: 'TEXT_CHUNK_PARAGRAPH',
          run_id,
          ts: ts(),
          paragraph_index: i,
          text: paragraphs[i],
          is_final: i === paragraphs.length - 1
        };
        
        // Simulate assumption after first paragraph
        if (i === 0 && cfg.simulateAssumption) {
          yield {
            type: 'ASSUMPTION_MADE',
            run_id,
            ts: ts(),
            assumption: MOCK_ASSUMPTION
          };
          
          // Health update (yellow because of assumption)
          yield {
            type: 'HEALTH_UPDATE',
            run_id,
            ts: ts(),
            health: {
              global_status: HealthLevel.YELLOW,
              metrics: {
                memory: { type: 'memory', level: HealthLevel.GREEN, score: 90 },
                coherence: { type: 'coherence', level: HealthLevel.YELLOW, score: 75, message: '1 supposition' },
                style: { type: 'style', level: HealthLevel.GREEN, score: 88 },
                budget: { type: 'budget', level: HealthLevel.GREEN, score: 85 }
              }
            }
          };
        }
        
        await sleep(cfg.delayBetweenEvents);
      }
    }
    
    // Stage completed
    yield {
      type: 'STAGE_UPDATE',
      run_id,
      ts: ts(),
      stage: {
        name: stage.name as any,
        status: 'completed',
        duration_ms: stage.duration,
        progress: 100
      }
    };
    
    await sleep(cfg.delayBetweenEvents / 2);
  }
  
  // ─── BUDGET FINAL ───
  yield {
    type: 'BUDGET_FINAL',
    run_id,
    ts: ts(),
    budget: {
      tokens_estimated_before: 1500,
      tokens_real_after: 1423,
      euro_estimated_before: 0.02,
      euro_real_after: 0.018,
      display: { value: 0.018, approx: false, currency: 'EUR' }
    }
  };
  
  // ─── COMPLETE ───
  const output_text = MOCK_PARAGRAPHS.slice(0, cfg.paragraphCount).join('\n\n');
  
  const zen_journal: JournalEntry[] = [
    { level: HealthLevel.GREEN, message: 'Mémoire chargée' },
    ...(cfg.simulateAssumption 
      ? [{ level: HealthLevel.YELLOW, message: '1 supposition : fiole = Tome 1', actionable: true, action_id: MOCK_ASSUMPTION.id }]
      : []),
    { level: HealthLevel.GREEN, message: 'Style conforme' }
  ];
  
  yield {
    type: 'RUN_COMPLETED',
    run_id,
    ts: ts(),
    output_text,
    decisions: MOCK_DECISIONS,
    zen_journal
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNNER SERVICE (Consumes generator)
// ─────────────────────────────────────────────────────────────────────────────

export interface RunnerCallbacks {
  onEvent: (event: RunEvent) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export async function runMockRunner(
  request: RunRequest,
  callbacks: RunnerCallbacks,
  config?: Partial<MockConfig>
): Promise<void> {
  try {
    const generator = mockRunner(request, config);
    
    for await (const event of generator) {
      callbacks.onEvent(event);
      
      if (event.type === 'RUN_COMPLETED' || event.type === 'RUN_FAILED') {
        break;
      }
    }
    
    callbacks.onComplete?.();
  } catch (error) {
    callbacks.onError?.(error as Error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function createTestRequest(overrides?: Partial<RunRequest>): RunRequest {
  return {
    input_text: 'Test input',
    tone: 'dark',
    objective: 'STANDARD',
    engine: 'standard',
    view: 'zen',
    scaffold_enabled: false,
    ...overrides
  };
}

export async function collectAllEvents(
  request: RunRequest,
  config?: Partial<MockConfig>
): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  const generator = mockRunner(request, config);
  
  for await (const event of generator) {
    events.push(event);
  }
  
  return events;
}

export default {
  mockRunner,
  runMockRunner,
  createTestRequest,
  collectAllEvents
};
