import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

export default function PlayerOverlay() {
  const {
    playerOpen,
    closePlayer,
    media,
    playerSource,
    isRuSource,
    currentSeason,
    currentEpisode,
    seasonsData,
    tg,
    updatePlayerEpisode,
    playerLoaded,
    playerError,
    setPlayerError,
    setPlayerLoaded,
    playerUrl,
    setPlayerUrl,
    activeSkip,
    performSkip,
    setCurrentSeason,
    setCurrentEpisode,
    playerTimerRef,
  } = useApp();

  if (!playerOpen) {
    return null;
  }

  return (
    <div className="overlay open player-view">
            <div className="player-header">
                <button className="player-back" onClick={closePlayer}>{I.back}</button>
                <div className="player-info">
                    <div className="player-title">{media?.title || media?.name}</div>
                    <div className="player-header-meta">
                        <span className="player-source-badge">{isRuSource(playerSource) ? <><span className="ru-badge">RU</span> {playerSource}</> : playerSource}</span>
                        {media?.media_type === 'tv' && !isRuSource(playerSource) && <span className="player-source-name">S{currentSeason}:E{currentEpisode}</span>}
                        {media?.media_type === 'tv' && isRuSource(playerSource) && <span className="player-source-name player-source-hint">серии внутри плеера</span>}
                    </div>
                </div>
                {media?.media_type === 'tv' && !isRuSource(playerSource) && (
                    <div className="player-ep-nav">
                        <button className="player-ep-btn"
                            onClick={() => {
                                if (currentEpisode > 1) { const ne = currentEpisode - 1; setCurrentEpisode(ne); updatePlayerEpisode(currentSeason, ne); }
                                tg?.HapticFeedback?.impactOccurred?.('light');
                            }}>{I.skipBack}</button>
                        <button className="player-ep-btn"
                            onClick={() => {
                                const maxEp = seasonsData.find(s => s.season_number === currentSeason)?.episode_count || 24;
                                if (currentEpisode < maxEp) { const ne = currentEpisode + 1; setCurrentEpisode(ne); updatePlayerEpisode(currentSeason, ne); }
                                tg?.HapticFeedback?.impactOccurred?.('light');
                            }}>{I.skipForward}</button>
                    </div>
                )}
            </div>
            <div className="player-frame">
                {!playerLoaded && !playerError && (
                    <div className="player-loading-overlay">
                        <div className="player-loading-spinner"></div>
                        <div className="player-loading-text">Загрузка плеера...</div>
                    </div>
                )}
                {playerError && (
                    <div className="player-error-overlay">
                        <div className="player-error-icon">{I.alertTriangle}</div>
                        <div className="player-error-text">Источник не отвечает</div>
                        <div className="player-error-hint">Попробуйте другой плеер или повторите попытку</div>
                        <button className="player-error-btn" onClick={() => { setPlayerError(false); setPlayerLoaded(false); setPlayerUrl(playerUrl + (playerUrl.includes('?') ? '&' : '?') + '_r=' + Date.now()); }}>Повторить</button>
                    </div>
                )}
                <iframe src={playerUrl} allowFullScreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="no-referrer" onLoad={() => { setPlayerLoaded(true); setPlayerError(false); if (playerTimerRef.current) clearTimeout(playerTimerRef.current); }} />
                {activeSkip && (
                    <div className="skip-btn-container">
                        <button className={`skip-btn ${activeSkip.type === 'intro' ? 'intro' : 'outro'}`} onClick={() => { performSkip(activeSkip.end, activeSkip.type); tg?.HapticFeedback?.impactOccurred?.('medium'); }}>
                            {I.skipForward}
                            <span className="skip-label">
                                <span className="skip-type">{activeSkip.type === 'intro' ? 'Заставка' : 'Титры'}</span>
                                Пропустить
                            </span>
                        </button>
                    </div>
                )}
            </div>
            {media?.media_type === 'tv' && !isRuSource(playerSource) && (() => {
                const maxEp = seasonsData.find(s => s.season_number === currentSeason)?.episode_count || 24;
                if (currentEpisode < maxEp) return (
                    <button className="player-next-ep" onClick={() => { const ne = currentEpisode + 1; setCurrentEpisode(ne); updatePlayerEpisode(currentSeason, ne); tg?.HapticFeedback?.impactOccurred?.('medium'); }}>
                        {I.skipForward} Следующая серия (E{currentEpisode + 1})
                    </button>
                );
                return null;
            })()}
            {media?.media_type === 'tv' && (
                isRuSource(playerSource) ? (
                    <div className="episode-picker episode-picker-ru">
                        <div className="episode-picker-ru-title"><span className="ru-badge">RU</span> Встроенный плеер {playerSource}</div>
                        <div className="episode-picker-ru-hint">
                            Используйте переключатель серий <b>внутри плеера</b>.<br/>
                            Collaps / Alloha / Kodik сами управляют навигацией.
                        </div>
                    </div>
                ) : (
                    <div className="episode-picker">
                        <div className="episode-picker-header">
                            <div className="episode-picker-title">Сезон {currentSeason}</div>
                            <div className="player-source-badge">{seasonsData.find(s => s.season_number === currentSeason)?.name || `Сезон ${currentSeason}`}</div>
                        </div>
                        <div className="episode-row">{Array.from({ length: media.number_of_seasons || 1 }, (_, i) => i + 1).map(s => (
                            <button key={s} className={`episode-btn ${currentSeason === s ? 'active' : ''}`} onClick={() => { setCurrentSeason(s); setCurrentEpisode(1); updatePlayerEpisode(s, 1); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                                {s}
                            </button>
                        ))}</div>
                        <div className="episode-picker-title episode-picker-subtitle">
                            Серия {currentEpisode} из {seasonsData.find(s => s.season_number === currentSeason)?.episode_count || '?'}
                        </div>
                        <div className="episode-row">{Array.from({ length: seasonsData.find(s => s.season_number === currentSeason)?.episode_count || 24 }, (_, i) => i + 1).map(e => (
                            <button key={e} className={`episode-btn ${currentEpisode === e ? 'active' : ''}`} onClick={() => { setCurrentEpisode(e); updatePlayerEpisode(currentSeason, e); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                                {e}
                            </button>
                        ))}</div>
                    </div>
                )
            )}
        </div>
  );
}
