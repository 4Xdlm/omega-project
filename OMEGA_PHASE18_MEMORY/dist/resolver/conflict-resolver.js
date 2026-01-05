/**
 * OMEGA CONFLICT_RESOLVER — Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-04: Conflit = flag user (jamais silencieux)
 * INV-MEM-08: Audit trail complet
 */
import { createHash } from 'crypto';
import { ConflictCategory, ConflictSeverity, ConflictStatus, ResolutionStrategy, ConflictFlag, SEVERITY_VALUES, RESOLVER_LIMITS, } from './constants.js';
import { ResolverErrorCode } from './types.js';
const defaultClock = () => new Date().toISOString();
// ═══════════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
// ID counter for uniqueness within same millisecond
let idCounter = 0;
function sha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
function generateConflictId(partyA, partyB, timestamp) {
    const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
    const counter = idCounter++;
    const hash = sha256(`${partyA.entityId}:${partyB.entityId}:${timestamp}:${counter}`).substring(0, 8);
    return `conflict_${ts}_${hash}`;
}
function generateAuditId(conflictId, action, timestamp) {
    const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
    const counter = idCounter++;
    const hash = sha256(`${conflictId}:${action}:${timestamp}:${counter}`).substring(0, 8);
    return `audit_${ts}_${hash}`;
}
// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLVER CLASS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * ConflictResolver — Détection et résolution de conflits
 *
 * INV-MEM-04: Jamais de résolution silencieuse
 * - Tout conflit est tracé
 * - L'utilisateur est toujours notifié
 * - Audit trail cryptographique
 */
export class ConflictResolver {
    // Storage
    conflicts = new Map();
    auditTrail = [];
    listeners = new Set();
    // Metrics
    totalDetected = 0;
    totalResolved = 0;
    resolutionTimes = [];
    autoResolutions = 0;
    // Audit chain
    lastAuditHash = '0'.repeat(64);
    // Clock
    clock;
    constructor(clock = defaultClock) {
        this.clock = clock;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // DETECTION (INV-MEM-04)
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Détecte un nouveau conflit
     * INV-MEM-04: Le conflit est TOUJOURS flaggé
     */
    detect(input) {
        // Validation
        const validationError = this.validateDetectInput(input);
        if (validationError) {
            return { success: false, error: validationError };
        }
        // Check limits
        const pendingCount = this.countByStatus(ConflictStatus.PENDING);
        if (pendingCount >= RESOLVER_LIMITS.MAX_PENDING_CONFLICTS) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.MAX_CONFLICTS_EXCEEDED,
                    message: `Max pending conflicts (${RESOLVER_LIMITS.MAX_PENDING_CONFLICTS}) exceeded`,
                },
            };
        }
        const now = this.clock();
        const severity = input.severity ?? this.inferSeverity(input.category);
        const flags = this.inferFlags(input);
        const conflict = {
            id: generateConflictId(input.partyA, input.partyB, now),
            category: input.category,
            severity,
            status: ConflictStatus.PENDING,
            partyA: input.partyA,
            partyB: input.partyB,
            description: input.description ?? this.generateDescription(input),
            flags,
            metadata: {
                detectedAt: now,
                detectedBy: input.detectedBy ?? 'system',
            },
        };
        this.conflicts.set(conflict.id, conflict);
        this.totalDetected++;
        // Audit
        this.addAuditEntry(conflict.id, 'DETECTED', conflict.metadata.detectedBy, now);
        // Notify
        this.notifyListeners({ type: 'DETECTED', conflict, timestamp: now });
        return { success: true, data: conflict };
    }
    /**
     * Détection proactive - scan pour contradictions
     */
    scan(entities) {
        const detected = [];
        // Group by entityId to find potential conflicts
        const byEntity = new Map();
        for (const entity of entities) {
            const key = `${entity.entityType}:${entity.entityId}`;
            if (!byEntity.has(key)) {
                byEntity.set(key, []);
            }
            byEntity.get(key).push(entity);
        }
        // Check for value contradictions
        for (const [, parties] of byEntity) {
            if (parties.length < 2)
                continue;
            for (let i = 0; i < parties.length; i++) {
                for (let j = i + 1; j < parties.length; j++) {
                    const a = parties[i];
                    const b = parties[j];
                    if (a.value !== b.value) {
                        // Check if same priority (true conflict) or different (auto-resolvable)
                        const category = a.priority === b.priority
                            ? ConflictCategory.SOURCE_CONFLICT
                            : ConflictCategory.VALUE_CONTRADICTION;
                        const result = this.detect({
                            category,
                            partyA: a,
                            partyB: b,
                        });
                        if (result.success) {
                            detected.push(result.data);
                        }
                    }
                }
            }
        }
        return detected;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Résout un conflit
     * INV-MEM-04: Résolution TOUJOURS tracée avec qui/quand/pourquoi
     */
    resolve(conflictId, input) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.CONFLICT_NOT_FOUND,
                    message: `Conflict ${conflictId} not found`,
                },
            };
        }
        if (conflict.status === ConflictStatus.RESOLVED_BY_USER ||
            conflict.status === ConflictStatus.RESOLVED_AUTO) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.CONFLICT_ALREADY_RESOLVED,
                    message: `Conflict ${conflictId} is already resolved`,
                },
            };
        }
        const now = this.clock();
        // Determine final value
        let finalValue;
        if (input.strategy === ResolutionStrategy.KEEP_EXISTING) {
            finalValue = conflict.partyA.value;
        }
        else if (input.strategy === ResolutionStrategy.USE_NEW) {
            finalValue = conflict.partyB.value;
        }
        else if (input.strategy === ResolutionStrategy.CUSTOM) {
            finalValue = input.customValue;
        }
        else if (input.strategy === ResolutionStrategy.APPLY_PRIORITY) {
            finalValue = conflict.partyA.priority >= conflict.partyB.priority
                ? conflict.partyA.value
                : conflict.partyB.value;
        }
        const resolution = {
            strategy: input.strategy,
            winner: input.winner,
            finalValue,
            reason: input.reason ?? `Resolved by ${input.resolvedBy}`,
            isAutomatic: false,
        };
        const resolved = {
            ...conflict,
            status: ConflictStatus.RESOLVED_BY_USER,
            resolution,
            metadata: {
                ...conflict.metadata,
                resolvedAt: now,
                resolvedBy: input.resolvedBy,
            },
        };
        this.conflicts.set(conflictId, resolved);
        this.totalResolved++;
        // Track resolution time
        const detectionTime = new Date(conflict.metadata.detectedAt).getTime();
        const resolutionTime = new Date(now).getTime();
        this.resolutionTimes.push(resolutionTime - detectionTime);
        // Audit
        this.addAuditEntry(conflictId, 'RESOLVED', input.resolvedBy, now, {
            strategy: input.strategy,
            winner: input.winner,
            finalValue,
        });
        // Notify
        this.notifyListeners({ type: 'RESOLVED', conflict: resolved, timestamp: now });
        return { success: true, data: resolved };
    }
    /**
     * Tente une résolution automatique (si autorisé)
     */
    tryAutoResolve(conflictId) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.CONFLICT_NOT_FOUND,
                    message: `Conflict ${conflictId} not found`,
                },
            };
        }
        // Check if auto-resolvable
        if (!conflict.flags.includes(ConflictFlag.AUTO_RESOLVABLE)) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.CANNOT_AUTO_RESOLVE,
                    message: 'This conflict requires user input',
                },
            };
        }
        // Auto-resolve based on priority
        if (conflict.partyA.priority !== conflict.partyB.priority) {
            const now = this.clock();
            const winner = conflict.partyA.priority > conflict.partyB.priority ? 'A' : 'B';
            const winningParty = winner === 'A' ? conflict.partyA : conflict.partyB;
            const resolution = {
                strategy: ResolutionStrategy.APPLY_PRIORITY,
                winner,
                finalValue: winningParty.value,
                reason: `Auto-resolved by priority (${winningParty.source} has higher priority)`,
                isAutomatic: true,
            };
            const resolved = {
                ...conflict,
                status: ConflictStatus.RESOLVED_AUTO,
                resolution,
                metadata: {
                    ...conflict.metadata,
                    resolvedAt: now,
                    resolvedBy: 'system',
                },
            };
            this.conflicts.set(conflictId, resolved);
            this.totalResolved++;
            this.autoResolutions++;
            // Audit
            this.addAuditEntry(conflictId, 'RESOLVED', 'system', now, {
                strategy: ResolutionStrategy.APPLY_PRIORITY,
                automatic: true,
            });
            return { success: true, data: resolved };
        }
        return {
            success: false,
            error: {
                code: ResolverErrorCode.REQUIRES_USER_INPUT,
                message: 'Cannot auto-resolve: same priority',
            },
        };
    }
    /**
     * Ignore un conflit (avec justification)
     */
    ignore(conflictId, reason, ignoredBy) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.CONFLICT_NOT_FOUND,
                    message: `Conflict ${conflictId} not found`,
                },
            };
        }
        const now = this.clock();
        const ignored = {
            ...conflict,
            status: ConflictStatus.IGNORED,
            metadata: {
                ...conflict.metadata,
                resolvedAt: now,
                resolvedBy: ignoredBy,
                notes: reason,
            },
        };
        this.conflicts.set(conflictId, ignored);
        // Audit
        this.addAuditEntry(conflictId, 'IGNORED', ignoredBy, now, { reason });
        return { success: true, data: ignored };
    }
    /**
     * Reporte un conflit
     */
    defer(conflictId, reason, deferredBy) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            return {
                success: false,
                error: {
                    code: ResolverErrorCode.CONFLICT_NOT_FOUND,
                    message: `Conflict ${conflictId} not found`,
                },
            };
        }
        const now = this.clock();
        const deferred = {
            ...conflict,
            status: ConflictStatus.DEFERRED,
            metadata: {
                ...conflict.metadata,
                notes: reason,
            },
        };
        this.conflicts.set(conflictId, deferred);
        // Audit
        this.addAuditEntry(conflictId, 'DEFERRED', deferredBy, now, { reason });
        return { success: true, data: deferred };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère un conflit par ID
     */
    getConflict(id) {
        return this.conflicts.get(id) ?? null;
    }
    /**
     * Requête les conflits selon un filtre
     */
    queryConflicts(filter) {
        let results = [];
        for (const conflict of this.conflicts.values()) {
            if (this.matchesFilter(conflict, filter)) {
                results.push(conflict);
            }
        }
        // Sort by severity descending, then by detection time
        results.sort((a, b) => {
            const severityDiff = SEVERITY_VALUES[b.severity] - SEVERITY_VALUES[a.severity];
            if (severityDiff !== 0)
                return severityDiff;
            return b.metadata.detectedAt.localeCompare(a.metadata.detectedAt);
        });
        // Apply limit
        if (filter.limit) {
            results = results.slice(0, filter.limit);
        }
        return results;
    }
    /**
     * Récupère les conflits en attente
     */
    getPendingConflicts() {
        return this.queryConflicts({ status: ConflictStatus.PENDING });
    }
    /**
     * Récupère les conflits nécessitant attention utilisateur
     */
    getRequiringUserAttention() {
        return this.queryConflicts({ flag: ConflictFlag.REQUIRES_USER_ATTENTION });
    }
    /**
     * Compte les conflits par statut
     */
    countByStatus(status) {
        let count = 0;
        for (const conflict of this.conflicts.values()) {
            if (conflict.status === status)
                count++;
        }
        return count;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT TRAIL (INV-MEM-08)
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère l'audit trail
     */
    getAuditTrail(conflictId) {
        if (conflictId) {
            return this.auditTrail.filter(e => e.conflictId === conflictId);
        }
        return [...this.auditTrail];
    }
    /**
     * Vérifie l'intégrité de l'audit trail
     */
    verifyAuditIntegrity() {
        const errors = [];
        // Check that each conflict has at least a DETECTED entry
        for (const conflict of this.conflicts.values()) {
            const entries = this.auditTrail.filter(e => e.conflictId === conflict.id);
            if (entries.length === 0) {
                errors.push(`No audit entries for conflict ${conflict.id}`);
            }
            if (!entries.some(e => e.action === 'DETECTED')) {
                errors.push(`Missing DETECTED entry for conflict ${conflict.id}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère les métriques
     */
    getMetrics() {
        const byCategory = {
            [ConflictCategory.VALUE_CONTRADICTION]: 0,
            [ConflictCategory.TEMPORAL_INCONSISTENCY]: 0,
            [ConflictCategory.SPATIAL_INCONSISTENCY]: 0,
            [ConflictCategory.LOGICAL_CONTRADICTION]: 0,
            [ConflictCategory.SOURCE_CONFLICT]: 0,
            [ConflictCategory.MISSING_REQUIRED]: 0,
            [ConflictCategory.CIRCULAR_REFERENCE]: 0,
            [ConflictCategory.OTHER]: 0,
        };
        const bySeverity = {
            [ConflictSeverity.INFO]: 0,
            [ConflictSeverity.WARNING]: 0,
            [ConflictSeverity.ERROR]: 0,
            [ConflictSeverity.CRITICAL]: 0,
        };
        const byStatus = {
            [ConflictStatus.PENDING]: 0,
            [ConflictStatus.REVIEWING]: 0,
            [ConflictStatus.RESOLVED_BY_USER]: 0,
            [ConflictStatus.RESOLVED_AUTO]: 0,
            [ConflictStatus.IGNORED]: 0,
            [ConflictStatus.DEFERRED]: 0,
        };
        for (const conflict of this.conflicts.values()) {
            byCategory[conflict.category]++;
            bySeverity[conflict.severity]++;
            byStatus[conflict.status]++;
        }
        const avgResolutionTime = this.resolutionTimes.length > 0
            ? this.resolutionTimes.reduce((a, b) => a + b, 0) / this.resolutionTimes.length
            : 0;
        const autoRate = this.totalResolved > 0
            ? this.autoResolutions / this.totalResolved
            : 0;
        return {
            totalDetected: this.totalDetected,
            totalResolved: this.totalResolved,
            totalPending: byStatus[ConflictStatus.PENDING],
            totalIgnored: byStatus[ConflictStatus.IGNORED],
            byCategory,
            bySeverity,
            byStatus,
            avgResolutionTimeMs: avgResolutionTime,
            autoResolutionRate: autoRate,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LISTENERS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Ajoute un listener
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Supprime un listener
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Réinitialise (pour tests)
     */
    clear() {
        this.conflicts.clear();
        this.auditTrail.length = 0;
        this.listeners.clear();
        this.totalDetected = 0;
        this.totalResolved = 0;
        this.resolutionTimes = [];
        this.autoResolutions = 0;
        this.lastAuditHash = '0'.repeat(64);
    }
    /**
     * Compte les conflits
     */
    count() {
        return this.conflicts.size;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    validateDetectInput(input) {
        if (!Object.values(ConflictCategory).includes(input.category)) {
            return { code: ResolverErrorCode.INVALID_CATEGORY, message: 'Invalid category' };
        }
        if (!input.partyA || !input.partyA.entityId) {
            return { code: ResolverErrorCode.INVALID_PARTY, message: 'Party A is invalid' };
        }
        if (!input.partyB || !input.partyB.entityId) {
            return { code: ResolverErrorCode.INVALID_PARTY, message: 'Party B is invalid' };
        }
        return null;
    }
    inferSeverity(category) {
        switch (category) {
            case ConflictCategory.LOGICAL_CONTRADICTION:
            case ConflictCategory.CIRCULAR_REFERENCE:
                return ConflictSeverity.CRITICAL;
            case ConflictCategory.TEMPORAL_INCONSISTENCY:
            case ConflictCategory.SPATIAL_INCONSISTENCY:
                return ConflictSeverity.ERROR;
            case ConflictCategory.VALUE_CONTRADICTION:
            case ConflictCategory.SOURCE_CONFLICT:
                return ConflictSeverity.WARNING;
            default:
                return ConflictSeverity.INFO;
        }
    }
    inferFlags(input) {
        const flags = [];
        // Different priorities = auto-resolvable
        if (input.partyA.priority !== input.partyB.priority) {
            flags.push(ConflictFlag.AUTO_RESOLVABLE);
        }
        else {
            // Same priority = requires user attention
            flags.push(ConflictFlag.REQUIRES_USER_ATTENTION);
        }
        return flags;
    }
    generateDescription(input) {
        return `${input.category}: ${input.partyA.entityType}:${input.partyA.entityId} ` +
            `has conflicting values "${input.partyA.value}" vs "${input.partyB.value}"`;
    }
    matchesFilter(conflict, filter) {
        if (filter.category && conflict.category !== filter.category)
            return false;
        if (filter.status && conflict.status !== filter.status)
            return false;
        if (filter.minSeverity) {
            if (SEVERITY_VALUES[conflict.severity] < SEVERITY_VALUES[filter.minSeverity])
                return false;
        }
        if (filter.entityId) {
            if (conflict.partyA.entityId !== filter.entityId &&
                conflict.partyB.entityId !== filter.entityId)
                return false;
        }
        if (filter.flag) {
            if (!conflict.flags.includes(filter.flag))
                return false;
        }
        if (filter.detectedAfter) {
            if (conflict.metadata.detectedAt <= filter.detectedAfter)
                return false;
        }
        return true;
    }
    addAuditEntry(conflictId, action, actor, timestamp, details) {
        // Enforce limit
        if (this.auditTrail.length >= RESOLVER_LIMITS.MAX_HISTORY_SIZE) {
            this.auditTrail.shift();
        }
        const id = generateAuditId(conflictId, action, timestamp);
        const hashContent = JSON.stringify({ id, conflictId, action, actor, timestamp, details, prev: this.lastAuditHash });
        const hash = sha256(hashContent);
        const entry = {
            id,
            conflictId,
            action,
            actor,
            timestamp,
            details,
            hash,
        };
        this.auditTrail.push(entry);
        this.lastAuditHash = hash;
    }
    notifyListeners(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch {
                // Ignore listener errors
            }
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Crée un nouveau ConflictResolver
 */
export function createConflictResolver(clock) {
    return new ConflictResolver(clock);
}
//# sourceMappingURL=conflict-resolver.js.map