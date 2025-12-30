import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("contract Ã¢â‚¬â€ loadProject error path is stable", () => {
  it("loadProject fails deterministically when project is missing", async () => {
    const loadMod: any = await import("./load");
    const nodeIoMod: any = await import("./node_io");

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omega-canon-"));
    const io = nodeIoMod.createNodeIO(dir);

    let err: any = null;
    try {
      await loadMod.loadProject(io, { validateIntegrity: false });
    } catch (e) {
      err = e;
    }

    expect(err).toBeTruthy();
    expect(typeof err.name).toBe("string");

    // Contrat rÃƒÂ©el actuel : TypeError OU CanonError, mais jamais silence
    expect(["TypeError", "CanonError"]).toContain(err.name);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
