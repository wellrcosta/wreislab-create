import { Elysia } from 'elysia';
import Redis from 'ioredis';

const redis = new Redis(Bun.env.REDIS_URL ?? 'redis://localhost:6379');

export const cachePlugin = new Elysia({ name: 'cache' }).decorate('cache', redis);

export type Cache = typeof redis;
