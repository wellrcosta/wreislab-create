import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const sqlite = new Database(Bun.env.DB_PATH ?? 'data.db');
const db = drizzle(sqlite);

export const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db);

export type Db = typeof db;
