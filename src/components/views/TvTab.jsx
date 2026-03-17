import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import Section from '../common/Section.jsx';
import HeroCarousel from './HeroCarousel.jsx';

export default function TvTab() {
    const {
        tvPopular, tvHeroIndex, setTvHeroIndex, tg,
        TV_GENRES, tvGenre, setTvGenre,
        filteredTvOnAir, filteredTvPopular, filteredTvTop,
        dataLoading, openDetails, favorites, toggleFavorite,
        toggleWatchlist, watchlist,
    } = useApp();

    return (
        <div className="tab-content">
            <div className="tv-header">
                <div className="tv-header-title">СЕРИАЛЫ</div>
                <div className="tv-header-sub">Лучшие сериалы со всего мира</div>
            </div>

            <HeroCarousel
                items={tvPopular}
                activeIndex={tvHeroIndex}
                setActiveIndex={setTvHeroIndex}
                badgePrefix="Популярный"
                badgeIcon={I.tv}
                badgeStyle="linear-gradient(135deg, var(--purple), var(--pink))"
                defaultType="tv"
            />

            <div className="tv-genres">
                {TV_GENRES.map(g => (
                    <button key={g.id} className={`tv-genre ${tvGenre === g.id ? 'active' : ''}`}
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
