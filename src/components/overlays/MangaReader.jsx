import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';

export default function MangaReader() {
    const {
        mangaReaderOpen, mangaTitle, mangaCurrentChapter, mangaChapters,
        mangaPages, mangaReaderLoading, mangaReaderError,
        closeReader, goAdjacentChapter,
    } = useApp();

    const scrollRef = useRef(null);
    const [chrome, setChrome] = useState(true);

    // Reset scroll to top on every chapter change.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setChrome(true);
    }, [mangaCurrentChapter?.id]);

    // Esc / browser-back friendliness is handled globally; nothing here.
    if (!mangaReaderOpen) return null;

    const idx = mangaChapters.findIndex((c) => c.id === mangaCurrentChapter?.id);
    const hasNewer = idx > 0;                       // -index order: smaller index = newer
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

            <div className="manga-reader-scroll" ref={scrollRef} onClick={() => setChrome((v) => !v)}>
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
                        <div className="manga-reader-end">
                            {hasOlder && <button className="manga-reader-nav" onClick={(e) => { e.stopPropagation(); goAdjacentChapter('prev'); }}>{I.back} Пред. глава</button>}
                            <button className="manga-reader-nav primary" onClick={(e) => { e.stopPropagation(); closeReader(); }}>К списку глав</button>
                            {hasNewer && <button className="manga-reader-nav" onClick={(e) => { e.stopPropagation(); goAdjacentChapter('next'); }}>След. глава {I.back}</button>}
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
