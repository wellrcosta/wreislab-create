import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

interface ComposeDoc {
  services?: Record<string, unknown>;
  volumes?: Record<string, unknown>;
  networks?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function mergeDockerCompose(target: string, patchPath: string): Promise<void> {
  const baseRaw = await fs.readFile(target, 'utf8');
  const patchRaw = await fs.readFile(patchPath, 'utf8');

  const base = (yaml.load(baseRaw) ?? {}) as ComposeDoc;
  const patch = (yaml.load(patchRaw) ?? {}) as ComposeDoc;

  const merged: ComposeDoc = { ...base };

  if (patch.services) {
    merged.services = { ...(base.services ?? {}) };
    for (const [name, svc] of Object.entries(patch.services)) {
      if (name === 'api' && merged.services.api) {
        const baseApi = merged.services.api as Record<string, unknown>;
        const patchApi = svc as Record<string, unknown>;
        const mergedDependsOn = {
          ...(baseApi.depends_on as Record<string, unknown> ?? {}),
          ...(patchApi.depends_on as Record<string, unknown> ?? {}),
        };
        merged.services.api = {
          ...baseApi,
          ...patchApi,
          ...(Object.keys(mergedDependsOn).length > 0 ? { depends_on: mergedDependsOn } : {}),
        };
      } else {
        merged.services[name] = svc;
      }
    }
  }

  if (patch.volumes) {
    merged.volumes = { ...(base.volumes ?? {}), ...patch.volumes };
  }
  if (patch.networks) {
    merged.networks = { ...(base.networks ?? {}), ...patch.networks };
  }

  await fs.writeFile(target, yaml.dump(merged, { lineWidth: 120 }), 'utf8');
}

interface WorkspaceDoc {
  allowBuilds?: Record<string, boolean | string>;
  [key: string]: unknown;
}

export async function mergePnpmWorkspace(target: string, patchPath: string): Promise<void> {
  const baseRaw = await fs.readFile(target, 'utf8');
  const patchRaw = await fs.readFile(patchPath, 'utf8');

  const base = (yaml.load(baseRaw) ?? {}) as WorkspaceDoc;
  const patch = (yaml.load(patchRaw) ?? {}) as WorkspaceDoc;

  const merged: WorkspaceDoc = { ...base };

  if (patch.allowBuilds) {
    merged.allowBuilds = { ...(base.allowBuilds ?? {}), ...patch.allowBuilds };
  }

  for (const [key, value] of Object.entries(patch)) {
    if (key !== 'allowBuilds') {
      merged[key] = value;
    }
  }

  await fs.writeFile(target, yaml.dump(merged, { lineWidth: 120 }), 'utf8');
}

export async function generateInfraCompose(dockerComposePath: string): Promise<void> {
  const doc = (yaml.load(await fs.readFile(dockerComposePath, 'utf8')) ?? {}) as ComposeDoc;
  const { api: _api, ...infraServices } = (doc.services ?? {}) as Record<string, unknown>;
  if (Object.keys(infraServices).length === 0) return;

  const infra: ComposeDoc = { ...doc, services: infraServices };
  const infraPath = path.join(path.dirname(dockerComposePath), 'docker-compose.infra.yml');
  await fs.writeFile(infraPath, yaml.dump(infra, { lineWidth: 120 }), 'utf8');
}
