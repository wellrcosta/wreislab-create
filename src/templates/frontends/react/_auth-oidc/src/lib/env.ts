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
  VITE_OIDC_AUTHORITY: z.string().url(),
  VITE_OIDC_CLIENT_ID: z.string().min(1),
  VITE_OIDC_REDIRECT_URI: z.string().url(),
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: z.string().url(),
  VITE_OIDC_SCOPE: z.string().default('openid profile email groups'),
  VITE_OIDC_RESPONSE_TYPE: z.string().default('code'),
  VITE_JWT_GROUPS_CLAIM: z.string().default('groups'),
});

const parsed = envSchema.safeParse({
  VITE_APP_NAME: get('VITE_APP_NAME', import.meta.env.VITE_APP_NAME),
  VITE_API_BASE_URL: get('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
  VITE_OIDC_AUTHORITY: get('VITE_OIDC_AUTHORITY', import.meta.env.VITE_OIDC_AUTHORITY),
  VITE_OIDC_CLIENT_ID: get('VITE_OIDC_CLIENT_ID', import.meta.env.VITE_OIDC_CLIENT_ID),
  VITE_OIDC_REDIRECT_URI: get('VITE_OIDC_REDIRECT_URI', import.meta.env.VITE_OIDC_REDIRECT_URI),
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: get('VITE_OIDC_POST_LOGOUT_REDIRECT_URI', import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI),
  VITE_OIDC_SCOPE: get('VITE_OIDC_SCOPE', import.meta.env.VITE_OIDC_SCOPE),
  VITE_OIDC_RESPONSE_TYPE: get('VITE_OIDC_RESPONSE_TYPE', import.meta.env.VITE_OIDC_RESPONSE_TYPE),
  VITE_JWT_GROUPS_CLAIM: get('VITE_JWT_GROUPS_CLAIM', import.meta.env.VITE_JWT_GROUPS_CLAIM),
});

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Missing or invalid environment variables.');
}

export const env = parsed.data;
