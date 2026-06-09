export type AuthOption = 'oidc' | 'jwt' | 'none';
export type DatabaseOption = 'none' | 'postgres' | 'mysql' | 'sqlite' | 'mongo';
export type CacheOption = 'none' | 'redis' | 'dragonfly';
export type QueueOption = 'none' | 'rabbitmq';
export type AiOption = 'none' | 'multi';
export type RealtimeOption = ('websocket' | 'webhook')[];
export type FrontendOption = 'react' | 'none';
export type BackendOption = 'nestjs' | 'bun' | 'spring' | 'dotnet' | 'go' | 'python';
export type PackageManager = 'pnpm' | 'npm' | 'yarn';

export type PresetId =
  | 'quick'
  | 'crud'
  | 'full-oidc'
  | 'realtime'
  | 'api-only'
  | 'frontend-only'
  | 'custom';

export interface ProjectConfig {
  name: string;
  preset: PresetId;
  backend: BackendOption;
  auth: AuthOption;
  database: DatabaseOption;
  cache: CacheOption;
  queue: QueueOption;
  ai: AiOption;
  realtime: RealtimeOption;
  frontend: FrontendOption;
  packageManager: PackageManager;
  outputDir: string;
}

export interface SavedProjectConfig {
  name: string;
  backend: BackendOption;
  auth: AuthOption;
  database: DatabaseOption;
  cache: CacheOption;
  queue: QueueOption;
  ai: AiOption;
  realtime: RealtimeOption;
  frontend: FrontendOption;
}

export interface AddConfig {
  feature: 'database' | 'cache' | 'queue' | 'realtime' | 'ai';
  value: string;
  packageManager: PackageManager;
}

export interface Preset {
  id: PresetId;
  label: string;
  hint: string;
  defaults: Partial<Omit<ProjectConfig, 'name' | 'preset' | 'outputDir'>>;
}

export interface OverlayManifest {
  name: string;
  files: string[];
  packagePatch?: string;
  composePatch?: string;
  envPatch?: string;
}
