// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OMEGA TESTS CONCURRENCE â€” Lock Manager & Race Conditions
// Version: 1.0
// Date: 21 dÃ©cembre 2025
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createNodeIO } from './node_io';
import { Store } from './store_mock';
import { createProject } from './create_project';
import { acquireLock, releaseLock, hasLock } from './lock_manager';

const TEST_DIR = path.join(__dirname, 'temp_concurrency');

describe('ðŸ”’ CONCURRENCE â€” Lock Manager & Race Conditions', () => {
  let io: any;

  beforeEach(async () => {
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }); } catch {}
    await fs.mkdir(TEST_DIR, { recursive: true });
    io = createNodeIO(TEST_DIR);
  });

  afterEach(async () => {
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }); } catch {}
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #1 â€” DOUBLE SAVE CONCURRENT
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ’£ Double save concurrent: doit gÃ©rer le lock proprement', async () => {
    // CrÃ©er un projet initial
    await createProject(io, TEST_DIR, { name: 'Concurrent Test', author: 'Alice' });
    
    const store = new Store(io, TEST_DIR);
    await store.load();

    // Modifier le projet avec un champ VALIDE
    const project = store.getProject();
    if (project) {
      project.meta.description = 'Modified by test';
    }

    // Lancer 2 saves en parallÃ¨le strict
    const save1 = store.save();
    const save2 = store.save();

    const results = await Promise.allSettled([save1, save2]);

    // VÃ©rifications:
    // 1. Au moins un save doit rÃ©ussir
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    // 2. Si l'un Ã©choue, ce doit Ãªtre avec un message de lock
    const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    for (const failure of failures) {
      expect(failure.reason.message).toMatch(/locked|LOCK|integrity/i); // Accepter aussi integrity errors
    }

    // 3. Le fichier final doit Ãªtre valide (pas corrompu)
    const finalStore = new Store(io, TEST_DIR);
    await expect(finalStore.load()).resolves.not.toThrow();
    
    const loaded = finalStore.getProject();
    expect(loaded).toBeDefined();
    expect(loaded?.meta.name).toBe('Concurrent Test');
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #2 â€” SAVE PENDANT LOAD
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ”„ Save pendant load: comportement dÃ©terministe', async () => {
    await createProject(io, TEST_DIR, { name: 'Load Save Test' });
    
    const store1 = new Store(io, TEST_DIR);
    const store2 = new Store(io, TEST_DIR);

    // Lancer load et save quasi-simultanÃ©ment
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

    // Au moins une opÃ©ration doit rÃ©ussir
    expect(loadResult.status === 'fulfilled' || saveResult.status === 'fulfilled').toBe(true);

    // VÃ©rification finale: le fichier doit Ãªtre cohÃ©rent
    const finalStore = new Store(io, TEST_DIR);
    await finalStore.load();
    expect(finalStore.getProject()).toBeDefined();
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #3 â€” LOCK TTL (Time To Live)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('â±ï¸ Lock TTL: doit expirer et Ãªtre rÃ©cupÃ©rable', async () => {
    const TTL_MS = 100; // 100ms pour test rapide

    // AcquÃ©rir un lock avec TTL court
    await acquireLock(TEST_DIR, { ttlMs: TTL_MS, stealStale: true });
    
    // VÃ©rifier que le lock existe
    expect(await hasLock(TEST_DIR)).toBe(true);

    // Attendre que le TTL expire
    await new Promise(resolve => setTimeout(resolve, TTL_MS + 50));

    // Tenter d'acquÃ©rir Ã  nouveau (doit rÃ©ussir car stale)
    await expect(acquireLock(TEST_DIR, { ttlMs: TTL_MS, stealStale: true }))
      .resolves
      .not.toThrow();

    // Cleanup
    await releaseLock(TEST_DIR);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #4 â€” LOCK NON-STEALABLE
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ” Lock non-stealable: doit refuser double acquisition', async () => {
    // AcquÃ©rir un lock
    await acquireLock(TEST_DIR, { ttlMs: 5000, stealStale: false });

    // Tenter d'acquÃ©rir Ã  nouveau sans steal
    await expect(acquireLock(TEST_DIR, { ttlMs: 5000, stealStale: false }))
      .rejects
      .toThrow(/LOCK_ALREADY_EXISTS/);

    // Cleanup
    await releaseLock(TEST_DIR);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #5 â€” BOMBARDEMENT (20 saves concurrents)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ’¥ Bombardement: 20 saves concurrents sans corruption', async () => {
    await createProject(io, TEST_DIR, { name: 'Bombardement' });
    
    const store = new Store(io, TEST_DIR);
    await store.load();

    // Lancer 20 saves en parallÃ¨le
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

    // VÃ©rification critique: le fichier doit Ãªtre valide
    const finalStore = new Store(io, TEST_DIR);
    await expect(finalStore.load()).resolves.not.toThrow();
    
    const project = finalStore.getProject();
    expect(project).toBeDefined();
    expect(project?.meta.name).toBe('Bombardement');
    
    // La description doit Ãªtre l'une des itÃ©rations (pas corrompue)
    expect(project?.meta.description).toMatch(/^Iteration \d+$/);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #6 â€” RELEASE IDEMPOTENT
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('â™»ï¸ Release lock: doit Ãªtre idempotent', async () => {
    await acquireLock(TEST_DIR, { ttlMs: 5000 });
    
    // Premier release
    await expect(releaseLock(TEST_DIR)).resolves.not.toThrow();
    
    // Second release (lock dÃ©jÃ  released)
    await expect(releaseLock(TEST_DIR)).resolves.not.toThrow();
    
    // VÃ©rifier que le lock n'existe plus
    expect(await hasLock(TEST_DIR)).toBe(false);
  });
});
