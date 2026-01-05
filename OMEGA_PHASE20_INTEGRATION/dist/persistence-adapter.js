/**
 * OMEGA Integration Layer — Persistence Adapter
 * Phase 20 — v3.20.0
 *
 * Simplified persistence for integration.
 * Based on Phase 19 NodeFileAdapter concepts.
 *
 * Invariants:
 * - INV-INT-01: Atomic writes (tmp → fsync → rename)
 * - INV-INT-02: Reload == original
 * - INV-INT-03: Hash integrity verified
 */
import { readFile, rename, readdir, open, unlink, } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash, randomBytes } from 'crypto';
// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function computeHash(data) {
    return createHash('sha256').update(data).digest('hex');
}
function canonicalEncode(value) {
    return JSON.stringify(sortDeep(value));
}
function sortDeep(value) {
    if (value === null || value === undefined)
        return value;
    if (Array.isArray(value))
        return value.map(sortDeep);
    if (typeof value === 'object') {
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = sortDeep(value[key]);
        }
        return sorted;
    }
    return value;
}
function validateKey(key) {
    if (!key || typeof key !== 'string')
        return false;
    if (key.length > 200)
        return false;
    // Forbidden chars for Windows/Unix
    const forbidden = /[<>:"|?*\\/\x00-\x1f]/;
    return !forbidden.test(key);
}
// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
const FILE_EXTENSION = '.omega.json';
const TEMP_EXTENSION = '.omega.tmp';
export class PersistenceAdapter {
    basePath;
    instanceId;
    constructor(config) {
        this.basePath = config.basePath;
        this.instanceId = config.instanceId ?? 'default';
        this.ensureDirectory();
    }
    ensureDirectory() {
        if (!existsSync(this.basePath)) {
            mkdirSync(this.basePath, { recursive: true });
        }
    }
    keyToPath(key) {
        return join(this.basePath, `${key}${FILE_EXTENSION}`);
    }
    keyToTempPath(key) {
        const random = randomBytes(4).toString('hex');
        return join(this.basePath, `${key}_${random}${TEMP_EXTENSION}`);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SAVE (ATOMIC)
    // ═══════════════════════════════════════════════════════════════════════════
    async save(key, data) {
        if (!validateKey(key)) {
            return { success: false, error: `Invalid key: ${key}` };
        }
        const filePath = this.keyToPath(key);
        const tempPath = this.keyToTempPath(key);
        try {
            // Compute data hash
            const dataJson = canonicalEncode(data);
            const dataHash = computeHash(dataJson);
            // Create envelope
            const envelope = {
                magic: 'OMEGA_PERSIST_V2',
                version: '3.20.0',
                key,
                timestamp: new Date().toISOString(),
                dataHash,
                data,
            };
            const envelopeJson = canonicalEncode(envelope);
            const envelopeBuffer = Buffer.from(envelopeJson, 'utf8');
            const envelopeHash = computeHash(envelopeBuffer);
            // Atomic write: tmp → fsync → rename
            const handle = await open(tempPath, 'w');
            try {
                await handle.write(envelopeBuffer);
                await handle.sync();
            }
            finally {
                await handle.close();
            }
            await rename(tempPath, filePath);
            return {
                success: true,
                data: {
                    key,
                    path: filePath,
                    hash: envelopeHash,
                    bytesWritten: envelopeBuffer.length,
                },
            };
        }
        catch (error) {
            // Cleanup temp file
            try {
                await unlink(tempPath);
            }
            catch {
                // Ignore
            }
            return {
                success: false,
                error: `Save failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LOAD
    // ═══════════════════════════════════════════════════════════════════════════
    async load(key) {
        if (!validateKey(key)) {
            return { success: false, error: `Invalid key: ${key}` };
        }
        const filePath = this.keyToPath(key);
        if (!existsSync(filePath)) {
            return { success: false, error: `Key not found: ${key}` };
        }
        try {
            const buffer = await readFile(filePath);
            const json = buffer.toString('utf8');
            const envelope = JSON.parse(json);
            // Verify magic
            if (envelope.magic !== 'OMEGA_PERSIST_V2') {
                return { success: false, error: 'Invalid file format: magic mismatch' };
            }
            // Verify data hash
            const dataJson = canonicalEncode(envelope.data);
            const computedDataHash = computeHash(dataJson);
            const verified = computedDataHash === envelope.dataHash;
            if (!verified) {
                return { success: false, error: 'Data integrity check failed: hash mismatch' };
            }
            return {
                success: true,
                data: {
                    key,
                    path: filePath,
                    hash: computeHash(buffer),
                    data: envelope.data,
                    verified,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Load failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LIST
    // ═══════════════════════════════════════════════════════════════════════════
    async list(prefix) {
        try {
            if (!existsSync(this.basePath)) {
                return { success: true, data: [] };
            }
            const files = await readdir(this.basePath);
            let keys = files
                .filter(f => f.endsWith(FILE_EXTENSION) && !f.startsWith('.'))
                .map(f => f.slice(0, -FILE_EXTENSION.length));
            if (prefix) {
                keys = keys.filter(k => k.startsWith(prefix));
            }
            return { success: true, data: keys };
        }
        catch (error) {
            return {
                success: false,
                error: `List failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // EXISTS
    // ═══════════════════════════════════════════════════════════════════════════
    async exists(key) {
        if (!validateKey(key))
            return false;
        return existsSync(this.keyToPath(key));
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════════════════════
    async delete(key) {
        if (!validateKey(key)) {
            return { success: false, error: `Invalid key: ${key}` };
        }
        const filePath = this.keyToPath(key);
        if (!existsSync(filePath)) {
            return { success: true, data: false };
        }
        try {
            await unlink(filePath);
            return { success: true, data: true };
        }
        catch (error) {
            return {
                success: false,
                error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createPersistenceAdapter(config) {
    return new PersistenceAdapter(config);
}
//# sourceMappingURL=persistence-adapter.js.map