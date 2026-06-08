import fs from 'fs-extra';

export interface AppModulePatch {
  imports?: string[];
  modules?: string[];
  providers?: string[];
}

export async function patchAppModule(filePath: string, patches: AppModulePatch[]): Promise<void> {
  if (!(await fs.pathExists(filePath))) return;

  let content = await fs.readFile(filePath, 'utf8');

  const allImports = patches.flatMap((p) => p.imports ?? []);
  const allModules = patches.flatMap((p) => p.modules ?? []);
  const allProviders = patches.flatMap((p) => p.providers ?? []);

  // When empty, also consume the preceding newline to avoid blank lines
  if (allImports.length > 0) {
    content = content.replace('// {{EXTRA_IMPORTS}}', allImports.join('\n'));
  } else {
    content = content.replace('\n// {{EXTRA_IMPORTS}}', '');
  }

  if (allModules.length > 0) {
    content = content.replace(
      '    // {{EXTRA_MODULES}}',
      allModules.map((m) => `    ${m},`).join('\n'),
    );
  } else {
    content = content.replace('\n    // {{EXTRA_MODULES}}', '');
  }

  if (allProviders.length > 0) {
    content = content.replace(
      '    // {{EXTRA_PROVIDERS}}',
      allProviders.map((p) => `    ${p},`).join('\n'),
    );
  } else {
    content = content.replace('\n    // {{EXTRA_PROVIDERS}}', '');
  }

  await fs.writeFile(filePath, content, 'utf8');
}
