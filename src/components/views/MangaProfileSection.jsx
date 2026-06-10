import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import { MANGA_STATUSES } from '../../lib/mangaStatuses.js';

function fmtTime(sec) {
    if (!sec) return '0м';
    const min = Math.round(sec / 60);
    if (min < 1) return '<1м';
    const h = Math.floor(min / 60);
    return h > 0 ? `${h}ч ${min % 60}м` : `${min}м`;
}

function MiniCard({ item, onOpen }) {
    return (
        <div className="manga-card" onClick={() => onOpen({ dir: item.dir, title: item.title, cover: item.cover })} role="button">
            <div className="manga-card-poster">
                {item.cover
                    ? <img src={item.cover} alt={item.title} loading="lazy" decoding="async" referrerPolicy="origin" />
                    : <div className="manga-card-ph">{item.title}</div>}
            </div>
            <div className="manga-card-title">{item.title}</div>
        </div>
    );
}

export default function MangaProfileSection() {
    const { mangaChaptersRead, mangaSeconds, mangaLibrary, mangaLibraryByStatus, openManga, pluralize } = useApp();
    const libCount = Object.keys(mangaLibrary || {}).length;

    const tiles = [
        { icon: I.bookOpen, num: mangaChaptersRead, label: pluralize(mangaChaptersRead, 'Глава прочитана', 'Главы прочитаны', 'Глав прочитано'), c: 'var(--accent)' },
        { icon: I.clock, num: fmtTime(mangaSeconds), label: 'Время чтения', c: 'var(--green)' },
        { icon: I.folder, num: libCount, label: pluralize(libCount, 'Тайтл в библиотеке', 'Тайтла в библиотеке', 'Тайтлов в библиотеке'), c: 'var(--blue)' },
    ];

    return (
        <div className="manga-profile">
            <div className="stat-tiles">
                {tiles.map((t, i) => (
                    <div key={i} className="stat-tile" style={{ '--c': t.c }}>
                        <div className="stat-tile-icon">{t.icon}</div>
                        <div className="stat-tile-num">{t.num}</div>
                        <div className="stat-tile-label">{t.label}</div>
                    </div>
                ))}
            </div>

            {libCount === 0 ? (
                <div className="manga-empty"><div className="manga-empty-icon">{I.bookOpen}</div>Библиотека манги пуста. Откройте тайтл и выберите статус.</div>
            ) : (
                MANGA_STATUSES.map((s) => {
                    const items = mangaLibraryByStatus[s.id] || [];
                    if (!items.length) return null;
                    return (
                        <div key={s.id} className="manga-lib-group">
                            <div className="manga-lib-group-title"><span className="manga-status-ic">{s.icon}</span> {s.label} <span className="manga-lib-count">{items.length}</span></div>
                            <div className="manga-grid">
                                {items.map((it) => <MiniCard key={it.dir} item={it} onOpen={openManga} />)}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
