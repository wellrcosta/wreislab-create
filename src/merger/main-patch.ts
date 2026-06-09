import fs from 'fs-extra';

export interface MainPatch {
  imports?: string[];
  setup?: string[];
}

export async function patchMain(filePath: string, patches: MainPatch[]): Promise<void> {
  if (!(await fs.pathExists(filePath))) return;

  let content = await fs.readFile(filePath, 'utf8');

  const allImports = patches.flatMap((p) => p.imports ?? []);
  const allSetup = patches.flatMap((p) => p.setup ?? []);

  if (allImports.length > 0) {
    const insertBefore = 'async function bootstrap()';
    const idx = content.indexOf(insertBefore);
    if (idx !== -1) {
      content = content.slice(0, idx) + allImports.join('\n') + '\n' + content.slice(idx);
    }
  }

  if (allSetup.length > 0) {
    content = content.replace(
      '  // {{EXTRA_SETUP}}',
      allSetup.map((s) => `  ${s}`).join('\n'),
    );
  } else {
    content = content.replace('\n  // {{EXTRA_SETUP}}', '');
  }

  await fs.writeFile(filePath, content, 'utf8');
}
