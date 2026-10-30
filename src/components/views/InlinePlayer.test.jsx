import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InlinePlayer from './InlinePlayer.jsx';

const app = vi.hoisted(() => ({ current: null }));
vi.mock('../../context/AppContext.jsx', () => ({ useApp: () => app.current }));
vi.mock('./AnixartPanel.jsx', () => ({ default: () => null }));
const media = { id: 157336, title: 'Интерстеллар', release_date: '2014-11-05', media_type: 'movie' };
let playSource;

function PlayerHarness() {
    const [playerUrl, setPlayerUrl] = useState('');
    const [playerSource, setPlayerSource] = useState('');
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    app.current = {
        media, sourceLoading: true, seasonsData: [], currentSeason: 1, currentEpisode: 1,
        playerUrl, setPlayerUrl, playerSource, setPlayerSource, playerLoaded, setPlayerLoaded,
        playerError, setPlayerError, playSource, playerTimerRef: { current: null },
        isRuSource: () => false,
    };
    return <InlinePlayer />;
}

beforeEach(() => {
    playSource = vi.fn();
    vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

function selectRezka() {
    fireEvent.click(screen.getByRole('button', { name: /HDRezka/ }));
}

describe('HDRezka resolver failures', () => {
    it('shows the server error with no iframe and retries the resolver', async () => {
        fetch.mockResolvedValue({ ok: false, json: async () => ({ ok: false, error: 'Зеркала HDRezka не отвечают.' }) });
        render(<PlayerHarness />);
        selectRezka();
        expect(await screen.findByRole('alert')).toHaveTextContent('Зеркала HDRezka не отвечают.');
        expect(screen.queryByText('Поиск на HDRezka…')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
        expect(playSource).not.toHaveBeenCalled();
    });

    it('shows not found when the resolver returns no embed', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: false, embed: null }) });
        render(<PlayerHarness />);
        selectRezka();
        expect(await screen.findByRole('alert')).toHaveTextContent('HDRezka не нашёл плеер');
    });

    it('finishes a stalled search after the timeout', async () => {
        vi.useFakeTimers();
        fetch.mockImplementation((_, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }));
        render(<PlayerHarness />);
        app.current.playerTimerRef.current = setTimeout(() => app.current.setPlayerError(true), 15000);
        selectRezka();
        await act(() => vi.advanceTimersByTimeAsync(15000));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        await act(() => vi.advanceTimersByTimeAsync(45000));
        expect(screen.getByRole('alert')).toHaveTextContent('не ответил вовремя');
        expect(screen.queryByText('Поиск на HDRezka…')).not.toBeInTheDocument();
    });

    it('ignores a late HDRezka result after switching players', async () => {
        let finish;
        fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
        render(<PlayerHarness />);
        selectRezka();
        const signal = fetch.mock.calls[0][1].signal;
        fireEvent.click(screen.getByRole('button', { name: 'VidLink' }));
        expect(signal.aborted).toBe(true);
        await act(async () => finish({ ok: true, json: async () => ({ ok: true, embed: 'https://player.example/embed' }) }));
        expect(playSource).toHaveBeenCalledTimes(1);
        expect(playSource.mock.calls[0][1]).toBe('VidLink');
    });

    it('plays a successfully resolved embed', async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, embed: 'https://player.example/embed' }) });
        render(<PlayerHarness />);
        selectRezka();
        await waitFor(() => expect(playSource).toHaveBeenCalledWith('https://player.example/embed', 'HDRezka'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
