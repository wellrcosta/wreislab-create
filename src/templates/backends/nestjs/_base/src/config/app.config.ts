import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  name: process.env.APP_NAME ?? '{{PROJECT_NAME}}',
  version: process.env.APP_VERSION ?? '1.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
}));
