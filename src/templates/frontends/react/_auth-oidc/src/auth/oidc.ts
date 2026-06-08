import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { env } from '@/lib/env';

export const userManager = new UserManager({
  authority: env.VITE_OIDC_AUTHORITY,
  client_id: env.VITE_OIDC_CLIENT_ID,
  redirect_uri: env.VITE_OIDC_REDIRECT_URI,
  post_logout_redirect_uri: env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
  scope: env.VITE_OIDC_SCOPE,
  response_type: env.VITE_OIDC_RESPONSE_TYPE,
  automaticSilentRenew: true,
  loadUserInfo: true,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});
