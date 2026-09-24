import { useState, type FormEvent } from 'react';
import { AuthError, login } from '../auth/session';
import { Brand } from '../components/ui/Brand';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/primitives';

const field =
  'h-[42px] w-full rounded-[11px] border border-line bg-surface-2 px-3 font-medium text-fg outline-0 placeholder:text-fg-3 focus:border-accent/60 focus:shadow-[0_0_0_3px_var(--accent-soft)]';

/** Email + password; on success the session store switches the app to the dashboard. */
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Cannot reach the server. Try again.');
      setBusy(false);
    }
  };

  return (
    <main className="relative z-1 grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <Brand className="mb-6 justify-center text-lg" />
        <form onSubmit={submit} className="rounded-lg border border-line bg-surface p-6 shadow-card" noValidate>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-[-.02em]">Sign in</h1>
          <p className="mt-1 text-sm text-fg-2">Your command center, kept up to date by your agents.</p>

          <label className="mt-5 block text-[12.5px] font-bold text-fg-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${field} mt-1.5`}
          />

          <label className="mt-3.5 block text-[12.5px] font-bold text-fg-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} mt-1.5`}
          />

          {error && (
            <p role="alert" className="mt-3.5 flex items-center gap-2 rounded-[10px] bg-crit/10 px-3 py-2 text-[13px] font-semibold text-crit">
              <Icon name="alert" size="sm" />
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
