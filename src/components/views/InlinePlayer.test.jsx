import { useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InlinePlayer from './InlinePlayer.jsx';

const app = vi.hoisted(() => ({ current: null }));
vi.mock('../../context/AppContext.jsx', () => ({ useApp: () => app.current }));
vi.mock('./AnixartPanel.jsx', () => ({ default: () => null }));
const media = { id: 157336, title: 'Интерстеллар', release_date: '2014-11-05', media_type: 'movie' };
let playSource;
let showToast;

function PlayerHarness({ allohaData = null, season = 1, episode = 1 }) {
    const [playerUrl, setPlayerUrl] = useState('');
    const [playerSource, setPlayerSource] = useState('');
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    const [currentSeason, setCurrentSeason] = useState(season);
    const [currentEpisode, setCurrentEpisode] = useState(episode);
    const playerTimerRef = useRef(null);
    app.current = {
        media, sourceLoading: true, seasonsData: [], allohaData,
        currentSeason, setCurrentSeason, currentEpisode, setCurrentEpisode,
        playerUrl, setPlayerUrl, playerSource, setPlayerSource, playerLoaded, setPlayerLoaded,
        playerError, setPlayerError, playSource, playerTimerRef, showToast,
        isRuSource: () => false,
    };
    return <InlinePlayer />;
}

beforeEach(() => {
    playSource = vi.fn();
    showToast = vi.fn();
    vi.stubGlobal('fetch', vi.fn());
});

describe('per-episode voiceover fallback', () => {
    const missing = [{ season: 1, episode: 2 }];
    const allohaData = {
        iframe: 'https://alloha.example/series',
        seasons: { 1: { episodes: { 2: {
            iframe: 'https://alloha.example/series?season=1&episode=2',
            translation: { 34: { translation: 'LostFilm' }, 85: { translation: 'HDrezka Studio' } },
        } } } },
    };

    beforeEach(() => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({
            ok: true, embed: 'https://api.nextembed.ws/embed/movie/92634', unlabeledEpisodes: missing,
        }) });
        playSource.mockImplementation((url, source) => {
            app.current.setPlayerUrl(url);
            app.current.setPlayerSource(source);
        });
    });

    it('keeps the correctly named first episode and switches the broken second episode', async () => {
        const { container } = render(<PlayerHarness allohaData={allohaData} />);
        selectRezka();
        await waitFor(() => expect(playSource).toHaveBeenCalledWith('https://api.nextembed.ws/embed/movie/92634?season=1&episode=1', 'HDRezka'));
        const frame = container.querySelector('iframe');
        act(() => window.dispatchEvent(new MessageEvent('message', {
            origin: 'https://api.nextembed.ws', source: frame.contentWindow,
            data: JSON.stringify({ event: 'changeEpisode', season: 1, episode: '2' }),
        })));
        expect(playSource).toHaveBeenLastCalledWith(allohaData.seasons[1].episodes[2].iframe, 'Alloha', 1, 2);
        expect(app.current.currentEpisode).toBe(2);
        expect(app.current.showToast).toHaveBeenCalled();
    });

    it('uses named voiceovers when reopening an affected episode', async () => {
        render(<PlayerHarness allohaData={allohaData} episode={2} />);
        selectRezka();
        await waitFor(() => expect(playSource).toHaveBeenCalledWith(allohaData.seasons[1].episodes[2].iframe, 'Alloha', 1, 2));
    });

    it('ignores episode messages from other windows and origins', async () => {
        const { container } = render(<PlayerHarness allohaData={allohaData} />);
        selectRezka();
        await waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
        const frame = container.querySelector('iframe');
        for (const [origin, source] of [['https://attacker.example', frame.contentWindow], ['https://api.nextembed.ws', window]]) {
            act(() => window.dispatchEvent(new MessageEvent('message', {
                origin, source, data: { event: 'changeEpisode', season: 1, episode: 2 },
            })));
        }
        expect(playSource).toHaveBeenCalledTimes(1);
    });

    it('does not replace a playable source with missing or also unlabeled alternatives', async () => {
        const unknown = { ...allohaData, seasons: { 1: { episodes: { 2: {
            iframe: allohaData.seasons[1].episodes[2].iframe, translation: { 1: { translation: 'rus0' } },
        } } } } };
        render(<PlayerHarness allohaData={unknown} episode={2} />);
        selectRezka();
        await waitFor(() => expect(playSource).toHaveBeenCalledWith('https://api.nextembed.ws/embed/movie/92634?season=1&episode=2', 'HDRezka'));
    });
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
