import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.resetModules();
});

describe('local auth Google OAuth adapter', () => {
  it('redirects to the self-host Google OAuth start endpoint with redirect_to', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: 'https://mi-yomi.github.io/', origin: 'https://mi-yomi.github.io' };

    const { supabase } = await import('./supabase.js');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://mi-yomi.github.io/' } });

    expect(error).toBeNull();
    expect(window.location.href).toBe('https://hades.178-62-250-207.sslip.io/api/auth/google/start?redirect_to=https%3A%2F%2Fmi-yomi.github.io%2F');

    window.location = originalLocation;
  });

  it('stores auth_token from OAuth callback URL before requesting the session', async () => {
    window.history.replaceState({}, '', '/?auth_token=oauth-session-token');
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ session: { access_token: 'oauth-session-token', user: { id: 'u1', email: 'u@example.com' } } }),
    }));

    const { supabase } = await import('./supabase.js');
    const { data } = await supabase.auth.getSession();

    expect(localStorage.getItem('hades_local_api_token')).toBe('oauth-session-token');
    expect(data.session.user.email).toBe('u@example.com');
    expect(window.location.search).toBe('');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://hades.178-62-250-207.sslip.io/api/auth/session',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer oauth-session-token' }) }),
    );
  });
});
