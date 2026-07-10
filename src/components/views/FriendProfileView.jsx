import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import Card from '../common/Card.jsx';
import { MANGA_STATUS_MAP } from '../../lib/mangaStatuses.js';
import { activateOnKeyboard } from '../../lib/a11y.js';

export default function FriendProfileView() {
  const {
    viewingFriend,
    friendData,
    setViewingFriend,
    setFriendLoadError,
    friendLoadError,
    profileTab,
    setProfileTab,
    openDetails,
    openManga,
    mangaEnabled,
    IMG,
  } = useApp();

  // Items the friend chose to hide from friends (keys: String(item_id) | "m:{slug}").
  const hidden = friendData.profile?.hidden_items || [];
  const isHid = (key) => hidden.includes(key);
  const favorites = friendData.favorites.filter((f) => !isHid(String(f.item_id)));
  const history = friendData.history.filter((h) => !isHid(String(h.item_id)));
  const reviews = friendData.reviews.filter((r) => !isHid(String(r.movie_id || r.item_id)));
  const manga = (friendData.profile?.manga_reading || []).filter((m) => !isHid(`m:${m.dir}`));
  const showManga = mangaEnabled && manga.length > 0;

  const TABS = [
    { id: 'favorites', label: 'Избранное', icon: I.heartFilled, count: favorites.length },
    { id: 'history', label: 'История', icon: I.clock, count: history.length },
    { id: 'reviews', label: 'Отзывы', icon: I.penTool, count: reviews.length },
    ...(showManga ? [{ id: 'manga', label: 'Манга', icon: I.bookOpen, count: manga.length }] : []),
  ];
  const ft = TABS.some((t) => t.id === profileTab) ? profileTab : 'favorites';

  return (
    <div className="tab-content">
        <div className="profile-header">
            <div className="profile-cover" style={{ backgroundImage: friendData.profile?.cover_url ? `url(${friendData.profile.cover_url})` : '' }}></div>
            <div className="profile-user">
                <div className="profile-avatar-wrap">
                    {viewingFriend.avatar_url || friendData.profile?.avatar_url ?
                        <img src={viewingFriend.avatar_url || friendData.profile?.avatar_url} className="profile-avatar" alt="Аватар друга" /> :
                        <div className="profile-avatar-placeholder">{viewingFriend.username?.[0]?.toUpperCase()}</div>
                    }
                </div>
                <div className="profile-info">
                    <div className="profile-name">{viewingFriend.username}</div>
                    <div className="profile-tag">#{viewingFriend.tag}</div>
                </div>
            </div>
        </div>

        <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <button className="play-main-btn secondary" onClick={() => { setViewingFriend(null); setFriendLoadError(null); }}>{I.back} Назад к друзьям</button>
        </div>

        {friendLoadError && (
            <div className="friend-error" style={{margin:'0 16px 16px'}}>
                {I.alertTriangle} {friendLoadError}
            </div>
        )}

        <div className="profile-stats">
            <div className="profile-stat"><div className="profile-stat-num">{favorites.length}</div><div className="profile-stat-label">Избранное</div></div>
            <div className="profile-stat"><div className="profile-stat-num">{history.length}</div><div className="profile-stat-label">Просмотрено</div></div>
            <div className="profile-stat"><div className="profile-stat-num">{reviews.length}</div><div className="profile-stat-label">Отзывы</div></div>
            {showManga && <div className="profile-stat"><div className="profile-stat-num">{manga.length}</div><div className="profile-stat-label">Манга</div></div>}
        </div>

        <div className="profile-tabs" style={{ justifyContent: 'center' }}>
            {TABS.map((t) => (
                <button key={t.id} className={`library-tab ${ft === t.id ? 'active' : ''}`} onClick={() => setProfileTab(t.id)}>
                    <span className="tab-icon">{t.icon}</span> {t.label} ({t.count})
                </button>
            ))}
        </div>
        <div style={{ padding: '0 16px' }}>
            {ft === 'favorites' && (
                favorites.length > 0
                    ? <div className="library-grid">{favorites.map(f => <Card key={f.item_id} item={{...f, id: f.item_id}} onSelect={openDetails} type={f.media_type} />)}</div>
                    : <div className="library-empty"><div className="library-empty-icon">{I.heart}</div><div className="library-empty-text">У {viewingFriend.username} пока нет избранного</div></div>
            )}
            {ft === 'history' && (
                history.length > 0
                    ? <div className="library-grid">{history.map(h => (
                        <div key={h.item_id} style={{position:'relative'}}>
                            <Card item={{...h, id: h.item_id}} onSelect={openDetails} type={h.media_type} />
                            {h.last_season && <div style={{position:'absolute',top:6,left:6,padding:'2px 6px',borderRadius:4,background:'rgba(0,0,0,0.7)',fontSize:9,fontWeight:700,color:'white'}}>S{h.last_season}E{h.last_episode}</div>}
                        </div>
                    ))}</div>
                    : <div className="library-empty"><div className="library-empty-icon">{I.clock}</div><div className="library-empty-text">У {viewingFriend.username} пока нет истории</div></div>
            )}
            {ft === 'reviews' && (
                reviews.length > 0
                    ? reviews.map(r => {
                        const rCls = r.rating >= 7 ? 'high' : r.rating >= 5 ? 'mid' : 'low';
                        return (
                            <div key={r.id || r.created_at} className="friend-review-card">
                                <div className="friend-review-top" onClick={() => openDetails({ id: r.movie_id || r.item_id }, r.media_type || 'movie')}
                                    onKeyDown={(event) => activateOnKeyboard(event, () => openDetails({ id: r.movie_id || r.item_id }, r.media_type || 'movie'))}
                                    role="button" tabIndex={0} aria-label={`Открыть ${r.title}`}>
                                    {r.poster_path ? <img className="friend-review-poster" src={`${IMG}${r.poster_path}`} alt="" /> : <div className="friend-review-poster-ph">{I.film}</div>}
                                    <div className="friend-review-info">
                                        <div className="friend-review-title">{r.title}</div>
                                        <div className="friend-review-year">{r.media_type === 'tv' ? 'Сериал' : 'Фильм'} {r.release_date ? `• ${r.release_date.split('-')[0]}` : ''}</div>
                                        <div className="friend-review-rating-wrap"><div className={`friend-review-rating ${rCls}`}>{I.star} {r.rating}/10</div></div>
                                    </div>
                                </div>
                                <div className="friend-review-body">{r.content}</div>
                                <button className="friend-review-action" onClick={() => openDetails({ id: r.movie_id || r.item_id }, r.media_type || 'movie')}>{I.play} Посмотреть самому</button>
                            </div>
                        );
                    })
                    : <div className="library-empty"><div className="library-empty-icon">{I.penTool}</div><div className="library-empty-text">У {viewingFriend.username} пока нет отзывов</div></div>
            )}
            {ft === 'manga' && (
                <div className="manga-grid">
                    {manga.map((m) => (
                        <div key={m.dir} className="manga-card" role="button" tabIndex={0} aria-label={`Открыть ${m.title}`}
                            onClick={() => openManga({ dir: m.dir, title: m.title, cover: m.cover })}
                            onKeyDown={(event) => activateOnKeyboard(event, () => openManga({ dir: m.dir, title: m.title, cover: m.cover }))}>
                            <div className="manga-card-poster">
                                {m.cover
                                    ? <img src={m.cover} alt={m.title} loading="lazy" referrerPolicy="origin" />
                                    : <div className="manga-card-ph">{m.title}</div>}
                                {m.status && MANGA_STATUS_MAP[m.status] && <div className="manga-card-type">{MANGA_STATUS_MAP[m.status].label}</div>}
                            </div>
                            <div className="manga-card-title">{m.title}</div>
                            {m.chapter != null && <div className="manga-card-meta">Гл. {m.chapter}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
