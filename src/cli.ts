#!/usr/bin/env node
import * as p from '@clack/prompts';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { addFeature, generate } from './generator.js';
import { runAddPrompts, runPrompts } from './prompts.js';
import type { SavedProjectConfig } from './types.js';

async function detectExistingProject(cwd: string): Promise<SavedProjectConfig | null> {
  const candidates = [
    path.join(cwd, '.wreislab.json'),
    path.join(cwd, 'backend', '.wreislab.json'),
  ];
  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return fs.readJson(candidate) as Promise<SavedProjectConfig>;
    }
  }
  return null;
}

async function main(): Promise<void> {
  console.log();
  console.log(pc.bold(pc.cyan('  wreislab-create')));
  console.log();

  const cwd = process.cwd();
  const existing = await detectExistingProject(cwd);

  if (existing) {
    // Add mode: already inside a generated project
    const addConfig = await runAddPrompts(cwd, existing);

    const spinner = p.spinner();
    spinner.start('Applying feature...');

    try {
      await addFeature(addConfig, existing, cwd);
      spinner.stop('Feature added successfully!');
    } catch (err) {
      spinner.stop('Failed to add feature');
      p.log.error(String(err));
      process.exit(1);
    }

    p.outro(
      [
        pc.bold('Feature added!'),
        '',
        pc.dim('Next steps:'),
        '  cp .env.example .env   # fill in the new variables',
        '  docker compose up -d   # start infrastructure (if needed)',
      ].join('\n'),
    );
    return;
  }

  // Create mode: new project
  const config = await runPrompts(cwd);

  const spinner = p.spinner();
  spinner.start('Generating project...');

  try {
    await generate(config);
    spinner.stop('Project generated successfully!');
  } catch (err) {
    spinner.stop('Failed to generate project');
    p.log.error(String(err));
    process.exit(1);
  }

  const projectPath = config.preset === 'api-only' || config.frontend === 'none' ? config.name : `${config.name}/backend`;
  p.outro(
    [
      pc.bold(`Project ready at ./${config.name}`),
      '',
      pc.dim('Next steps:'),
      `  cd ${projectPath}`,
      '  cp .env.example .env   # fill in your variables',
      '  docker compose up -d   # start infrastructure (if any)',
      `  ${config.packageManager} run start:dev`,
      '',
      pc.dim('For production: pnpm run build && pnpm run start:prod'),
    ].join('\n'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
