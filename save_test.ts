import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeIO } from './node_io';
import { saveProject } from './save';
import { verifyProjectIntegrity } from './integrity';
import { acquireLock } from './lock_manager';

describe('save.ts â€” Atomic Persistence', () => {
  let projectRoot: string;
  let io: NodeIO;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'omega-save-'));
    io = new NodeIO();
    await mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('sauvegarde les donnÃ©es et met Ã  jour l\'intÃ©gritÃ©', async () => {
    const data = { version: 1, name: "Saved Project" };

    // Act
    await saveProject(io, projectRoot, data);

    // Assert 1: Fichier prÃ©sent et contenu correct
    const content = JSON.parse(await io.readFile(projectRoot, 'omega.json'));
    expect(content.name).toBe("Saved Project");

    // Assert 2: Pas de fichier temporaire rÃ©siduel
    const existsTemp = await io.exists(projectRoot, 'omega.json.tmp');
    expect(existsTemp).toBe(false);

    // Assert 3: L'intÃ©gritÃ© est valide (signature Ã  jour)
    const isIntact = await verifyProjectIntegrity(io, projectRoot);
    expect(isIntact).toBe(true);
  });

  it('Ã©choue proprement si le systÃ¨me est verrouillÃ© (Concurrency)', async () => {
    // On simule un autre processus qui a pris le lock
    // CORRECTION : Appel direct sans 'io'
    await acquireLock(projectRoot, 'system_save', 5000);

    // On essaie de sauvegarder par dessus
    await expect(saveProject(io, projectRoot, { foo: "bar" }))
      .rejects
      .toThrow(/System is locked/);
  });
});
