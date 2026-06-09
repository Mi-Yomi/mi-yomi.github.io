import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import { MANGA_STATUSES } from '../../lib/mangaStatuses.js';
import MangaComments from '../common/MangaComments.jsx';

export default function MangaDetailsOverlay() {
    const {
        mangaTitle, mangaChapters, mangaTitleLoading,
        closeManga, openChapter, mangaProgress, mangaRead,
        getMangaStatus, setMangaStatus,
        mangaTitleComments, mangaCommentsLoading,
        isHidden, toggleHidden, showToast,
    } = useApp();
    const [tab, setTab] = useState('chapters');

    if (!mangaTitle) return null;

    const dir = mangaTitle.dir;
    const progress = mangaProgress?.[dir];
    const readMap = mangaRead?.[dir] || {};
    const status = getMangaStatus(dir);
    const oldest = mangaChapters[mangaChapters.length - 1];
    const resumeChapter = progress
        ? mangaChapters.find((c) => c.id === progress.chapterId) || oldest
        : oldest;
    const readCount = Object.values(readMap).filter((p) => p >= 90).length;

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
                        {readCount > 0 && <span className="manga-chip">{I.bookOpen} {readCount} прочитано</span>}
                    </div>
                    <button
                        className="manga-read-btn"
                        disabled={!resumeChapter}
                        onClick={() => resumeChapter && openChapter(resumeChapter)}
                    >
                        {I.bookOpen} {progress ? `Продолжить · Гл. ${progress.chapter}` : 'Читать с начала'}
                    </button>
                </div>
            </div>

            {/* Reading-list status picker */}
            <div className="manga-status-picker">
                {MANGA_STATUSES.map((s) => (
                    <button
                        key={s.id}
                        className={`manga-status-btn ${status === s.id ? 'active' : ''}`}
                        onClick={() => setMangaStatus(mangaTitle, s.id)}
                    >
                        <span className="manga-status-ic">{s.icon}</span>
                        {s.label}
                    </button>
                ))}
                {(() => {
                    const hidden = isHidden(`m:${dir}`);
                    return (
                        <button
                            className={`manga-status-btn manga-hide-btn ${hidden ? 'active' : ''}`}
                            onClick={async () => { const h = await toggleHidden(`m:${dir}`); showToast?.(h ? 'Скрыто от друзей' : 'Снова видно друзьям'); }}
                        >
                            <span className="manga-status-ic">{hidden ? I.eye : I.ban}</span>
                            {hidden ? 'Показать друзьям' : 'Скрыть от друзей'}
                        </button>
                    );
                })()}
            </div>

            {mangaTitle.genres?.length > 0 && (
                <div className="manga-genres">
                    {mangaTitle.genres.map((g) => <span key={g} className="manga-genre-tag">{g}</span>)}
                </div>
            )}

            {mangaTitle.description && <p className="manga-description">{mangaTitle.description}</p>}

            <div className="manga-detail-tabs">
                <button className={`manga-detail-tab ${tab === 'chapters' ? 'active' : ''}`} onClick={() => setTab('chapters')}>
                    {I.list} Главы <span className="manga-detail-tab-count">{mangaChapters.length}</span>
                </button>
                <button className={`manga-detail-tab ${tab === 'comments' ? 'active' : ''}`} onClick={() => setTab('comments')}>
                    {I.msg} Комментарии
                </button>
            </div>

            {tab === 'chapters' ? (
                <div className="manga-chapters">
                    {mangaTitleLoading ? (
                        <div className="manga-chapters-loading">Загрузка глав…</div>
                    ) : mangaChapters.length === 0 ? (
                        <div className="manga-empty">
                            <div className="manga-empty-icon">{I.ban}</div>
                            Главы недоступны — тайтл лицензирован.
                            <a className="manga-ext-link" href={`https://mangalib.me/ru/manga/${dir}`} target="_blank" rel="noopener noreferrer">Открыть на MangaLib {I.back}</a>
                        </div>
                    ) : (
                        <div className="manga-chapters-list">
                            {mangaChapters.map((c) => {
                                const pct = readMap[c.id] || 0;
                                const isReading = progress && progress.chapterId === c.id;
                                return (
                                    <div
                                        key={c.id}
                                        className={`manga-chapter-row ${pct >= 90 ? 'done' : ''} ${isReading ? 'reading' : ''}`}
                                        onClick={() => openChapter(c)}
                                        role="button"
                                    >
                                        <div className="manga-chapter-main">
                                            <span className="manga-chapter-num">Том {c.tome} · Глава {c.chapter}</span>
                                            {c.name && <span className="manga-chapter-name">{c.name}</span>}
                                        </div>
                                        {pct >= 90
                                            ? <span className="manga-chapter-badge done">{I.check} Прочитано</span>
                                            : pct > 0
                                                ? <span className="manga-chapter-badge">{pct}%</span>
                                                : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="manga-chapters">
                    <MangaComments comments={mangaTitleComments} loading={mangaCommentsLoading} emptyText="К этому тайтлу пока нет комментариев" />
                </div>
            )}
        </div>
    );
}
