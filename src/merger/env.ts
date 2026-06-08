import fs from 'fs-extra';

export async function appendEnvPatch(target: string, patchPath: string): Promise<void> {
  const patchContent = await fs.readFile(patchPath, 'utf8');
  const trimmed = patchContent.trim();
  if (!trimmed) return;
  await fs.appendFile(target, `\n${trimmed}\n`);
}
