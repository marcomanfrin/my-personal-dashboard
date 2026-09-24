import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { queryClient } from '../src/api/queryClient';
import { dashboardFixture, tokenResponse } from './fixtures';
import { FakeEventSource } from './setup';

type Handler = (init: RequestInit) => { status: number; body?: unknown };
let routes: Record<string, Handler>;
let fixture: ReturnType<typeof dashboardFixture>;
let calls: { method: string; url: string; body: unknown; auth: string | null }[];

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  queryClient.clear();
  FakeEventSource.instances = [];
  calls = [];
  fixture = dashboardFixture();
  routes = {
    'POST /api/auth/refresh': () => ({ status: 200, body: tokenResponse() }),
    'GET /api/dashboard': () => ({ status: 200, body: fixture }),
    'GET /api/agents': () => ({ status: 200, body: { agents: [], runs: [] } }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      const url = input.split('?')[0]!;
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({
        method,
        url,
        body: init.body ? JSON.parse(init.body as string) : undefined,
        auth: headers.authorization ?? null,
      });
      const exact = routes[`${method} ${url}`];
      const pattern = Object.entries(routes).find(([k]) => {
        const [m, p] = k.split(' ');
        return m === method && new RegExp(`^${p!.replace(/:id/g, '[^/]+')}$`).test(url);
      })?.[1];
      const handler = exact ?? pattern;
      if (!handler) return json(404, { error: 'not_found', message: url });
      const { status, body } = handler(init);
      return json(status, body);
    }),
  );
});

describe('app', () => {
  it('restores the session from the refresh cookie and renders the dashboard', async () => {
    render(<App />);
    expect(await screen.findByText('Attention required')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/, Marco$/);

    // KPIs are computed in the browser from the data.
    expect(screen.getByLabelText(/^4 Emails to act on/)).toBeTruthy();
    expect(screen.getByLabelText(/^3 PRs to review/)).toBeTruthy();

    // The API was called with the access token; the live stream opened with it.
    expect(calls.find((c) => c.url === '/api/dashboard')?.auth).toBe('Bearer header.payload.signature');
    expect(FakeEventSource.instances[0]?.url).toContain('access_token=header.payload.signature');

    for (const title of ['Mail triage', 'Calendar', 'GitHub', 'Reminders', 'Personal Gantt', 'Trello tasks', 'Projects'])
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
  });

  it('marks a mail done optimistically, sends the PATCH, and offers undo', async () => {
    // A stateful fake: the PATCH changes what the next GET returns, as on the real server.
    routes['PATCH /api/emails/:id'] = (init) => {
      const id = calls[calls.length - 1]!.url.split('/').pop();
      const email = fixture.data.emails.find((e) => e.id === id)!;
      Object.assign(email, JSON.parse(init.body as string));
      return { status: 200, body: email };
    };
    render(<App />);
    const mail = await screen.findByRole('region', { name: 'Mail triage' });
    const subject = 'Line 3 HMI keeps losing the PLC connection';
    expect(within(mail).getByText(subject)).toBeTruthy();

    fireEvent.click(within(mail).getByRole('button', { name: `Mark “${subject}” as done` }));

    // Gone from "Needs action" at once, before the server answers.
    await waitFor(() => expect(within(mail).queryByText(subject)).toBeNull());
    expect(screen.getByLabelText(/^3 Emails to act on/)).toBeTruthy();
    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch?.body).toEqual({ done: true, read: true, category: 'archived' });

    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      const undo = calls.filter((c) => c.method === 'PATCH')[1];
      expect(undo?.body).toEqual({ done: false, read: false, category: 'urgent' });
    });
  });

  it('opens a drawer with the record details and closes on Escape', async () => {
    render(<App />);
    const github = await screen.findByRole('region', { name: 'GitHub' });
    fireEvent.click(within(github).getByText('MES order sync over OPC UA'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('sistec/hmi-5309 #248')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Mark review done' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows the login page without a session and signs in', async () => {
    routes['POST /api/auth/refresh'] = () => ({ status: 401, body: { error: 'unauthorized', message: 'No session' } });
    routes['POST /api/auth/login'] = (init) => {
      const { password } = JSON.parse(init.body as string);
      return password === 'right-password'
        ? { status: 200, body: tokenResponse() }
        : { status: 401, body: { error: 'unauthorized', message: 'Invalid email or password' } };
    };
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'marco@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Wrong email or password/);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'right-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Attention required')).toBeTruthy();
  });

  it('refreshes once on 401 and retries the request', async () => {
    let first = true;
    routes['GET /api/dashboard'] = () => {
      if (first) {
        first = false;
        return { status: 401, body: { error: 'unauthorized', message: 'expired' } };
      }
      return { status: 200, body: fixture };
    };
    render(<App />);
    expect(await screen.findByText('Attention required')).toBeTruthy();
    expect(calls.filter((c) => c.url === '/api/auth/refresh')).toHaveLength(2);
  });
});
