import { useApp } from '../../context/AppContext.jsx';

export default function SettingsSection() {
    const { userProfile, user, setNameEditOpen, history, supabase, setHistory, tg, pluralize, toggleAutoSkip, autoSkip, isAdmin, setAdminOpen, loadPendingUsers, handleLogout } = useApp();

    return (
        <div className="settings-section">
            <div className="settings-group">
                <div className="settings-group-title">Аккаунт</div>
                <div className="settings-item" onClick={() => setNameEditOpen(true)}>
                    <span className="settings-item-icon">✏️</span>
                    <div className="settings-item-text"><div className="settings-item-title">Сменить имя</div><div className="settings-item-desc">{userProfile?.username}#{userProfile?.tag}</div></div>
                    <span className="settings-item-arrow">›</span>
                </div>
                <div className="settings-item" onClick={() => document.querySelector('.profile-cover-edit input')?.click()}>
                    <span className="settings-item-icon">🖼️</span>
                    <div className="settings-item-text"><div className="settings-item-title">Обложка профиля</div><div className="settings-item-desc">Загрузить изображение</div></div>
                    <span className="settings-item-arrow">›</span>
                </div>
                <div className="settings-item" onClick={() => document.querySelector('.profile-avatar-edit input')?.click()}>
                    <span className="settings-item-icon">📸</span>
                    <div className="settings-item-text"><div className="settings-item-title">Аватар</div><div className="settings-item-desc">Изменить фото профиля</div></div>
                    <span className="settings-item-arrow">›</span>
                </div>
            </div>
            <div className="settings-group">
                <div className="settings-group-title">Данные</div>
                <div className="settings-item" onClick={() => { if (confirm('Очистить историю просмотров?')) { supabase.from('history').delete().eq('user_id', user.id); setHistory([]); tg?.HapticFeedback?.notificationOccurred?.('success'); } }}>
                    <span className="settings-item-icon">🗑️</span>
                    <div className="settings-item-text"><div className="settings-item-title">Очистить историю</div><div className="settings-item-desc">{history.length} {pluralize(history.length, 'запись', 'записи', 'записей')}</div></div>
                    <span className="settings-item-arrow">›</span>
                </div>
            </div>
            <div className="settings-group">
                <div className="settings-group-title">Плеер</div>
                <div className="settings-item" onClick={toggleAutoSkip}>
                    <span className="settings-item-icon">⏭</span>
                    <div className="settings-item-text"><div className="settings-item-title">Авто-пропуск заставок</div><div className="settings-item-desc">Автоматически пропускать intro и outro</div></div>
                    <div style={{width:44,height:26,borderRadius:13,background:autoSkip?'var(--accent)':'var(--surface-2)',border:'2px solid '+(autoSkip?'var(--accent)':'var(--border)'),transition:'all 0.2s',position:'relative',flexShrink:0}}>
                        <div style={{width:20,height:20,borderRadius:10,background:'white',position:'absolute',top:1,left:autoSkip?21:1,transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}></div>
                    </div>
                </div>
            </div>
            <div className="settings-group">
                <div className="settings-group-title">Информация</div>
                <div className="settings-item"><span className="settings-item-icon">📧</span><div className="settings-item-text"><div className="settings-item-title">Email</div><div className="settings-item-desc">{user.email}</div></div></div>
                <div className="settings-item"><span className="settings-item-icon">🆔</span><div className="settings-item-text"><div className="settings-item-title">ID</div><div className="settings-item-desc" style={{fontSize:9,fontFamily:'monospace'}}>{user.id}</div></div></div>
            </div>
            {isAdmin && (
                <div className="settings-group">
                    <div className="settings-item" style={{borderColor:'rgba(255,171,0,0.2)'}} onClick={() => { setAdminOpen(true); loadPendingUsers(); }}>
                        <span className="settings-item-icon" style={{background:'linear-gradient(135deg, var(--gold), #ff6b6b)'}}>👑</span>
                        <div className="settings-item-text"><div className="settings-item-title">Админ-панель</div><div className="settings-item-desc">Управление подборками</div></div>
                        <span className="admin-badge">ADMIN</span>
                    </div>
                </div>
            )}
            <div className="settings-group">
                <div className="settings-item danger" onClick={handleLogout}>
                    <span className="settings-item-icon">🚪</span>
                    <div className="settings-item-text"><div className="settings-item-title">Выйти из аккаунта</div><div className="settings-item-desc">Вы сможете войти снова</div></div>
                </div>
            </div>
        </div>
    );
}
