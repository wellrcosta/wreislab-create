import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
// {{EXTRA_ROUTE_IMPORTS}}

export function App() {
  return (
    <Routes>
      {/* {{EXTRA_TOPLEVEL_ROUTES}} */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        {/* {{EXTRA_LAYOUT_ROUTES}} */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
