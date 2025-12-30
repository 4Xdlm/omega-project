import { describe, it, expect, beforeEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

import {
  quarantineFile,
  listQuarantineFiles,
  countQuarantineFiles,
  getQuarantineFile,
  cleanOldQuarantineFiles
} from './quarantine';

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `omega-quarantine-${Date.now()}`);
  await mkdir(root, { recursive: true });
});

describe('quarantine.ts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â functional coverage (stable)', () => {
  it('quarantineFile dÃƒÆ’Ã‚Â©place un fichier en quarantaine', async () => {
    const file = join(root, 'bad.json');
    await writeFile(file, 'BROKEN');

    const id = await quarantineFile(root, file, 'corruption');

    const meta = await getQuarantineFile(root, id);
    expect(meta).not.toBeNull();
    expect(meta?.originalPath).toBe(file);
  });

  it('listQuarantineFiles retourne la liste', async () => {
    const file = join(root, 'bad.json');
    await writeFile(file, 'BROKEN');
    await quarantineFile(root, file, 'corruption');

    const list = await listQuarantineFiles(root);
    expect(list.length).toBe(1);
  });

  it('countQuarantineFiles retourne le bon nombre', async () => {
    const file = join(root, 'bad.json');
    await writeFile(file, 'BROKEN');
    await quarantineFile(root, file, 'corruption');

    const count = await countQuarantineFiles(root);
    expect(count).toBe(1);
  });

  it('getQuarantineFile retourne null si absent', async () => {
    const res = await getQuarantineFile(root, 'unknown');
    expect(res).toBeNull();
  });

  it('cleanOldQuarantineFiles supprime les anciens', async () => {
    const file = join(root, 'old.json');
    await writeFile(file, 'OLD');
    await quarantineFile(root, file, 'old');

    const removed = await cleanOldQuarantineFiles(root, 0);
    expect(removed).toBe(1);
  });
});
