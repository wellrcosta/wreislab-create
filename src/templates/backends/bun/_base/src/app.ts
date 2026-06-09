import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env';
import { healthPlugin } from './plugins/health';
import { metricsPlugin } from './plugins/metrics';
import { examplePlugin } from './plugins/example';
// {{EXTRA_IMPORTS}}

export const createApp = () =>
  new Elysia()
    .use(cors({ origin: env.CORS_ORIGIN }))
    .use(
      swagger({
        path: '/docs',
        documentation: {
          info: { title: env.APP_NAME, version: '0.1.0', description: `${env.APP_NAME} API` },
        },
      }),
    )
    .use(healthPlugin)
    .use(metricsPlugin)
    .use(examplePlugin)
    // {{EXTRA_PLUGINS}}
