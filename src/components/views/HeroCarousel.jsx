import { memo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { BACKDROP } from '../../lib/config.js';
import { I } from '../../lib/icons.jsx';
import { ratingColor } from '../../lib/utils.js';

/**
 * Reusable hero carousel.
 * @param {Object[]} [items] - Override items (default: trending from context)
 * @param {number} [activeIndex] - Override active index (default: heroIndex from context)
 * @param {Function} [setActiveIndex] - Override setter (default: setHeroIndex from context)
 * @param {string} [badgePrefix] - Badge text prefix (default: "В тренде")
 * @param {string} [badgeStyle] - Badge gradient CSS
 * @param {string} [btnStyle] - Primary button gradient CSS
 * @param {string} [defaultType] - Default media type for items without media_type
 */
const HeroCarousel = memo(function HeroCarousel({
    items: externalItems,
    activeIndex: externalIndex,
    setActiveIndex: externalSetIndex,
    badgePrefix = 'В тренде',
    badgeIcon = '🔥',
    badgeStyle,
    btnStyle,
    defaultType,
}) {
    const { trending, heroIndex, openDetails, favorites, toggleFavorite, setHeroIndex } = useApp();
    const tg = window.Telegram?.WebApp;
    const touchRef = useRef({ startX: 0, startY: 0 });

    const items = externalItems || trending;
    const activeIdx = externalIndex ?? heroIndex;
    const setIdx = externalSetIndex || setHeroIndex;
    const maxSlides = Math.min(items.length, 5);

    const handleTouchStart = useCallback((e) => {
        touchRef.current.startX = e.touches[0].clientX;
        touchRef.current.startY = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e) => {
        const dx = e.changedTouches[0].clientX - touchRef.current.startX;
        const dy = e.changedTouches[0].clientY - touchRef.current.startY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) setIdx(prev => (prev + 1) % maxSlides);
            else setIdx(prev => (prev - 1 + maxSlides) % maxSlides);
            tg?.HapticFeedback?.impactOccurred?.('light');
        }
    }, [maxSlides, setIdx, tg]);

    if (items.length === 0) return <div className="skeleton-hero"></div>;

    return (
        <div className="hero-carousel" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {items.slice(0, 5).map((item, idx) => {
                const type = item.media_type || defaultType || (item.first_air_date ? 'tv' : 'movie');
                return (
                    <div key={item.id} className={`hero-slide ${activeIdx === idx ? 'active' : ''}`}
                        onClick={() => openDetails(item, type)}>
                        <div className="hero-bg" style={{ backgroundImage: `url(${BACKDROP}${item.backdrop_path})` }}></div>
                        <div className="hero-grad"></div>
                        <div className="hero-content">
                            <div className="hero-badge" style={badgeStyle ? { background: badgeStyle } : undefined}>
                                {badgeIcon} #{idx + 1} {badgePrefix}
                            </div>
                            <h1 className="hero-title">{item.title || item.name}</h1>
                            <div className="hero-meta">
                                <span className={`rating ${ratingColor(item.vote_average)}`}>{I.star} {item.vote_average?.toFixed(1)}</span>
                                <span>{(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                                <span>{type === 'tv' ? '📺 Сериал' : '🎬 Фильм'}</span>
                            </div>
                            {item.overview && <div className="hero-overview">{item.overview}</div>}
                            <div className="hero-btns">
                                <button className="hero-btn" style={btnStyle ? { background: btnStyle, color: 'white' } : undefined}>{I.play} Смотреть</button>
                                <button className="hero-btn secondary" onClick={e => { e.stopPropagation(); toggleFavorite(item, type); }}>
                                    {favorites.some(f => f.item_id === String(item.id)) ? I.heartFilled : I.heart}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div className="hero-dots">
                {items.slice(0, 5).map((_, idx) => (
                    <button key={idx} className={`hero-dot ${activeIdx === idx ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setIdx(idx); tg?.HapticFeedback?.impactOccurred?.('light'); }} />
                ))}
            </div>
        </div>
    );
});

export default HeroCarousel;
