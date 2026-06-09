import { memo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

const StatsSection = memo(function StatsSection() {
    const { calcStats } = useApp();
    const s = calcStats;

    const tiles = [
        { icon: I.eye, num: s.total, label: 'Просмотрено', color: 'var(--accent)' },
        { icon: I.star, num: s.avgRating, label: 'Ср. оценка', color: 'var(--gold)' },
        { icon: I.film, num: s.movieCount, label: 'Фильмов', color: 'var(--blue)' },
        { icon: I.tv, num: s.tvCount, label: 'Сериалов', color: 'var(--purple)' },
        { icon: I.sparkles, num: s.animeCount, label: 'Аниме', color: 'var(--pink)', hide: s.animeCount === 0 },
        { icon: I.clock, num: s.totalWatchHours > 0 ? `${s.totalWatchHours}ч` : '—', label: 'Времени', color: 'var(--green)' },
    ].filter(t => !t.hide);

    const ratioParts = [
        { key: 'movie', label: 'Фильмы', count: s.movieCount, color: 'var(--accent)' },
        { key: 'tv', label: 'Сериалы', count: s.tvCount, color: 'var(--purple)' },
        { key: 'anime', label: 'Аниме', count: s.animeCount, color: 'var(--cyan)' },
    ].filter(p => p.count > 0);

    return (
        <div className="stats-section">
            <div className="stat-tiles">
                {tiles.map((t, i) => (
                    <div key={i} className="stat-tile" style={{ '--c': t.color }}>
                        <div className="stat-tile-icon">{t.icon}</div>
                        <div className="stat-tile-num">{t.num}</div>
                        <div className="stat-tile-label">{t.label}</div>
                    </div>
                ))}
            </div>

            {s.total > 0 && (
                <div className="stat-panel">
                    <div className="stat-panel-title">{I.target} Соотношение контента</div>
                    <div className="stats-ratio">
                        {ratioParts.map(p => (
                            <div key={p.key} className="stats-ratio-seg" style={{ width: `${(p.count / (s.sampleTotal || s.total)) * 100}%`, background: p.color }} />
                        ))}
                    </div>
                    <div className="stats-legend">
                        {ratioParts.map(p => (
                            <div key={p.key} className="stats-legend-item">
                                <span className="stats-legend-dot" style={{ background: p.color }} />
                                {p.label} <b>{Math.round((p.count / (s.sampleTotal || s.total)) * 100)}%</b>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {s.topGenres.length > 0 && (
                <div className="stat-panel">
                    <div className="stat-panel-title">{I.flame} Любимые жанры</div>
                    <div className="stats-bar-wrap">
                        {s.topGenres.map((g, i) => {
                            const colors = ['var(--accent)', 'var(--gold)', 'var(--blue)', 'var(--green)', 'var(--purple)'];
                            return (
                                <div key={g.id} className="stats-bar-item">
                                    <div className="stats-bar-name">{g.name}</div>
                                    <div className="stats-bar-track">
                                        <div className="stats-bar-fill" style={{ width: `${(g.count / s.maxGenreCount) * 100}%`, background: `linear-gradient(90deg, ${colors[i] || 'var(--text-muted)'}, color-mix(in srgb, ${colors[i] || 'var(--text-muted)'} 60%, #fff))` }} />
                                    </div>
                                    <div className="stats-bar-val">{g.count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="stat-panel">
                <div className="stat-panel-title">{I.calendar} Активность · 30 дней</div>
                <div className="activity-grid">
                    {s.activityCells.map((cell, i) => {
                        const lvl = cell.count === 0 ? '' : cell.count <= 1 ? 'l1' : cell.count <= 2 ? 'l2' : cell.count <= 3 ? 'l3' : 'l4';
                        return <div key={i} className={`activity-cell ${lvl}`} title={`${cell.date}: ${cell.count}`}></div>;
                    })}
                </div>
                <div className="activity-scale">
                    Меньше
                    <span className="activity-cell" /><span className="activity-cell l1" /><span className="activity-cell l2" /><span className="activity-cell l3" /><span className="activity-cell l4" />
                    Больше
                </div>
            </div>
        </div>
    );
});

export default StatsSection;
