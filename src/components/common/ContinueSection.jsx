import ContinueCard from './ContinueCard.jsx';
import { useMemo } from 'react';

export default function ContinueSection({ title, icon, items, onSelect, getProgress }) {
    // Filter to only items with active watch progress (started but not finished)
    const activeItems = useMemo(() => {
        if (!items?.length) return [];
        return items.filter(m => {
            const itemId = m.item_id || m.id;
            const stored = getProgress ? getProgress(itemId) : null;
            if (!stored || !stored.duration || stored.duration === 0) return false;
            const percent = (stored.time / stored.duration) * 100;
            return percent >= 1 && percent < 90;
        }).sort((a, b) => {
            const aStored = getProgress ? getProgress(a.item_id || a.id) : null;
            const bStored = getProgress ? getProgress(b.item_id || b.id) : null;
            return (bStored?.ts || 0) - (aStored?.ts || 0);
        }).slice(0, 5);
    }, [items, getProgress]);

    if (!activeItems.length) return null;

    return (
        <div className="section">
            <div className="section-head"><h2 className="section-title">{icon} {title}</h2></div>
            <div className="scroll-row">
                {activeItems.map(m => {
                    const itemId = m.item_id || m.id;
                    const stored = getProgress ? getProgress(itemId) : null;
                    return (
                        <div key={itemId} className="continue-card-wrap">
                            <ContinueCard
                                item={{...m, id: itemId}}
                                onSelect={onSelect}
                                progress={m.progress || 5}
                                storedTime={stored?.time || 0}
                                storedDuration={stored?.duration || 0}
                            />
                            {m.last_season && (
                                <div className="continue-ep-badge">S{m.last_season}:E{m.last_episode}</div>
                            )}
                            {m.last_source && (
                                <div className="continue-src-badge">{m.last_source}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
