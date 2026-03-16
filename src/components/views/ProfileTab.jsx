import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Card from '../common/Card.jsx';
import ProfileHeader from './ProfileHeader.jsx';
import StatsSection from './StatsSection.jsx';
import SettingsSection from './SettingsSection.jsx';
import CollectionModal from '../overlays/CollectionModal.jsx';
import { LIBRARY_STATUSES } from '../../lib/libraryStatuses.js';

export default function ProfileTab() {
  const [colModalOpen, setColModalOpen] = useState(false);
  const [colModalTitle, setColModalTitle] = useState('');
  const [colModalEditId, setColModalEditId] = useState(null);
  const {
    favorites, history, reviews, watchlist, collections, friendRequests,
    profileTab, setProfileTab, tg, profileCompletion, userProfile,
    librarySort, setLibrarySort, sortItems, openDetails,
    toggleFavorite, toggleWatchlist, reviewPosters, IMG, I,
    saveCollection, deleteCollection,
    friendSearch, setFriendSearch, searchUser, searchResult,
    sendFriendRequest, loadFriendProfile, acceptFriend, declineFriend, friends,
    libraryByStatus, libraryCounts, setStatusPickerItem,
  } = useApp();

  return (
    <div className="tab-content">
        <ProfileHeader />

        {profileCompletion < 100 && (
            <div className="profile-completion">
                <div className="profile-completion-header">
                    <div className="profile-completion-title">Заполненность профиля</div>
                    <div className="profile-completion-pct">{profileCompletion}%</div>
                </div>
                <div className="profile-completion-bar"><div className="profile-completion-fill" style={{width:`${profileCompletion}%`}}></div></div>
                <div className="profile-completion-hint">
                    {!userProfile?.avatar_url ? 'Добавьте аватар' : !userProfile?.cover_url ? 'Добавьте обложку' : favorites.length === 0 ? 'Добавьте фильм в избранное' : reviews.length === 0 ? 'Оставьте отзыв' : 'Добавьте друзей'}
                </div>
            </div>
        )}

        <div className="profile-tabs">
            {[
                ...LIBRARY_STATUSES.map(s => ({ id: `lib_${s.id}`, label: `${s.icon} ${s.label}`, count: libraryCounts[s.id] })),
                { id: 'favorites', label: '❤️ Избранное' },
                { id: 'history', label: '🕐 История' },
                { id: 'reviews', label: '✍️ Отзывы' },
                { id: 'collections', label: '📁 Коллекции', count: collections.length },
                { id: 'stats', label: '📊 Стата' },
                { id: 'friends', label: '👥 Друзья' },
                { id: 'requests', label: '📩 Заявки', count: friendRequests.length },
                { id: 'settings', label: '⚙️' },
            ].map(t => (
                <button key={t.id} className={`library-tab ${profileTab === t.id ? 'active' : ''}`} onClick={() => { setProfileTab(t.id); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                    {t.label}
                    {t.count > 0 && <span className="watchlist-badge">{t.count}</span>}
                </button>
            ))}
        </div>

        <div style={{ padding: '0 16px' }}>
            {(profileTab.startsWith('lib_') || ['favorites', 'history'].includes(profileTab)) && (
                <div className="library-sort">
                    {[{id:'date',label:'По дате'},{id:'rating',label:'По рейтингу'},{id:'title',label:'По имени'}].map(s => (
                        <button key={s.id} className={`library-sort-btn ${librarySort === s.id ? 'active' : ''}`} onClick={() => setLibrarySort(s.id)}>{s.label}</button>
                    ))}
                </div>
            )}

            {/* Library status categories */}
            {LIBRARY_STATUSES.map(s => {
                if (profileTab !== `lib_${s.id}`) return null;
                const items = libraryByStatus[s.id] || [];
                return items.length > 0 ? (
                    <div key={s.id} className="library-grid">
                        {sortItems(items, librarySort).map(item => (
                            <div key={item.item_id} style={{ position: 'relative' }}>
                                <Card item={{ ...item, id: item.item_id }} onSelect={openDetails} type={item.media_type} />
                                <button
                                    style={{
                                        position: 'absolute', bottom: 44, right: 4, padding: '3px 8px', borderRadius: 8,
                                        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                                        border: `1px solid ${s.color}33`, color: s.color,
                                        fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                    }}
                                    onClick={(e) => { e.stopPropagation(); setStatusPickerItem({ ...item, id: item.item_id }); }}
                                >
                                    {s.icon}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div key={s.id} className="library-empty">
                        <div className="library-empty-icon">{s.icon}</div>
                        <div className="library-empty-text">Список пуст</div>
                        <div className="library-empty-hint">Откройте фильм и выберите статус</div>
                    </div>
                );
            })}

            {profileTab === 'favorites' && (favorites.length > 0 ? <div className="library-grid">{sortItems(favorites, librarySort).map(f => <Card key={f.item_id} item={{...f, id: f.item_id}} onSelect={openDetails} onFav={toggleFavorite} isFav={true} type={f.media_type} />)}</div> : <div className="library-empty"><div className="library-empty-icon">❤️</div><div className="library-empty-text">Пока ничего не добавлено</div><div className="library-empty-hint">Нажмите ♥ на любом фильме</div></div>)}
            {profileTab === 'history' && (history.length > 0 ? <div className="library-grid">{sortItems(history, librarySort).map(h => <Card key={h.item_id} item={{...h, id: h.item_id}} onSelect={openDetails} onFav={toggleFavorite} isFav={favorites.some(fav => fav.item_id === h.item_id)} type={h.media_type} />)}</div> : <div className="library-empty"><div className="library-empty-icon">🕐</div><div className="library-empty-text">История пуста</div><div className="library-empty-hint">Начните смотреть — всё появится здесь</div></div>)}

            {profileTab === 'reviews' && (reviews.length > 0 ? reviews.map(r => {
                const rCls = r.rating >= 7 ? 'high' : r.rating >= 5 ? 'mid' : 'low';
                const posterSrc = (favorites.find(f => f.item_id === r.movie_id)?.poster_path) || (history.find(h => h.item_id === r.movie_id)?.poster_path) || reviewPosters[r.movie_id] || null;
                return (
                    <div key={r.id || r.movie_id} className="friend-review-card">
                        <div className="friend-review-top" onClick={() => openDetails({ id: r.movie_id }, r.media_type || 'movie')}>
                            {posterSrc ? <img className="friend-review-poster" src={`${IMG}${posterSrc}`} alt="" /> : <div className="friend-review-poster-ph">🎬</div>}
                            <div className="friend-review-info">
                                <div className="friend-review-title">{r.title}</div>
                                <div className="friend-review-year">{r.media_type === 'tv' ? 'Сериал' : 'Фильм'}</div>
                                <div className="friend-review-rating-wrap"><div className={`friend-review-rating ${rCls}`}>{I.star} {r.rating}/10</div></div>
                            </div>
                        </div>
                        <div className="friend-review-body">{r.content}</div>
                        {r.created_at && <div style={{padding:'0 16px 8px',fontSize:10,color:'var(--text-muted)'}}>{new Date(r.created_at).toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})}</div>}
                        <div className="friend-review-action" onClick={() => openDetails({ id: r.movie_id }, r.media_type || 'movie')}>{I.play} Открыть фильм</div>
                    </div>
                );
            }) : <div className="library-empty"><div className="library-empty-icon">📝</div><div className="library-empty-text">Нет отзывов</div><div className="library-empty-hint">Откройте фильм и оставьте отзыв</div></div>)}

            {profileTab === 'collections' && (
                <div>
                    <button className="collection-create-btn" onClick={() => { setColModalTitle(''); setColModalEditId(null); setColModalOpen(true); }}>+ Создать коллекцию</button>
                    {collections.length > 0 ? collections.map(col => (
                        <div key={col.id} className="collection-card">
                            <div className="collection-card-head"><div className="collection-card-title">{col.title}</div><div className="collection-card-count">{(col.items || []).length} шт.</div></div>
                            <div className="collection-card-posters">
                                {(col.items || []).slice(0, 5).map(item => (
                                    item.poster_path ? <img key={item.id} className="collection-card-poster" src={`${IMG}${item.poster_path}`} alt="" onClick={() => openDetails({id: item.id}, item.media_type || 'movie')} /> : <div key={item.id} className="collection-card-poster-ph"></div>
                                ))}
                            </div>
                            <div style={{display:'flex',gap:6,marginTop:10}}>
                                <button style={{flex:1,padding:'8px',borderRadius:8,background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}} onClick={() => { setColModalTitle(col.title); setColModalEditId(col.id); setColModalOpen(true); }}>✏️ Изменить</button>
                                <button style={{padding:'8px 12px',borderRadius:8,background:'rgba(229,9,20,0.1)',border:'1px solid rgba(229,9,20,0.2)',color:'var(--accent)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}} onClick={() => deleteCollection(col.id)}>🗑</button>
                            </div>
                        </div>
                    )) : <div className="library-empty"><div className="library-empty-icon">📁</div><div className="library-empty-text">Нет коллекций</div><div className="library-empty-hint">Создайте свою первую коллекцию</div></div>}
                </div>
            )}

            {profileTab === 'stats' && <StatsSection />}

            {profileTab === 'friends' && (
                <div>
                    <div className="friends-search">
                        <input className="search-input" placeholder="Ник#Тег" value={friendSearch} onChange={e => setFriendSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUser()} />
                        <button onClick={searchUser}>Найти</button>
                    </div>
                    {searchResult && searchResult !== 'not_found' && (
                        <div className="friend-card" style={{ borderColor: 'var(--accent)' }}>
                            <div className="friend-avatar">{searchResult.avatar_url ? <img src={searchResult.avatar_url} /> : searchResult.username?.[0]?.toUpperCase()}</div>
                            <div className="friend-info"><div className="friend-name">{searchResult.username}</div><div className="friend-meta">#{searchResult.tag}</div></div>
                            <button className="friend-btn accept" onClick={() => sendFriendRequest(searchResult.id)}>+ Добавить</button>
                        </div>
                    )}
                    {searchResult === 'not_found' && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Не найден</div>}
                    {friends.length > 0 ? friends.map(f => (
                        <div key={f.id} className="friend-card" onClick={() => loadFriendProfile(f)}>
                            <div className="friend-avatar">{f.avatar_url ? <img src={f.avatar_url} /> : f.username?.[0]?.toUpperCase()}</div>
                            <div className="friend-info"><div className="friend-name">{f.username}</div><div className="friend-meta">#{f.tag} · Нажми чтобы открыть</div></div>
                        </div>
                    )) : <div className="library-empty"><div className="library-empty-icon">👥</div><div className="library-empty-text">Найдите друзей по Ник#Тег</div></div>}
                </div>
            )}

            {profileTab === 'requests' && (friendRequests.length > 0 ? friendRequests.map(req => (
                <div key={req.requestId} className="friend-card">
                    <div className="friend-avatar">{req.avatar_url ? <img src={req.avatar_url} /> : req.username?.[0]?.toUpperCase()}</div>
                    <div className="friend-info"><div className="friend-name">{req.username}</div><div className="friend-meta">хочет дружить</div></div>
                    <div className="friend-actions"><button className="friend-btn accept" onClick={() => acceptFriend(req.requestId)}>{I.check}</button><button className="friend-btn decline" onClick={() => declineFriend(req.requestId)}>{I.x}</button></div>
                </div>
            )) : <div className="library-empty"><div className="library-empty-icon">📩</div><div className="library-empty-text">Нет заявок</div></div>)}

            {profileTab === 'settings' && <SettingsSection />}
        </div>
        <CollectionModal
            isOpen={colModalOpen}
            onClose={() => setColModalOpen(false)}
            initialTitle={colModalTitle}
            title={colModalEditId ? 'Переименовать коллекцию' : 'Новая коллекция'}
            onSave={(title) => {
                if (colModalEditId) {
                    const col = collections.find(c => c.id === colModalEditId);
                    saveCollection(title, col?.items || [], colModalEditId);
                } else {
                    saveCollection(title, []);
                }
            }}
        />
    </div>
  );
}
