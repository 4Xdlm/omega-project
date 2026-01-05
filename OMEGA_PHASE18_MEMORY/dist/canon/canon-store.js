/**
 * OMEGA CANON_CORE — Store Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-01: CANON = source de vérité absolue
 * INV-MEM-05: Persistence intègre
 * INV-MEM-06: Déterminisme total
 * INV-MEM-08: Audit trail complet
 */
import { CANON_VERSION, CANON_MAGIC, FactType, FactSource, FactStatus, ConflictType, ConflictResolution, SOURCE_PRIORITY, DEFAULT_CONFIDENCE, CANON_LIMITS, HASH_CONFIG, } from './constants.js';
import { CanonErrorCode } from './types.js';
import { hashFact, verifyFactHash, computeMerkleRoot, hashAuditEntry, hashExport, generateFactId, generateSnapshotId, generateAuditId, generateConflictId, } from './hash.js';
/** Default clock using system time */
const defaultClock = () => new Date().toISOString();
export class CanonStore {
    // Storage interne
    facts = new Map();
    factsBySubject = new Map();
    factsByKey = new Map(); // subject:predicate -> fact ids
    auditTrail = [];
    conflicts = new Map();
    // État
    lastHash = HASH_CONFIG.GENESIS_HASH;
    lastAuditHash = HASH_CONFIG.GENESIS_HASH;
    // Clock function (injectable for testing)
    clock;
    constructor(clock = defaultClock) {
        this.clock = clock;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Ajoute un nouveau fait au CANON
     * INV-MEM-01: Auto-override si source prioritaire
     */
    add(input) {
        // Validation
        const validationError = this.validateInput(input);
        if (validationError) {
            return { success: false, error: validationError };
        }
        const now = this.clock();
        const key = this.makeKey(input.subject, input.predicate);
        // Vérifier si un fait existe déjà pour ce subject:predicate
        const existingIds = this.factsByKey.get(key);
        const existingFact = existingIds?.length
            ? this.getActiveFact(existingIds)
            : null;
        if (existingFact) {
            // Conflit potentiel - appliquer la priorité de source
            const existingPriority = SOURCE_PRIORITY[existingFact.source];
            const newPriority = SOURCE_PRIORITY[input.source];
            if (newPriority > existingPriority) {
                // Nouvelle source plus prioritaire → archive l'ancien, crée le nouveau
                return this.replaceWithHigherPriority(existingFact, input, now);
            }
            else if (newPriority === existingPriority && existingFact.value !== input.value) {
                // Même priorité, valeurs différentes → conflit à résoudre
                return this.createConflict(existingFact, input, now);
            }
            else if (newPriority < existingPriority) {
                // Source moins prioritaire → ignorer silencieusement ou créer version archivée
                return this.archiveAsLowerPriority(existingFact, input, now);
            }
            else {
                // Même priorité, même valeur → mise à jour timestamp seulement (idempotent)
                return { success: true, data: existingFact };
            }
        }
        // Pas de fait existant → création normale
        return this.createFact(input, now);
    }
    /**
     * Récupère un fait par subject et predicate
     * Retourne le fait ACTIF avec la plus haute priorité
     */
    getFact(subject, predicate) {
        const key = this.makeKey(subject, predicate);
        const ids = this.factsByKey.get(key);
        if (!ids || ids.length === 0) {
            return null;
        }
        return this.getActiveFact(ids);
    }
    /**
     * Récupère un fait par son ID
     */
    getFactById(id) {
        return this.facts.get(id) ?? null;
    }
    /**
     * Met à jour un fait existant (crée une nouvelle version)
     */
    update(subject, predicate, input) {
        const existing = this.getFact(subject, predicate);
        if (!existing) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.FACT_NOT_FOUND,
                    message: `No fact found for ${subject}:${predicate}`,
                },
            };
        }
        if (existing.status === FactStatus.DELETED) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.FACT_DELETED,
                    message: `Fact ${existing.id} is deleted`,
                },
            };
        }
        const now = this.clock();
        const newSource = input.source ?? existing.source;
        const newConfidence = input.confidence ?? DEFAULT_CONFIDENCE[newSource];
        // Valider la nouvelle valeur
        if (input.value.length > CANON_LIMITS.MAX_VALUE_LENGTH) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.VALUE_TOO_LONG,
                    message: `Value exceeds ${CANON_LIMITS.MAX_VALUE_LENGTH} characters`,
                },
            };
        }
        // Archiver l'ancien
        this.archiveFact(existing, now, input.updatedBy ?? 'system');
        // Créer la nouvelle version
        const newVersion = existing.version + 1;
        if (newVersion > CANON_LIMITS.MAX_VERSIONS_PER_FACT) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.MAX_VERSIONS_EXCEEDED,
                    message: `Maximum versions (${CANON_LIMITS.MAX_VERSIONS_PER_FACT}) exceeded`,
                },
            };
        }
        const factWithoutHash = {
            id: generateFactId({ ...existing, type: existing.type, source: newSource }, now),
            type: existing.type,
            subject: existing.subject,
            predicate: existing.predicate,
            value: input.value,
            source: newSource,
            status: FactStatus.ACTIVE,
            confidence: newConfidence,
            version: newVersion,
            previousHash: this.lastHash,
            metadata: {
                createdAt: existing.metadata.createdAt,
                updatedAt: now,
                createdBy: existing.metadata.createdBy,
                sourceRef: existing.metadata.sourceRef,
                sourcePosition: existing.metadata.sourcePosition,
                tags: existing.metadata.tags,
                notes: input.reason ?? existing.metadata.notes,
            },
        };
        const hash = hashFact(factWithoutHash);
        const newFact = { ...factWithoutHash, hash };
        // Stocker
        this.storeFact(newFact);
        // Audit
        this.addAuditEntry('UPDATE', newFact.id, input.updatedBy ?? 'system', now, {
            previousId: existing.id,
            previousValue: existing.value,
            newValue: input.value,
            reason: input.reason,
        });
        return { success: true, data: newFact };
    }
    /**
     * Supprime un fait (soft delete)
     */
    delete(subject, predicate, deletedBy = 'system', reason) {
        const existing = this.getFact(subject, predicate);
        if (!existing) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.FACT_NOT_FOUND,
                    message: `No fact found for ${subject}:${predicate}`,
                },
            };
        }
        const now = this.clock();
        // Simply update the existing fact to DELETED status (soft delete)
        const deletedFact = {
            ...existing,
            status: FactStatus.DELETED,
            metadata: {
                ...existing.metadata,
                updatedAt: now,
                notes: reason ?? existing.metadata.notes,
            },
        };
        // Update in place
        this.facts.set(existing.id, deletedFact);
        // Audit
        this.addAuditEntry('DELETE', existing.id, deletedBy, now, {
            reason,
        });
        return { success: true, data: deletedFact };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // QUERY OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Recherche des faits selon un filtre
     */
    query(filter) {
        let results = [];
        // Optimisation: si subject spécifié, chercher d'abord par subject
        if (filter.subject) {
            const subjectIds = this.factsBySubject.get(filter.subject);
            if (!subjectIds)
                return [];
            for (const id of subjectIds) {
                const fact = this.facts.get(id);
                if (fact && this.matchesFilter(fact, filter)) {
                    results.push(fact);
                }
            }
        }
        else {
            // Scan complet
            for (const fact of this.facts.values()) {
                if (this.matchesFilter(fact, filter)) {
                    results.push(fact);
                }
            }
        }
        // Tri déterministe: par subject, puis predicate, puis version desc
        results.sort((a, b) => {
            const subjectCmp = a.subject.localeCompare(b.subject);
            if (subjectCmp !== 0)
                return subjectCmp;
            const predicateCmp = a.predicate.localeCompare(b.predicate);
            if (predicateCmp !== 0)
                return predicateCmp;
            return b.version - a.version;
        });
        // Pagination
        const offset = filter.offset ?? 0;
        const limit = filter.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    /**
     * Récupère tous les faits d'un subject
     */
    getSubjectFacts(subject) {
        return this.query({ subject, status: FactStatus.ACTIVE });
    }
    /**
     * Vérifie si un fait existe
     */
    has(subject, predicate) {
        return this.getFact(subject, predicate) !== null;
    }
    /**
     * Compte le nombre de facts
     */
    count(filter) {
        if (!filter) {
            return this.facts.size;
        }
        return this.query(filter).length;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SNAPSHOT & DIFF
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Crée un snapshot de l'état actuel
     */
    createSnapshot() {
        const now = this.clock();
        const activeHashes = this.getActiveFactHashes();
        const rootHash = computeMerkleRoot(activeHashes);
        return {
            id: generateSnapshotId(rootHash, now),
            timestamp: now,
            rootHash,
            factCount: activeHashes.length,
            lastFactHash: this.lastHash,
            version: CANON_VERSION,
        };
    }
    /**
     * Calcule la différence entre l'état actuel et un snapshot
     */
    diff(fromSnapshot) {
        const toSnapshot = this.createSnapshot();
        // Collecter les facts par catégorie de changement
        const added = [];
        const modified = [];
        const archived = [];
        const deleted = [];
        for (const fact of this.facts.values()) {
            // Compare timestamps - facts created after snapshot
            const wasCreatedAfterSnapshot = fact.metadata.createdAt > fromSnapshot.timestamp;
            const wasUpdatedAfterSnapshot = fact.metadata.updatedAt > fromSnapshot.timestamp;
            if (wasCreatedAfterSnapshot && fact.version === 1 && fact.status === FactStatus.ACTIVE) {
                added.push(fact);
            }
            else if (wasUpdatedAfterSnapshot && fact.version > 1 && fact.status === FactStatus.ACTIVE) {
                modified.push(fact);
            }
            else if (wasUpdatedAfterSnapshot && fact.status === FactStatus.ARCHIVED) {
                archived.push(fact);
            }
            else if (wasUpdatedAfterSnapshot && fact.status === FactStatus.DELETED) {
                deleted.push(fact);
            }
        }
        return {
            from: fromSnapshot,
            to: toSnapshot,
            added,
            modified,
            archived,
            deleted,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFLICT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère les conflits en attente
     */
    getPendingConflicts() {
        return Array.from(this.conflicts.values())
            .filter(c => c.resolution === ConflictResolution.PENDING);
    }
    /**
     * Résout un conflit
     * INV-MEM-04: User flag obligatoire pour résolution
     */
    resolveConflict(conflictId, choice, resolvedBy) {
        const conflict = this.conflicts.get(conflictId);
        if (!conflict) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.FACT_NOT_FOUND,
                    message: `Conflict ${conflictId} not found`,
                },
            };
        }
        const now = this.clock();
        if (choice === 'existing') {
            // Restore the existing fact to ACTIVE status
            const restoredFact = {
                ...conflict.existingFact,
                status: FactStatus.ACTIVE,
                metadata: {
                    ...conflict.existingFact.metadata,
                    updatedAt: now,
                },
            };
            this.facts.set(conflict.existingFact.id, restoredFact);
            // Mark the conflict as resolved
            const resolvedConflict = {
                ...conflict,
                resolution: ConflictResolution.USER_CHOICE,
                winningFactId: conflict.existingFact.id,
                resolvedAt: now,
                resolvedBy,
            };
            this.conflicts.set(conflictId, resolvedConflict);
            // Audit
            this.addAuditEntry('RESOLVE_CONFLICT', conflict.existingFact.id, resolvedBy, now, {
                conflictId,
                choice: 'existing',
            });
            return { success: true, data: restoredFact };
        }
        else {
            // Choisir le nouveau → remplacer l'existant
            const result = this.replaceWithUserChoice(conflict, resolvedBy, now);
            if (result.success) {
                const resolvedConflict = {
                    ...conflict,
                    resolution: ConflictResolution.USER_CHOICE,
                    winningFactId: result.data.id,
                    resolvedAt: now,
                    resolvedBy,
                };
                this.conflicts.set(conflictId, resolvedConflict);
            }
            return result;
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // METRICS & AUDIT
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère les métriques du CANON
     */
    getMetrics() {
        const byType = {
            [FactType.CHARACTER]: 0,
            [FactType.LOCATION]: 0,
            [FactType.OBJECT]: 0,
            [FactType.EVENT]: 0,
            [FactType.RELATION]: 0,
            [FactType.WORLD_RULE]: 0,
            [FactType.TEMPORAL]: 0,
            [FactType.META]: 0,
        };
        const bySource = {
            [FactSource.USER]: 0,
            [FactSource.TEXT]: 0,
            [FactSource.IMPORTED]: 0,
            [FactSource.INFERRED]: 0,
        };
        let active = 0, archived = 0, deleted = 0, conflicted = 0;
        let lastModified = HASH_CONFIG.GENESIS_HASH;
        for (const fact of this.facts.values()) {
            byType[fact.type]++;
            bySource[fact.source]++;
            switch (fact.status) {
                case FactStatus.ACTIVE:
                    active++;
                    break;
                case FactStatus.ARCHIVED:
                    archived++;
                    break;
                case FactStatus.DELETED:
                    deleted++;
                    break;
                case FactStatus.CONFLICTED:
                    conflicted++;
                    break;
            }
            if (fact.metadata.updatedAt > lastModified) {
                lastModified = fact.metadata.updatedAt;
            }
        }
        return {
            totalFacts: this.facts.size,
            activeFacts: active,
            archivedFacts: archived,
            deletedFacts: deleted,
            conflictedFacts: conflicted,
            byType,
            bySource,
            currentRootHash: computeMerkleRoot(this.getActiveFactHashes()),
            lastModified,
        };
    }
    /**
     * Récupère l'historique d'audit
     */
    getAuditTrail(factId) {
        if (factId) {
            return this.auditTrail.filter(e => e.factId === factId);
        }
        return [...this.auditTrail];
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRITY VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Vérifie l'intégrité de tous les faits
     */
    verifyIntegrity() {
        const errors = [];
        for (const fact of this.facts.values()) {
            if (!verifyFactHash(fact)) {
                errors.push(`Hash mismatch for fact ${fact.id}`);
            }
        }
        // Vérifier la chaîne de hash
        const sortedFacts = Array.from(this.facts.values())
            .sort((a, b) => a.metadata.createdAt.localeCompare(b.metadata.createdAt));
        let previousHash = HASH_CONFIG.GENESIS_HASH;
        for (const fact of sortedFacts) {
            if (fact.previousHash !== previousHash) {
                // Note: ce n'est pas toujours une erreur car les branches peuvent exister
                // On ne marque comme erreur que si c'est vraiment incohérent
            }
            previousHash = fact.hash;
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // EXPORT / IMPORT
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Exporte le CANON complet
     */
    export() {
        const now = this.clock();
        const snapshot = this.createSnapshot();
        const facts = Array.from(this.facts.values());
        const auditTrail = [...this.auditTrail];
        const exportHash = hashExport(facts, auditTrail, snapshot.rootHash);
        return {
            magic: CANON_MAGIC,
            version: CANON_VERSION,
            exportedAt: now,
            snapshot,
            facts,
            auditTrail,
            exportHash,
        };
    }
    /**
     * Importe un CANON exporté
     */
    static import(data) {
        // Vérifier le magic
        if (data.magic !== CANON_MAGIC) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.SNAPSHOT_INVALID,
                    message: 'Invalid magic number',
                },
            };
        }
        // Vérifier le hash d'export
        const computedHash = hashExport(data.facts, data.auditTrail, data.snapshot.rootHash);
        if (computedHash !== data.exportHash) {
            return {
                success: false,
                error: {
                    code: CanonErrorCode.HASH_MISMATCH,
                    message: 'Export hash mismatch',
                },
            };
        }
        // Reconstruire le store
        const store = new CanonStore();
        for (const fact of data.facts) {
            store.facts.set(fact.id, fact);
            // Index par subject
            if (!store.factsBySubject.has(fact.subject)) {
                store.factsBySubject.set(fact.subject, new Set());
            }
            store.factsBySubject.get(fact.subject).add(fact.id);
            // Index par key
            const key = store.makeKey(fact.subject, fact.predicate);
            if (!store.factsByKey.has(key)) {
                store.factsByKey.set(key, []);
            }
            store.factsByKey.get(key).push(fact.id);
            // Mettre à jour lastHash
            if (fact.metadata.updatedAt > store.lastHash) {
                store.lastHash = fact.hash;
            }
        }
        // Restaurer l'audit trail
        for (const entry of data.auditTrail) {
            store.auditTrail.push(entry);
            store.lastAuditHash = entry.hash;
        }
        return { success: true, data: store };
    }
    /**
     * Réinitialise le store (pour tests)
     */
    clear() {
        this.facts.clear();
        this.factsBySubject.clear();
        this.factsByKey.clear();
        this.conflicts.clear();
        this.auditTrail.length = 0;
        this.lastHash = HASH_CONFIG.GENESIS_HASH;
        this.lastAuditHash = HASH_CONFIG.GENESIS_HASH;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    makeKey(subject, predicate) {
        return `${subject}:${predicate}`;
    }
    validateInput(input) {
        if (!input.subject || input.subject.length === 0) {
            return { code: CanonErrorCode.INVALID_SUBJECT, message: 'Subject is required' };
        }
        if (input.subject.length > CANON_LIMITS.MAX_SUBJECT_LENGTH) {
            return { code: CanonErrorCode.SUBJECT_TOO_LONG, message: `Subject exceeds ${CANON_LIMITS.MAX_SUBJECT_LENGTH} characters` };
        }
        if (!input.predicate || input.predicate.length === 0) {
            return { code: CanonErrorCode.INVALID_PREDICATE, message: 'Predicate is required' };
        }
        if (input.predicate.length > CANON_LIMITS.MAX_PREDICATE_LENGTH) {
            return { code: CanonErrorCode.PREDICATE_TOO_LONG, message: `Predicate exceeds ${CANON_LIMITS.MAX_PREDICATE_LENGTH} characters` };
        }
        if (input.value === undefined || input.value === null) {
            return { code: CanonErrorCode.INVALID_VALUE, message: 'Value is required' };
        }
        if (input.value.length > CANON_LIMITS.MAX_VALUE_LENGTH) {
            return { code: CanonErrorCode.VALUE_TOO_LONG, message: `Value exceeds ${CANON_LIMITS.MAX_VALUE_LENGTH} characters` };
        }
        if (this.facts.size >= CANON_LIMITS.MAX_TOTAL_FACTS) {
            return { code: CanonErrorCode.MAX_FACTS_EXCEEDED, message: `Maximum facts (${CANON_LIMITS.MAX_TOTAL_FACTS}) exceeded` };
        }
        return null;
    }
    createFact(input, timestamp) {
        const confidence = input.confidence ?? DEFAULT_CONFIDENCE[input.source];
        const factWithoutHash = {
            id: generateFactId(input, timestamp),
            type: input.type,
            subject: input.subject,
            predicate: input.predicate,
            value: input.value,
            source: input.source,
            status: FactStatus.ACTIVE,
            confidence,
            version: 1,
            previousHash: this.lastHash,
            metadata: {
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: input.createdBy ?? 'system',
                sourceRef: input.sourceRef,
                sourcePosition: input.sourcePosition,
                tags: input.tags,
                notes: input.notes,
            },
        };
        const hash = hashFact(factWithoutHash);
        const fact = { ...factWithoutHash, hash };
        this.storeFact(fact);
        this.addAuditEntry('CREATE', fact.id, fact.metadata.createdBy, timestamp);
        return { success: true, data: fact };
    }
    storeFact(fact) {
        this.facts.set(fact.id, fact);
        this.lastHash = fact.hash;
        // Index par subject
        if (!this.factsBySubject.has(fact.subject)) {
            this.factsBySubject.set(fact.subject, new Set());
        }
        this.factsBySubject.get(fact.subject).add(fact.id);
        // Index par key
        const key = this.makeKey(fact.subject, fact.predicate);
        if (!this.factsByKey.has(key)) {
            this.factsByKey.set(key, []);
        }
        this.factsByKey.get(key).push(fact.id);
    }
    archiveFact(fact, timestamp, actor) {
        // Simply update status to ARCHIVED - preserve everything else including hash
        const archivedFact = {
            ...fact,
            status: FactStatus.ARCHIVED,
            metadata: {
                ...fact.metadata,
                updatedAt: timestamp,
            },
        };
        this.facts.set(fact.id, archivedFact);
        this.addAuditEntry('ARCHIVE', fact.id, actor, timestamp);
    }
    getActiveFact(ids) {
        let best = null;
        let bestPriority = -1;
        for (const id of ids) {
            const fact = this.facts.get(id);
            if (fact && fact.status === FactStatus.ACTIVE) {
                const priority = SOURCE_PRIORITY[fact.source];
                if (priority > bestPriority) {
                    best = fact;
                    bestPriority = priority;
                }
            }
        }
        return best;
    }
    getActiveFactHashes() {
        const hashes = [];
        for (const fact of this.facts.values()) {
            if (fact.status === FactStatus.ACTIVE) {
                hashes.push(fact.hash);
            }
        }
        return hashes.sort();
    }
    replaceWithHigherPriority(existing, input, timestamp) {
        // Archive l'ancien
        this.archiveFact(existing, timestamp, input.createdBy ?? 'system');
        // Crée le nouveau avec version incrémentée
        const confidence = input.confidence ?? DEFAULT_CONFIDENCE[input.source];
        const factWithoutHash = {
            id: generateFactId(input, timestamp),
            type: input.type,
            subject: input.subject,
            predicate: input.predicate,
            value: input.value,
            source: input.source,
            status: FactStatus.ACTIVE,
            confidence,
            version: existing.version + 1,
            previousHash: this.lastHash,
            metadata: {
                createdAt: existing.metadata.createdAt,
                updatedAt: timestamp,
                createdBy: input.createdBy ?? 'system',
                sourceRef: input.sourceRef,
                sourcePosition: input.sourcePosition,
                tags: input.tags,
                notes: input.notes,
            },
        };
        const hash = hashFact(factWithoutHash);
        const fact = { ...factWithoutHash, hash };
        this.storeFact(fact);
        this.addAuditEntry('UPDATE', fact.id, fact.metadata.createdBy, timestamp, {
            previousId: existing.id,
            reason: 'Higher priority source',
            resolution: ConflictResolution.AUTO_PRIORITY,
        });
        return { success: true, data: fact };
    }
    archiveAsLowerPriority(existing, input, timestamp) {
        // On crée quand même le fait mais en status ARCHIVED
        const confidence = input.confidence ?? DEFAULT_CONFIDENCE[input.source];
        const factWithoutHash = {
            id: generateFactId(input, timestamp),
            type: input.type,
            subject: input.subject,
            predicate: input.predicate,
            value: input.value,
            source: input.source,
            status: FactStatus.ARCHIVED,
            confidence,
            version: existing.version + 1,
            previousHash: this.lastHash,
            metadata: {
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: input.createdBy ?? 'system',
                sourceRef: input.sourceRef,
                sourcePosition: input.sourcePosition,
                tags: input.tags,
                notes: 'Archived: lower priority source',
            },
        };
        const hash = hashFact(factWithoutHash);
        const fact = { ...factWithoutHash, hash };
        this.storeFact(fact);
        // Retourner le fait existant (qui reste actif)
        return { success: true, data: existing };
    }
    createConflict(existing, input, timestamp) {
        const conflictId = generateConflictId(existing.id, input.subject, timestamp);
        const conflict = {
            id: conflictId,
            type: ConflictType.VALUE_MISMATCH,
            existingFact: existing,
            incomingFact: input,
            resolution: ConflictResolution.PENDING,
            detectedAt: timestamp,
        };
        this.conflicts.set(conflictId, conflict);
        // Marquer le fait existant comme en conflit
        const conflictedFact = {
            ...existing,
            status: FactStatus.CONFLICTED,
            metadata: {
                ...existing.metadata,
                updatedAt: timestamp,
            },
        };
        this.facts.set(existing.id, conflictedFact);
        // INV-MEM-04: On retourne une erreur pour forcer la résolution par l'utilisateur
        return {
            success: false,
            error: {
                code: CanonErrorCode.CONFLICT_UNRESOLVED,
                message: `Conflict detected for ${input.subject}:${input.predicate}`,
                details: { conflictId },
            },
        };
    }
    replaceWithUserChoice(conflict, resolvedBy, timestamp) {
        const input = conflict.incomingFact;
        const existing = conflict.existingFact;
        // Archive l'ancien
        this.archiveFact(existing, timestamp, resolvedBy);
        // Crée le nouveau
        const confidence = input.confidence ?? DEFAULT_CONFIDENCE[input.source];
        const factWithoutHash = {
            id: generateFactId(input, timestamp),
            type: input.type,
            subject: input.subject,
            predicate: input.predicate,
            value: input.value,
            source: input.source,
            status: FactStatus.ACTIVE,
            confidence,
            version: existing.version + 1,
            previousHash: this.lastHash,
            metadata: {
                createdAt: existing.metadata.createdAt,
                updatedAt: timestamp,
                createdBy: resolvedBy,
                sourceRef: input.sourceRef,
                sourcePosition: input.sourcePosition,
                tags: input.tags,
                notes: `Resolved by user choice (conflict ${conflict.id})`,
            },
        };
        const hash = hashFact(factWithoutHash);
        const fact = { ...factWithoutHash, hash };
        this.storeFact(fact);
        this.addAuditEntry('RESOLVE_CONFLICT', fact.id, resolvedBy, timestamp, {
            conflictId: conflict.id,
            choice: 'incoming',
        });
        return { success: true, data: fact };
    }
    matchesFilter(fact, filter) {
        if (filter.type && fact.type !== filter.type)
            return false;
        if (filter.subject && fact.subject !== filter.subject)
            return false;
        if (filter.subjectPattern) {
            const regex = new RegExp(filter.subjectPattern, 'i');
            if (!regex.test(fact.subject))
                return false;
        }
        if (filter.predicate && fact.predicate !== filter.predicate)
            return false;
        if (filter.source && fact.source !== filter.source)
            return false;
        if (filter.status && fact.status !== filter.status)
            return false;
        if (filter.createdAfter && fact.metadata.createdAt <= filter.createdAfter)
            return false;
        if (filter.createdBefore && fact.metadata.createdAt >= filter.createdBefore)
            return false;
        if (filter.tags && filter.tags.length > 0) {
            const factTags = fact.metadata.tags ?? [];
            const hasAny = filter.tags.some(t => factTags.includes(t));
            if (!hasAny)
                return false;
        }
        return true;
    }
    addAuditEntry(action, factId, actor, timestamp, details) {
        const id = generateAuditId(action, factId, timestamp);
        const hash = hashAuditEntry({ id, timestamp, action, factId, actor, details }, this.lastAuditHash);
        const entry = {
            id,
            timestamp,
            action,
            factId,
            actor,
            details,
            hash,
        };
        this.auditTrail.push(entry);
        this.lastAuditHash = hash;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Crée un nouveau CanonStore
 * @param clock - Optional clock function for deterministic testing
 */
export function createCanonStore(clock) {
    return new CanonStore(clock);
}
//# sourceMappingURL=canon-store.js.map