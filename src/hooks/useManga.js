import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCatalog, searchManga, getTitle, getChapters, getChapterPages, getTitleComments, getChapterComments } from '../lib/api/mangalib.js';
import { MANGA_ENABLED } from '../lib/config.js';
import { MANGA_STATUSES } from '../lib/mangaStatuses.js';
import { supabase } from '../lib/api/supabase.js';

const FEED_ORDER = { updated: 'last_chapter_at', popular: 'views', new: 'created_at' };
const PROGRESS_KEY = 'hades_manga_progress';   // last chapter opened per title (continue reading)
const READ_KEY = 'hades_manga_read';           // { [dir]: { [chapterId]: percent 0-100 } }
const LIBRARY_KEY = 'hades_manga_library';      // { [dir]: { status, title, cover, ... } }
const SECONDS_KEY = 'hades_manga_seconds';      // total reading seconds
const READ_DONE = 90;                           // percent at which a chapter counts as read

const readJSON = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key) || ''); return v ?? fallback; } catch { return fallback; }
};
const writeJSON = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ } };

/**
 * Manga state (MangaLib). Catalog/search/title/chapters/pages/comments come from the
 * API client; per-chapter read progress (%), total reading time, the status library
 * (Читаю/Хочу/Прочитано/Любимое/Брошено) and last-read position live in localStorage.
 */
export default function useManga(showToast, user) {
    const tg = window.Telegram?.WebApp;
    const syncedRef = useRef('');

    // Browse feed
    const [mangaFeed, setMangaFeed] = useState([]);
    const [mangaFeedTab, setMangaFeedTab] = useState('updated');
    const [mangaFeedLoading, setMangaFeedLoading] = useState(false);
    const feedCache = useRef({});

    // Search
    const [mangaQuery, setMangaQuery] = useState('');
    const [mangaResults, setMangaResults] = useState([]);
    const [mangaSearching, setMangaSearching] = useState(false);
    const searchSeq = useRef(0);

    // Opened title + chapters + comments
    const [mangaTitle, setMangaTitle] = useState(null);
    const [mangaChapters, setMangaChapters] = useState([]);
    const [mangaTitleLoading, setMangaTitleLoading] = useState(false);
    const [mangaTitleComments, setMangaTitleComments] = useState([]);
    const [mangaCommentsLoading, setMangaCommentsLoading] = useState(false);

    // Reader
    const [mangaReaderOpen, setMangaReaderOpen] = useState(false);
    const [mangaCurrentChapter, setMangaCurrentChapter] = useState(null);
    const [mangaPages, setMangaPages] = useState([]);
    const [mangaReaderLoading, setMangaReaderLoading] = useState(false);
    const [mangaReaderError, setMangaReaderError] = useState(null);
    const [mangaChapterComments, setMangaChapterComments] = useState([]);

    // Persisted progress / library / stats
    const [mangaProgress, setMangaProgress] = useState(() => readJSON(PROGRESS_KEY, {}));
    const [mangaRead, setMangaRead] = useState(() => readJSON(READ_KEY, {}));
    const [mangaLibrary, setMangaLibrary] = useState(() => readJSON(LIBRARY_KEY, {}));
    const [mangaSeconds, setMangaSeconds] = useState(() => readJSON(SECONDS_KEY, 0));

    const loadMangaFeed = useCallback(async (tab = 'updated') => {
        setMangaFeedTab(tab);
        if (feedCache.current[tab]) { setMangaFeed(feedCache.current[tab]); return; }
        setMangaFeedLoading(true);
        try {
            const list = await getCatalog({ ordering: FEED_ORDER[tab] || FEED_ORDER.updated });
            feedCache.current[tab] = list;
            setMangaFeed(list);
        } catch (e) {
            console.warn('Manga feed error:', e.message);
            showToast?.('Не удалось загрузить мангу');
        }
        setMangaFeedLoading(false);
    }, [showToast]);

    // Debounced search
    useEffect(() => {
        const q = mangaQuery.trim();
        if (!q) { setMangaResults([]); setMangaSearching(false); return; }
        setMangaSearching(true);
        const seq = ++searchSeq.current;
        const t = setTimeout(async () => {
            try {
                const list = await searchManga(q);
                if (seq === searchSeq.current) setMangaResults(list);
            } catch (e) { console.warn('Manga search error:', e.message); }
            if (seq === searchSeq.current) setMangaSearching(false);
        }, 400);
        return () => clearTimeout(t);
    }, [mangaQuery]);

    const openManga = useCallback(async (item) => {
        if (!item?.dir) return;
        setMangaTitle({ ...item, _loading: true });
        setMangaChapters([]);
        setMangaTitleComments([]);
        setMangaTitleLoading(true);
        tg?.HapticFeedback?.impactOccurred?.('light');
        try {
            const title = await getTitle(item.dir);
            const resolved = title || item;
            setMangaTitle(resolved);
            const chs = await getChapters(resolved.dir);
            setMangaChapters(chs);
            // Comments for the title (best-effort)
            if (resolved.id) {
                setMangaCommentsLoading(true);
                getTitleComments(resolved.id).then((c) => setMangaTitleComments(c)).finally(() => setMangaCommentsLoading(false));
            }
        } catch (e) {
            console.warn('Manga title error:', e.message);
            showToast?.('Не удалось открыть тайтл');
        }
        setMangaTitleLoading(false);
    }, [showToast, tg]);

    const closeManga = useCallback(() => { setMangaTitle(null); setMangaChapters([]); setMangaTitleComments([]); }, []);

    // --- Reading progress (per chapter %) ---
    const markChapterProgress = useCallback((dir, chapterId, percent) => {
        if (!dir || !chapterId) return;
        setMangaRead((prev) => {
            const cur = prev[dir]?.[chapterId] || 0;
            const p = Math.min(100, Math.max(cur, Math.round(percent))); // monotonic
            if (p === cur) return prev;
            const next = { ...prev, [dir]: { ...(prev[dir] || {}), [chapterId]: p } };
            writeJSON(READ_KEY, next);
            return next;
        });
    }, []);

    const addReadingTime = useCallback((seconds) => {
        if (!seconds || seconds <= 0) return;
        setMangaSeconds((prev) => { const next = prev + Math.round(seconds); writeJSON(SECONDS_KEY, next); return next; });
    }, []);

    // --- Library statuses ---
    const getMangaStatus = useCallback((dir) => mangaLibrary[dir]?.status || null, [mangaLibrary]);

    const setMangaStatus = useCallback((item, status) => {
        if (!item?.dir) return;
        setMangaLibrary((prev) => {
            const next = { ...prev };
            if (!status || prev[item.dir]?.status === status) {
                delete next[item.dir];
                showToast?.('Убрано из библиотеки');
            } else {
                next[item.dir] = { status, dir: item.dir, title: item.title, cover: item.cover, type: item.type, rating: item.rating, ts: Date.now() };
                showToast?.(MANGA_STATUSES.find((s) => s.id === status)?.label || 'Сохранено');
            }
            writeJSON(LIBRARY_KEY, next);
            return next;
        });
        tg?.HapticFeedback?.impactOccurred?.('light');
    }, [showToast, tg]);

    const openChapter = useCallback(async (chapter) => {
        if (!chapter) return;
        setMangaReaderOpen(true);
        setMangaReaderLoading(true);
        setMangaReaderError(null);
        setMangaPages([]);
        setMangaChapterComments([]);
        setMangaCurrentChapter(chapter);
        tg?.HapticFeedback?.impactOccurred?.('light');
        const title = mangaTitle;
        try {
            const { pages, paid } = await getChapterPages(title?.dir, chapter.volume, chapter.number);
            if (paid) { setMangaReaderError('paid'); }
            else if (!pages.length) { setMangaReaderError('empty'); }
            else {
                setMangaPages(pages);
                const dir = title?.dir;
                if (dir) {
                    // Continue-reading pointer
                    setMangaProgress((prev) => {
                        const next = { ...prev, [dir]: { dir, chapterId: chapter.id, tome: chapter.tome, chapter: chapter.chapter, title: title.title, cover: title.cover, ts: Date.now() } };
                        writeJSON(PROGRESS_KEY, next);
                        return next;
                    });
                    // Auto-add to "Читаю" if the title isn't tracked yet
                    setMangaLibrary((prev) => {
                        if (prev[dir]) return prev;
                        const next = { ...prev, [dir]: { status: 'reading', dir, title: title.title, cover: title.cover, type: title.type, rating: title.rating, ts: Date.now() } };
                        writeJSON(LIBRARY_KEY, next);
                        return next;
                    });
                    // Mark a small starting progress so it shows as in-progress immediately
                    markChapterProgress(dir, chapter.id, 1);
                }
                // Chapter comments (best-effort)
                if (chapter.cid) getChapterComments(chapter.cid).then((c) => setMangaChapterComments(c));
            }
        } catch (e) {
            console.warn('Manga pages error:', e.message);
            setMangaReaderError('error');
        }
        setMangaReaderLoading(false);
    }, [mangaTitle, tg, markChapterProgress]);

    const closeReader = useCallback(() => { setMangaReaderOpen(false); setMangaPages([]); setMangaCurrentChapter(null); setMangaChapterComments([]); }, []);

    // Chapters are newest-first. Adjacent navigation: -1 = newer, +1 = older.
    const goAdjacentChapter = useCallback((dir) => {
        if (!mangaCurrentChapter || !mangaChapters.length) return;
        const i = mangaChapters.findIndex((c) => c.id === mangaCurrentChapter.id);
        if (i < 0) return;
        const target = mangaChapters[dir === 'next' ? i - 1 : i + 1];
        if (target) openChapter(target);
        else showToast?.(dir === 'next' ? 'Это последняя глава' : 'Это первая глава');
    }, [mangaCurrentChapter, mangaChapters, openChapter, showToast]);

    // --- Derived stats ---
    const mangaChaptersRead = useMemo(() => {
        let n = 0;
        for (const dir in mangaRead) for (const ch in mangaRead[dir]) if (mangaRead[dir][ch] >= READ_DONE) n++;
        return n;
    }, [mangaRead]);

    const mangaReadMinutes = useMemo(() => Math.round(mangaSeconds / 60), [mangaSeconds]);

    // Sync the manga library (with last-read chapter) to the user's profile so
    // friends can see what they're reading. Debounced; no-op without a real session.
    useEffect(() => {
        if (!user) return undefined;
        const reading = Object.values(mangaLibrary)
            .map((e) => ({ dir: e.dir, title: e.title, cover: e.cover, status: e.status, type: e.type, rating: e.rating, chapter: mangaProgress[e.dir]?.chapter ?? null, ts: e.ts }))
            .sort((a, b) => (b.ts || 0) - (a.ts || 0))
            .slice(0, 60);
        const json = JSON.stringify(reading);
        if (json === syncedRef.current) return undefined;
        const t = setTimeout(async () => {
            try { await supabase.from('profiles').update({ manga_reading: reading }).eq('id', user.id); syncedRef.current = json; }
            catch (e) { console.warn('Manga sync failed:', e.message); }
        }, 1500);
        return () => clearTimeout(t);
    }, [mangaLibrary, mangaProgress, user]);

    const mangaLibraryByStatus = useMemo(() => {
        const map = {};
        MANGA_STATUSES.forEach((s) => { map[s.id] = []; });
        Object.values(mangaLibrary).sort((a, b) => (b.ts || 0) - (a.ts || 0)).forEach((e) => {
            if (map[e.status]) map[e.status].push(e);
        });
        return map;
    }, [mangaLibrary]);

    return {
        mangaEnabled: MANGA_ENABLED,
        mangaFeed, mangaFeedTab, mangaFeedLoading, loadMangaFeed,
        mangaQuery, setMangaQuery, mangaResults, mangaSearching,
        mangaTitle, mangaChapters, mangaTitleLoading, openManga, closeManga,
        mangaTitleComments, mangaCommentsLoading,
        mangaReaderOpen, mangaCurrentChapter, mangaPages, mangaReaderLoading, mangaReaderError, mangaChapterComments,
        openChapter, closeReader, goAdjacentChapter,
        mangaProgress, mangaRead, markChapterProgress, addReadingTime,
        mangaLibrary, getMangaStatus, setMangaStatus, mangaLibraryByStatus,
        mangaChaptersRead, mangaReadMinutes, mangaSeconds,
    };
}
