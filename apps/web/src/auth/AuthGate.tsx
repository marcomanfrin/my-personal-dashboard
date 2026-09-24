import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { queryClient } from '../api/queryClient';
import { BrandMark } from '../components/ui/Brand';
import { LoginPage } from '../pages/LoginPage';
import { refresh, session, type Session } from './session';

export function useSession(): Session | null {
  return useSyncExternalStore(session.subscribe, session.get);
}

/**
 * Restores the session from the refresh cookie on load, then renders the app
 * when signed in and the login page otherwise. Signing out clears cached data.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const current = useSession();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    void refresh().finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!current) queryClient.clear();
  }, [current]);

  if (booting)
    return (
      <div className="grid min-h-screen place-items-center" role="status" aria-busy="true">
        <BrandMark className="animate-pulse" />
        <span className="sr-only">Loading</span>
      </div>
    );
  return current ? children : <LoginPage />;
}
