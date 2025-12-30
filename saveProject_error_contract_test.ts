import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

describe("contracts Ã¢â‚¬â€ saveProject (schema contract)", () => {
  it("saveProject rejects invalid project schema with CanonError", async () => {
    const saveMod: any = await import("./save");
    const nodeIoMod: any = await import("./node_io");

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omega-canon-"));
    const io = nodeIoMod.createNodeIO(dir);

    // volontairement incomplet pour dÃƒÂ©clencher le schÃƒÂ©ma
    const badProject: any = {
      project_id: "P_TEST",
      title: "Bad Project",
    };

    let err: any = null;
    try {
      await saveMod.saveProject(io, badProject, { validateBeforeSave: true });
    } catch (e) {
      err = e;
    }

    expect(err).toBeTruthy();
    expect(err.name).toBe("CanonError");
    expect(typeof err.code).toBe("string");

    await fs.rm(dir, { recursive: true, force: true });
  });
});
