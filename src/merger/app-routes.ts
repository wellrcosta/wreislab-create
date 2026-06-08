import fs from 'fs-extra';

export interface AppRoutePatch {
  imports?: string[];
  topLevelRoutes?: string[];
  layoutRoutes?: string[];
}

export interface HomePagePatch {
  imports?: string[];
  links?: string[];
}

export async function patchAppRoutes(filePath: string, patches: AppRoutePatch[]): Promise<void> {
  if (!(await fs.pathExists(filePath))) return;

  let content = await fs.readFile(filePath, 'utf8');

  const allImports = patches.flatMap((p) => p.imports ?? []);
  const allTopLevel = patches.flatMap((p) => p.topLevelRoutes ?? []);
  const allLayout = patches.flatMap((p) => p.layoutRoutes ?? []);

  if (allImports.length > 0) {
    content = content.replace('// {{EXTRA_ROUTE_IMPORTS}}', allImports.join('\n'));
  } else {
    content = content.replace('\n// {{EXTRA_ROUTE_IMPORTS}}', '');
  }

  if (allTopLevel.length > 0) {
    content = content.replace(
      '      {/* {{EXTRA_TOPLEVEL_ROUTES}} */}',
      allTopLevel.map((r) => `      ${r}`).join('\n'),
    );
  } else {
    content = content.replace('\n      {/* {{EXTRA_TOPLEVEL_ROUTES}} */}', '');
  }

  if (allLayout.length > 0) {
    content = content.replace(
      '        {/* {{EXTRA_LAYOUT_ROUTES}} */}',
      allLayout.map((r) => `        ${r}`).join('\n'),
    );
  } else {
    content = content.replace('\n        {/* {{EXTRA_LAYOUT_ROUTES}} */}', '');
  }

  await fs.writeFile(filePath, content, 'utf8');
}

export async function patchHomePage(filePath: string, patches: HomePagePatch[]): Promise<void> {
  if (!(await fs.pathExists(filePath))) return;

  let content = await fs.readFile(filePath, 'utf8');

  const allImports = patches.flatMap((p) => p.imports ?? []);
  const allLinks = patches.flatMap((p) => p.links ?? []);

  if (allImports.length > 0) {
    content = content.replace('// {{EXTRA_HOME_IMPORTS}}', allImports.join('\n'));
  } else {
    content = content.replace('\n// {{EXTRA_HOME_IMPORTS}}', '');
  }

  if (allLinks.length > 0) {
    content = content.replace(
      '      {/* {{EXTRA_HOME_LINKS}} */}',
      allLinks.map((l) => `      ${l}`).join('\n'),
    );
  } else {
    content = content.replace('\n      {/* {{EXTRA_HOME_LINKS}} */}', '');
  }

  await fs.writeFile(filePath, content, 'utf8');
}
