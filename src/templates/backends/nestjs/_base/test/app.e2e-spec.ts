// Set required env vars before any module is imported
process.env.NODE_ENV = 'test';
process.env.APP_NAME = process.env.APP_NAME || '{{PROJECT_NAME}}';
// Fallback values for optional overlay env vars (ignored if overlay not active)
process.env.OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL || 'http://localhost:8080/realms/test';
// Setting OIDC_JWKS_URI skips OIDC discovery at startup so the app can boot in tests
process.env.OIDC_JWKS_URI = process.env.OIDC_JWKS_URI || 'http://localhost:8080/realms/test/protocol/openid-connect/certs';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-minimum-32-characters-long-x';

import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) returns 200', () => {
    return supertest(app.getHttpServer()).get('/health').expect(200);
  });
});
