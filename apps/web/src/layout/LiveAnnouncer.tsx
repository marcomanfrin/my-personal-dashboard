import { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';

/** Tells screen reader users when live updates drop and come back (WCAG 4.1.3). */
export function LiveAnnouncer() {
  const { live } = useDashboard();
  const [message, setMessage] = useState('');
  const wasOffline = useRef(false);

  useEffect(() => {
    if (live === 'offline') {
      wasOffline.current = true;
      setMessage('Live updates disconnected. Data may be out of date.');
    } else if (live === 'live' && wasOffline.current) {
      wasOffline.current = false;
      setMessage('Live updates restored.');
    }
  }, [live]);

  return (
    <div role="status" className="sr-only">
      {message}
    </div>
  );
}
