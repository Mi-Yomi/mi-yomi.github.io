import { useApp } from '../../context/AppContext.jsx';
import Card from '../common/Card.jsx';
import ContinueSection from '../common/ContinueSection.jsx';
import Section from '../common/Section.jsx';
import HeroCarousel from './HeroCarousel.jsx';
import UpcomingSection from './UpcomingSection.jsx';
import FriendsActivity from './FriendsActivity.jsx';

export default function HomeTab() {
  const {
    HOME_GENRES, homeGenre, setHomeGenre, tg,
    setMoodOpen, setMoodStep, setMoodMood, setMoodType, setMoodDuration, setMoodResults,
    history, getStoredProgress, openDetails,
    randomSpinning, openRandomMovie,
    watchlist, curatedLists, toggleWatchlist,
    forYou, favorites, toggleFavorite,
    filteredPopular, filteredTopRated, dataLoading,
  } = useApp();

  return (
    <div className="tab-content">
        <HeroCarousel />

        <div className="genre-chips">
            {HOME_GENRES.map(g => (
                <button key={g.id} className={`genre-chip ${homeGenre === g.id ? 'active' : ''}`}
                    onClick={() => { setHomeGenre(g.id); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                    {g.label}
                </button>
            ))}
        </div>

        <div className="mood-widget" onClick={() => { setMoodOpen(true); setMoodStep(0); setMoodMood(null); setMoodType(null); setMoodDuration(null); setMoodResults([]); }}>
            <div className="mood-widget-title">🎯 Что посмотреть?</div>
            <div className="mood-widget-sub">Подберём фильм под настроение за 3 клика</div>
        </div>

        {history.length > 0 && <ContinueSection title="Продолжить" icon="▶️" items={history} onSelect={openDetails} getProgress={getStoredProgress} />}

        <button className={`random-btn ${randomSpinning ? 'spinning' : ''}`} onClick={openRandomMovie}>
            <span className="random-icon">🎲</span> Случайный фильм
        </button>

        <FriendsActivity />

        {watchlist.length > 0 && <Section title={<>🔖 Буду смотреть <span className="watchlist-badge">{watchlist.length}</span></>} icon="" items={watchlist.map(w => ({...w, id: w.item_id}))} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} />}

        {curatedLists.filter(cl => cl.is_active).map(cl => (
            <div key={cl.id} className="section">
                <div className="section-head">
                    <h2 className="section-title">🏆 {cl.title} <span className="curated-badge">ПОДБОРКА</span></h2>
                </div>
                <div className="scroll-row">
                    {(cl.items || []).map(item => (
                        <Card key={item.id} item={item} onSelect={openDetails} onFav={toggleFavorite} isFav={favorites.some(f => f.item_id === String(item.id))} type={item.media_type} />
                    ))}
                </div>
            </div>
        ))}

        <UpcomingSection />

        {forYou.length > 0 && <Section title="Подобрано для вас" icon="✨" items={forYou} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} onBookmark={toggleWatchlist} watchlist={watchlist} />}

        <Section title="Популярные" icon="🔥" items={filteredPopular} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
        <Section title="Топ рейтинга" icon="⭐" items={filteredTopRated} onSelect={openDetails} onFav={toggleFavorite} favorites={favorites} loading={dataLoading} onBookmark={toggleWatchlist} watchlist={watchlist} />
    </div>
  );
}
