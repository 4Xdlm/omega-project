import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeIO } from './node_io';
import { loadProject } from './load';
import { updateIntegrity, attachIntegrity } from './integrity';

// Helper pour créer un projet V1 valide
function createValidProject(name: string) {
  return {
    schema_version: '1.0.0',
    meta: {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: name,
      author: 'Test Author',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    state: {
      status: 'draft',
      current_chapter: null
    },
    runs: []
  };
}

describe('load.ts — Secure Loading Orchestrator', () => {
  let projectRoot: string;
  let io: NodeIO;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'omega-load-'));
    io = new NodeIO(projectRoot);
    await mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it('charge un projet valide (signe correctement)', async () => {
    const data = createValidProject('Valid Project');
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(data));
    await updateIntegrity(io, projectRoot);

    const result = await loadProject(io, projectRoot);
    expect(result.project.meta.name).toBe('Valid Project');
    expect(result.project.schema_version).toBe('1.0.0');
  });

  it('lance une erreur si le projet est corrompu (Integrite invalide)', async () => {
    const data = createValidProject('Test Project');
    const signed = attachIntegrity(data);
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(signed));

    // CORROMPRE: modifier sans resigner
    signed.meta.name = 'HACKED';
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(signed));

    await expect(loadProject(io, projectRoot))
      .rejects
      .toThrow(/integrity/i);
  });

  it('charge un projet V1 valide', async () => {
    const data = createValidProject('Migrated Project');
    await writeFile(join(projectRoot, 'omega.json'), JSON.stringify(data));
    await updateIntegrity(io, projectRoot);

    const result = await loadProject(io, projectRoot);
    expect(result.project.schema_version).toBe('1.0.0');
    expect(result.project.meta.name).toBe('Migrated Project');
  });

  it('lance une erreur si le fichier est introuvable', async () => {
    await expect(loadProject(io, projectRoot))
      .rejects
      .toThrow(/No project found|not found/i);
  });
});
