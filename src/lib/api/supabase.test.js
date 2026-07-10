import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithPopupMock = vi.fn();
const getIdTokenMock = vi.fn();
const initializeAppMock = vi.fn(() => ({ app: 'firebase-app' }));
const getAuthMock = vi.fn(() => ({ auth: 'firebase-auth' }));
const GoogleAuthProviderMock = vi.fn(function GoogleAuthProvider() { return { provider: 'google' }; });

vi.mock('firebase/app', () => ({ initializeApp: initializeAppMock }));
vi.mock('firebase/auth', () => ({
  getAuth: getAuthMock,
  GoogleAuthProvider: GoogleAuthProviderMock,
  signInWithPopup: signInWithPopupMock,
}));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.resetModules();
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('local auth Firebase adapter', () => {
  it('exchanges a Firebase Google ID token for a local HADES session', async () => {
    getIdTokenMock.mockResolvedValue('firebase-id-token');
    signInWithPopupMock.mockResolvedValue({ user: { getIdToken: getIdTokenMock } });
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ session: { access_token: 'local-session-token', user: { id: 'u1', email: 'u@example.com' } } }),
    });

    vi.doMock('../config.js', () => ({
      HADES_API_URL: 'https://hades.178-62-250-207.sslip.io/api',
      FIREBASE_ENABLED: true,
      FIREBASE_CONFIG: { apiKey: 'key', authDomain: 'auth', projectId: 'project', appId: 'app' },
    }));
    const { supabase } = await import('./supabase.js');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });

    expect(error).toBeNull();
    expect(initializeAppMock).toHaveBeenCalledOnce();
    expect(signInWithPopupMock).toHaveBeenCalledWith({ auth: 'firebase-auth' }, { provider: 'google' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://hades.178-62-250-207.sslip.io/api/auth/firebase',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'firebase-id-token' }),
      }),
    );
    expect(localStorage.getItem('hades_local_api_token')).toBe('local-session-token');
    expect(data.session.user.email).toBe('u@example.com');
  });

  it('returns a readable error when Firebase is not configured', async () => {
    vi.doMock('../config.js', () => ({
      HADES_API_URL: 'https://hades.178-62-250-207.sslip.io/api',
      FIREBASE_ENABLED: false,
      FIREBASE_CONFIG: {},
    }));
    const { supabase } = await import('./supabase.js');

    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });

    expect(data).toBeNull();
    expect(error.message).toContain('Firebase Auth не настроен');
  });

  it('clears an expired session and notifies auth listeners on a 401', async () => {
    vi.doMock('../config.js', () => ({
      HADES_API_URL: 'https://hades.example/api',
      FIREBASE_ENABLED: false,
      FIREBASE_CONFIG: {},
    }));
    localStorage.setItem('hades_local_api_token', 'expired-token');
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });
    const { supabase } = await import('./supabase.js');
    const listener = vi.fn();
    supabase.auth.onAuthStateChange(listener);

    const { error } = await supabase.from('favorites').select('*');

    expect(error.status).toBe(401);
    expect(localStorage.getItem('hades_local_api_token')).toBeNull();
    expect(listener).toHaveBeenCalledWith('SIGNED_OUT', null);
  });
});
