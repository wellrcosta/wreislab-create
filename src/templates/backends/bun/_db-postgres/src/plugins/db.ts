import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(Bun.env.DATABASE_URL ?? '');
const db = drizzle(client);

export const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db);

export type Db = typeof db;
