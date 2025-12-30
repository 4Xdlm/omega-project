// ═══════════════════════════════════════════════════════════════════════════
// OMEGA TESTS CONCURRENCE — Lock Manager & Race Conditions
// Version: 1.1 (EPERM fix for Windows)
// Date: 31 décembre 2025
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createNodeIO } from './node_io';
import { Store } from './store_mock';
import { createProject } from './create_project';
import { acquireLock, releaseLock, hasLock } from './lock_manager';

const TEST_DIR = path.join(__dirname, 'temp_concurrency');

describe('🔒 CONCURRENCE — Lock Manager & Race Conditions', () => {
  let io: any;

  beforeEach(async () => {
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }); } catch {}
    await fs.mkdir(TEST_DIR, { recursive: true });
    io = createNodeIO(TEST_DIR);
  });

  afterEach(async () => {
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }); } catch {}
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST #1 — DOUBLE SAVE CONCURRENT
  // ─────────────────────────────────────────────────────────────────────────
  it('💣 Double save concurrent: doit gérer le lock proprement', async () => {
    // Créer un projet initial
    await createProject(io, TEST_DIR, { name: 'Concurrent Test', author: 'Alice' });
    
    const store = new Store(io, TEST_DIR);
    await store.load();

    // Modifier le projet avec un champ VALIDE
    const project = store.getProject();
    if (project) {
      project.meta.description = 'Modified by test';
    }

    // Lancer 2 saves en parallèle strict
    const save1 = store.save();
    const save2 = store.save();

    const results = await Promise.allSettled([save1, save2]);

    // Vérifications:
    // 1. Au moins un save doit réussir
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    // 2. Si l'un échoue, ce doit être avec un message de lock ou EPERM (Windows)
    const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    for (const failure of failures) {
      // EPERM ajouté pour Windows qui renvoie cette erreur en cas de race condition sur rename
      expect(failure.reason.message).toMatch(/locked|LOCK|integrity|EPERM|EBUSY/i);
    }

    // 3. Le fichier final doit être valide (pas corrompu)
    const finalStore = new Store(io, TEST_DIR);
    await expect(finalStore.load()).resolves.not.toThrow();
    
    const loaded = finalStore.getProject();
    expect(loaded).toBeDefined();
    expect(loaded?.meta.name).toBe('Concurrent Test');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST #2 — SAVE PENDANT LOAD
  // ─────────────────────────────────────────────────────────────────────────
  it('🔄 Save pendant load: comportement déterministe', async () => {
    await createProject(io, TEST_DIR, { name: 'Load Save Test' });
    
    const store1 = new Store(io, TEST_DIR);
    const store2 = new Store(io, TEST_DIR);

    // Lancer load et save quasi-simultanément
    const loadPromise = store1.load();
    
    // Attendre un peu pour que load commence
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Essayer un save pendant que load est en cours
    const savePromise = (async () => {
      await store2.load();
      const project = store2.getProject();
      if (project) {
        project.meta.description = 'Modified during load';
      }
      return store2.save();
    })();

    const [loadResult, saveResult] = await Promise.allSettled([loadPromise, savePromise]);

    // Au moins une opération doit réussir
    expect(loadResult.status === 'fulfilled' || saveResult.status === 'fulfilled').toBe(true);

    // Vérification finale: le fichier doit être cohérent
    const finalStore = new Store(io, TEST_DIR);
    await finalStore.load();
    expect(finalStore.getProject()).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST #3 — LOCK TTL (Time To Live)
  // ─────────────────────────────────────────────────────────────────────────
  it('⏱️ Lock TTL: doit expirer et être récupérable', async () => {
    const TTL_MS = 100; // 100ms pour test rapide

    // Acquérir un lock avec TTL court
    await acquireLock(TEST_DIR, { ttlMs: TTL_MS, stealStale: true });
    
    // Vérifier que le lock existe
    expect(await hasLock(TEST_DIR)).toBe(true);

    // Attendre que le TTL expire
    await new Promise(resolve => setTimeout(resolve, TTL_MS + 50));

    // Tenter d'acquérir à nouveau (doit réussir car stale)
    await expect(acquireLock(TEST_DIR, { ttlMs: TTL_MS, stealStale: true }))
      .resolves
      .not.toThrow();

    // Cleanup
    await releaseLock(TEST_DIR);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST #4 — LOCK NON-STEALABLE
  // ─────────────────────────────────────────────────────────────────────────
  it('🔐 Lock non-stealable: doit refuser double acquisition', async () => {
    // Acquérir un lock
    await acquireLock(TEST_DIR, { ttlMs: 5000, stealStale: false });

    // Tenter d'acquérir à nouveau sans steal
    await expect(acquireLock(TEST_DIR, { ttlMs: 5000, stealStale: false }))
      .rejects
      .toThrow(/LOCK_ALREADY_EXISTS/);

    // Cleanup
    await releaseLock(TEST_DIR);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST #5 — BOMBARDEMENT (20 saves concurrents)
  // ─────────────────────────────────────────────────────────────────────────
  it('💥 Bombardement: 20 saves concurrents sans corruption', async () => {
    await createProject(io, TEST_DIR, { name: 'Bombardement' });
    
    const store = new Store(io, TEST_DIR);
    await store.load();

    // Lancer 20 saves en parallèle
    const iterations = 20;
    const promises: Promise<void>[] = [];

    for (let i = 0; i < iterations; i++) {
      const saveOp = (async () => {
        const localStore = new Store(io, TEST_DIR);
        await localStore.load();
        const project = localStore.getProject();
        if (project) {
          project.meta.description = `Iteration ${i}`;
        }
        await localStore.save();
      })();
      
      promises.push(saveOp);
    }

    // Attendre que tout finisse
    await Promise.allSettled(promises);

    // Vérification critique: le fichier doit être valide
    const finalStore = new Store(io, TEST_DIR);
    await expect(finalStore.load()).resolves.not.toThrow();
    
    const project = finalStore.getProject();
    expect(project).toBeDefined();
    expect(project?.meta.name).toBe('Bombardement');
    
    // La description doit être l'une des itérations (pas corrompue)
    expect(project?.meta.description).toMatch(/^Iteration \d+$/);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST #6 — RELEASE IDEMPOTENT
  // ─────────────────────────────────────────────────────────────────────────
  it('♻️ Release lock: doit être idempotent', async () => {
    await acquireLock(TEST_DIR, { ttlMs: 5000 });
    
    // Premier release
    await expect(releaseLock(TEST_DIR)).resolves.not.toThrow();
    
    // Second release (lock déjà released)
    await expect(releaseLock(TEST_DIR)).resolves.not.toThrow();
    
    // Vérifier que le lock n'existe plus
    expect(await hasLock(TEST_DIR)).toBe(false);
  });
});
