import ky, { type KyInstance } from 'ky';
import { userManager } from '@/auth/oidc';
import { env } from './env';

export const api: KyInstance = ky.create({
  prefix: env.VITE_API_BASE_URL,
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        const user = await userManager.getUser();
        if (user?.access_token) {
          request.headers.set('Authorization', `Bearer ${user.access_token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, options, response }) => {
        if (response.status === 401) {
          try {
            await userManager.signinSilent();
            const renewed = await userManager.getUser();
            if (renewed?.access_token) {
              const retryRequest = request.clone();
              retryRequest.headers.set('Authorization', `Bearer ${renewed.access_token}`);
              return ky(retryRequest, options);
            }
          } catch {
            // Silent renew failed — let the 401 propagate
          }
        }
        return response;
      },
    ],
  },
});

export interface PublicResponse {
  message: string;
  authenticated: boolean;
}

export interface ProfileResponse {
  sub: string;
  email: string;
  name: string;
  groups: string[];
}

export interface AdminResponse {
  message: string;
  allowed: boolean;
}
