import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="text-sm font-bold tracking-tight">
          {{PROJECT_NAME}}
        </Link>
        <nav className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="text-sm hover:underline">
                Profile
              </Link>
              <button onClick={handleLogout} className="text-sm hover:underline">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm hover:underline">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
