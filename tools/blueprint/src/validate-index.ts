import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

const ModuleSchema = z.object({
  module_id: z.string(),
  type: z.enum(['BUILD', 'GOVERNANCE', 'TOOL', 'NEXUS', 'DOC', 'SESSION']),
  path: z.string(),
  status: z.string(),
  files: z.array(z.string()),
  exports: z.any().nullable(),
  types: z.any().nullable(),
  functions: z.any().nullable(),
  tests: z.any().nullable(),
  invariants: z.any().nullable(),
  metrics: z.any().nullable()
});

const IndexSchema = z.object({
  schema_version: z.string(),
  generated_at: z.string(),
  commit: z.string(),
  modules: z.array(ModuleSchema),
  stats: z.object({
    total_modules: z.number(),
    build_modules: z.number(),
    nexus_modules: z.number().optional(),
    governance_modules: z.number().optional(),
    tool_modules: z.number().optional(),
    total_files: z.number()
  })
});

export async function validate(): Promise<boolean> {
  const indexPath = path.resolve('nexus/blueprint/OMEGA_BLUEPRINT_PACK/BLUEPRINT_INDEX.json');

  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    const data = JSON.parse(raw);

    // Validate schema
    IndexSchema.parse(data);
    console.log('BLUEPRINT_INDEX.json schema valid');

    // Verify all module paths exist
    for (const mod of data.modules) {
      const modPath = path.resolve(mod.path);
      try {
        await fs.access(modPath);
      } catch {
        throw new Error(`Module path not found: ${mod.path}`);
      }
    }
    console.log('All module paths exist');

    // Verify modules are sorted alphabetically
    const ids = data.modules.map((m: { module_id: string }) => m.module_id);
    const sorted = [...ids].sort();
    if (JSON.stringify(ids) !== JSON.stringify(sorted)) {
      throw new Error('Modules not sorted alphabetically');
    }
    console.log('Modules sorted correctly');

    return true;
  } catch (err) {
    console.error('Validation failed:', err);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  validate().then(ok => process.exit(ok ? 0 : 1));
}
