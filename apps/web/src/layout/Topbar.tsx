import { useState } from 'react';
import { Brand } from '../components/ui/Brand';
import { IconButton } from '../components/ui/primitives';
import { useDrawer } from '../drawer/DrawerContext';
import { useDashboard } from '../hooks/useDashboard';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/cn';
import { fmtLong } from '../lib/format';
import { Avatar } from './Navigation';
import { NotificationsMenu } from './NotificationsMenu';
import { SearchBox } from './SearchBox';

export function Topbar() {
  const { now, user } = useDashboard();
  const { open } = useDrawer();
  const { theme, toggle } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <div
      className={cn(
        'sticky top-[env(safe-area-inset-top,0px)] z-30 flex h-[var(--topbar-h)] items-center gap-2 border-b border-line bg-canvas/82 px-3.5 backdrop-blur-[14px] backdrop-saturate-[1.2]',
        'max-[359px]:gap-1 max-[359px]:px-2.5 md:gap-2.5 md:px-6',
      )}
    >
      <Brand className="text-[15px] md:hidden" nameClassName="max-[359px]:hidden" />
      <span className="hidden text-[13.5px] font-semibold whitespace-nowrap text-fg-2 md:block">{fmtLong(now)}</span>
      <div className="flex-1" />
      <SearchBox mobileOpen={searchOpen} onMobileClose={() => setSearchOpen(false)} />
      <IconButton icon="search" label="Search" className="md:hidden" onClick={() => setSearchOpen(true)} />
      <NotificationsMenu />
      <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={`Switch to ${next} mode`} tip={`Switch to ${next} mode`} onClick={toggle} />
      <button type="button" aria-label="Profile and data sources" data-tip="Profile and data sources" onClick={() => open('profile', 'me')}>
        <Avatar initials={user.initials} />
      </button>
    </div>
  );
}
