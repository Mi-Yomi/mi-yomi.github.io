import { useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

function MangaCard({ item, onOpen }) {
    return (
        <div className="manga-card" onClick={() => onOpen(item)} role="button">
            <div className="manga-card-poster">
                {item.cover
                    ? <img src={item.cover} alt={item.title} loading="lazy" decoding="async" referrerPolicy="origin" />
                    : <div className="manga-card-ph">{item.title}</div>}
                {item.rating > 0 && <div className="manga-card-rating">{I.star} {item.rating.toFixed(1)}</div>}
                {item.type && <div className="manga-card-type">{item.type}</div>}
            </div>
            <div className="manga-card-title">{item.title}</div>
            {item.meta && <div className="manga-card-meta">{item.meta}</div>}
            {item.chapters != null && !item.meta && <div className="manga-card-meta">{item.chapters} гл.</div>}
        </div>
    );
}

export default function MangaTab() {
    const {
        mangaFeed, mangaFeedTab, mangaFeedLoading, loadMangaFeed,
        mangaQuery, setMangaQuery, mangaResults, mangaSearching,
        openManga, mangaProgress, mangaBookmarks,
    } = useApp();

    useEffect(() => {
        if (mangaFeed.length === 0) loadMangaFeed('updated');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const TABS = [
        { id: 'updated', label: 'Обновления' },
        { id: 'popular', label: 'Популярное' },
        { id: 'new', label: 'Новинки' },
    ];

    const continueList = Object.values(mangaProgress || {}).sort((a, b) => b.ts - a.ts).slice(0, 12);
    const searching = mangaQuery.trim().length > 0;

    return (
        <div className="tab-content manga-tab">
            <div className="manga-search-bar">
                <span className="manga-search-icon">{I.search}</span>
                <input
                    className="manga-search-input"
                    placeholder="Поиск манги, манхвы, маньхуа..."
                    value={mangaQuery}
                    onChange={(e) => setMangaQuery(e.target.value)}
                />
                {mangaQuery && <button className="manga-search-clear" onClick={() => setMangaQuery('')} aria-label="Очистить">{I.x}</button>}
            </div>

            {searching ? (
                <div className="manga-section">
                    <div className="manga-section-title">{mangaSearching ? 'Поиск…' : `Найдено: ${mangaResults.length}`}</div>
                    <div className="manga-grid">
                        {mangaResults.map((m, i) => <MangaCard key={`${m.dir}-${i}`} item={m} onOpen={openManga} />)}
                    </div>
                    {!mangaSearching && mangaResults.length === 0 && (
                        <div className="manga-empty"><div className="manga-empty-icon">{I.search}</div>Ничего не найдено</div>
                    )}
                </div>
            ) : (
                <>
                    {continueList.length > 0 && (
                        <div className="manga-section">
                            <div className="manga-section-title">{I.bookOpen} Продолжить чтение</div>
                            <div className="manga-grid">
                                {continueList.map((p, i) => (
                                    <MangaCard key={`${p.dir}-${i}`} item={{ dir: p.dir, title: p.title, cover: p.cover, meta: `Гл. ${p.chapter}` }} onOpen={openManga} />
                                ))}
                            </div>
                        </div>
                    )}

                    {mangaBookmarks.length > 0 && (
                        <div className="manga-section">
                            <div className="manga-section-title">{I.bookmark} Закладки</div>
                            <div className="manga-grid">
                                {mangaBookmarks.map((m, i) => <MangaCard key={`${m.dir}-${i}`} item={m} onOpen={openManga} />)}
                            </div>
                        </div>
                    )}

                    <div className="manga-feed-tabs">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                className={`manga-feed-tab ${mangaFeedTab === t.id ? 'active' : ''}`}
                                onClick={() => loadMangaFeed(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="manga-grid">
                        {mangaFeedLoading
                            ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="manga-card-skeleton" />)
                            : mangaFeed.map((m, i) => <MangaCard key={`${m.dir}-${i}`} item={m} onOpen={openManga} />)}
                    </div>
                </>
            )}
        </div>
    );
}
