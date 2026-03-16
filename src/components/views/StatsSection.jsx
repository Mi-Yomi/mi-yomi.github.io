import { memo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const StatsSection = memo(function StatsSection() {
    const { calcStats } = useApp();

    return (
        <div className="stats-section">
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-card-num" style={{color:'var(--accent)'}}>{calcStats.total}</div><div className="stat-card-label">Всего просмотрено</div></div>
                <div className="stat-card"><div className="stat-card-num" style={{color:'var(--gold)'}}>{calcStats.avgRating}</div><div className="stat-card-label">Средняя оценка</div></div>
                <div className="stat-card"><div className="stat-card-num" style={{color:'var(--blue)'}}>{calcStats.movieCount}</div><div className="stat-card-label">Фильмов</div></div>
                <div className="stat-card"><div className="stat-card-num" style={{color:'var(--purple)'}}>{calcStats.tvCount}</div><div className="stat-card-label">Сериалов</div></div>
                {calcStats.animeCount > 0 && <div className="stat-card"><div className="stat-card-num" style={{color:'var(--pink, #ff69b4)'}}>{calcStats.animeCount}</div><div className="stat-card-label">Аниме</div></div>}
                {calcStats.totalWatchHours > 0 && <div className="stat-card"><div className="stat-card-num" style={{color:'var(--green)'}}>{calcStats.totalWatchHours}ч</div><div className="stat-card-label">Просмотрено часов</div></div>}
            </div>
            {calcStats.total > 0 && (
                <div className="stat-card full" style={{marginBottom:16}}>
                    <div className="stat-card-label" style={{marginBottom:8}}>Соотношение контента</div>
                    <div className="stats-ratio">
                        <div className="stats-ratio-movie" style={{width:`${(calcStats.movieCount/calcStats.total)*100}%`}}></div>
                        <div className="stats-ratio-tv" style={{width:`${(calcStats.tvCount/calcStats.total)*100}%`}}></div>
                        <div className="stats-ratio-anime" style={{width:`${(calcStats.animeCount/calcStats.total)*100}%`}}></div>
                    </div>
                    <div className="stats-legend">
                        <div className="stats-legend-item"><div className="stats-legend-dot" style={{background:'var(--accent)'}}></div>Фильмы</div>
                        <div className="stats-legend-item"><div className="stats-legend-dot" style={{background:'var(--purple)'}}></div>Сериалы</div>
                        <div className="stats-legend-item"><div className="stats-legend-dot" style={{background:'var(--cyan)'}}></div>Аниме</div>
                    </div>
                </div>
            )}
            {calcStats.topGenres.length > 0 && (
                <div className="stats-bar-section">
                    <div className="stats-bar-title">Топ жанров</div>
                    <div className="stats-bar-wrap">
                        {calcStats.topGenres.map((g, i) => (
                            <div key={g.id} className="stats-bar-item">
                                <div className="stats-bar-name">{g.name}</div>
                                <div className="stats-bar-track">
                                    <div className="stats-bar-fill" style={{width:`${(g.count/calcStats.maxGenreCount)*100}%`, background: ['var(--accent)','var(--gold)','var(--blue)','var(--green)','var(--purple)'][i] || 'var(--text-muted)'}}></div>
                                </div>
                                <div className="stats-bar-val">{g.count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="stats-bar-section">
                <div className="stats-bar-title">Активность (30 дней)</div>
                <div className="activity-grid">
                    {calcStats.activityCells.map((cell, i) => {
                        const lvl = cell.count === 0 ? '' : cell.count <= 1 ? 'l1' : cell.count <= 2 ? 'l2' : cell.count <= 3 ? 'l3' : 'l4';
                        return <div key={i} className={`activity-cell ${lvl}`} title={`${cell.date}: ${cell.count}`}></div>;
                    })}
                </div>
            </div>
        </div>
    );
});

export default StatsSection;
