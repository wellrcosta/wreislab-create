import fs from 'fs-extra';

export interface AppPluginPatch {
  imports?: string[];
  plugins?: string[];
}

export async function patchElysiaApp(filePath: string, patches: AppPluginPatch[]): Promise<void> {
  if (!(await fs.pathExists(filePath))) return;

  let content = await fs.readFile(filePath, 'utf8');

  const allImports = patches.flatMap((p) => p.imports ?? []);
  const allPlugins = patches.flatMap((p) => p.plugins ?? []);

  if (allImports.length > 0) {
    content = content.replace('// {{EXTRA_IMPORTS}}', allImports.join('\n'));
  } else {
    content = content.replace('\n// {{EXTRA_IMPORTS}}', '');
  }

  if (allPlugins.length > 0) {
    content = content.replace(
      '    // {{EXTRA_PLUGINS}}',
      allPlugins.map((p) => `    ${p}`).join('\n'),
    );
  } else {
    content = content.replace('\n    // {{EXTRA_PLUGINS}}', '');
  }

  await fs.writeFile(filePath, content, 'utf8');
}
