// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA REGISTRIES — PIPELINE & MODULE
// Version: 1.0.0 — NASA/SpaceX-Grade
// Invariants: REG-01 à REG-05, MREG-01 à MREG-05
// ═══════════════════════════════════════════════════════════════════════════════
import { PipelineSpecSchema, ModuleSpecSchema, CONSTANTS, } from './types';
// ═══════════════════════════════════════════════════════════════════════════════
// REASON CODES
// ═══════════════════════════════════════════════════════════════════════════════
export const REGISTRY_REASON_CODES = {
    REG_INTENT_NOT_FOUND: 'No pipeline registered for this intent',
    REG_PIPELINE_NOT_FOUND: 'Pipeline ID not found',
    REG_INVALID_SPEC: 'Pipeline specification is invalid',
    REG_MODULE_NOT_IN_CHAIN: 'Module not in allowed chain',
    REG_VERSION_MISMATCH: 'Pipeline version mismatch',
    REG_DISABLED: 'Pipeline is disabled',
};
export const MODULE_REGISTRY_REASON_CODES = {
    MREG_NOT_FOUND: 'Module not found in registry',
    MREG_DISABLED: 'Module is disabled (kill switch)',
    MREG_INTERFACE_MISMATCH: 'Module interface version mismatch',
    MREG_NOT_DETERMINISTIC: 'Module not deterministic-safe for this pipeline',
};
// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE REGISTRY ERROR
// ═══════════════════════════════════════════════════════════════════════════════
export class RegistryError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'RegistryError';
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
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
export class PipelineRegistry {
    // intent → pipeline_id
    intentMap = new Map();
    // pipeline_id → PipelineSpec
    pipelines = new Map();
    /**
     * Enregistre un pipeline
     */
    register(spec) {
        // Validate spec
        const result = PipelineSpecSchema.safeParse(spec);
        if (!result.success) {
            throw new RegistryError('REG_INVALID_SPEC', 'Invalid pipeline spec', {
                errors: result.error.errors,
            });
        }
        const validSpec = result.data;
        // Vérifier module_chain non vide
        if (validSpec.module_chain.length === 0) {
            throw new RegistryError('REG_INVALID_SPEC', 'module_chain cannot be empty');
        }
        // Vérifier contraintes explicites
        if (!validSpec.constraints) {
            throw new RegistryError('REG_INVALID_SPEC', 'constraints must be defined');
        }
        // Enregistrer
        this.pipelines.set(validSpec.pipeline_id, validSpec);
        this.intentMap.set(validSpec.intent, validSpec.pipeline_id);
    }
    /**
     * Résout un intent vers un PipelineSpec
     *
     * @returns PipelineSpec ou null si non trouvé/désactivé
     */
    resolve(intent) {
        const pipeline_id = this.intentMap.get(intent);
        if (!pipeline_id) {
            return null;
        }
        const spec = this.pipelines.get(pipeline_id);
        if (!spec) {
            return null;
        }
        // Kill switch
        if (spec.enabled === false) {
            return null;
        }
        return spec;
    }
    /**
     * Récupère un pipeline par ID
     */
    get(pipeline_id) {
        const spec = this.pipelines.get(pipeline_id);
        if (!spec) {
            return null;
        }
        if (spec.enabled === false) {
            return null;
        }
        return spec;
    }
    /**
     * Vérifie qu'un module est dans la chaîne d'un pipeline
     */
    isModuleInChain(pipeline_id, module_id_version) {
        const spec = this.pipelines.get(pipeline_id);
        if (!spec)
            return false;
        return spec.module_chain.includes(module_id_version);
    }
    /**
     * Désactive un pipeline (kill switch)
     */
    disable(pipeline_id) {
        const spec = this.pipelines.get(pipeline_id);
        if (!spec)
            return false;
        // Créer une copie avec enabled=false
        this.pipelines.set(pipeline_id, { ...spec, enabled: false });
        return true;
    }
    /**
     * Active un pipeline
     */
    enable(pipeline_id) {
        const spec = this.pipelines.get(pipeline_id);
        if (!spec)
            return false;
        this.pipelines.set(pipeline_id, { ...spec, enabled: true });
        return true;
    }
    /**
     * Liste tous les pipelines (pour debug/admin)
     */
    list() {
        return Array.from(this.pipelines.values());
    }
    /**
     * Liste les pipelines actifs
     */
    listEnabled() {
        return Array.from(this.pipelines.values()).filter(s => s.enabled !== false);
    }
    /**
     * Supprime un pipeline
     */
    unregister(pipeline_id) {
        const spec = this.pipelines.get(pipeline_id);
        if (!spec)
            return false;
        this.pipelines.delete(pipeline_id);
        this.intentMap.delete(spec.intent);
        return true;
    }
    /**
     * Nombre de pipelines enregistrés
     */
    size() {
        return this.pipelines.size;
    }
    /**
     * Vide le registre
     */
    clear() {
        this.pipelines.clear();
        this.intentMap.clear();
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
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
export class ModuleRegistry {
    // "module_id@version" → ModuleSpec
    modules = new Map();
    /**
     * Enregistre un module
     */
    register(spec) {
        // Validate spec
        const result = ModuleSpecSchema.safeParse(spec);
        if (!result.success) {
            throw new RegistryError('MREG_NOT_FOUND', 'Invalid module spec', {
                errors: result.error.errors,
            });
        }
        const validSpec = result.data;
        // Vérifier interface_version
        if (validSpec.interface_version !== CONSTANTS.INTERFACE_VERSION) {
            throw new RegistryError('MREG_INTERFACE_MISMATCH', `Interface version must be ${CONSTANTS.INTERFACE_VERSION}`, {
                expected: CONSTANTS.INTERFACE_VERSION,
                got: validSpec.interface_version,
            });
        }
        const key = `${validSpec.module_id}@${validSpec.version}`;
        this.modules.set(key, validSpec);
    }
    /**
     * Récupère un module par ID et version
     *
     * @param module_id ID du module
     * @param version Version explicite (pas de "latest")
     * @returns ModuleSpec ou null
     */
    get(module_id, version) {
        const key = `${module_id}@${version}`;
        const spec = this.modules.get(key);
        if (!spec) {
            return null;
        }
        // Kill switch
        if (spec.enabled === false) {
            return null;
        }
        return spec;
    }
    /**
     * Récupère un module par clé complète "module_id@version"
     */
    getByKey(key) {
        const spec = this.modules.get(key);
        if (!spec || spec.enabled === false) {
            return null;
        }
        return spec;
    }
    /**
     * Vérifie si un module est deterministic_safe
     */
    isDeterministicSafe(module_id, version) {
        const spec = this.get(module_id, version);
        return spec?.limits.deterministic_safe ?? false;
    }
    /**
     * Désactive un module (kill switch)
     */
    disable(module_id, version) {
        const key = `${module_id}@${version}`;
        const spec = this.modules.get(key);
        if (!spec)
            return false;
        this.modules.set(key, { ...spec, enabled: false });
        return true;
    }
    /**
     * Active un module
     */
    enable(module_id, version) {
        const key = `${module_id}@${version}`;
        const spec = this.modules.get(key);
        if (!spec)
            return false;
        this.modules.set(key, { ...spec, enabled: true });
        return true;
    }
    /**
     * Liste toutes les versions d'un module
     */
    listVersions(module_id) {
        return Array.from(this.modules.values())
            .filter(s => s.module_id === module_id);
    }
    /**
     * Liste tous les modules
     */
    list() {
        return Array.from(this.modules.values());
    }
    /**
     * Liste les modules actifs
     */
    listEnabled() {
        return Array.from(this.modules.values()).filter(s => s.enabled !== false);
    }
    /**
     * Supprime un module
     */
    unregister(module_id, version) {
        const key = `${module_id}@${version}`;
        return this.modules.delete(key);
    }
    /**
     * Nombre de modules enregistrés
     */
    size() {
        return this.modules.size;
    }
    /**
     * Vide le registre
     */
    clear() {
        this.modules.clear();
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════
export function createPipelineRegistry() {
    return new PipelineRegistry();
}
export function createModuleRegistry() {
    return new ModuleRegistry();
}
// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Parse une clé module "module_id@version"
 */
export function parseModuleKey(key) {
    const match = key.match(/^([a-z][a-z0-9_-]*)@(\d+\.\d+\.\d+)$/);
    if (!match)
        return null;
    return { module_id: match[1], version: match[2] };
}
/**
 * Crée une clé module
 */
export function createModuleKey(module_id, version) {
    return `${module_id}@${version}`;
}
//# sourceMappingURL=registry.js.map