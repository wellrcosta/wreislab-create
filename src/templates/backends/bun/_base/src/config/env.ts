import { z } from 'zod';

const schema = z.object({
  APP_NAME: z.string().default('{{PROJECT_NAME}}'),
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  SWAGGER_ENABLED: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
});

const parsed = schema.safeParse(Bun.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
