import { memo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const FriendsActivity = memo(function FriendsActivity() {
    const { friendsActivity, openDetails, IMG } = useApp();

    if (friendsActivity.length === 0) return null;

    return (
        <div className="activity-feed">
            <div className="activity-title"><span className="activity-live-dot"></span> Друзья смотрят</div>
            <div className="activity-scroll">
                {friendsActivity.map((a, i) => (
                    <div key={i} className="activity-card" onClick={() => openDetails({ id: a.item_id }, a.media_type)}>
                        <div className="activity-avatar">
                            {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} alt="" /> : a.profiles?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="activity-info">
                            <div className="activity-user">{a.profiles?.username || 'Друг'}</div>
                            <div className="activity-what">{a.title}{a.last_season ? ` S${a.last_season}:E${a.last_episode}` : ''}</div>
                        </div>
                        {a.poster_path && <img className="activity-poster" src={`${IMG}${a.poster_path}`} alt="" />}
                    </div>
                ))}
            </div>
        </div>
    );
});

export default FriendsActivity;
