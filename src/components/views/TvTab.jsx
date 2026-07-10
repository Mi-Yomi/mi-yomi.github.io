import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import Section from '../common/Section.jsx';
import HeroCarousel from './HeroCarousel.jsx';

export default function TvTab() {
    const {
        tvPopular, tvTrending, tvHeroIndex, setTvHeroIndex, tg,
        TV_GENRES, tvGenre, setTvGenre,
        filteredTvOnAir, filteredTvPopular, filteredTvTop,
        dataLoading, openDetails, favorites, toggleFavorite,
        toggleWatchlist, watchlist,
    } = useApp();

    const tvHeroItems = useMemo(() =>
        (tvTrending.length ? tvTrending : tvPopular).filter(i => i.backdrop_path).slice(0, 5),
        [tvTrending, tvPopular]
    );

    return (
        <div className="tab-content">
            <div className="tv-header">
                <h1 className="tv-header-title">СЕРИАЛЫ</h1>
                <div className="tv-header-sub">Лучшие сериалы со всего мира</div>
            </div>

            <HeroCarousel
                items={tvHeroItems}
                activeIndex={tvHeroIndex}
                setActiveIndex={setTvHeroIndex}
                badgePrefix="В тренде"
                badgeIcon={I.tv}
                badgeStyle="linear-gradient(135deg, var(--purple), var(--pink))"
                defaultType="tv"
            />

            <div className="tv-genres">
                {TV_GENRES.map(g => (
                    <button key={g.id} className={`tv-genre ${tvGenre === g.id ? 'active' : ''}`}
                        aria-pressed={tvGenre === g.id}
                        onClick={() => { setTvGenre(g.id); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                        {g.label}
                    </button>
                ))}
            </div>

            <Section title={<>Сейчас в эфире <span className="live-badge"><span className="live-dot"></span> LIVE</span></>} icon={I.circle} items={filteredTvOnAir} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} type="tv" loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
            <Section title="Популярные" icon={I.tv} items={filteredTvPopular} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} type="tv" loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
            <Section title="Лучшие всех времён" icon={I.trophy} items={filteredTvTop} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} type="tv" loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
        </div>
    );
}
