import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import Card from '../common/Card.jsx';

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
    IMG,
  } = useApp();

  return (
    <div className="tab-content">
        {/* Friend Cover */}
        <div className="profile-header">
            <div className="profile-cover" style={{ backgroundImage: friendData.profile?.cover_url ? `url(${friendData.profile.cover_url})` : '' }}></div>
            <div className="profile-user">
                <div className="profile-avatar-wrap">
                    {viewingFriend.avatar_url || friendData.profile?.avatar_url ?
                        <img src={viewingFriend.avatar_url || friendData.profile?.avatar_url} className="profile-avatar" /> :
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

        {/* Friend Stats */}
        <div className="profile-stats">
            <div className="profile-stat">
                <div className="profile-stat-num">{friendData.favorites.length}</div>
                <div className="profile-stat-label">Избранное</div>
            </div>
            <div className="profile-stat">
                <div className="profile-stat-num">{friendData.history.length}</div>
                <div className="profile-stat-label">Просмотрено</div>
            </div>
            <div className="profile-stat">
                <div className="profile-stat-num">{friendData.reviews.length}</div>
                <div className="profile-stat-label">Отзывы</div>
            </div>
        </div>

        <div className="profile-tabs" style={{ justifyContent: 'center' }}>
            {['favorites', 'history', 'reviews'].map(t => (
                <button key={t} className={`library-tab ${profileTab === t ? 'active' : ''}`} onClick={() => setProfileTab(t)}>
                    <span className="tab-icon">{t === 'favorites' ? I.heartFilled : t === 'history' ? I.clock : I.penTool}</span>
                    {t === 'favorites' && ` Избранное (${friendData.favorites.length})`}
                    {t === 'history' && ` История (${friendData.history.length})`}
                    {t === 'reviews' && ` Отзывы (${friendData.reviews.length})`}
                </button>
            ))}
        </div>
        <div style={{ padding: '0 16px' }}>
            {profileTab === 'favorites' && (
                friendData.favorites.length > 0 ? (
                    <div className="library-grid">{friendData.favorites.map(f => <Card key={f.item_id} item={{...f, id: f.item_id}} onSelect={openDetails} type={f.media_type} />)}</div>
                ) : (
                    <div className="library-empty"><div className="library-empty-icon">{I.heart}</div><div className="library-empty-text">У {viewingFriend.username} пока нет избранного</div></div>
                )
            )}
            {profileTab === 'history' && (
                friendData.history.length > 0 ? (
                    <div className="library-grid">{friendData.history.map(h => (
                        <div key={h.item_id} style={{position:'relative'}}>
                            <Card item={{...h, id: h.item_id}} onSelect={openDetails} type={h.media_type} />
                            {h.last_season && <div style={{position:'absolute',top:6,left:6,padding:'2px 6px',borderRadius:4,background:'rgba(0,0,0,0.7)',fontSize:9,fontWeight:700,color:'white'}}>S{h.last_season}E{h.last_episode}</div>}
                        </div>
                    ))}</div>
                ) : (
                    <div className="library-empty"><div className="library-empty-icon">{I.clock}</div><div className="library-empty-text">У {viewingFriend.username} пока нет истории</div></div>
                )
            )}
            {profileTab === 'reviews' && (
                friendData.reviews.length > 0 ? (
                    friendData.reviews.map(r => {
                        const rCls = r.rating >= 7 ? 'high' : r.rating >= 5 ? 'mid' : 'low';
                        return (
                            <div key={r.id || r.created_at} className="friend-review-card">
                                <div className="friend-review-top" onClick={() => openDetails({ id: r.movie_id || r.item_id }, r.media_type || 'movie')}>
                                    {r.poster_path
                                        ? <img className="friend-review-poster" src={`${IMG}${r.poster_path}`} alt="" />
                                        : <div className="friend-review-poster-ph">{I.film}</div>
                                    }
                                    <div className="friend-review-info">
                                        <div className="friend-review-title">{r.title}</div>
                                        <div className="friend-review-year">{r.media_type === 'tv' ? 'Сериал' : 'Фильм'} {r.release_date ? `• ${r.release_date.split('-')[0]}` : ''}</div>
                                        <div className="friend-review-rating-wrap">
                                            <div className={`friend-review-rating ${rCls}`}>{I.star} {r.rating}/10</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="friend-review-body">{r.content}</div>
                                <div className="friend-review-action" onClick={() => openDetails({ id: r.movie_id || r.item_id }, r.media_type || 'movie')}>
                                    {I.play} Посмотреть самому
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="library-empty"><div className="library-empty-icon">{I.penTool}</div><div className="library-empty-text">У {viewingFriend.username} пока нет отзывов</div></div>
                )
            )}
        </div>
    </div>
  );
}
