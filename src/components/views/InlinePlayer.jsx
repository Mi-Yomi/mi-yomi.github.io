import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import { buildPlayerSources } from '../../lib/playerSources.js';
import AnixartPanel from './AnixartPanel.jsx';

/**
 * Inline player that lives on the details page (no separate full-screen page).
 * Shows an hdrezka/kinogo-style source picker on top of the embedded iframe, plus
 * an episode picker for international balancers that need an explicit season/episode.
 */
export default function InlinePlayer() {
    const {
        media, collapsData, allohaData, isAnimeContent, animeData, sourceLoading,
        playerUrl, setPlayerUrl, playerSource, setPlayerSource, playerLoaded, setPlayerLoaded,
        playerError, setPlayerError, playSource, playerTimerRef,
        currentSeason, setCurrentSeason, currentEpisode, setCurrentEpisode,
        seasonsData, updatePlayerEpisode, activeSkip, performSkip, isRuSource, tg,
    } = useApp();

    const sources = useMemo(
        () => buildPlayerSources({ media, collapsData, allohaData, isAnimeContent, animeData }),
        [media, collapsData, allohaData, isAnimeContent, animeData]
    );

    const selectedRef = useRef(null);

    const urlFor = useCallback((src, s, e) => {
        if (!src) return null;
        if (src.builtinEpisodes) return src.url;
        if (src._fb) return src._fb.getUrl(media.id, media.media_type, s, e);
        return src.url;
    }, [media]);

    // Stable callback for the Anixart panel (recreating it would re-trigger its search loop)
    const playAnixart = useCallback((url) => playSource(url, 'Anixart'), [playSource]);

    const selectSource = useCallback((src) => {
        if (!src || !media) return;
        if (src.special === 'anixart') {
            // Anixart has its own voiceover/episode panel that drives the iframe
            setPlayerSource('Anixart');
            setPlayerUrl('');
            setPlayerLoaded(false);
            try { localStorage.setItem('hades_preferred_source', 'Anixart'); } catch { /* ignore */ }
            return;
        }
        playSource(urlFor(src, currentSeason, currentEpisode), src.name, currentSeason, currentEpisode);
    }, [media, currentSeason, currentEpisode, playSource, urlFor, setPlayerSource, setPlayerUrl, setPlayerLoaded]);

    // Reset selection when the title changes so we re-pick for the new media.
    useEffect(() => {
        selectedRef.current = null;
        setPlayerUrl('');
        setPlayerLoaded(false);
    }, [media?.id, setPlayerUrl, setPlayerLoaded]);

    // Auto-load a default player once the Russian sources have settled.
    useEffect(() => {
        if (!media || sourceLoading) return;
        if (selectedRef.current === media.id) return;
        if (sources.length === 0) return;
        selectedRef.current = media.id;
        let preferred = null;
        try { preferred = localStorage.getItem('hades_preferred_source'); } catch { /* ignore */ }
        // Honor an Anixart preference (its panel auto-loads the first episode)
        if (preferred === 'Anixart' && sources.some(s => s.special === 'anixart')) {
            setPlayerSource('Anixart'); setPlayerUrl('');
            return;
        }
        const pick = sources.find(s => s.name === preferred && !s.special)
            || sources.find(s => s.lang === 'ru' && !s.special)
            || sources.find(s => !s.special);
        if (pick) playSource(urlFor(pick, currentSeason, currentEpisode), pick.name, currentSeason, currentEpisode, { auto: true });
    }, [media, sourceLoading, sources, playSource, urlFor, currentSeason, currentEpisode, setPlayerSource, setPlayerUrl]);

    if (!media) return null;

    const ruSources = sources.filter(s => s.lang === 'ru');
    const enSources = sources.filter(s => s.lang === 'en');
    const isTv = media.media_type === 'tv';
    const builtin = isRuSource(playerSource);
    const maxEp = seasonsData.find(s => s.season_number === currentSeason)?.episode_count || 24;

    const retry = () => {
        setPlayerError(false);
        setPlayerLoaded(false);
        setPlayerUrl(playerUrl + (playerUrl.includes('?') ? '&' : '?') + '_r=' + Date.now());
    };

    return (
        <div className="dov-player-wrap">
            <div className="player-picker">
                <div className="player-picker-label">{I.play} Где смотреть</div>
                <div className="player-tabs">
                    {ruSources.map(s => (
                        <button key={s.id} className={`player-tab ${playerSource === s.name ? 'active' : ''}`} onClick={() => selectSource(s)}>
                            <span className="ru-badge">RU</span> {s.name}
                        </button>
                    ))}
                    {sourceLoading && <span className="player-tab is-loading"><span className="player-tab-dot" /> Ищем озвучки…</span>}
                    {!sourceLoading && ruSources.length === 0 && <span className="player-tab is-empty">Рус. озвучка не найдена</span>}
                </div>
                {enSources.length > 0 && (
                    <div className="player-tabs player-tabs-en">
                        <span className="player-tabs-sub">Англ. / без перевода:</span>
                        {enSources.map(s => (
                            <button key={s.id} className={`player-tab en ${playerSource === s.name ? 'active' : ''}`} onClick={() => selectSource(s)}>
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="player-frame inline">
                {playerUrl ? (
                    <>
                        {!playerLoaded && !playerError && (
                            <div className="player-loading-overlay">
                                <div className="player-loading-spinner"></div>
                                <div className="player-loading-text">Загрузка плеера…</div>
                            </div>
                        )}
                        {playerError && (
                            <div className="player-error-overlay">
                                <div className="player-error-icon">{I.alertTriangle}</div>
                                <div className="player-error-text">Источник не отвечает</div>
                                <div className="player-error-hint">Выберите другой плеер выше или повторите</div>
                                <button className="player-error-btn" onClick={retry}>Повторить</button>
                            </div>
                        )}
                        <iframe
                            key={playerUrl}
                            src={playerUrl}
                            title={media.title || media.name}
                            allowFullScreen
                            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                            referrerPolicy="no-referrer"
                            onLoad={() => { setPlayerLoaded(true); setPlayerError(false); if (playerTimerRef.current) clearTimeout(playerTimerRef.current); }}
                        />
                        {activeSkip && (
                            <div className="skip-btn-container">
                                <button className={`skip-btn ${activeSkip.type === 'intro' ? 'intro' : 'outro'}`} onClick={() => { performSkip(activeSkip.end, activeSkip.type); tg?.HapticFeedback?.impactOccurred?.('medium'); }}>
                                    {I.skipForward}
                                    <span className="skip-label"><span className="skip-type">{activeSkip.type === 'intro' ? 'Заставка' : 'Титры'}</span>Пропустить</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="player-empty">
                        <div className="player-empty-icon">{I.play}</div>
                        <div className="player-empty-text">{playerSource === 'Anixart' ? 'Загрузка Anixart…' : sourceLoading ? 'Загрузка источников…' : 'Выберите плеер выше'}</div>
                    </div>
                )}
            </div>

            {playerSource === 'Anixart' && (
                <AnixartPanel media={media} onPlay={playAnixart} />
            )}

            {playerSource !== 'Anixart' && isTv && playerUrl && (
                builtin ? (
                    <div className="player-builtin-hint"><span className="ru-badge">RU</span> Сезоны и серии — переключаются <b>внутри плеера {playerSource}</b></div>
                ) : (
                    <div className="episode-picker inline">
                        <div className="episode-picker-header">
                            <div className="episode-picker-title">Сезон {currentSeason}</div>
                            <div className="player-source-badge">{seasonsData.find(s => s.season_number === currentSeason)?.name || `Сезон ${currentSeason}`}</div>
                        </div>
                        <div className="episode-row">
                            {Array.from({ length: media.number_of_seasons || 1 }, (_, i) => i + 1).map(s => (
                                <button key={s} className={`episode-btn ${currentSeason === s ? 'active' : ''}`} onClick={() => { setCurrentSeason(s); setCurrentEpisode(1); updatePlayerEpisode(s, 1); tg?.HapticFeedback?.impactOccurred?.('light'); }}>{s}</button>
                            ))}
                        </div>
                        <div className="episode-picker-title episode-picker-subtitle">Серия {currentEpisode} из {seasonsData.find(s => s.season_number === currentSeason)?.episode_count || '?'}</div>
                        <div className="episode-row">
                            {Array.from({ length: maxEp }, (_, i) => i + 1).map(e => (
                                <button key={e} className={`episode-btn ${currentEpisode === e ? 'active' : ''}`} onClick={() => { setCurrentEpisode(e); updatePlayerEpisode(currentSeason, e); tg?.HapticFeedback?.impactOccurred?.('light'); }}>{e}</button>
                            ))}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
