import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <h1 className="text-2xl font-bold">Sign In</h1>
      <button
        onClick={() => login('/')}
        className="rounded-md bg-foreground px-6 py-2 text-sm text-background hover:opacity-90"
      >
        Login with OIDC
      </button>
    </div>
  );
}
