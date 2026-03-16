import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { I } from '../../lib/icons.jsx';
import { IMG_SM, IMG } from '../../lib/config.js';
import { isAnime } from '../../lib/api/tmdb.js';
import { GENRE_NAMES } from '../../lib/utils.js';

const Card = memo(function Card({ item, onSelect, onFav, isFav, type = 'movie', onBookmark, isBookmarked, gridMode = false, index = 0 }) {
    const [imgLoaded, setImgLoaded] = useState(false);
    const cardRef = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '100px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const year = (item.release_date || item.first_air_date || '').split('-')[0];
    const rating = item.vote_average?.toFixed(1);
    const ratingNum = item.vote_average;
    const isTV = type === 'tv' || item.media_type === 'tv';
    const animeFlag = isAnime(item);
    const ratingCls = ratingNum >= 7 ? 'rating-green' : ratingNum >= 5 ? 'rating-yellow' : 'rating-red';
    const releaseStr = item.release_date || item.first_air_date || '';
    const isNew = releaseStr && (Date.now() - new Date(releaseStr).getTime()) < 30 * 24 * 60 * 60 * 1000;
    const imgBase = gridMode ? IMG : IMG_SM;
    const firstGenre = item.genre_ids?.[0] ? GENRE_NAMES[item.genre_ids[0]] : null;
    const eagerLoad = index < 6;

    const handleImageLoad = useCallback(() => setImgLoaded(true), []);

    return (
        <div
            ref={cardRef}
            className={`card ${visible ? 'card-visible' : ''}`}
            style={{ '--card-index': index }}
            onClick={() => onSelect(item, isTV ? 'tv' : 'movie')}
        >
            <div className="card-poster-wrap">
                {item.poster_path ? (
                    <img
                        className={`card-poster ${imgLoaded ? 'loaded' : ''}`}
                        src={`${imgBase}${item.poster_path}`}
                        alt={item.title || item.name}
                        loading={eagerLoad ? 'eager' : 'lazy'}
                        onLoad={handleImageLoad}
                        decoding="async"
                    />
                ) : (
                    <div className="card-poster card-poster-ph">{item.title || item.name}</div>
                )}
                {isNew && <div className="card-new-badge">Новинка</div>}
                {onBookmark && (
                    <button className={`card-bookmark ${isBookmarked ? 'active' : ''}`} onClick={e => { e.stopPropagation(); onBookmark(item, isTV ? 'tv' : 'movie'); }}>
                        <svg viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                )}
                {rating && rating > 0 && <div className={`card-rating ${ratingCls}`}>{I.star} {rating}</div>}
                {animeFlag ? <div className="card-type anime">Аниме</div> : isTV ? <div className="card-type tv">Сериал</div> : <div className="card-type movie">Фильм</div>}
                {onFav && (
                    <button className={`card-fav ${isFav ? 'active' : ''}`} onClick={e => { e.stopPropagation(); onFav(item, isTV ? 'tv' : 'movie'); }}>
                        {isFav ? I.heartFilled : I.heart}
                    </button>
                )}
            </div>
            <div className="card-info">
                <div className="card-title">{item.title || item.name}</div>
                <div className="card-meta">
                    <span>{year || '—'}</span>
                    {firstGenre && <span className="card-genre">{firstGenre}</span>}
                </div>
            </div>
        </div>
    );
});

export default Card;
