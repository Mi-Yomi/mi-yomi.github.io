import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

export default function MangaDetailsOverlay() {
    const {
        mangaTitle, mangaChapters, mangaTitleLoading,
        closeManga, openChapter, mangaProgress, mangaBookmarks, toggleMangaBookmark,
    } = useApp();

    if (!mangaTitle) return null;

    const progress = mangaProgress?.[mangaTitle.dir];
    const isBookmarked = mangaBookmarks?.some((b) => b.dir === mangaTitle.dir);
    const oldest = mangaChapters[mangaChapters.length - 1];
    const resumeChapter = progress
        ? mangaChapters.find((c) => c.id === progress.chapterId) || oldest
        : oldest;

    return (
        <div className="manga-details">
            <div className="manga-details-bar">
                <button className="manga-back" onClick={closeManga} aria-label="Назад">{I.back}</button>
                <div className="manga-details-bar-title">{mangaTitle.title}</div>
            </div>

            <div className="manga-details-hero">
                {mangaTitle.coverHigh || mangaTitle.cover
                    ? <img className="manga-details-cover" src={mangaTitle.coverHigh || mangaTitle.cover} alt="" referrerPolicy="origin" />
                    : <div className="manga-details-cover manga-card-ph">{mangaTitle.title}</div>}
                <div className="manga-details-info">
                    <h1 className="manga-details-title">{mangaTitle.title}</h1>
                    {mangaTitle.altTitle && <div className="manga-details-alt">{mangaTitle.altTitle}</div>}
                    <div className="manga-details-meta">
                        {mangaTitle.rating > 0 && <span className="manga-chip gold">{I.star} {mangaTitle.rating.toFixed(1)}</span>}
                        {mangaTitle.type && <span className="manga-chip">{mangaTitle.type}</span>}
                        {mangaTitle.year && <span className="manga-chip">{mangaTitle.year}</span>}
                        {mangaTitle.status && <span className="manga-chip">{mangaTitle.status}</span>}
                    </div>
                    <div className="manga-details-actions">
                        <button
                            className="manga-read-btn"
                            disabled={!resumeChapter}
                            onClick={() => resumeChapter && openChapter(resumeChapter)}
                        >
                            {I.bookOpen} {progress ? `Продолжить · Гл. ${progress.chapter}` : 'Читать с начала'}
                        </button>
                        <button
                            className={`manga-bookmark-btn ${isBookmarked ? 'active' : ''}`}
                            onClick={() => toggleMangaBookmark(mangaTitle)}
                            aria-label="Закладка"
                        >
                            {I.bookmark}
                        </button>
                    </div>
                </div>
            </div>

            {mangaTitle.genres?.length > 0 && (
                <div className="manga-genres">
                    {mangaTitle.genres.map((g) => <span key={g} className="manga-genre-tag">{g}</span>)}
                </div>
            )}

            {mangaTitle.description && (
                <p className="manga-description">{mangaTitle.description}</p>
            )}

            <div className="manga-chapters">
                <div className="manga-chapters-head">
                    <span>{I.list} Главы</span>
                    <span className="manga-chapters-count">{mangaChapters.length}</span>
                </div>

                {mangaTitleLoading ? (
                    <div className="manga-chapters-loading">Загрузка глав…</div>
                ) : mangaChapters.length === 0 ? (
                    <div className="manga-empty">
                        <div className="manga-empty-icon">{I.ban}</div>
                        Главы недоступны — тайтл лицензирован.
                        <a className="manga-ext-link" href={`https://mangalib.me/ru/manga/${mangaTitle.dir}`} target="_blank" rel="noopener noreferrer">Открыть на MangaLib {I.back}</a>
                    </div>
                ) : (
                    <div className="manga-chapters-list">
                        {mangaChapters.map((c) => {
                            const isRead = progress && progress.chapterId === c.id;
                            return (
                                <div
                                    key={c.id}
                                    className={`manga-chapter-row ${isRead ? 'reading' : ''} ${c.isPaid ? 'paid' : ''}`}
                                    onClick={() => openChapter(c)}
                                    role="button"
                                >
                                    <div className="manga-chapter-main">
                                        <span className="manga-chapter-num">Том {c.tome} · Глава {c.chapter}</span>
                                        {c.name && <span className="manga-chapter-name">{c.name}</span>}
                                    </div>
                                    {c.isPaid && <span className="manga-chapter-lock">{I.x} платно</span>}
                                    {isRead && <span className="manga-chapter-badge">читаю</span>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
