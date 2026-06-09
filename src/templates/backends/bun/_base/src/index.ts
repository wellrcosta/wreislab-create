import pino from 'pino';
import { env } from './config/env';
import { createApp } from './app';

const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.APP_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
      : undefined,
});

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ service: env.APP_NAME, env: env.APP_ENV }, `Server running on port ${env.PORT}`);
  if (env.SWAGGER_ENABLED) {
    logger.info(`Swagger UI: http://localhost:${env.PORT}/docs`);
  }
});

export type App = typeof app;
