import { TooltipLayer } from '../components/feedback/TooltipLayer';
import { BrandMark } from '../components/ui/Brand';
import { Button } from '../components/ui/primitives';
import { DrawerProvider } from '../drawer/DrawerContext';
import { DrawerHost } from '../drawer/DrawerHost';
import { AttentionPanel } from '../features/attention/AttentionPanel';
import { CalendarCard } from '../features/calendar/CalendarCard';
import { GanttCard } from '../features/gantt/GanttCard';
import { GithubCard } from '../features/github/GithubCard';
import { KpiGrid } from '../features/kpis/KpiGrid';
import { MailCard } from '../features/mail/MailCard';
import { ProjectsCard } from '../features/projects/ProjectsCard';
import { RemindersCard } from '../features/reminders/RemindersCard';
import { TrelloCard } from '../features/trello/TrelloCard';
import { DashboardProvider } from '../hooks/useDashboard';
import { Greeting } from '../layout/Greeting';
import { LiveAnnouncer } from '../layout/LiveAnnouncer';
import { BottomNav, Sidebar } from '../layout/Navigation';
import { SectionsProvider } from '../layout/sections';
import { Topbar } from '../layout/Topbar';

/**
 * The board: one column on phones, two from 768px, a 12-column grid from 1200px
 * with the same spans and order as the demo. `dense` fills the gaps.
 */
function Board() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto outline-none max-w-[1680px] px-3 pt-3.5 pb-[calc(var(--bottomnav-h)+28px)] xs:px-4 md:px-7 md:pt-[18px] md:pb-12">
      <div className="grid grid-flow-row-dense grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-[18px] xl:grid-cols-12 [&>*]:min-w-0">
        <AttentionPanel className="md:col-span-2 xl:order-1 xl:col-span-7" />
        <KpiGrid className="md:col-span-2 xl:order-2 xl:col-span-5" />
        <MailCard className="md:col-span-2 xl:order-3 xl:col-span-7" />
        <CalendarCard className="xl:order-4 xl:col-span-5" />
        <RemindersCard className="xl:order-6 xl:col-span-5" />
        <GithubCard className="md:col-span-2 xl:order-5 xl:col-span-7" />
        <GanttCard className="md:col-span-2 xl:order-7 xl:col-span-12" />
        <TrelloCard className="md:col-span-2 xl:order-8 xl:col-span-8" />
        <ProjectsCard className="md:col-span-2 xl:order-9 xl:col-span-4" />
      </div>
    </main>
  );
}

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
          <div className="relative z-1 grid min-h-screen grid-cols-[var(--sidebar-w)_minmax(0,1fr)]">
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
