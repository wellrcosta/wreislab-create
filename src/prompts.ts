import * as p from '@clack/prompts';
import { PRESETS } from './presets.js';
import type {
  AddConfig,
  AiOption,
  AuthOption,
  BackendOption,
  CacheOption,
  DatabaseOption,
  FrontendOption,
  PackageManager,
  PresetId,
  ProjectConfig,
  QueueOption,
  RealtimeOption,
  SavedProjectConfig,
} from './types.js';

export async function runPrompts(cwd: string): Promise<ProjectConfig> {
  p.intro('WReisLab Template Generator');

  const name = await p.text({
    message: 'Project name?',
    placeholder: 'my-app',
    validate: (v: string) => {
      if (!v) return 'Name is required';
      if (!/^[a-z0-9-_]+$/.test(v)) return 'Use only lowercase letters, numbers, - or _';
    },
  });
  if (p.isCancel(name)) process.exit(0);

  const presetId = await p.select<PresetId>({
    message: 'Choose a preset (starting point):',
    options: PRESETS.map((pr) => ({
      value: pr.id,
      label: pr.label,
      hint: pr.hint,
    })),
  });
  if (p.isCancel(presetId)) process.exit(0);

  const preset = PRESETS.find((pr) => pr.id === presetId)!;
  const d = preset.defaults;

  p.note('Customize your addons — any combination is valid', 'Configuration');

  const isFrontendOnly = presetId === 'frontend-only';
  const isApiOnly = presetId === 'api-only';

  let backend: BackendOption = d.backend ?? 'nestjs';
  let auth: AuthOption = d.auth ?? 'none';
  let database: DatabaseOption = d.database ?? 'none';
  let cache: CacheOption = d.cache ?? 'none';
  let queue: QueueOption = d.queue ?? 'none';
  let ai: AiOption = d.ai ?? 'none';
  let realtime: RealtimeOption = d.realtime ?? [];
  let frontend: FrontendOption = d.frontend ?? 'react';

  if (!isFrontendOnly) {
    const backendAns = await p.select<BackendOption>({
      message: 'Backend language / framework?',
      options: [
        { value: 'nestjs', label: 'NestJS (TypeScript)', hint: 'available' },
        { value: 'bun', label: 'Bun (TypeScript + Elysia)', hint: 'available' },
        { value: 'dotnet', label: '.NET 8', hint: 'coming soon' },
        { value: 'go', label: 'Go (Gin / Chi)', hint: 'coming soon' },
        { value: 'spring', label: 'Java / Spring Boot', hint: 'coming soon' },
        { value: 'python', label: 'Python (FastAPI)', hint: 'coming soon' },
      ],
      initialValue: backend,
    });
    if (p.isCancel(backendAns)) process.exit(0);
    backend = backendAns;

    const authAns = await p.select<AuthOption>({
      message: 'Authentication?',
      options: [
        { value: 'none', label: 'None' },
        { value: 'oidc', label: 'OIDC (Pocket ID / Keycloak / any provider)' },
        { value: 'jwt', label: 'Simple JWT (local secret, no JWKS)' },
      ],
      initialValue: auth,
    });
    if (p.isCancel(authAns)) process.exit(0);
    auth = authAns;

    const dbAns = await p.select<DatabaseOption>({
      message: 'Database?',
      options: [
        { value: 'none', label: 'None' },
        { value: 'postgres', label: 'PostgreSQL (TypeORM)' },
        { value: 'mysql', label: 'MySQL (TypeORM)' },
        { value: 'sqlite', label: 'SQLite (TypeORM — no extra container)' },
        { value: 'mongo', label: 'MongoDB (Mongoose)' },
      ],
      initialValue: database,
    });
    if (p.isCancel(dbAns)) process.exit(0);
    database = dbAns;

    const cacheAns = await p.select<CacheOption>({
      message: 'Cache?',
      options: [
        { value: 'none', label: 'None' },
        { value: 'redis', label: 'Redis' },
        { value: 'dragonfly', label: 'Dragonfly (Redis-compatible, faster)' },
      ],
      initialValue: cache,
    });
    if (p.isCancel(cacheAns)) process.exit(0);
    cache = cacheAns;

    const queueAns = await p.select<QueueOption>({
      message: 'Queue / Messaging?',
      options: [
        { value: 'none', label: 'None' },
        { value: 'rabbitmq', label: 'RabbitMQ (producer + consumer)' },
      ],
      initialValue: queue,
    });
    if (p.isCancel(queueAns)) process.exit(0);
    queue = queueAns;

    const aiAns = await p.select<AiOption>({
      message: 'AI integration?',
      options: [
        { value: 'none', label: 'None' },
        { value: 'multi', label: 'Yes — multi-provider (NVIDIA free, OpenAI, Claude, Gemini, DeepSeek)' },
      ],
      initialValue: ai,
    });
    if (p.isCancel(aiAns)) process.exit(0);
    ai = aiAns;

    const realtimeAns = await p.multiselect<'websocket' | 'webhook'>({
      message: 'Real-time communication? (select any combination)',
      options: [
        { value: 'websocket', label: 'WebSocket', hint: 'push events to frontend' },
        { value: 'webhook', label: 'Webhook (HTTP endpoint to receive external events)' },
      ],
      initialValues: realtime,
      required: false,
    });
    if (p.isCancel(realtimeAns)) process.exit(0);
    realtime = realtimeAns as RealtimeOption;
  }

  if (!isApiOnly) {
    const frontendAns = await p.select<FrontendOption>({
      message: 'Frontend?',
      options: [
        { value: 'react', label: 'React (shadcn/ui + TanStack Query)', hint: 'available' },
        { value: 'none', label: 'None (API only)' },
      ],
      initialValue: frontend,
    });
    if (p.isCancel(frontendAns)) process.exit(0);
    frontend = frontendAns;
  } else {
    frontend = 'none';
  }

  if (isFrontendOnly) {
    backend = 'nestjs';
    auth = 'none';
    database = 'none';
    cache = 'none';
    queue = 'none';
    ai = 'none';
    realtime = [];
    frontend = 'react';
  }

  const pkgMgr = await p.select<PackageManager>({
    message: 'Package manager?',
    options: [
      { value: 'pnpm', label: 'pnpm', hint: 'recommended' },
      { value: 'npm', label: 'npm' },
      { value: 'yarn', label: 'yarn' },
    ],
    initialValue: d.packageManager ?? 'pnpm',
  });
  if (p.isCancel(pkgMgr)) process.exit(0);

  return {
    name: name as string,
    preset: presetId as PresetId,
    backend,
    auth,
    database,
    cache,
    queue,
    ai,
    realtime,
    frontend,
    packageManager: pkgMgr as PackageManager,
    outputDir: `${cwd}/${name}`,
  };
}

export async function runAddPrompts(cwd: string, existing: SavedProjectConfig): Promise<AddConfig> {
  p.intro(`Add feature to "${existing.name}"`);

  type FeatureChoice = 'database' | 'cache' | 'queue' | 'websocket' | 'webhook' | 'ai';
  const options: { value: FeatureChoice; label: string; hint?: string }[] = [];

  if (existing.database === 'none') {
    options.push({ value: 'database', label: 'Database' });
  }
  if (existing.cache === 'none') {
    options.push({ value: 'cache', label: 'Cache (Redis / Dragonfly)' });
  }
  if (existing.queue === 'none') {
    options.push({ value: 'queue', label: 'Queue — RabbitMQ' });
  }
  if (!existing.realtime.includes('websocket')) {
    options.push({ value: 'websocket', label: 'WebSocket', hint: 'push events to frontend' });
  }
  if (!existing.realtime.includes('webhook')) {
    options.push({ value: 'webhook', label: 'Webhook (HTTP endpoint for external events)' });
  }
  if ((existing.ai ?? 'none') === 'none') {
    options.push({ value: 'ai', label: 'AI integration (NVIDIA free, OpenAI, Claude, Gemini, DeepSeek)' });
  }

  if (options.length === 0) {
    p.outro('All available features are already active in this project.');
    process.exit(0);
  }

  const featureAns = await p.select<FeatureChoice>({
    message: 'Which feature do you want to add?',
    options,
  });
  if (p.isCancel(featureAns)) process.exit(0);
  const feature = featureAns as FeatureChoice;

  let value = feature as string;

  if (feature === 'database') {
    const dbAns = await p.select<Exclude<DatabaseOption, 'none'>>({
      message: 'Which database?',
      options: [
        { value: 'postgres', label: 'PostgreSQL (TypeORM)' },
        { value: 'mysql', label: 'MySQL (TypeORM)' },
        { value: 'sqlite', label: 'SQLite (TypeORM — no extra container)' },
        { value: 'mongo', label: 'MongoDB (Mongoose)' },
      ],
    });
    if (p.isCancel(dbAns)) process.exit(0);
    value = dbAns as string;
  }

  if (feature === 'cache') {
    const cacheAns = await p.select<Exclude<CacheOption, 'none'>>({
      message: 'Which cache?',
      options: [
        { value: 'redis', label: 'Redis' },
        { value: 'dragonfly', label: 'Dragonfly (Redis-compatible, faster)' },
      ],
    });
    if (p.isCancel(cacheAns)) process.exit(0);
    value = cacheAns as string;
  }

  const pkgMgr = await p.select<PackageManager>({
    message: 'Package manager?',
    options: [
      { value: 'pnpm', label: 'pnpm', hint: 'recommended' },
      { value: 'npm', label: 'npm' },
      { value: 'yarn', label: 'yarn' },
    ],
    initialValue: 'pnpm',
  });
  if (p.isCancel(pkgMgr)) process.exit(0);

  const normalizedFeature = (feature === 'websocket' || feature === 'webhook')
    ? 'realtime'
    : feature;

  return {
    feature: normalizedFeature as AddConfig['feature'],
    value: feature === 'ai' ? 'multi' : value,
    packageManager: pkgMgr as PackageManager,
  };
}
