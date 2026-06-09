import { Elysia } from 'elysia';
import { collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

export const metricsPlugin = new Elysia({ name: 'metrics' }).get('/metrics', async ({ set }) => {
  set.headers['content-type'] = register.contentType;
  return register.metrics();
});
