import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

export default function NotificationsPanel() {
  const {
    notifOpen,
    setNotifOpen,
    unreadNotifCount,
    markAllNotificationsRead,
    notifications,
    openDetails,
    supabase,
    setNotifications,
  } = useApp();

  if (!notifOpen) {
    return null;
  }

  const NOTIF_ICONS = {
    friend_request: I.userPlus,
    friend_accepted: I.userCheck,
    review_like: I.thumbsUp,
    friend_watched: I.eye,
  };

  return (
    <div className="notif-panel">
            <div className="notif-header">
                <button className="mood-close" onClick={() => setNotifOpen(false)}>{I.x}</button>
                <div className="notif-header-title">Уведомления</div>
                {unreadNotifCount > 0 && <button className="notif-mark-all" onClick={markAllNotificationsRead}>Прочитать все</button>}
            </div>
            <div className="notif-list">
                {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => {
                        if (n.data?.movie_id) openDetails({ id: n.data.movie_id }, n.data.media_type || 'movie');
                        if (!n.is_read) { supabase.from('notifications').update({ is_read: true }).eq('id', n.id).then(() => {}); setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x)); }
                        setNotifOpen(false);
                    }}>
                        <div className="notif-icon">
                            {NOTIF_ICONS[n.type] || I.bell}
                        </div>
                        <div className="notif-body">
                            <div className="notif-text">{n.title}</div>
                            {n.body && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{n.body}</div>}
                            <div className="notif-time">{n.created_at ? new Date(n.created_at).toLocaleDateString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}</div>
                        </div>
                    </div>
                )) : (
                    <div className="notif-empty">
                        <div className="notif-empty-icon">{I.bell}</div>
                        <div className="notif-empty-text">Пока нет уведомлений</div>
                        <div className="notif-empty-hint">Они появятся когда друзья будут активны</div>
                    </div>
                )}
            </div>
        </div>
  );
}
