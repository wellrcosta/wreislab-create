import { Elysia } from 'elysia';
import mongoose from 'mongoose';

await mongoose.connect(Bun.env.MONGO_URL ?? 'mongodb://localhost:27017/app');

export const dbPlugin = new Elysia({ name: 'db' }).decorate('mongoose', mongoose);
