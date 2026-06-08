import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  APP_NAME: Joi.string().required(),
  APP_VERSION: Joi.string().default('1.0.0'),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),

  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  APP_URL: Joi.string().uri().allow('').optional(),

  SWAGGER_ENABLED: Joi.boolean().default(true),
  METRICS_ENABLED: Joi.boolean().default(true),

  OIDC_ISSUER_URL: Joi.string().uri().required(),
  OIDC_AUDIENCE: Joi.string().allow('').default(''),
  OIDC_JWKS_URI: Joi.string().uri().allow('').default(''),

  JWT_GROUPS_CLAIM: Joi.string().default('groups'),
});
