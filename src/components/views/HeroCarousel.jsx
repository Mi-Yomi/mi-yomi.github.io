import { memo, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { BACKDROP } from '../../lib/config.js';
import { I } from '../../lib/icons.jsx';
import { ratingColor } from '../../lib/utils.js';

const HeroCarousel = memo(function HeroCarousel({
    items: externalItems,
    activeIndex: externalIndex,
    setActiveIndex: externalSetIndex,
    badgePrefix = 'В тренде',
    badgeIcon = I.flame,
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
        <section className="hero-carousel" aria-label="Рекомендации" aria-roledescription="карусель" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {items.slice(0, 5).map((item, idx) => {
                const type = item.media_type || defaultType || (item.first_air_date ? 'tv' : 'movie');
                const isActive = activeIdx === idx;
                const isAdjacent = idx === (activeIdx + 1) % maxSlides || idx === (activeIdx - 1 + maxSlides) % maxSlides;
                return (
                    <div key={item.id} className={`hero-slide ${isActive ? 'active' : ''}`}
                        role="group" aria-roledescription="слайд" aria-label={`${idx + 1} из ${maxSlides}: ${item.title || item.name}`}
                        aria-hidden={!isActive} inert={isActive ? undefined : ''}
                        onClick={() => openDetails(item, type)}>
                        <div className="hero-bg" style={{ backgroundImage: isActive || isAdjacent ? `url(${BACKDROP}${item.backdrop_path})` : undefined }}></div>
                        <div className="hero-grad"></div>
                        <div className="hero-content">
                            <div className="hero-badge" style={badgeStyle ? { background: badgeStyle } : undefined}>
                                {badgeIcon} #{idx + 1} {badgePrefix}
                            </div>
                            <h2 className="hero-title">{item.title || item.name}</h2>
                            <div className="hero-meta">
                                <span className={`rating ${ratingColor(item.vote_average)}`}>{I.star} {item.vote_average?.toFixed(1)}</span>
                                <span>{(item.release_date || item.first_air_date || '').split('-')[0]}</span>
                                <span>{type === 'tv' ? <>{I.tv} Сериал</> : <>{I.film} Фильм</>}</span>
                            </div>
                            {item.overview && <div className="hero-overview">{item.overview}</div>}
                            <div className="hero-btns">
                                <button className="hero-btn" style={btnStyle ? { background: btnStyle, color: 'white' } : undefined}>{I.play} Смотреть</button>
                                {(() => { const fav = favorites.some(f => f.item_id === String(item.id)); return (
                                    <button className="hero-btn secondary" onClick={e => { e.stopPropagation(); toggleFavorite(item, type); }}
                                        aria-label={fav ? 'Убрать из избранного' : 'В избранное'} aria-pressed={fav}>
                                        {fav ? I.heartFilled : I.heart}
                                    </button>
                                ); })()}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div className="hero-dots">
                {items.slice(0, 5).map((_, idx) => (
                    <button key={idx} className={`hero-dot ${activeIdx === idx ? 'active' : ''}`}
                        aria-label={`Показать слайд ${idx + 1}: ${items[idx]?.title || items[idx]?.name || ''}`} aria-current={activeIdx === idx ? 'true' : undefined}
                        onClick={(e) => { e.stopPropagation(); setIdx(idx); tg?.HapticFeedback?.impactOccurred?.('light'); }} />
                ))}
            </div>
        </section>
    );
});

export default HeroCarousel;
