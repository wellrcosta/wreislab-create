import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="text-sm font-bold tracking-tight">
          {{PROJECT_NAME}}
        </Link>
      </div>
    </header>
  );
}
