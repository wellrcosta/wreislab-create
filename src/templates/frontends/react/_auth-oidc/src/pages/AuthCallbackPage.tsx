import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userManager } from '@/auth/oidc';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    userManager
      .signinRedirectCallback()
      .then((user) => {
        const from = (user?.state as { from?: string } | null)?.from ?? '/';
        navigate(from, { replace: true });
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Completing sign in...</p>
    </div>
  );
}
