import { registerAs } from '@nestjs/config';

export const oidcConfig = registerAs('oidc', () => ({
  issuerUrl: process.env.OIDC_ISSUER_URL ?? '',
  audience: process.env.OIDC_AUDIENCE ?? '',
  jwksUri: process.env.OIDC_JWKS_URI ?? '',
  groupsClaim: process.env.JWT_GROUPS_CLAIM ?? 'groups',
}));
