// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OMEGA TESTS ROBUSTESSE â€” Chaos Engineering & Edge Cases
// Version: 1.0
// Date: 21 dÃ©cembre 2025
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createNodeIO } from './node_io';
import { Store } from './store_mock';
import { createProject } from './create_project';
import { loadProject } from './load';
import { attachIntegrity } from './integrity';

const TEST_DIR = path.join(__dirname, 'temp_robustness');
const PROJECT_FILE = 'omega.json';

describe('ðŸ›¡ï¸ ROBUSTESSE â€” Chaos Engineering & Edge Cases', () => {
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
  // TEST #1 â€” LE SABOTEUR (IntÃ©gritÃ© Physique â€” Bit Flip)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ¦¹ SABOTEUR: doit dÃ©tecter corruption manuelle (bit flip)', async () => {
    // 1. CrÃ©er et sauvegarder un projet sain
    const store = new Store(io, TEST_DIR);
    await createProject(io, TEST_DIR, { name: 'Valid Project', author: 'Alice' });
    await store.load();
    await store.save();

    // 2. SABOTAGE MANUEL (modification directe du fichier)
    const filePath = path.join(TEST_DIR, PROJECT_FILE);
    const content = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);
    
    // Modifier le nom SANS recalculer l'intÃ©gritÃ©
    json.meta.name = 'HACKED PROJECT';
    
    await fs.writeFile(filePath, JSON.stringify(json, null, 2));

    // 3. Tentative de chargement (doit Ã©chouer)
    const storeCorrupted = new Store(io, TEST_DIR);
    
    // Le systÃ¨me DOIT rejeter ce fichier car l'intÃ©gritÃ© ne matche plus
    await expect(storeCorrupted.load())
      .rejects
      .toThrow(); // IntÃ©gritÃ© invalide
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #2 â€” JSON CORROMPU (Syntaxe Invalide)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ“„ JSON corrompu: doit rejeter avec erreur propre', async () => {
    await createProject(io, TEST_DIR, { name: 'Test' });
    
    // Corrompre le fichier JSON (syntaxe invalide)
    const filePath = path.join(TEST_DIR, PROJECT_FILE);
    await fs.writeFile(filePath, '{ "meta": { "name": "incomplete');

    // Tentative de chargement
    await expect(loadProject(io, TEST_DIR))
      .rejects
      .toThrow(); // Invalid JSON
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #3 â€” JSON VALIDE MAIS SCHÃ‰MA INVALIDE
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ“‹ SchÃ©ma invalide: doit rejeter avec CanonError', async () => {
    // CrÃ©er un fichier JSON valide mais ne respectant pas le schÃ©ma
    const filePath = path.join(TEST_DIR, PROJECT_FILE);
    const invalidProject = {
      meta: {
        // Manque 'name' (requis)
        version: '1.0.0'
      },
      schema_version: '1.0.0'
    };
    
    await fs.writeFile(filePath, JSON.stringify(invalidProject, null, 2));

    await expect(loadProject(io, TEST_DIR))
      .rejects
      .toThrow(); // Validation schema
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #4 â€” CRASH SIMULÃ‰ AVANT RENAME (AtomicitÃ©)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ’¥ Crash avant rename: ancien fichier doit rester intact', async () => {
    await createProject(io, TEST_DIR, { name: 'Original', author: 'Original Author' });
    
    // Charger le projet original pour vÃ©rifier qu'il est valide
    const originalStore = new Store(io, TEST_DIR);
    await originalStore.load();
    
    const originalProject = originalStore.getProject();
    expect(originalProject?.meta.name).toBe('Original');
    expect(originalProject?.meta.author).toBe('Original Author');
    
    // CRASH SIMULÃ‰: Ã‰crire un fichier .tmp avec integrity valide mais ne PAS faire rename
    // Ceci simule un crash juste avant le rename
    const modifiedProject = { ...originalProject! };
    modifiedProject.meta.name = 'Modified';
    modifiedProject.meta.author = 'Modified Author';
    
    // Recalculer integrity pour le fichier modifiÃ©
    const { integrity, ...withoutIntegrity } = modifiedProject as any;
    const validModified = attachIntegrity(withoutIntegrity);
    
    // Ã‰crire le .tmp (simulant dÃ©but de save)
    const tempFile = path.join(TEST_DIR, `${PROJECT_FILE}.crash-test.tmp`);
    await fs.writeFile(tempFile, JSON.stringify(validModified, null, 2));

    // CRASH: on ne fait PAS le rename
    // Le fichier original doit toujours Ãªtre lÃ  et valide

    const afterCrashStore = new Store(io, TEST_DIR);
    await afterCrashStore.load();
    
    const loaded = afterCrashStore.getProject();
    expect(loaded?.meta.name).toBe('Original'); // Pas 'Modified'
    expect(loaded?.meta.author).toBe('Original Author'); // Pas 'Modified Author'
    
    // Cleanup du temp file
    await fs.unlink(tempFile);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #5 â€” PATH TRAVERSAL (SÃ©curitÃ©)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ”’ Path traversal: doit rejeter ../ et ..\\', async () => {
    // Tenter d'Ã©crire avec path traversal
    await expect(io.writeFile(TEST_DIR, '../evil.txt', 'hacked'))
      .rejects
      .toThrow(/Unsafe path|Path traversal/i);

    await expect(io.writeFile(TEST_DIR, '..\\evil.txt', 'hacked'))
      .rejects
      .toThrow(/Unsafe path|Path traversal/i);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #6 â€” CHEMINS UNICODE + ESPACES (PrÃ©paration Windows)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸŒ Unicode + espaces: doit gÃ©rer correctement', async () => {
    const unicodeDir = path.join(TEST_DIR, 'Dossier TestÃ©', 'Projet_Î©mega_ðŸš€');
    await fs.mkdir(unicodeDir, { recursive: true });
    
    const unicodeIO = createNodeIO(unicodeDir);
    
    await createProject(unicodeIO, unicodeDir, { 
      name: 'Projet SpÃ©cial',
      author: 'Jean-FranÃ§ois'
    });

    const store = new Store(unicodeIO, unicodeDir);
    await store.load();
    
    expect(store.getProject()?.meta.author).toBe('Jean-FranÃ§ois');
    
    // VÃ©rifier que le fichier existe physiquement
    const exists = await fs.stat(path.join(unicodeDir, PROJECT_FILE));
    expect(exists.isFile()).toBe(true);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #7 â€” NOMS RÃ‰SERVÃ‰S WINDOWS (CON, PRN, NUL)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸªŸ Noms rÃ©servÃ©s Windows: doit rejeter CON, PRN, NUL', async () => {
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];

    for (const name of reservedNames) {
      await expect(io.writeFile(TEST_DIR, name, 'data'))
        .rejects
        .toThrow(/Reserved filename|Unsafe path/i);
    }
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #8 â€” LOOP SAVE/LOAD (StabilitÃ© Long-Run)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ” Loop save/load x200: doit rester stable', async () => {
    await createProject(io, TEST_DIR, { name: 'Loop Test', author: 'Test' });
    
    const store = new Store(io, TEST_DIR);

    for (let i = 0; i < 200; i++) {
      await store.load();
      
      const project = store.getProject();
      if (project) {
        project.meta.description = `Iteration ${i}`;
      }
      
      await store.save();
    }

    // VÃ©rification finale
    await store.load();
    const final = store.getProject();
    expect(final?.meta.name).toBe('Loop Test');
    expect(final?.meta.description).toBe('Iteration 199');
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #9 â€” PROJET Ã‰NORME (10MB String)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸ“¦ Projet Ã©norme: doit gÃ©rer 10MB de donnÃ©es', async () => {
    await createProject(io, TEST_DIR, { name: 'Huge Project' });
    
    const store = new Store(io, TEST_DIR);
    await store.load();
    
    const project = store.getProject();
    if (project) {
      // GÃ©nÃ©rer une string de 10MB
      project.meta.description = 'X'.repeat(10 * 1024 * 1024);
    }

    // Save doit rÃ©ussir sans OOM
    await expect(store.save()).resolves.not.toThrow();

    // Load doit rÃ©ussir
    const store2 = new Store(io, TEST_DIR);
    await expect(store2.load()).resolves.not.toThrow();
    
    const loaded = store2.getProject();
    expect(loaded?.meta.description?.length).toBe(10 * 1024 * 1024);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #10 â€” CHEMINS ABSOLUS (SÃ©curitÃ©)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('ðŸš« Chemins absolus: doit rejeter /root et C:\\', async () => {
    // Unix absolute
    await expect(io.writeFile(TEST_DIR, '/etc/passwd', 'hack'))
      .rejects
      .toThrow(/Absolute path|Unsafe path/i);

    // Windows absolute
    await expect(io.writeFile(TEST_DIR, 'C:\\Windows\\evil.txt', 'hack'))
      .rejects
      .toThrow(/Absolute path|Unsafe path/i);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TEST #11 â€” DOUBLE SLASHES (Path Normalization)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  it('âš¡ Double slashes: doit rejeter //  et \\\\', async () => {
    await expect(io.writeFile(TEST_DIR, 'path//to//file.txt', 'data'))
      .rejects
      .toThrow(/Double slashes|Unsafe path/i);

    await expect(io.writeFile(TEST_DIR, 'path\\\\to\\\\file.txt', 'data'))
      .rejects
      .toThrow(/Double slashes|Unsafe path/i);
  });
});
