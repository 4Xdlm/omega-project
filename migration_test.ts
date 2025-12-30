import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// CORRECTION IMPORTS : On remonte d'un cran (..) sans passer par src
import { NodeIO } from './node_io';
import { 
  migrateProject, 
  checkMigrationNeeded, 
  CURRENT_OMEGA_VERSION 
} from './migration';

describe('migration.ts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Versioning & Integrity', () => {
  let projectRoot: string;
  let io: NodeIO;

  beforeEach(async () => {
    // CrÃƒÆ’Ã‚Â©ation d'un environnement propre pour chaque test
    projectRoot = await mkdtemp(join(tmpdir(), 'omega-migration-'));
    io = new NodeIO();
    await mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    // Nettoyage aprÃƒÆ’Ã‚Â¨s chaque test
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('ne fait rien si le projet est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  ÃƒÆ’Ã‚Â  jour', async () => {
    // Arrange
    const data = { version: CURRENT_OMEGA_VERSION, name: "UpToDate" };
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(data));

    // Act
    const needed = await checkMigrationNeeded(io, projectRoot);
    const result = await migrateProject(io, projectRoot);

    // Assert
    expect(needed).toBe(false);
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(false);
    expect(result.initialVersion).toBe(CURRENT_OMEGA_VERSION);
  });

  it('migre un projet v0 (sans version) vers CURRENT', async () => {
    // Arrange: fichier sans champ version
    const data = { name: "OldProject" };
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(data));

    // Act
    const needed = await checkMigrationNeeded(io, projectRoot);
    const result = await migrateProject(io, projectRoot);

    // Assert
    expect(needed).toBe(true);
    expect(result.success).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.initialVersion).toBe(0);
    expect(result.finalVersion).toBe(CURRENT_OMEGA_VERSION);

    // VÃƒÆ’Ã‚Â©rification disque
    // CORRECTION CRITIQUE : on passe (root, relative) pour respecter la sÃƒÆ’Ã‚Â©curitÃƒÆ’Ã‚Â© NodeIO
    const content = JSON.parse(await io.readFile(projectRoot, 'omega.json'));
    expect(content.version).toBe(CURRENT_OMEGA_VERSION);
  });

  it('refuse de migrer un projet du futur (Downgrade Protection)', async () => {
    // Arrange
    const futureVersion = CURRENT_OMEGA_VERSION + 99;
    const data = { version: futureVersion, name: "Future" };
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(data));

    // Act & Assert
    await expect(migrateProject(io, projectRoot))
      .rejects
      .toThrow(/Cannot migrate project from future version/);
  });

  it('ÃƒÆ’Ã‚Â©choue si le fichier projet est manquant', async () => {
    await expect(migrateProject(io, projectRoot))
      .rejects
      .toThrow(/Project file missing/);
  });

  it('ÃƒÆ’Ã‚Â©choue si le JSON est corrompu', async () => {
    await writeFile(join(projectRoot, 'omega.json'), '{ invalid json ');
    
    await expect(migrateProject(io, projectRoot))
      .rejects
      .toThrow(/Invalid project file/);
  });
});
