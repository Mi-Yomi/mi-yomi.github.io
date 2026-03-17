import { useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import Section from '../common/Section.jsx';
import HeroCarousel from './HeroCarousel.jsx';

export default function AnimeTab() {
    const {
        animeSeries, animeMovies, animeHeroIndex, setAnimeHeroIndex, tg,
        ANIME_GENRES, animeGenre, setAnimeGenre,
        filteredAnimeSeries, filteredAnimeMovies,
        dataLoading, openDetails, favorites, toggleFavorite,
        toggleWatchlist, watchlist,
    } = useApp();

    const animeHeroItems = useMemo(() =>
        [...animeSeries, ...animeMovies].filter(a => a.backdrop_path).slice(0, 5),
        [animeSeries, animeMovies]
    );

    return (
        <div className="tab-content">
            <div className="anime-header">
                <div className="anime-header-title">АНИМЕ</div>
                <div className="anime-header-sub">Лучшее аниме из Японии</div>
            </div>

            <HeroCarousel
                items={animeHeroItems}
                activeIndex={animeHeroIndex}
                setActiveIndex={setAnimeHeroIndex}
                badgePrefix="Аниме"
                badgeIcon={I.flag}
                badgeStyle="linear-gradient(135deg, #ff6b9d, #c44dff)"
                btnStyle="linear-gradient(135deg, #ff6b9d, #c44dff)"
            />

            <div className="anime-genres">
                {ANIME_GENRES.map(g => (
                    <button key={g.id} className={`anime-genre ${animeGenre === g.id ? 'active' : ''}`}
                        onClick={() => { setAnimeGenre(g.id); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                        {g.label}
                    </button>
                ))}
            </div>

            <Section title="Аниме-сериалы" icon={I.tv} items={filteredAnimeSeries} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} type="tv" loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
            <Section title="Аниме-фильмы" icon={I.film} items={filteredAnimeMovies} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} type="movie" loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
        </div>
    );
}
