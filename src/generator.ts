import * as p from '@clack/prompts';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { appendEnvPatch } from './merger/env.js';
import { mergeDockerCompose, mergePnpmWorkspace, generateInfraCompose } from './merger/yaml.js';
import { mergePackageJson } from './merger/json.js';
import { patchAppModule, type AppModulePatch as _AppModulePatch } from './merger/app-module.js';
import {
  patchAppRoutes,
  patchHomePage,
  type AppRoutePatch as _AppRoutePatch,
  type HomePagePatch as _HomePagePatch,
} from './merger/app-routes.js';
import type { AddConfig, ProjectConfig, SavedProjectConfig } from './types.js';

const TEMPLATES_DIR = path.join(__dirname, 'templates');

interface OverlayManifest {
  name: string;
  files: string[];
  packagePatch?: string;
  composePatch?: string;
  workspacePatch?: string;
  envPatch?: string;
  appModulePatch?: _AppModulePatch;
  appRoutePatch?: _AppRoutePatch;
  homePagePatch?: _HomePagePatch;
}

interface OverlayPatches {
  appModulePatch: _AppModulePatch | null;
  appRoutePatch: _AppRoutePatch | null;
  homePagePatch: _HomePagePatch | null;
}

async function applyOverlay(overlayDir: string, targetDir: string): Promise<OverlayPatches> {
  const none: OverlayPatches = { appModulePatch: null, appRoutePatch: null, homePagePatch: null };
  const manifestPath = path.join(overlayDir, 'overlay.json');
  if (!(await fs.pathExists(manifestPath))) return none;

  const manifest: OverlayManifest = await fs.readJson(manifestPath);

  // Copy overlay source files
  const srcDir = path.join(overlayDir, 'src');
  if (await fs.pathExists(srcDir)) {
    await fs.copy(srcDir, path.join(targetDir, 'src'), { overwrite: true });
  }

  // Additional root-level files
  for (const file of manifest.files ?? []) {
    const src = path.join(overlayDir, file);
    const dest = path.join(targetDir, file);
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest, { overwrite: true });
    }
  }

  // Merge package.json
  if (manifest.packagePatch) {
    const patchPath = path.join(overlayDir, manifest.packagePatch);
    const targetPkg = path.join(targetDir, 'package.json');
    if ((await fs.pathExists(patchPath)) && (await fs.pathExists(targetPkg))) {
      await mergePackageJson(targetPkg, patchPath);
    }
  }

  // Merge docker-compose.yml
  if (manifest.composePatch) {
    const patchPath = path.join(overlayDir, manifest.composePatch);
    const targetCompose = path.join(targetDir, 'docker-compose.yml');
    if ((await fs.pathExists(patchPath)) && (await fs.pathExists(targetCompose))) {
      await mergeDockerCompose(targetCompose, patchPath);
    }
  }

  // Merge pnpm-workspace.yaml
  if (manifest.workspacePatch) {
    const patchPath = path.join(overlayDir, manifest.workspacePatch);
    const targetWorkspace = path.join(targetDir, 'pnpm-workspace.yaml');
    if ((await fs.pathExists(patchPath)) && (await fs.pathExists(targetWorkspace))) {
      await mergePnpmWorkspace(targetWorkspace, patchPath);
    }
  }

  // Append .env.example
  if (manifest.envPatch) {
    const patchPath = path.join(overlayDir, manifest.envPatch);
    const targetEnv = path.join(targetDir, '.env.example');
    if ((await fs.pathExists(patchPath)) && (await fs.pathExists(targetEnv))) {
      await appendEnvPatch(targetEnv, patchPath);
    }
  }

  return {
    appModulePatch: manifest.appModulePatch ?? null,
    appRoutePatch: manifest.appRoutePatch ?? null,
    homePagePatch: manifest.homePagePatch ?? null,
  };
}

function resolveBackendOverlays(config: ProjectConfig): string[] {
  const overlays: string[] = ['_base'];

  if (config.auth === 'oidc') overlays.push('_auth-oidc');
  else if (config.auth === 'jwt') overlays.push('_auth-jwt');

  if (config.database !== 'none') overlays.push(`_db-${config.database}`);

  if (config.cache !== 'none') overlays.push(`_cache-${config.cache}`);

  if (config.queue !== 'none') overlays.push(`_msg-${config.queue}`);

  if (config.ai !== 'none') overlays.push('_ai');

  for (const rt of config.realtime) overlays.push(`_realtime-${rt}`);

  return overlays;
}

function resolveFrontendOverlays(config: ProjectConfig): string[] {
  const overlays: string[] = ['_base'];

  if (config.auth === 'oidc') overlays.push('_auth-oidc');

  if (config.realtime.includes('websocket')) overlays.push('_realtime');
  if (config.queue === 'rabbitmq') overlays.push('_queue-ui');

  return overlays;
}

function installDeps(dir: string, pkgMgr: string): void {
  const cmd = pkgMgr === 'yarn' ? 'yarn' : `${pkgMgr} install`;
  execSync(cmd, { cwd: dir, stdio: 'inherit' });
}

export async function generate(config: ProjectConfig): Promise<void> {
  const { outputDir, packageManager } = config;
  const isApiOnly = config.preset === 'api-only' || config.frontend === 'none';
  const isFrontendOnly = config.preset === 'frontend-only';

  await fs.ensureDir(outputDir);

  // --- Backend ---
  if (!isFrontendOnly) {
    const backendDir = isApiOnly ? outputDir : path.join(outputDir, 'backend');
    await fs.ensureDir(backendDir);
    const overlays = resolveBackendOverlays(config);
    const backendTemplateBase = path.join(TEMPLATES_DIR, 'backends', config.backend);

    p.log.step(`Backend: ${config.backend} (${overlays.slice(1).join(', ') || 'base'})...`);

    const appModulePatches: _AppModulePatch[] = [];
    for (const overlay of overlays) {
      const overlayDir = path.join(backendTemplateBase, overlay);
      if (!(await fs.pathExists(overlayDir))) {
        p.log.warn(`Overlay "${overlay}" not yet implemented — skipping`);
        continue;
      }
      const { appModulePatch } = await applyOverlay(overlayDir, backendDir);
      if (appModulePatch) appModulePatches.push(appModulePatch);
    }

    await patchAppModule(path.join(backendDir, 'src', 'app.module.ts'), appModulePatches);

    const composePath = path.join(backendDir, 'docker-compose.yml');
    if (await fs.pathExists(composePath)) {
      await generateInfraCompose(composePath);
    }

    await replaceInFiles(backendDir, '{{PROJECT_NAME}}', config.name);

    // Save project config marker for "add" mode
    const saved: SavedProjectConfig = {
      name: config.name,
      backend: config.backend,
      auth: config.auth,
      database: config.database,
      cache: config.cache,
      queue: config.queue,
      ai: config.ai,
      realtime: config.realtime,
      frontend: config.frontend,
    };
    await fs.writeJson(path.join(backendDir, '.wreislab.json'), saved, { spaces: 2 });
    if (!isApiOnly) {
      await fs.writeJson(path.join(outputDir, '.wreislab.json'), saved, { spaces: 2 });
    }
  }

  // --- Frontend ---
  if (config.frontend !== 'none') {
    const frontendDir = isApiOnly ? outputDir : path.join(outputDir, 'frontend');
    await fs.ensureDir(frontendDir);
    const overlays = resolveFrontendOverlays(config);
    const frontendTemplateBase = path.join(TEMPLATES_DIR, 'frontends', config.frontend);

    p.log.step(`Frontend: ${config.frontend} (${overlays.slice(1).join(', ') || 'base'})...`);

    const appRoutePatches: _AppRoutePatch[] = [];
    const homePagePatches: _HomePagePatch[] = [];
    for (const overlay of overlays) {
      const overlayDir = path.join(frontendTemplateBase, overlay);
      if (!(await fs.pathExists(overlayDir))) {
        p.log.warn(`Overlay "${overlay}" not yet implemented — skipping`);
        continue;
      }
      const { appRoutePatch, homePagePatch } = await applyOverlay(overlayDir, frontendDir);
      if (appRoutePatch) appRoutePatches.push(appRoutePatch);
      if (homePagePatch) homePagePatches.push(homePagePatch);
    }

    await patchAppRoutes(path.join(frontendDir, 'src', 'App.tsx'), appRoutePatches);
    await patchHomePage(path.join(frontendDir, 'src', 'pages', 'HomePage.tsx'), homePagePatches);

    await replaceInFiles(frontendDir, '{{PROJECT_NAME}}', config.name);
  }

  // --- Install deps ---
  if (process.env._SKIP_INSTALL !== '1') {
    p.log.step('Installing dependencies...');

    if (!isFrontendOnly && (await fs.pathExists(path.join(outputDir, 'backend', 'package.json')))) {
      installDeps(path.join(outputDir, 'backend'), packageManager);
    } else if (await fs.pathExists(path.join(outputDir, 'package.json'))) {
      installDeps(outputDir, packageManager);
    }

    if (config.frontend !== 'none' && (await fs.pathExists(path.join(outputDir, 'frontend', 'package.json')))) {
      installDeps(path.join(outputDir, 'frontend'), packageManager);
    }
  }
}

export async function addFeature(add: AddConfig, existing: SavedProjectConfig, cwd: string): Promise<void> {
  // Determine backend target dir: check if we're in root (fullstack) or already in backend/
  let backendDir = cwd;
  if (await fs.pathExists(path.join(cwd, 'backend', 'package.json'))) {
    backendDir = path.join(cwd, 'backend');
  }

  const backendTemplateBase = path.join(TEMPLATES_DIR, 'backends', existing.backend);

  let overlayName: string;
  if (add.feature === 'database') overlayName = `_db-${add.value}`;
  else if (add.feature === 'cache') overlayName = `_cache-${add.value}`;
  else if (add.feature === 'queue') overlayName = `_msg-${add.value}`;
  else if (add.feature === 'ai') overlayName = '_ai';
  else overlayName = `_realtime-${add.value}`;

  const overlayDir = path.join(backendTemplateBase, overlayName);
  if (!(await fs.pathExists(overlayDir))) {
    p.log.error(`Overlay "${overlayName}" not found — feature not yet implemented.`);
    process.exit(1);
  }

  p.log.step(`Applying overlay "${overlayName}"...`);
  const { appModulePatch } = await applyOverlay(overlayDir, backendDir);
  if (appModulePatch) {
    await patchAppModule(path.join(backendDir, 'src', 'app.module.ts'), [appModulePatch]);
  }

  const composePath = path.join(backendDir, 'docker-compose.yml');
  if (await fs.pathExists(composePath)) {
    await generateInfraCompose(composePath);
  }

  await replaceInFiles(backendDir, '{{PROJECT_NAME}}', existing.name);

  // Update saved config
  const updated: SavedProjectConfig = { ...existing };
  if (add.feature === 'database') updated.database = add.value as SavedProjectConfig['database'];
  else if (add.feature === 'cache') updated.cache = add.value as SavedProjectConfig['cache'];
  else if (add.feature === 'queue') updated.queue = add.value as SavedProjectConfig['queue'];
  else if (add.feature === 'ai') updated.ai = 'multi';
  else if (add.feature === 'realtime') {
    const rt = add.value as 'websocket' | 'webhook';
    if (!updated.realtime.includes(rt)) updated.realtime = [...updated.realtime, rt];
  }

  await fs.writeJson(path.join(backendDir, '.wreislab.json'), updated, { spaces: 2 });
  // Also update root marker if it exists
  const rootMarker = path.join(cwd, '.wreislab.json');
  if (await fs.pathExists(rootMarker)) {
    await fs.writeJson(rootMarker, updated, { spaces: 2 });
  }

  if (process.env._SKIP_INSTALL !== '1') {
    p.log.step('Installing dependencies...');
    installDeps(backendDir, add.packageManager);
  }
}

async function replaceInFiles(dir: string, from: string, to: string): Promise<void> {
  const extensions = ['.ts', '.tsx', '.json', '.yml', '.yaml', '.md', '.env', '.example', '.sh', '.html'];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      await replaceInFiles(fullPath, from, to);
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      const content = await fs.readFile(fullPath, 'utf8');
      if (content.includes(from)) {
        await fs.writeFile(fullPath, content.replaceAll(from, to), 'utf8');
      }
    }
  }
}
