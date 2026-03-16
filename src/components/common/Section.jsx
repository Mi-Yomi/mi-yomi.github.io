import Card from './Card.jsx';
import SkeletonCards from './SkeletonCards.jsx';

export default function Section({ title, icon, items, onSelect, onFav, favorites, type = 'movie', loading: isLoading, onBookmark, watchlist: wl }) {
    if (!isLoading && !items?.length) return null;
    return (
        <div className="section">
            <div className="section-head"><h2 className="section-title">{icon} {title}</h2></div>
            <div className="scroll-row">
                {isLoading || !items?.length
                    ? <SkeletonCards count={5} />
                    : items.map(m => <Card key={m.id} item={m} onSelect={onSelect} onFav={onFav} isFav={favorites?.some(f => f.item_id === String(m.id))} type={type} onBookmark={onBookmark} isBookmarked={wl?.some(w => w.item_id === String(m.id))} />)
                }
            </div>
        </div>
    );
}
