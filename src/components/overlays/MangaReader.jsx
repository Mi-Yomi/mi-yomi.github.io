import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import MangaComments from '../common/MangaComments.jsx';

export default function MangaReader() {
    const {
        mangaReaderOpen, mangaTitle, mangaCurrentChapter, mangaChapters,
        mangaPages, mangaReaderLoading, mangaReaderError, mangaChapterComments,
        closeReader, goAdjacentChapter, markChapterProgress, addReadingTime,
    } = useApp();

    const scrollRef = useRef(null);
    const lastSaveRef = useRef(0);
    const [chrome, setChrome] = useState(true);
    const [showComments, setShowComments] = useState(false);

    // Reset scroll on chapter change.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setChrome(true);
        setShowComments(false);
        lastSaveRef.current = 0;
    }, [mangaCurrentChapter?.id]);

    // Reading-time accounting: count time per chapter view (capped to avoid idle inflation).
    useEffect(() => {
        if (!mangaReaderOpen || !mangaCurrentChapter) return undefined;
        const start = Date.now();
        return () => addReadingTime(Math.min(1800, (Date.now() - start) / 1000));
    }, [mangaReaderOpen, mangaCurrentChapter?.id, addReadingTime]);

    // Track read progress (%) as the user scrolls.
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || !mangaTitle || !mangaCurrentChapter) return;
        const max = el.scrollHeight - el.clientHeight;
        const pct = max > 4 ? (el.scrollTop / max) * 100 : 100;
        const now = Date.now();
        if (now - lastSaveRef.current > 700 || pct >= 99) {
            lastSaveRef.current = now;
            markChapterProgress(mangaTitle.dir, mangaCurrentChapter.id, pct);
        }
    }, [mangaTitle, mangaCurrentChapter, markChapterProgress]);

    if (!mangaReaderOpen) return null;

    const idx = mangaChapters.findIndex((c) => c.id === mangaCurrentChapter?.id);
    const hasNewer = idx > 0;
    const hasOlder = idx >= 0 && idx < mangaChapters.length - 1;

    return (
        <div className="manga-reader">
            <div className={`manga-reader-bar top ${chrome ? '' : 'hidden'}`}>
                <button className="manga-reader-btn" onClick={closeReader} aria-label="Закрыть">{I.back}</button>
                <div className="manga-reader-title">
                    <div className="manga-reader-name">{mangaTitle?.title}</div>
                    {mangaCurrentChapter && <div className="manga-reader-ch">Том {mangaCurrentChapter.tome} · Глава {mangaCurrentChapter.chapter}</div>}
                </div>
            </div>

            <div className="manga-reader-scroll" ref={scrollRef} onScroll={onScroll} onClick={() => setChrome((v) => !v)}>
                {mangaReaderLoading ? (
                    <div className="manga-reader-state"><div className="loader-spin" /><div>Загрузка страниц…</div></div>
                ) : mangaReaderError === 'paid' ? (
                    <div className="manga-reader-state"><div className="manga-empty-icon">{I.x}</div>Платная глава — недоступна для чтения.</div>
                ) : mangaReaderError === 'empty' ? (
                    <div className="manga-reader-state"><div className="manga-empty-icon">{I.ban}</div>В этой главе нет страниц.</div>
                ) : mangaReaderError ? (
                    <div className="manga-reader-state"><div className="manga-empty-icon">{I.ban}</div>Не удалось загрузить главу.</div>
                ) : (
                    <div className="manga-reader-pages">
                        {mangaPages.map((p, i) => (
                            <img
                                key={i}
                                className="manga-page"
                                src={p.link}
                                alt={`Стр. ${i + 1}`}
                                loading={i < 2 ? 'eager' : 'lazy'}
                                decoding="async"
                                referrerPolicy="origin"
                                style={p.width && p.height ? { aspectRatio: `${p.width}/${p.height}` } : undefined}
                            />
                        ))}

                        <div className="manga-reader-end" onClick={(e) => e.stopPropagation()}>
                            <div className="manga-reader-end-nav">
                                {hasOlder && <button className="manga-reader-nav" onClick={() => goAdjacentChapter('prev')}>{I.back} Пред. глава</button>}
                                <button className="manga-reader-nav primary" onClick={closeReader}>К списку глав</button>
                                {hasNewer && <button className="manga-reader-nav" onClick={() => goAdjacentChapter('next')}>След. глава {I.back}</button>}
                            </div>
                            <button className="manga-reader-comments-toggle" onClick={() => setShowComments((v) => !v)}>
                                {I.msg} Комментарии к главе {mangaChapterComments.length ? `(${mangaChapterComments.length})` : ''}
                            </button>
                            {showComments && <MangaComments comments={mangaChapterComments} emptyText="К этой главе пока нет комментариев" />}
                        </div>
                    </div>
                )}
            </div>

            {!mangaReaderLoading && !mangaReaderError && (
                <div className={`manga-reader-bar bottom ${chrome ? '' : 'hidden'}`}>
                    <button className="manga-reader-btn wide" disabled={!hasOlder} onClick={() => goAdjacentChapter('prev')}>{I.back} Пред.</button>
                    <button className="manga-reader-btn wide" disabled={!hasNewer} onClick={() => goAdjacentChapter('next')}>След. {I.back}</button>
                </div>
            )}
        </div>
    );
}
