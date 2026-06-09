import { Elysia } from 'elysia';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(Bun.env.DATABASE_URL ?? '');
const db = drizzle(connection);

export const dbPlugin = new Elysia({ name: 'db' }).decorate('db', db);

export type Db = typeof db;
