import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{{PROJECT_NAME}}</h1>
        <p className="text-muted-foreground text-sm">React + NestJS + OIDC</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {isAuthenticated ? (
          <>
            <Link to="/profile" className="rounded-md bg-foreground px-4 py-2 text-sm text-background">
              Profile
            </Link>
            <Link to="/logout" className="rounded-md border px-4 py-2 text-sm">
              Logout
            </Link>
          </>
        ) : (
          <Link to="/login" className="rounded-md bg-foreground px-4 py-2 text-sm text-background">
            Login
          </Link>
        )}
      </div>
      {/* {{EXTRA_HOME_LINKS}} */}
    </div>
  );
}
