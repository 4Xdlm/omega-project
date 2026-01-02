import { ExecutionMode, ExecutionReport, PipelineSpec, OmegaModule } from './types';
import { ModuleRegistry } from './registry';
import { AuditAppender } from './gateway';
export declare const ORCHESTRATOR_REASON_CODES: {
    readonly ORCH_NO_TOKEN: "Missing execution token";
    readonly ORCH_NO_SPEC: "Missing pipeline spec";
    readonly ORCH_BAD_DEADLINE: "Invalid max_runtime_ms";
    readonly ORCH_EMPTY_CHAIN: "module_chain is empty";
    readonly ORCH_MODULE_NOT_FOUND: "Module not found in registry";
    readonly ORCH_DET_UNSAFE_MODULE: "Module not deterministic-safe";
    readonly ORCH_STEP_CRASH: "Module crashed during execution";
    readonly ORCH_TIMEOUT: "Execution exceeded deadline";
    readonly ORCH_STATE_VIOLATION: "Invalid state transition attempted";
    readonly ORCH_VALIDATION_FAILED: "Module validation failed";
    readonly ORCH_CANCELLED: "Execution was cancelled";
};
export type OrchestratorReasonCode = keyof typeof ORCHESTRATOR_REASON_CODES;
export declare class OrchestratorError extends Error {
    readonly code: OrchestratorReasonCode;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: OrchestratorReasonCode, message: string, details?: Record<string, unknown> | undefined);
}
export interface ModuleLoader {
    load(module_id: string, version: string): Promise<OmegaModule<unknown, unknown> | null>;
}
export interface OrchestratorRequest {
    execution_token: string;
    pipeline_spec: PipelineSpec;
    payload: unknown;
    mode: ExecutionMode;
    trace: boolean;
}
export declare class Orchestrator {
    private readonly moduleRegistry;
    private readonly moduleLoader;
    private readonly audit;
    private cancelled;
    constructor(moduleRegistry: ModuleRegistry, moduleLoader: ModuleLoader, audit: AuditAppender);
    execute(request: OrchestratorRequest): Promise<ExecutionReport>;
    cancel(execution_token: string): void;
    private transition;
    private completeExecution;
    private failExecution;
    private timeoutExecution;
    private cancelExecution;
    private executeWithTimeout;
    private createContext;
    private auditAppend;
}
export declare function createOrchestrator(moduleRegistry: ModuleRegistry, moduleLoader: ModuleLoader, audit: AuditAppender): Orchestrator;
export declare class MockModuleLoader implements ModuleLoader {
    private modules;
    register(module_id: string, version: string, module: OmegaModule<unknown, unknown>): void;
    load(module_id: string, version: string): Promise<OmegaModule<unknown, unknown> | null>;
}
export declare function createPassthroughModule(id: string, version: string): OmegaModule<unknown, unknown>;
export declare function createFailingModule(id: string, version: string, errorCode?: string): OmegaModule<unknown, unknown>;
export declare function createSlowModule(id: string, version: string, delayMs: number): OmegaModule<unknown, unknown>;
//# sourceMappingURL=orchestrator.d.ts.map