import { useEffect } from 'react';
import { useAuth } from '@/auth/useAuth';

export function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-muted-foreground text-sm">Signing out...</p>
    </div>
  );
}
