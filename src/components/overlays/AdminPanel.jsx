import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

export default function AdminPanel() {
  const {
    adminOpen,
    isAdmin,
    user,
    userProfile,
    setAdminOpen,
    setAdminEditingId,
    setAdminListTitle,
    setAdminListItems,
    adminEditingId,
    adminListTitle,
    adminSearchQuery,
    setAdminSearchQuery,
    adminSearch,
    adminSearchResults,
    addToAdminList,
    IMG,
    adminListItems,
    saveCuratedList,
    curatedLists,
    toggleCuratedListActive,
    editCuratedList,
    deleteCuratedList,
    loadPendingUsers,
    approvalLoading,
    approvalTab,
    setApprovalTab,
    pendingUsers,
    approveUser,
    rejectUser,
  } = useApp();

  if (!adminOpen || !isAdmin) {
    return null;
  }

  return (
    <div className="admin-panel">
            <div className="admin-header">
                <button className="admin-btn secondary" onClick={() => { setAdminOpen(false); setAdminEditingId(null); setAdminListTitle(''); setAdminListItems([]); }}>{I.back}</button>
                <h2>Админ-панель</h2>
                <span className="admin-badge">ADMIN</span>
            </div>

            <div className="admin-section">
                <div className="admin-section-title">{adminEditingId ? <>{I.edit} Редактирование подборки</> : <>{I.plus} Новая подборка</>}</div>
                <input
                    className="admin-input"
                    value={adminListTitle}
                    onChange={e => setAdminListTitle(e.target.value)}
                    placeholder="Название (напр. Рекомендации года)"
                    style={{marginBottom:12}}
                />

                <div className="admin-search-wrap">
                    <span className="admin-search-icon">{I.search}</span>
                    <input
                        className="admin-input admin-input-search"
                        value={adminSearchQuery}
                        onChange={e => { setAdminSearchQuery(e.target.value); adminSearch(e.target.value); }}
                        placeholder="Поиск фильмов и сериалов..."
                    />
                </div>

                {adminSearchResults.length > 0 && (
                    <div className="admin-search-results">
                        {adminSearchResults.map(item => (
                            <div key={item.id} className="admin-search-item" onClick={() => addToAdminList(item)}>
                                {item.poster_path && <img src={`${IMG}${item.poster_path}`} alt="" />}
                                <div className="admin-search-item-info">
                                    <div className="admin-search-item-title">{item.title || item.name}</div>
                                    <div className="admin-search-item-year">{(item.release_date || item.first_air_date || '').split('-')[0]} • {item.media_type === 'tv' ? 'Сериал' : 'Фильм'}</div>
                                </div>
                                <span style={{color:'var(--green)',fontSize:18}}>{I.plus}</span>
                            </div>
                        ))}
                    </div>
                )}

                {adminListItems.length > 0 && (
                    <div style={{marginTop:16}}>
                        <div style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',marginBottom:8}}>
                            В подборке: {adminListItems.length} {adminListItems.length === 1 ? 'элемент' : adminListItems.length < 5 ? 'элемента' : 'элементов'}
                        </div>
                        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:8}}>
                            {adminListItems.map((item, idx) => (
                                <div key={item.id} className="admin-list-item" style={{position:'relative'}}>
                                    {item.poster_path ? <img src={`${IMG}${item.poster_path}`} alt="" /> : <div style={{width:60,height:90,borderRadius:8,background:'var(--surface-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>{item.title}</div>}
                                    <div className="admin-list-item-title">{item.title}</div>
                                    <button onClick={() => setAdminListItems(prev => prev.filter((_, i) => i !== idx))} style={{
                                        position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',
                                        background:'var(--accent)',color:'white',border:'none',fontSize:10,
                                        display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'
                                    }}>{I.x}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{display:'flex',gap:8,marginTop:16}}>
                    <button className="admin-btn gold" style={{flex:1}} onClick={saveCuratedList} disabled={!adminListTitle.trim() || adminListItems.length === 0}>
                        {adminEditingId ? <>{I.save} Сохранить</> : <>{I.sparkles} Создать подборку</>}
                    </button>
                    {adminEditingId && (
                        <button className="admin-btn secondary" onClick={() => { setAdminEditingId(null); setAdminListTitle(''); setAdminListItems([]); }}>
                            Отмена
                        </button>
                    )}
                </div>
            </div>

            <div className="admin-section">
                <div className="admin-section-title">{I.list} Мои подборки ({curatedLists.length})</div>
                {curatedLists.length === 0 ? (
                    <div style={{textAlign:'center',padding:'32px 16px',color:'var(--text-muted)'}}>
                        <div style={{fontSize:32,marginBottom:8}}>{I.fileText}</div>
                        <div style={{fontSize:13,fontWeight:600}}>Пока нет подборок</div>
                    </div>
                ) : curatedLists.map(list => (
                    <div key={list.id} className="admin-list-card" style={{opacity: list.is_active ? 1 : 0.5}}>
                        <div className="admin-list-header">
                            <div className="admin-list-title">
                                <span className="status-dot" style={{background: list.is_active ? 'var(--green)' : 'var(--accent)'}}></span> {list.title}
                            </div>
                            <div className="admin-list-count">{(list.items || []).length} элементов</div>
                        </div>
                        <div className="admin-list-items">
                            {(list.items || []).slice(0, 8).map(item => (
                                <div key={item.id} className="admin-list-item">
                                    {item.poster_path ? <img src={`${IMG}${item.poster_path}`} alt="" /> : <div style={{width:60,height:90,borderRadius:8,background:'var(--surface-2)'}}></div>}
                                    <div className="admin-list-item-title">{item.title}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{display:'flex',gap:6,marginTop:8}}>
                            <button className="admin-btn secondary" style={{flex:1,padding:'8px 0',fontSize:11}} onClick={() => toggleCuratedListActive(list.id, list.is_active)}>
                                <span className="status-dot" style={{background: list.is_active ? 'var(--accent)' : 'var(--green)'}}></span> {list.is_active ? 'Скрыть' : 'Показать'}
                            </button>
                            <button className="admin-btn secondary" style={{flex:1,padding:'8px 0',fontSize:11}} onClick={() => editCuratedList(list)}>
                                {I.edit} Изменить
                            </button>
                            <button className="admin-btn danger" style={{padding:'8px 12px',fontSize:11}} onClick={() => deleteCuratedList(list.id)}>
                                {I.trash}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* === User Approval Management === */}
            <div className="admin-section">
                <div className="admin-section-title admin-section-title-row">
                    <span>{I.users} Заявки пользователей</span>
                    <button className="admin-btn secondary admin-btn-sm" onClick={loadPendingUsers}>
                        {approvalLoading ? <>{I.hourglass}</> : <>{I.refresh}</>} Обновить
                    </button>
                </div>

                <div className="approval-tabs">
                    <button className={`approval-tab ${approvalTab === 'pending' ? 'active' : ''}`} onClick={() => setApprovalTab('pending')}>
                        {I.hourglass} Ожидают
                        {pendingUsers.filter(u => u.status === 'pending' || !u.status).length > 0 && (
                            <span className="approval-count">{pendingUsers.filter(u => u.status === 'pending' || !u.status).length}</span>
                        )}
                    </button>
                    <button className={`approval-tab ${approvalTab === 'approved' ? 'active' : ''}`} onClick={() => setApprovalTab('approved')}>
                        {I.checkCircle} Одобрены
                    </button>
                    <button className={`approval-tab ${approvalTab === 'rejected' ? 'active' : ''}`} onClick={() => setApprovalTab('rejected')}>
                        {I.ban} Отклонены
                    </button>
                </div>

                {(() => {
                    const filtered = pendingUsers.filter(u => {
                        if (approvalTab === 'pending') return u.status === 'pending' || !u.status;
                        return u.status === approvalTab;
                    });
                    if (filtered.length === 0) return (
                        <div style={{textAlign:'center',padding:'32px 16px',color:'var(--text-muted)'}}>
                            <div style={{fontSize:32,marginBottom:8}}>
                                {approvalTab === 'pending' ? I.checkCircle : approvalTab === 'approved' ? I.user : I.ban}
                            </div>
                            <div style={{fontSize:13,fontWeight:600}}>
                                {approvalTab === 'pending' ? 'Нет заявок на рассмотрении' : approvalTab === 'approved' ? 'Нет одобренных пользователей' : 'Нет отклонённых пользователей'}
                            </div>
                        </div>
                    );
                    return filtered.map(u => (
                        <div key={u.id} className="approval-card">
                            <div className="approval-avatar">
                                {u.avatar_url
                                    ? <img src={u.avatar_url} alt="" />
                                    : (u.username || 'U').charAt(0).toUpperCase()
                                }
                            </div>
                            <div className="approval-info">
                                <div className="approval-name">{u.username || 'User'}#{u.tag || '0000'}</div>
                                <div className="approval-email">{u.email || '—'}</div>
                                {u.created_at && <div className="approval-date">Зарегистрирован: {new Date(u.created_at).toLocaleDateString('ru-RU', {day:'numeric',month:'long',year:'numeric'})}</div>}
                            </div>
                            <div className="approval-actions">
                                {(u.status === 'pending' || !u.status || u.status === 'rejected') && (
                                    <button className="approval-btn approve" onClick={() => approveUser(u.id)} title="Одобрить">{I.check}</button>
                                )}
                                {(u.status === 'pending' || !u.status || u.status === 'approved') && (
                                    <button className="approval-btn reject" onClick={() => rejectUser(u.id)} title="Отклонить">{I.x}</button>
                                )}
                            </div>
                        </div>
                    ));
                })()}
            </div>
        </div>
  );
}
