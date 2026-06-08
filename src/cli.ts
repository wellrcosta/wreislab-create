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
    spinner.start('Aplicando feature...');

    try {
      await addFeature(addConfig, existing, cwd);
      spinner.stop('Feature adicionada com sucesso!');
    } catch (err) {
      spinner.stop('Erro ao adicionar feature');
      p.log.error(String(err));
      process.exit(1);
    }

    p.outro(
      [
        pc.bold('Feature adicionada!'),
        '',
        pc.dim('Próximos passos:'),
        '  cp .env.example .env   # adicione as novas variáveis',
        '  docker compose up -d   # sobe infraestrutura (se necessário)',
      ].join('\n'),
    );
    return;
  }

  // Create mode: new project
  const config = await runPrompts(cwd);

  const spinner = p.spinner();
  spinner.start('Gerando projeto...');

  try {
    await generate(config);
    spinner.stop('Projeto gerado com sucesso!');
  } catch (err) {
    spinner.stop('Erro ao gerar projeto');
    p.log.error(String(err));
    process.exit(1);
  }

  const projectPath = config.preset === 'api-only' || config.frontend === 'none' ? config.name : `${config.name}/backend`;
  p.outro(
    [
      pc.bold(`Projeto pronto em ./${config.name}`),
      '',
      pc.dim('Próximos passos:'),
      `  cd ${projectPath}`,
      '  cp .env.example .env   # ajuste as variáveis',
      '  docker compose up -d   # sobe infraestrutura (se houver)',
      `  ${config.packageManager} run start:dev`,
      '',
      pc.dim('Para produção: pnpm run build && pnpm run start:prod'),
    ].join('\n'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
