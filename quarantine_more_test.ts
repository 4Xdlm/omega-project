import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeIO } from "./node_io";
import {
  quarantineFile,
  listQuarantineFiles,
  countQuarantineFiles,
  cleanOldQuarantineFiles,
  getQuarantineFile,
} from "./quarantine";

describe("quarantine.ts ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â functional coverage (NodeIO, contract-aligned)", () => {
  let projectRoot: string;
  let io: NodeIO;
  let sourceFile: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "omega-quarantine-"));
    io = new NodeIO();

    // ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ¢â‚¬Ëœ PRÃƒÆ’Ã¢â‚¬Â°CONDITION CONTRACTUELLE :
    // le dossier _quarantine DOIT exister
    await mkdir(join(projectRoot, "_quarantine"), { recursive: true });

    sourceFile = join(projectRoot, "test.txt");
    await writeFile(sourceFile, "TEST_CONTENT", "utf-8");
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("quarantineFile dÃƒÆ’Ã‚Â©place un fichier en quarantaine", async () => {
    const result = await quarantineFile(io, projectRoot, sourceFile);

    expect(result).toBeDefined();
    expect(result.originalPath).toBe(sourceFile);

    const recovered = await getQuarantineFile(
      io,
      projectRoot,
      result.quarantineId
    );

    expect(recovered).not.toBeNull();
  });

  it("listQuarantineFiles retourne la liste des fichiers", async () => {
    await quarantineFile(io, projectRoot, sourceFile);

    const list = await listQuarantineFiles(io, projectRoot);

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
  });

  it("countQuarantineFiles retourne le bon nombre", async () => {
    await quarantineFile(io, projectRoot, sourceFile);

    const count = await countQuarantineFiles(io, projectRoot);

    expect(count).toBe(1);
  });

  it("getQuarantineFile retourne null pour un id inconnu", async () => {
    const file = await getQuarantineFile(io, projectRoot, "unknown-id");
    expect(file).toBeNull();
  });

  it("cleanOldQuarantineFiles supprime les fichiers anciens", async () => {
    const result = await quarantineFile(io, projectRoot, sourceFile);

    const metaPath = join(
      projectRoot,
      "_quarantine",
      `${result.quarantineId}.meta.json`
    );

    await writeFile(
      metaPath,
      JSON.stringify({
        ...result,
        quarantinedAt: Date.now() - 1000 * 60 * 60 * 24 * 365,
      }),
      "utf-8"
    );

    const removed = await cleanOldQuarantineFiles(io, projectRoot, 1000);

    expect(removed).toBeGreaterThanOrEqual(1);
  });
});
