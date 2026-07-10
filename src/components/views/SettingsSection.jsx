import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

// One settings row: tinted icon chip + title/desc + right slot (chevron, switch,
// custom node). Rows live inside a .set-card group separated by hairlines.
function Row({ icon, tint = 'var(--text-secondary)', title, desc, onClick, right, danger }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            className={`set-row ${onClick ? 'tap' : ''} ${danger ? 'danger' : ''}`}
            style={{ '--tint': tint }}
            onClick={onClick}
        >
            <span className="set-row-ic">{icon}</span>
            <div className="set-row-text">
                <div className="set-row-title">{title}</div>
                {desc && <div className="set-row-desc">{desc}</div>}
            </div>
            {right !== undefined ? right : (onClick ? <span className="set-row-chev">{I.back}</span> : null)}
        </Tag>
    );
}

function Switch({ on }) {
    return <span className={`set-switch ${on ? 'on' : ''}`} aria-checked={on} role="switch"><span className="set-switch-knob" /></span>;
}

export default function SettingsSection() {
    const { userProfile, user, setNameEditOpen, history, supabase, setHistory, tg, pluralize, toggleAutoSkip, autoSkip, isAdmin, setAdminOpen, loadPendingUsers, handleLogout, loadUserProfile } = useApp();

    return (
        <div className="settings-section">
            <div className="set-group">
                <div className="set-group-title">Аккаунт</div>
                <div className="set-card">
                    <Row icon={I.edit} tint="var(--blue)" title="Имя" desc={`${userProfile?.username}#${userProfile?.tag}`} onClick={() => setNameEditOpen(true)} />
                    <Row icon={I.camera} tint="var(--purple, #a78bfa)" title="Аватар" desc="Фото профиля" onClick={() => document.querySelector('.profile-avatar-edit input')?.click()} />
                    <Row icon={I.image} tint="var(--gold)" title="Обложка профиля" desc="Баннер на странице профиля" onClick={() => document.querySelector('.profile-cover-edit input')?.click()} />
                    <Row icon={I.refresh} tint="var(--green)" title="Обновить профиль" desc="Перезагрузить данные из базы" onClick={() => loadUserProfile(user.id, user.email)} />
                </div>
            </div>

            <div className="set-group">
                <div className="set-group-title">Плеер</div>
                <div className="set-card">
                    <Row
                        icon={I.skipForward} tint="var(--accent)"
                        title="Авто-пропуск заставок" desc="Пропускать intro и outro автоматически"
                        onClick={toggleAutoSkip} right={<Switch on={autoSkip} />}
                    />
                </div>
            </div>

            <div className="set-group">
                <div className="set-group-title">Данные</div>
                <div className="set-card">
                    <Row
                        icon={I.refresh} tint="var(--green)"
                        title="Синхронизация" desc="История, прогресс и манга привязаны к аккаунту"
                        right={<span className="set-row-ok">{I.checkCircle}</span>}
                    />
                    <Row
                        icon={I.trash} tint="var(--accent)"
                        title="Очистить историю" desc={`${history.length} ${pluralize(history.length, 'запись', 'записи', 'записей')}`}
                        onClick={() => { if (confirm('Очистить историю просмотров?')) { supabase.from('history').delete().eq('user_id', user.id); setHistory([]); tg?.HapticFeedback?.notificationOccurred?.('success'); } }}
                    />
                </div>
            </div>

            <div className="set-group">
                <div className="set-group-title">Об аккаунте</div>
                <div className="set-card">
                    <Row icon={I.mail} title="Email" desc={user.email} right={null} />
                    <Row icon={I.hash} title="ID" desc={<span className="set-mono">{user.id}</span>} right={null} />
                </div>
            </div>

            {isAdmin && (
                <div className="set-group">
                    <div className="set-card admin">
                        <Row
                            icon={I.crown} tint="var(--gold)"
                            title="Админ-панель" desc="Заявки и подборки"
                            onClick={() => { setAdminOpen(true); loadPendingUsers(); }}
                            right={<span className="admin-badge">ADMIN</span>}
                        />
                    </div>
                </div>
            )}

            <div className="set-group">
                <div className="set-card">
                    <Row icon={I.logout} tint="var(--accent)" danger title="Выйти из аккаунта" desc="Вы сможете войти снова" onClick={handleLogout} />
                </div>
            </div>
        </div>
    );
}
