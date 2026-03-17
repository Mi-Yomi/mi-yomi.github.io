import Card from '../common/Card.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function DetailsOverlay() {
  const {
    detailsOpen,
    media,
    BACKDROP,
    I,
    closeDetails,
    tg,
    favorites,
    toggleFavorite,
    ratingColor,
    pluralize,
    history,
    getStoredProgress,
    formatWatchTime,
    isRuSource,
    collapsData,
    allohaData,
    FALLBACK_SOURCES,
    currentSeason,
    currentEpisode,
    setCurrentSeason,
    setCurrentEpisode,
    playSource,
    sourceLoading,
    isAnimeContent,
    animeData,
    movieComments,
    setReviewOpen,
    watchlist,
    toggleWatchlist,
    setAddToCollectionItem,
    overviewExpanded,
    setOverviewExpanded,
    recommendations,
    openDetails,
    myReactions,
    toggleReaction,
    IMG,
    showToast,
    getItemStatus, setStatusPickerItem,
  } = useApp();

  return (
    <div className={`overlay ${detailsOpen ? 'open' : ''}`}>
        {media && (
            <>
                <div className="details-backdrop" style={{ backgroundImage: `url(${BACKDROP}${media.backdrop_path})` }}>
                    <button className="details-back" onClick={closeDetails}>{I.back}</button>
                    <button className="details-share" onClick={async (e) => { 
                        e.stopPropagation(); 
                        const url = `${window.location.origin}${window.location.pathname}#${media.media_type}/${media.id}`;
                        const shareData = { title: media.title || media.name, text: `Смотри "${media.title || media.name}" на HADES Cinema`, url };
                        if (navigator.share) { try { await navigator.share(shareData); } catch {} }
                        else { try { await navigator.clipboard.writeText(url); showToast('🔗 Ссылка скопирована!'); } catch { showToast('🔗 ' + url); } }
                        tg?.HapticFeedback?.notificationOccurred?.('success');
                    }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </button>
                    <button className={`details-fav ${favorites.some(f => f.item_id === String(media.id)) ? 'active' : ''}`} onClick={() => toggleFavorite(media, media.media_type)}>{favorites.some(f => f.item_id === String(media.id)) ? I.heartFilled : I.heart}</button>
                </div>
                <div className="details-body">
                    <h1 className="details-title">{media.title || media.name}</h1>
                    {media.original_title && media.original_title !== (media.title || media.name) && (
                        <div className="details-original-title">{media.original_title || media.original_name}</div>
                    )}
                    <div className="details-meta">
                        <span className={`rating ${ratingColor(media.vote_average)}`}>{I.star} {media.vote_average?.toFixed(1)}</span>
                        {media.vote_count > 0 && <span className="details-vote-count">{media.vote_count > 999 ? `${(media.vote_count/1000).toFixed(1)}K` : media.vote_count} оценок</span>}
                        <span>{(media.release_date || media.first_air_date || '').split('-')[0]}</span>
                        {media.runtime && <span>{Math.floor(media.runtime/60)}ч {media.runtime%60}м</span>}
                        {media.number_of_seasons && <span>{media.number_of_seasons} {pluralize(media.number_of_seasons, 'сезон', 'сезона', 'сезонов')}</span>}
                        {media.number_of_episodes && <span>{media.number_of_episodes} {pluralize(media.number_of_episodes, 'серия', 'серии', 'серий')}</span>}
                        {media.status && <span className={media.status === 'Returning Series' ? 'details-status-on-air' : ''}>{media.status === 'Returning Series' ? '● В эфире' : media.status === 'Ended' ? 'Завершён' : media.status}</span>}
                    </div>
                    
                    {/* Genre Tags */}
                    {media.genres?.length > 0 && (
                        <div className="detail-genre-tags">
                            {media.genres.map(g => <span key={g.id} className="detail-genre-tag">{g.name}</span>)}
                        </div>
                    )}
                    
                    {/* Continue Button */}
                    {history.find(h => h.item_id === String(media.id)) && (() => {
                        const histEntry = history.find(x => x.item_id === String(media.id));
                        const s = histEntry?.last_season || 1;
                        const ep = histEntry?.last_episode || 1;
                        const lastSrc = histEntry?.last_source;
                        const wasRuSource = isRuSource(lastSrc);
                        const savedProgress = getStoredProgress(media.id);
                        const savedTimeStr = savedProgress?.time > 5 ? formatWatchTime(savedProgress.time) : null;
                        
                        const getContinueUrl = () => {
                            // If last source was a RU balancer, use the RU player URL
                            if (wasRuSource || !lastSrc) {
                                if ((lastSrc === 'Collaps' || !lastSrc) && collapsData?.iframe_url) return { url: collapsData.iframe_url, name: 'Collaps' };
                                if (lastSrc === 'Alloha' && allohaData?.iframe) return { url: allohaData.iframe, name: 'Alloha' };
                                if (lastSrc === 'Kodik') return { url: null, name: 'Kodik' };
                                // Fallback: prefer Collaps > Alloha > first fallback
                                if (collapsData?.iframe_url) return { url: collapsData.iframe_url, name: 'Collaps' };
                                if (allohaData?.iframe) return { url: allohaData.iframe, name: 'Alloha' };
                            }
                            // For fallback sources, rebuild URL from source config
                            const srcObj = lastSrc ? FALLBACK_SOURCES.find(fs => fs.name === lastSrc) : null;
                            if (srcObj) return { url: srcObj.getUrl(media.id, media.media_type, s, ep), name: lastSrc };
                            // Ultimate fallback
                            return { url: FALLBACK_SOURCES[0].getUrl(media.id, media.media_type, s, ep), name: FALLBACK_SOURCES[0].name };
                        };
                        
                        return (
                            <button className="play-main-btn continue" onClick={() => {
                                setCurrentSeason(s);
                                setCurrentEpisode(ep);
                                const { url, name } = getContinueUrl();
                                if (url) playSource(url, name, s, ep);
                                else alert('Источник пока загружается, подождите пару секунд и нажмите снова');
                            }}>
                                ▶️ Продолжить {histEntry?.last_season ? `S${s}:E${ep}` : 'просмотр'}
                                {savedTimeStr && <span className="continue-time-badge">⏱ {savedTimeStr}</span>}
                                {!savedTimeStr && lastSrc && <span className="continue-source-hint">• {lastSrc}</span>}
                            </button>
                        );
                    })()}
                    
                    {sourceLoading ? (
                        <div>
                            <div className="skeleton-source"></div>
                            <div className="skeleton-source" style={{opacity:0.6}}></div>
                        </div>
                    ) : (
                        <>
                            {collapsData && <button className="play-main-btn" onClick={() => playSource(collapsData.iframe_url, 'Collaps')}>{I.play} 🇷🇺 Смотреть</button>}
                            {allohaData && <button className="play-main-btn blue" onClick={() => playSource(allohaData.iframe, 'Alloha')}>{I.play} 🇷🇺 Alloha</button>}
                            {isAnimeContent && animeData?.myAnimeListId && <button className="play-main-btn pink" onClick={() => playSource(`https://kodik.info/find-player?title=${encodeURIComponent(media.name || media.title)}&mal=${animeData.myAnimeListId}`, 'Kodik')}>{I.play} 🎌 Kodik Anime</button>}
                        </>
                    )}
                    
                    <div className="details-action-row">
                        <button className="play-main-btn secondary" onClick={() => setReviewOpen(true)}>📝 Отзыв {movieComments.length > 0 && `(${movieComments.length})`}</button>
                        <button className="play-main-btn secondary" onClick={() => setStatusPickerItem({ id: media.id, title: media.title || media.name, name: media.name, poster_path: media.poster_path, media_type: media.media_type, vote_average: media.vote_average, backdrop_path: media.backdrop_path, release_date: media.release_date || media.first_air_date })}>
                            {(() => { const st = getItemStatus(media.id); return st ? { watching: '▶️ Смотрю', planned: '🔖 Буду', completed: '✅ Просм.', on_hold: '⏸️ Отложено', dropped: '🚫 Брошено' }[st] : '📋 Статус'; })()}
                        </button>
                    </div>
                    <div className="details-action-row">
                        <button className={`play-main-btn secondary ${watchlist.some(w => w.item_id === String(media.id)) ? 'watchlist-active' : ''}`} onClick={() => toggleWatchlist(media, media.media_type)}>
                            🔖 {watchlist.some(w => w.item_id === String(media.id)) ? 'В списке' : 'Буду смотреть'}
                        </button>
                        <button className="play-main-btn secondary font-sm" onClick={() => setAddToCollectionItem({ id: media.id, title: media.title || media.name, poster_path: media.poster_path, media_type: media.media_type, vote_average: media.vote_average })}>
                            📁 В коллекцию
                        </button>
                    </div>
                    
                    <div className="fallback-section">
                        <div className="fallback-title">🌍 Другие плееры (англ. озвучка)</div>
                        <div className="fallback-grid">{FALLBACK_SOURCES.map(src => <div key={src.id} className="fallback-btn" onClick={() => playSource(src.getUrl(media.id, media.media_type, currentSeason, currentEpisode), src.name)}><div className="fallback-btn-icon">{src.icon}</div><div className="fallback-btn-name">{src.name}</div></div>)}</div>
                        <div className="fallback-hint">
                            💡 Для русской озвучки используйте Collaps / Alloha / Kodik выше
                        </div>
                    </div>
                    
                    {media.overview && (() => {
                        const isLong = media.overview.length > 150;
                        return (
                            <div>
                                <p className={`details-overview ${!overviewExpanded && isLong ? 'details-overview-short' : ''}`}>{media.overview}</p>
                                {isLong && <div className="details-overview-toggle" onClick={() => setOverviewExpanded(!overviewExpanded)}>{overviewExpanded ? 'Свернуть ↑' : 'Читать далее ↓'}</div>}
                            </div>
                        );
                    })()}
                    
                    {/* Cast Section */}
                    {media._embedded?.cast?.length > 0 || media.credits?.cast?.length > 0 ? (
                        <div className="detail-cast">
                            <div className="detail-cast-title">🎭 В ролях</div>
                            <div className="detail-cast-scroll">
                                {(media.credits?.cast || []).slice(0, 12).map(c => (
                                    <div key={c.id} className="detail-cast-card">
                                        {c.profile_path
                                            ? <img className="detail-cast-img" src={`${IMG}${c.profile_path}`} alt={c.name} loading="lazy" />
                                            : <div className="detail-cast-placeholder">{c.name?.[0]}</div>
                                        }
                                        <div className="detail-cast-name">{c.name}</div>
                                        <div className="detail-cast-role">{c.character}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    
                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                        <div className="recs-section">
                            <div className="recs-title">🎯 Похожие</div>
                            <div className="recs-scroll">
                                {recommendations.map(r => (
                                    <Card key={r.id} item={r} onSelect={openDetails} onFav={toggleFavorite} isFav={favorites.some(f => f.item_id === String(r.id))} type={r.media_type || media?.media_type || 'movie'} />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Comments Section */}
                    <div className="comments-section">
                        <div className="comments-title">💬 Отзывы <span className="comments-count">{movieComments.length}</span></div>
                        {movieComments.length > 0 ? movieComments.map(c => {
                            const rCls = c.rating >= 7 ? 'high' : c.rating >= 5 ? 'mid' : 'low';
                            return (
                                <div key={c.id || c.created_at} className="comment-card">
                                    <div className="comment-header">
                                        <div className="comment-avatar">{c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} /> : c.profiles?.username?.[0]?.toUpperCase() || '?'}</div>
                                        <div>
                                            <div className="comment-author">{c.profiles?.username || 'Аноним'} <span className="comment-tag">#{c.profiles?.tag}</span></div>
                                            <div className="comment-date">{c.created_at ? new Date(c.created_at).toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'}) : ''}</div>
                                        </div>
                                        <div className={`comment-rating-badge ${rCls}`}>{I.star} {c.rating}</div>
                                    </div>
                                    <div className="comment-text">{c.content}</div>
                                    <div className="reaction-row">
                                        <button className={`reaction-btn ${myReactions[c.id] === 'like' ? 'liked' : ''}`} onClick={() => toggleReaction(c.id, 'like')}>👍 {c.likes_count || ''}</button>
                                        <button className={`reaction-btn ${myReactions[c.id] === 'dislike' ? 'disliked' : ''}`} onClick={() => toggleReaction(c.id, 'dislike')}>👎</button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="comments-empty">
                                <div className="comments-empty-icon">💬</div>
                                <div className="comments-empty-text">Пока нет отзывов</div>
                                <div className="comments-empty-hint">Будьте первым — поделитесь впечатлениями!</div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}
    </div>
  );
}
