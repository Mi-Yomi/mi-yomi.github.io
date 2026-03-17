import { memo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

const UpcomingSection = memo(function UpcomingSection() {
    const { upcoming, IMG, watchlist, toggleWatchlist, openDetails } = useApp();

    if (upcoming.length === 0) return null;

    return (
        <div className="section">
            <div className="section-head"><h2 className="section-title">{I.calendar} Скоро в кино</h2></div>
            <div className="scroll-row">
                {upcoming.map(m => {
                    const daysUntil = Math.ceil((new Date(m.release_date) - new Date()) / (1000 * 60 * 60 * 24));
                    const inWatchlist = watchlist.some(w => w.item_id === String(m.id));
                    return (
                        <div key={m.id} className="upcoming-card" onClick={() => openDetails(m, 'movie')}>
                            {m.poster_path && <img className="upcoming-poster" src={`${IMG}${m.poster_path}`} alt="" loading="lazy" />}
                            <div className="upcoming-countdown">{daysUntil <= 0 ? 'Уже вышел' : `${daysUntil} дн.`}</div>
                            <button className={`upcoming-remind ${inWatchlist ? 'active' : ''}`} onClick={e => { e.stopPropagation(); toggleWatchlist(m, 'movie'); }}>
                                {inWatchlist ? I.check : I.bell}
                            </button>
                            <div className="upcoming-info">
                                <div className="upcoming-title">{m.title}</div>
                                <div className="upcoming-date">{new Date(m.release_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default UpcomingSection;
