import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import MangaComments from '../common/MangaComments.jsx';

export default function MangaReader() {
    const {
        mangaReaderOpen, mangaTitle, mangaCurrentChapter, mangaChapters,
        mangaSections, mangaReaderLoading, mangaReaderError, mangaNextError, mangaReaderSession,
        closeReader, goAdjacentChapter, loadNextChapter, noteChapterInView,
        markChapterProgress, addReadingTime,
    } = useApp();

    const scrollRef = useRef(null);
    const sentinelRef = useRef(null);
    const sectionElsRef = useRef(new Map()); // chapter.id -> <section> element
    const lastSaveRef = useRef(0);
    const [chrome, setChrome] = useState(true);
    const [openComments, setOpenComments] = useState(() => new Set());

    // Reset only on an explicit open (chapter list / nav buttons) — not when the
    // in-view chapter changes because the user scrolled across a chapter boundary.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setChrome(true);
        setOpenComments(new Set());
        lastSaveRef.current = 0;
    }, [mangaReaderSession]);

    // The hook keeps only the last READER_WINDOW sections; when sections are
    // dropped from the head, subtract their height from scrollTop (before paint)
    // so the viewport doesn't jump. Native scroll anchoring is disabled in CSS
    // (.manga-reader-scroll { overflow-anchor: none }) to avoid double-compensation.
    const heightsRef = useRef(new Map());                      // chapter.id -> px height at last commit
    const prevSectionsRef = useRef({ session: -1, ids: [] });
    useLayoutEffect(() => {
        const prev = prevSectionsRef.current;
        const ids = mangaSections.map((s) => s.chapter.id);
        if (prev.session === mangaReaderSession && prev.ids.length) {
            let dy = 0;
            for (const id of prev.ids) {
                if (ids.includes(id)) break; // only count the contiguous removed head
                dy += heightsRef.current.get(id) || 0;
                heightsRef.current.delete(id);
            }
            if (dy && scrollRef.current) scrollRef.current.scrollTop -= dy;
        } else {
            heightsRef.current.clear();
        }
        prevSectionsRef.current = { session: mangaReaderSession, ids };
        for (const [id, node] of sectionElsRef.current) heightsRef.current.set(id, node.offsetHeight);
    }, [mangaSections, mangaReaderSession]);

    // Reading-time accounting: count time per chapter view (capped to avoid idle inflation).
    useEffect(() => {
        if (!mangaReaderOpen || !mangaCurrentChapter) return undefined;
        const start = Date.now();
        return () => addReadingTime(Math.min(1800, (Date.now() - start) / 1000));
    }, [mangaReaderOpen, mangaCurrentChapter?.id, addReadingTime]);

    // Track per-chapter read progress (%) and which chapter is in view while scrolling.
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el || !mangaTitle || !mangaSections.length) return;
        const view = el.getBoundingClientRect();
        const mid = (view.top + view.bottom) / 2;
        const now = Date.now();
        const save = now - lastSaveRef.current > 500;
        if (save) lastSaveRef.current = now;
        let current = null;
        for (const sec of mangaSections) {
            const node = sectionElsRef.current.get(sec.chapter.id);
            if (!node) continue;
            const r = node.getBoundingClientRect();
            heightsRef.current.set(sec.chapter.id, r.height); // keep trim compensation fresh
            if (r.top <= mid && r.bottom > mid) current = sec.chapter;
            if (r.bottom < view.top || r.top > view.bottom || !sec.pages.length) continue;
            const pct = Math.max(0, Math.min(100, ((view.bottom - r.top) / Math.max(1, r.height)) * 100));
            if (save || pct >= 99) markChapterProgress(mangaTitle.dir, sec.chapter.id, pct);
        }
        if (current && current.id !== mangaCurrentChapter?.id) noteChapterInView(current);
    }, [mangaTitle, mangaSections, mangaCurrentChapter, markChapterProgress, noteChapterInView]);

    // Next chapter in reading order after the last loaded section (chapters are newest-first).
    const lastSection = mangaSections[mangaSections.length - 1];
    const lastIdx = lastSection ? mangaChapters.findIndex((c) => c.id === lastSection.chapter.id) : -1;
    const nextChapter = lastIdx > 0 ? mangaChapters[lastIdx - 1] : null;
    const hasNext = !!nextChapter;

    // Seamless scroll: append the next chapter when the bottom sentinel gets close.
    // Re-runs on mangaSections.length so short chapters keep chaining without a scroll event.
    useEffect(() => {
        if (!mangaReaderOpen || mangaReaderLoading || mangaReaderError || !hasNext || mangaNextError) return undefined;
        const rootEl = scrollRef.current;
        const target = sentinelRef.current;
        if (!rootEl || !target) return undefined;
        const io = new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) loadNextChapter(); },
            { root: rootEl, rootMargin: '1600px 0px' },
        );
        io.observe(target);
        return () => io.disconnect();
    }, [mangaReaderOpen, mangaReaderLoading, mangaReaderError, hasNext, mangaNextError, mangaSections.length, loadNextChapter]);

    if (!mangaReaderOpen) return null;

    const idx = mangaChapters.findIndex((c) => c.id === mangaCurrentChapter?.id);
    const hasNewer = idx > 0;
    const hasOlder = idx >= 0 && idx < mangaChapters.length - 1;

    const toggleComments = (id) => setOpenComments((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

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
                        {mangaSections.map((sec, si) => (
                            <section
                                key={sec.chapter.id}
                                className="manga-section"
                                ref={(node) => {
                                    if (node) sectionElsRef.current.set(sec.chapter.id, node);
                                    else sectionElsRef.current.delete(sec.chapter.id);
                                }}
                            >
                                <div className="manga-chapter-divider">
                                    <span className="manga-chapter-divider-line" />
                                    <span className="manga-chapter-divider-text">Том {sec.chapter.tome} · Глава {sec.chapter.chapter}{sec.chapter.name ? ` — ${sec.chapter.name}` : ''}</span>
                                    <span className="manga-chapter-divider-line" />
                                </div>

                                {sec.error ? (
                                    <div className="manga-section-note">
                                        {sec.error === 'paid' ? I.x : I.ban}
                                        <div>{sec.error === 'paid' ? 'Платная глава — недоступна для чтения' : 'В этой главе нет страниц'}</div>
                                    </div>
                                ) : (
                                    <>
                                        {sec.pages.map((p, i) => (
                                            <img
                                                key={i}
                                                className="manga-page"
                                                src={p.link}
                                                alt={`Глава ${sec.chapter.chapter} · стр. ${i + 1}`}
                                                loading={si === 0 && i < 2 ? 'eager' : 'lazy'}
                                                decoding="async"
                                                referrerPolicy="origin"
                                                style={p.width && p.height ? { aspectRatio: `${p.width}/${p.height}` } : undefined}
                                            />
                                        ))}
                                        <div className="manga-chapter-end" onClick={(e) => e.stopPropagation()}>
                                            <div className="manga-chapter-divider">
                                                <span className="manga-chapter-divider-line" />
                                                <span className="manga-chapter-divider-text">Конец главы {sec.chapter.chapter}</span>
                                                <span className="manga-chapter-divider-line" />
                                            </div>
                                            <button className="manga-reader-comments-toggle" onClick={() => toggleComments(sec.chapter.id)}>
                                                {I.msg} Комментарии к главе {sec.comments.length ? `(${sec.comments.length})` : ''}
                                            </button>
                                            {openComments.has(sec.chapter.id) && <MangaComments comments={sec.comments} emptyText="К этой главе пока нет комментариев" />}
                                        </div>
                                    </>
                                )}
                            </section>
                        ))}

                        <div ref={sentinelRef} />

                        {hasNext ? (
                            <div className="manga-reader-next" onClick={(e) => e.stopPropagation()}>
                                {mangaNextError ? (
                                    <>
                                        <div>Не удалось загрузить главу {nextChapter.chapter}</div>
                                        <button className="manga-reader-nav primary" onClick={loadNextChapter}>Повторить</button>
                                    </>
                                ) : (
                                    <>
                                        <div className="loader-spin" />
                                        <div>Глава {nextChapter.chapter} загружается…</div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="manga-reader-next" onClick={(e) => e.stopPropagation()}>
                                <div>Это была последняя глава</div>
                                <button className="manga-reader-nav primary" onClick={closeReader}>К списку глав</button>
                            </div>
                        )}
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
