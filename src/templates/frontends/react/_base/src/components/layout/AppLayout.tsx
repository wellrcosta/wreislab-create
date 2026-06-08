import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="container py-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
