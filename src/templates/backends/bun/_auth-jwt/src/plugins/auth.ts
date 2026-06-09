import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';

const JWT_SECRET = Bun.env.JWT_SECRET ?? 'change-me-in-production';
const JWT_EXPIRATION = Bun.env.JWT_EXPIRATION ?? '7d';

export const authPlugin = new Elysia({ name: 'auth' })
  .use(jwt({ name: 'jwt', secret: JWT_SECRET }))
  .use(bearer())
  .macro({
    auth: () => ({
      async beforeHandle({ bearer: token, jwt: jwtInstance, error }) {
        if (!token) return error(401, { message: 'Missing authorization token' });
        const payload = await jwtInstance.verify(token);
        if (!payload) return error(401, { message: 'Invalid or expired token' });
      },
    }),
  })
  .post(
    '/auth/login',
    async ({ body, jwt: jwtInstance }) => {
      // Replace with real user lookup and password verification
      if (body.username !== 'admin' || body.password !== 'secret') {
        throw new Error('Invalid credentials');
      }
      const token = await jwtInstance.sign(
        { sub: '1', username: body.username },
        { exp: JWT_EXPIRATION },
      );
      return { token };
    },
    {
      body: t.Object({ username: t.String(), password: t.String() }),
      error({ error }) {
        return { status: 401, body: { message: error.message } };
      },
    },
  );
