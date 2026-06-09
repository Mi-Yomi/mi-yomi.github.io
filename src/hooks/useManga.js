import { useCallback, useEffect, useRef, useState } from 'react';
import { getCatalog, searchManga, getTitle, getChapters, getChapterPages } from '../lib/api/mangalib.js';
import { MANGA_ENABLED } from '../lib/config.js';

const FEED_ORDER = { updated: 'last_chapter_at', popular: 'views', new: 'created_at' };
const PROGRESS_KEY = 'hades_manga_progress';
const BOOKMARKS_KEY = 'hades_manga_bookmarks';

const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || '') ?? fallback; } catch { return fallback; }
};

/**
 * Manga reader state (remanga via proxy). Catalog/search/title/chapters/pages all
 * come through the API client; reading progress and bookmarks are kept in
 * localStorage (no Supabase tables needed). Self-contained — wired into the app
 * context like the other feature hooks.
 */
export default function useManga(showToast) {
    const tg = window.Telegram?.WebApp;

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

    // Opened title + chapters
    const [mangaTitle, setMangaTitle] = useState(null);
    const [mangaChapters, setMangaChapters] = useState([]);
    const [mangaTitleLoading, setMangaTitleLoading] = useState(false);

    // Reader
    const [mangaReaderOpen, setMangaReaderOpen] = useState(false);
    const [mangaCurrentChapter, setMangaCurrentChapter] = useState(null);
    const [mangaPages, setMangaPages] = useState([]);
    const [mangaReaderLoading, setMangaReaderLoading] = useState(false);
    const [mangaReaderError, setMangaReaderError] = useState(null);

    // Reading progress + bookmarks (localStorage)
    const [mangaProgress, setMangaProgress] = useState(() => readJSON(PROGRESS_KEY, {}));
    const [mangaBookmarks, setMangaBookmarks] = useState(() => readJSON(BOOKMARKS_KEY, []));

    const loadMangaFeed = useCallback(async (tab = 'updated') => {
        setMangaFeedTab(tab);
        if (feedCache.current[tab]) { setMangaFeed(feedCache.current[tab]); return; }
        setMangaFeedLoading(true);
        try {
            const list = await getCatalog({ ordering: FEED_ORDER[tab] || FEED_ORDER.updated, count: 30 });
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
        setMangaTitleLoading(true);
        tg?.HapticFeedback?.impactOccurred?.('light');
        try {
            const title = await getTitle(item.dir);
            setMangaTitle(title || item);
            const chs = await getChapters((title || item).dir);
            setMangaChapters(chs);
        } catch (e) {
            console.warn('Manga title error:', e.message);
            showToast?.('Не удалось открыть тайтл');
        }
        setMangaTitleLoading(false);
    }, [showToast, tg]);

    const closeManga = useCallback(() => { setMangaTitle(null); setMangaChapters([]); }, []);

    const openChapter = useCallback(async (chapter) => {
        if (!chapter) return;
        setMangaReaderOpen(true);
        setMangaReaderLoading(true);
        setMangaReaderError(null);
        setMangaPages([]);
        setMangaCurrentChapter(chapter);
        tg?.HapticFeedback?.impactOccurred?.('light');
        try {
            const { pages, paid } = await getChapterPages(mangaTitle?.dir, chapter.volume, chapter.number);
            if (paid) { setMangaReaderError('paid'); }
            else if (!pages.length) { setMangaReaderError('empty'); }
            else {
                setMangaPages(pages);
                // Save reading progress keyed by title dir
                const dir = mangaTitle?.dir;
                if (dir) {
                    setMangaProgress((prev) => {
                        const next = { ...prev, [dir]: { chapterId: chapter.id, tome: chapter.tome, chapter: chapter.chapter, title: mangaTitle.title, cover: mangaTitle.cover, ts: Date.now() } };
                        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* quota */ }
                        return next;
                    });
                }
            }
        } catch (e) {
            console.warn('Manga pages error:', e.message);
            setMangaReaderError('error');
        }
        setMangaReaderLoading(false);
    }, [mangaTitle, tg]);

    const closeReader = useCallback(() => { setMangaReaderOpen(false); setMangaPages([]); setMangaCurrentChapter(null); }, []);

    // Chapters come newest-first (-index). Adjacent navigation: -1 = newer, +1 = older.
    const goAdjacentChapter = useCallback((dir) => {
        if (!mangaCurrentChapter || !mangaChapters.length) return;
        const i = mangaChapters.findIndex((c) => c.id === mangaCurrentChapter.id);
        if (i < 0) return;
        const target = mangaChapters[dir === 'next' ? i - 1 : i + 1];
        if (target) openChapter(target);
        else showToast?.(dir === 'next' ? 'Это последняя глава' : 'Это первая глава');
    }, [mangaCurrentChapter, mangaChapters, openChapter, showToast]);

    const toggleMangaBookmark = useCallback((item) => {
        setMangaBookmarks((prev) => {
            const exists = prev.some((b) => b.dir === item.dir);
            const next = exists
                ? prev.filter((b) => b.dir !== item.dir)
                : [{ dir: item.dir, title: item.title, cover: item.cover, type: item.type, rating: item.rating }, ...prev];
            try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next)); } catch { /* quota */ }
            showToast?.(exists ? 'Удалено из закладок' : 'Добавлено в закладки');
            tg?.HapticFeedback?.impactOccurred?.('light');
            return next;
        });
    }, [showToast, tg]);

    return {
        mangaEnabled: MANGA_ENABLED,
        mangaFeed, mangaFeedTab, mangaFeedLoading, loadMangaFeed,
        mangaQuery, setMangaQuery, mangaResults, mangaSearching,
        mangaTitle, mangaChapters, mangaTitleLoading, openManga, closeManga,
        mangaReaderOpen, mangaCurrentChapter, mangaPages, mangaReaderLoading, mangaReaderError,
        openChapter, closeReader, goAdjacentChapter,
        mangaProgress, mangaBookmarks, toggleMangaBookmark,
    };
}
