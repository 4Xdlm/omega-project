# @omega/integration-nexus-dep — API REFERENCE
## Version: 0.7.0 | Standard: NASA-Grade L4

---

## CONTRACTS

### NexusRequest

```typescript
interface NexusRequest<T = unknown> {
  readonly id: string;           // Unique request identifier
  readonly operation: NexusOperationType;
  readonly payload: T;
  readonly timestamp: string;    // ISO 8601
  readonly metadata?: RequestMetadata;
}
```

### NexusResponse

```typescript
interface NexusResponse<T = unknown> {
  readonly success: boolean;
  readonly requestId: string;    // Matches request.id
  readonly data?: T;
  readonly error?: NexusError;
  readonly executionTrace?: ExecutionTrace;
}
```

### NexusOperationType

```typescript
type NexusOperationType =
  | "ANALYZE_TEXT"
  | "VALIDATE_INPUT"
  | "COMPUTE_FINGERPRINT"
  | "COMPARE_TEXTS"
  | "BATCH_ANALYZE";
```

---

## ADAPTERS

### GenomeAdapter

READ-ONLY adapter for Genome module integration.

```typescript
const adapter = createGenomeAdapter();

// Analyze text
const result = await adapter.analyzeText(text: string, seed?: number);
// Returns: { fingerprint: string, analysis: AnalysisResult }

// Compute fingerprint
const fingerprint = await adapter.computeFingerprint(content: string, seed?: number);
// Returns: string (16-char hex)

// Compare texts
const similarity = await adapter.compareTexts(text1: string, text2: string);
// Returns: { similarity: number, verdict: string }
```

### MyceliumAdapter

READ-ONLY adapter for Mycelium module integration.

```typescript
const adapter = createMyceliumAdapter();

// Validate input
const result = await adapter.validateInput(input: unknown);
// Returns: { valid: boolean, errors?: string[] }

// Get validation rules
const rules = adapter.getValidationRules();
// Returns: ValidationRule[]
```

---

## ROUTER

### DefaultRouter

Request dispatcher with execution tracing.

```typescript
const router = createDefaultRouter(options?: RouterOptions);

// Dispatch request
const response = await router.dispatch(request: NexusRequest);
// Returns: NexusResponse

// Register handler
router.register(operation: NexusOperationType, handler: Handler);

// Get registered operations
const ops = router.getOperations();
// Returns: NexusOperationType[]
```

---

## TRANSLATORS

### InputTranslator

Normalizes input data for processing.

```typescript
const translator = createInputTranslator(options?: TranslatorOptions);

// Translate input
const normalized = translator.translate(input: string);
// Returns: { content: string, metadata: InputMetadata }
```

### OutputTranslator

Formats responses for output.

```typescript
const translator = createOutputTranslator(options?: TranslatorOptions);

// Format response
const formatted = translator.format(response: NexusResponse);
// Returns: FormattedResponse
```

---

## CONNECTORS

### FileConnector

Filesystem integration (skeleton).

```typescript
const connector = createFileConnector(options?: FileConnectorOptions);

// Read file
const content = connector.read(path: string);
// Returns: string | undefined

// Write file
const success = connector.write(path: string, content: string);
// Returns: boolean

// Check existence
const exists = connector.exists(path: string);
// Returns: boolean
```

### CLIConnector

Command-line argument parsing.

```typescript
const connector = createCLIConnector();

// Parse arguments
const args = connector.parse(argv: string[]);
// Returns: { command: string, flags: Set<string>, options: Map<string, string> }

// Build command
const cmd = connector.build({ command: string, args: string[] });
// Returns: string
```

---

## PIPELINE

### PipelineBuilder

Fluent pipeline construction.

```typescript
const pipeline = createPipeline(name: string)
  .stage("validate", async (input) => { ... })
  .stage("transform", async (input) => { ... })
  .stage("output", async (input) => { ... })
  .build();
// Returns: PipelineDefinition
```

### PipelineExecutor

Executes pipeline definitions.

```typescript
const executor = createPipelineExecutor(options?: ExecutorOptions);

// Execute pipeline
const result = await executor.execute(pipeline: PipelineDefinition, input: unknown);
// Returns: PipelineResult

// PipelineResult contains:
// - status: "completed" | "failed"
// - stages: StageResult[]
// - finalOutput: unknown
// - error?: PipelineError
```

### Pre-built Pipelines

```typescript
// Validation pipeline
const pipeline = createValidationPipeline();

// Analysis pipeline
const pipeline = createAnalysisPipeline();
```

---

## SCHEDULER

### JobScheduler

Priority-based job scheduling with policies.

```typescript
const scheduler = createScheduler(options?: SchedulerOptions);

// Submit job
const jobId = scheduler.submit(name: string, pipeline: PipelineDefinition, input: unknown, options?: JobOptions);
// Returns: string (job ID)

// Wait for completion
const state = await scheduler.waitFor(jobId: string, timeoutMs?: number);
// Returns: JobState

// Cancel job
const cancelled = scheduler.cancel(jobId: string);
// Returns: boolean

// Get statistics
const stats = scheduler.getStats();
// Returns: QueueStats

// Cleanup terminal jobs
const removed = scheduler.cleanup();
// Returns: number
```

### Policies

```typescript
// Max queue policy
const policy = createMaxQueuePolicy(limit: number);

// Apply to scheduler
const scheduler = createScheduler({
  maxConcurrent: 10,
  policies: [policy]
});
```

---

## FACTORY FUNCTIONS

| Function | Returns | Description |
|----------|---------|-------------|
| `createNexusRequest(op, payload)` | NexusRequest | Create request with unique ID |
| `createGenomeAdapter()` | GenomeAdapter | Genome module adapter |
| `createMyceliumAdapter()` | MyceliumAdapter | Mycelium module adapter |
| `createDefaultRouter(opts?)` | DefaultRouter | Request router |
| `createInputTranslator(opts?)` | InputTranslator | Input normalizer |
| `createOutputTranslator(opts?)` | OutputTranslator | Output formatter |
| `createFileConnector(opts?)` | FileConnector | File system connector |
| `createCLIConnector()` | CLIConnector | CLI argument parser |
| `createPipeline(name)` | PipelineBuilder | Pipeline builder |
| `createPipelineExecutor(opts?)` | PipelineExecutor | Pipeline executor |
| `createValidationPipeline()` | PipelineDefinition | Pre-built validation |
| `createAnalysisPipeline()` | PipelineDefinition | Pre-built analysis |
| `createScheduler(opts?)` | JobScheduler | Job scheduler |
| `createMaxQueuePolicy(limit)` | Policy | Queue limit policy |

---

## TYPE EXPORTS

All types are exported from the package root:

```typescript
import type {
  NexusRequest,
  NexusResponse,
  NexusOperationType,
  NexusError,
  ExecutionTrace,
  AnalysisResult,
  ValidationResult,
  PipelineDefinition,
  PipelineResult,
  StageResult,
  JobState,
  JobPriority,
  QueueStats,
  Policy,
  RouterOptions,
  SchedulerOptions,
  ExecutorOptions
} from "@omega/integration-nexus-dep";
```
