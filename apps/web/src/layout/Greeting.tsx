import { ms } from '@argus/shared';
import { useDashboard } from '../hooks/useDashboard';
import { dueText, fmtLong, fmtTime, plural } from '../lib/format';
import { GreetingAvatar } from './GreetingAvatar';

const helloFor = (h: number) => (h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

/** "Good morning, Marco" and one sentence about the day. */
export function Greeting() {
  const { user, now, data, insights } = useDashboard();
  const n = now.getTime();
  const pressing = insights.attention.filter((i) => i.level === 'critical' || i.level === 'high').length;
  const critical = insights.attention.filter((i) => i.level === 'critical').length;
  const nowEv = data.events.find((e) => ms(e.start) <= n && ms(e.end) > n);
  const nextEv = [...data.events].sort((a, b) => ms(a.start) - ms(b.start)).find((e) => ms(e.start) > n);

  return (
    <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 pt-5 pb-1 md:gap-4 md:px-7 md:pt-[26px] md:pb-1.5">
      <GreetingAvatar pressing={pressing} critical={critical} hour={now.getHours()} />
      <div className="min-w-0">
        <h1 className="text-[clamp(22px,5.4vw,30px)] leading-[1.15] font-extrabold tracking-[-.025em]">
          {helloFor(now.getHours())}, {user.name}
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[14.5px] text-fg-2 [&_strong]:font-bold [&_strong]:text-fg">
          {fmtLong(now)}.{' '}
          {pressing ? (
            <>
              You have{' '}
              <strong>
                {pressing} {plural(pressing, 'thing', 'things')}
              </strong>{' '}
              that need your attention today
            </>
          ) : (
            'Nothing urgent right now'
          )}
          {nowEv ? (
            <>
              , and you're in <strong>{nowEv.title}</strong> until {fmtTime(nowEv.end)}.
            </>
          ) : nextEv ? (
            <>
              . Next up: <strong>{nextEv.title}</strong>, {dueText(nextEv.start, true, now).replace(/^In /, 'in ')}.
            </>
          ) : (
            '.'
          )}
        </p>
      </div>
    </div>
  );
}
