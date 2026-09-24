import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { AuthGate } from './auth/AuthGate';
import { ToastProvider } from './components/feedback/Toast';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthGate>
          <DashboardPage />
        </AuthGate>
      </ToastProvider>
    </QueryClientProvider>
  );
}
