import { TooltipLayer } from '../components/feedback/TooltipLayer';
import { BrandMark } from '../components/ui/Brand';
import { Button } from '../components/ui/primitives';
import { DrawerProvider } from '../drawer/DrawerContext';
import { DrawerHost } from '../drawer/DrawerHost';
import { DashboardProvider } from '../hooks/useDashboard';
import { Board } from '../layout/Board';
import { Greeting } from '../layout/Greeting';
import { LiveAnnouncer } from '../layout/LiveAnnouncer';
import { BottomNav, Sidebar } from '../layout/Navigation';
import { SectionsProvider } from '../layout/sections';
import { Topbar } from '../layout/Topbar';

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-busy="true">
      <BrandMark className="animate-pulse" />
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}

function LoadError({ retry }: { retry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="max-w-sm rounded-lg border border-line bg-surface p-6 text-center shadow-card">
        <h1 className="text-lg font-extrabold">Can't reach the server</h1>
        <p className="mt-1.5 text-sm text-fg-2">The dashboard API did not answer. Check that it is running, then try again.</p>
        <Button variant="primary" icon="refresh" className="mt-4" onClick={retry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

export function DashboardPage() {
  return (
    <DashboardProvider fallback={<Loading />} error={(retry) => <LoadError retry={retry} />}>
      <SectionsProvider>
        <DrawerProvider>
          <a
            href="#main"
            className="sr-only z-90 rounded-md bg-accent px-3.5 py-2 text-sm font-bold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <div className="relative z-1 grid min-h-screen grid-cols-[var(--sidebar-w)_minmax(0,1fr)] transition-[grid-template-columns] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]">
            <Sidebar />
            <div className="col-start-2 min-w-0">
              <header>
                <Topbar />
                <Greeting />
              </header>
              <Board />
            </div>
            <BottomNav />
          </div>
          <DrawerHost />
          <TooltipLayer />
          <LiveAnnouncer />
        </DrawerProvider>
      </SectionsProvider>
    </DashboardProvider>
  );
}
