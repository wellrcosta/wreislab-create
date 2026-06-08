import deepmerge from 'deepmerge';
import fs from 'fs-extra';

export async function mergePackageJson(target: string, patchPath: string): Promise<void> {
  const base = await fs.readJson(target);
  const patch = await fs.readJson(patchPath);

  const merged = deepmerge<Record<string, unknown>>(base, patch, {
    arrayMerge: (dest: unknown[], src: unknown[]) => {
      const combined = [...dest, ...src];
      return [...new Set(combined)];
    },
  });

  // Keep scripts order stable: base scripts first, then new ones
  if (base.scripts && patch.scripts) {
    merged['scripts'] = { ...(base.scripts as object), ...(patch.scripts as object) };
  }

  await fs.writeJson(target, merged, { spaces: 2 });
}
