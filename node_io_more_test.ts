import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// CORRECTION IMPORTS : "../" direct, pas de "src"
import { NodeIO } from './node_io';
// On importe pas CanonErrorCode s'il n'est pas utilisÃƒÆ’Ã‚Â©, ou on corrige le chemin
import { CanonErrorCode } from './errors';

describe('node_io.ts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Low Level Infrastructure', () => {
  let root: string;
  let io: NodeIO;

  beforeEach(async () => {
    // CrÃƒÆ’Ã‚Â©ation d'un dossier temporaire unique pour chaque test
    root = await mkdtemp(join(tmpdir(), 'omega-io-'));
    io = new NodeIO();
    await mkdir(root, { recursive: true });
  });

  afterEach(async () => {
    // Nettoyage complet
    await rm(root, { recursive: true, force: true });
  });

  it('writeFile & readFile fonctionnent nominalement', async () => {
    const file = 'test.txt';
    const content = 'Hello Omega';
    
    await io.writeFile(root, file, content);
    const read = await io.readFile(root, file);
    
    expect(read).toBe(content);
    expect(await io.exists(root, file)).toBe(true);
  });

  it('writeFile crÃƒÆ’Ã‚Â©e automatiquement les dossiers parents', async () => {
    const deepFile = 'a/b/c/deep.txt';
    await io.writeFile(root, deepFile, 'deep content');
    
    expect(await io.exists(root, deepFile)).toBe(true);
    const files = await io.readDir(root, 'a/b/c');
    expect(files).toContain('deep.txt');
  });

  it('mkdir crÃƒÆ’Ã‚Â©e un dossier (rÃƒÆ’Ã‚Â©cursif)', async () => {
    await io.mkdir(root, 'new/folder');
    expect(await io.exists(root, 'new/folder')).toBe(true);
  });

  it('remove supprime fichiers et dossiers', async () => {
    await io.writeFile(root, 'todelete.txt', 'bye');
    expect(await io.exists(root, 'todelete.txt')).toBe(true);
    
    await io.remove(root, 'todelete.txt');
    expect(await io.exists(root, 'todelete.txt')).toBe(false);
  });

  it('REJETTE les chemins traversant vers le haut (Security)', async () => {
    // Tentative d'ÃƒÆ’Ã‚Â©crire hors de la racine
    const hackPath = '../hack.txt';
    
    await expect(io.writeFile(root, hackPath, 'hacked'))
      .rejects
      .toThrow(/Unsafe path rejected/);
  });

  it('REJETTE les chemins absolus considÃƒÆ’Ã‚Â©rÃƒÆ’Ã‚Â©s comme unsafe (si non match root)', async () => {
    // On simule un chemin absolu qui n'est pas root
    const absPath = join(tmpdir(), 'hack_abs.txt');
    
    await expect(io.writeFile(root, absPath, 'fail'))
      .rejects
      .toThrow();
  });

  it('readFile lance une erreur si fichier introuvable', async () => {
    await expect(io.readFile(root, 'phantom.txt'))
      .rejects
      .toThrow(/File not found/);
  });
});
