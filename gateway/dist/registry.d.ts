import { PipelineSpec, ModuleSpec } from './types';
export declare const REGISTRY_REASON_CODES: {
    readonly REG_INTENT_NOT_FOUND: "No pipeline registered for this intent";
    readonly REG_PIPELINE_NOT_FOUND: "Pipeline ID not found";
    readonly REG_INVALID_SPEC: "Pipeline specification is invalid";
    readonly REG_MODULE_NOT_IN_CHAIN: "Module not in allowed chain";
    readonly REG_VERSION_MISMATCH: "Pipeline version mismatch";
    readonly REG_DISABLED: "Pipeline is disabled";
};
export declare const MODULE_REGISTRY_REASON_CODES: {
    readonly MREG_NOT_FOUND: "Module not found in registry";
    readonly MREG_DISABLED: "Module is disabled (kill switch)";
    readonly MREG_INTERFACE_MISMATCH: "Module interface version mismatch";
    readonly MREG_NOT_DETERMINISTIC: "Module not deterministic-safe for this pipeline";
};
export declare class RegistryError extends Error {
    readonly code: keyof typeof REGISTRY_REASON_CODES | keyof typeof MODULE_REGISTRY_REASON_CODES;
    readonly details?: Record<string, unknown> | undefined;
    constructor(code: keyof typeof REGISTRY_REASON_CODES | keyof typeof MODULE_REGISTRY_REASON_CODES, message: string, details?: Record<string, unknown> | undefined);
}
/**
 * Pipeline Registry OMEGA
 *
 * Invariants garantis:
 * - REG-01: Pipeline non déclaré = inexistant
 * - REG-02: Résolution intent → pipeline déterministe
 * - REG-03: PipelineSpec versionnée
 * - REG-04: Whitelist module_chain obligatoire
 * - REG-05: Contraintes explicites
 */
export declare class PipelineRegistry {
    private readonly intentMap;
    private readonly pipelines;
    /**
     * Enregistre un pipeline
     */
    register(spec: PipelineSpec): void;
    /**
     * Résout un intent vers un PipelineSpec
     *
     * @returns PipelineSpec ou null si non trouvé/désactivé
     */
    resolve(intent: string): PipelineSpec | null;
    /**
     * Récupère un pipeline par ID
     */
    get(pipeline_id: string): PipelineSpec | null;
    /**
     * Vérifie qu'un module est dans la chaîne d'un pipeline
     */
    isModuleInChain(pipeline_id: string, module_id_version: string): boolean;
    /**
     * Désactive un pipeline (kill switch)
     */
    disable(pipeline_id: string): boolean;
    /**
     * Active un pipeline
     */
    enable(pipeline_id: string): boolean;
    /**
     * Liste tous les pipelines (pour debug/admin)
     */
    list(): PipelineSpec[];
    /**
     * Liste les pipelines actifs
     */
    listEnabled(): PipelineSpec[];
    /**
     * Supprime un pipeline
     */
    unregister(pipeline_id: string): boolean;
    /**
     * Nombre de pipelines enregistrés
     */
    size(): number;
    /**
     * Vide le registre
     */
    clear(): void;
}
/**
 * Module Registry OMEGA
 *
 * Invariants garantis:
 * - MREG-01: Module non déclaré = inexistant
 * - MREG-02: Version explicite obligatoire (pas de "latest")
 * - MREG-03: Kill switch enabled=false bloque exécution
 * - MREG-04: interface_version strict
 * - MREG-05: Résolution déterministe
 */
export declare class ModuleRegistry {
    private readonly modules;
    /**
     * Enregistre un module
     */
    register(spec: ModuleSpec): void;
    /**
     * Récupère un module par ID et version
     *
     * @param module_id ID du module
     * @param version Version explicite (pas de "latest")
     * @returns ModuleSpec ou null
     */
    get(module_id: string, version: string): ModuleSpec | null;
    /**
     * Récupère un module par clé complète "module_id@version"
     */
    getByKey(key: string): ModuleSpec | null;
    /**
     * Vérifie si un module est deterministic_safe
     */
    isDeterministicSafe(module_id: string, version: string): boolean;
    /**
     * Désactive un module (kill switch)
     */
    disable(module_id: string, version: string): boolean;
    /**
     * Active un module
     */
    enable(module_id: string, version: string): boolean;
    /**
     * Liste toutes les versions d'un module
     */
    listVersions(module_id: string): ModuleSpec[];
    /**
     * Liste tous les modules
     */
    list(): ModuleSpec[];
    /**
     * Liste les modules actifs
     */
    listEnabled(): ModuleSpec[];
    /**
     * Supprime un module
     */
    unregister(module_id: string, version: string): boolean;
    /**
     * Nombre de modules enregistrés
     */
    size(): number;
    /**
     * Vide le registre
     */
    clear(): void;
}
export declare function createPipelineRegistry(): PipelineRegistry;
export declare function createModuleRegistry(): ModuleRegistry;
/**
 * Parse une clé module "module_id@version"
 */
export declare function parseModuleKey(key: string): {
    module_id: string;
    version: string;
} | null;
/**
 * Crée une clé module
 */
export declare function createModuleKey(module_id: string, version: string): string;
//# sourceMappingURL=registry.d.ts.map