import { Elysia } from 'elysia';

export const healthPlugin = new Elysia({ name: 'health' }).get('/health', () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));
