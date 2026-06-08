/// <reference types="vite/client" />
import { z } from 'zod';

declare global {
  interface Window {
    __env__?: Record<string, string>;
  }
}

const get = (key: string, devFallback: string | undefined) =>
  window.__env__?.[key] || devFallback;

const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1),
  VITE_API_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  VITE_APP_NAME: get('VITE_APP_NAME', import.meta.env.VITE_APP_NAME),
  VITE_API_BASE_URL: get('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
});

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Missing or invalid environment variables.');
}

export const env = parsed.data;
