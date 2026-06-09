import { Elysia } from 'elysia';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = Bun.env.OIDC_ISSUER ?? '';
const audience = Bun.env.OIDC_AUDIENCE ?? '';

// Deferred: safe when OIDC_ISSUER is absent (e.g. unit test env)
const JWKS = issuer
  ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
  : null;

export const authPlugin = new Elysia({ name: 'auth' })
  .macro({
    auth: () => ({
      async beforeHandle({ request, error }) {
        if (!JWKS) return error(503, { message: 'OIDC_ISSUER not configured' });
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return error(401, { message: 'Missing authorization token' });
        }
        const token = authHeader.slice(7);
        try {
          await jwtVerify(token, JWKS, { issuer, audience });
        } catch {
          return error(401, { message: 'Invalid or expired token' });
        }
      },
    }),
  });
