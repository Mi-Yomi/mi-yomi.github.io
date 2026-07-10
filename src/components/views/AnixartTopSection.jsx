import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import { anixartTop } from '../../lib/api/anixart.js';
import { api } from '../../lib/api/tmdb.js';
import ScrollRow from '../common/ScrollRow.jsx';
import { activateOnKeyboard } from '../../lib/a11y.js';

/**
 * "Топ аниме · Anixart" row for the anime home. Anixart ranks anime far better than
 * TMDB. Cards use Anixart posters/ratings; clicking bridges to TMDB by the original
 * (romaji) title so the normal details/player flow opens.
 */
export default function AnixartTopSection() {
    const { openDetails, showToast } = useApp();
    const [items, setItems] = useState([]);
    const [opening, setOpening] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const list = await anixartTop(0, 3); // sort 3 = by rating
            if (!cancelled) setItems((list || []).filter(r => r.image && r.grade > 0).slice(0, 20));
        })();
        return () => { cancelled = true; };
    }, []);

    const openAnime = async (rel) => {
        if (opening) return;
        setOpening(true);
        try {
            const queries = [rel.title_original, rel.title_ru].filter(Boolean);
            let hit = null;
            for (const q of queries) {
                const res = await api(`/search/multi?query=${encodeURIComponent(q)}`);
                const results = (res?.results || []).filter(r => r.media_type === 'tv' || r.media_type === 'movie');
                hit = results.find(r => r.original_language === 'ja' || r.origin_country?.includes('JP')) || results[0];
                if (hit) break;
            }
            if (hit) openDetails(hit, hit.media_type);
            else showToast?.('Не нашлось в базе TMDB');
        } finally {
            setOpening(false);
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="section">
            <div className="section-head">
                <h2 className="section-title">{I.trophy} Топ аниме <span className="curated-badge">ANIXART</span></h2>
            </div>
            <ScrollRow className={opening ? 'is-opening' : ''}>
                {items.map(rel => (
                    <div key={rel.id} className="card card-visible" onClick={() => openAnime(rel)}
                        onKeyDown={(event) => activateOnKeyboard(event, () => openAnime(rel))}
                        role="button" tabIndex={0} aria-label={`Открыть ${rel.title_ru}`}>
                        <div className="card-poster-wrap">
                            <img className="card-poster loaded" src={rel.image} alt={rel.title_ru} loading="lazy" decoding="async" />
                            {rel.grade > 0 && <div className="card-rating rating-green">{I.star} {rel.grade.toFixed(1)}</div>}
                            <div className="card-type anime">{rel.category?.name || 'Аниме'}</div>
                        </div>
                        <div className="card-info">
                            <div className="card-title">{rel.title_ru}</div>
                            <div className="card-meta"><span>{rel.year || '—'}</span></div>
                        </div>
                    </div>
                ))}
            </ScrollRow>
        </div>
    );
}
