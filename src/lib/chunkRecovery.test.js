import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadForChunkError } from './chunkRecovery.js';

const missingChunk = new TypeError('error loading dynamically imported module: https://example.com/assets/MangaReader-old.js');
let reload;

beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    vi.stubGlobal('window', { location: { href: 'https://mi-yomi.github.io/?theme=dark#tv/213375', replace: reload } });
    vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => vi.unstubAllGlobals());

describe('stale module recovery', () => {
    it.each([
        missingChunk.message,
        'Failed to fetch dynamically imported module: /assets/old.js',
        'Importing a module script failed.',
        'Unable to preload CSS for /assets/old.css',
    ])('recognizes browser import failure: %s', message => {
        expect(isChunkLoadError(new Error(message))).toBe(true);
    });

    it('reloads once and keeps the guard across module initialization', async () => {
        expect(reloadForChunkError(missingChunk)).toBe(true);
        vi.resetModules();
        const nextPage = await import('./chunkRecovery.js');
        expect(nextPage.reloadForChunkError(missingChunk)).toBe(false);
        expect(reload).toHaveBeenCalledTimes(1);
        const destination = new URL(reload.mock.calls[0][0]);
        expect(destination.origin).toBe('https://mi-yomi.github.io');
        expect(destination.hash).toBe('#tv/213375');
        expect(destination.searchParams.get('theme')).toBe('dark');
        expect(destination.searchParams.get('_hades_update')).toMatch(/^\d+$/);
    });

    it('leaves unrelated errors and offline failures to the error UI', () => {
        expect(reloadForChunkError(new Error('Invalid profile'))).toBe(false);
        vi.stubGlobal('navigator', { onLine: false });
        expect(reloadForChunkError(missingChunk)).toBe(false);
        expect(reload).not.toHaveBeenCalled();
        expect(sessionStorage.length).toBe(0);
    });

    it('does not loop if storage is unavailable or clear user data', () => {
        localStorage.setItem('hades_session', 'preserved');
        vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('Storage unavailable'); } });
        expect(reloadForChunkError(missingChunk)).toBe(false);
        expect(localStorage.getItem('hades_session')).toBe('preserved');
        expect(reload).not.toHaveBeenCalled();
        localStorage.removeItem('hades_session');
    });
});
