import { BACKDROP, I, IMG } from '../../lib/appConstants.jsx';

function ContinueCard({ item, onSelect, progress = 45, storedTime, storedDuration }) {
    const timeStr = (() => {
        if (!storedTime || storedTime < 5) return null;
        const h = Math.floor(storedTime / 3600);
        const m = Math.floor((storedTime % 3600) / 60);
        const s = Math.floor(storedTime % 60);
        if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        return `${m}:${String(s).padStart(2,'0')}`;
    })();
    const realProgress = storedDuration > 0 ? Math.min(95, (storedTime / storedDuration) * 100) : progress;
    return (
        <div className="continue-card" onClick={() => onSelect(item, item.media_type)}>
            <img className="continue-poster" src={item.backdrop_path ? `${BACKDROP}${item.backdrop_path}` : `${IMG}${item.poster_path}`} alt="" loading="lazy" />
            <div className="continue-play">{I.play}</div>
            <div className="continue-overlay">
                <div className="continue-title">{item.title || item.name}</div>
                <div className="continue-meta">
                    {item.last_season ? `S${item.last_season}:E${item.last_episode}` : 'Продолжить'}
                    {timeStr && <span className="continue-time">⏱ {timeStr}</span>}
                </div>
                <div className="continue-progress"><div className="continue-progress-bar" style={{ width: `${realProgress}%` }}></div></div>
            </div>
        </div>
    );
}

export default ContinueCard;
