import ky, { type KyInstance } from 'ky';
import { env } from './env';

export const api: KyInstance = ky.create({
  prefix: env.VITE_API_BASE_URL,
});

export interface HelloResponse {
  message: string;
}
