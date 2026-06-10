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
const READER_WINDOW = 5;                        // max chapter sections kept in the reader DOM

const readJSON = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key) || ''); return v ?? fallback; } catch { return fallback; }
};
const writeJSON = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ } };

// Keep the URL hash in sync with the reading session (replaceState only — no new
// history entries, so back-button behaviour is untouched). Lets a page reload
// land back in the manga reader instead of the home tab.
const setMangaHash = (h) => {
    try { window.history.replaceState(window.history.state, '', h ? `#${h}` : window.location.pathname + window.location.search); } catch { /* ignore */ }
};

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

    // Reader (seamless scroll: next chapters are appended as sections while the user reads)
    const [mangaReaderOpen, setMangaReaderOpen] = useState(false);
    const [mangaResumeAt, setMangaResumeAt] = useState(null); // % to scroll to when a session opens
    const [mangaCurrentChapter, setMangaCurrentChapter] = useState(null); // chapter currently in view
    const [mangaSections, setMangaSections] = useState([]);              // [{ chapter, pages, comments, error }] in reading order
    const [mangaReaderLoading, setMangaReaderLoading] = useState(false); // first chapter of a session
    const [mangaReaderError, setMangaReaderError] = useState(null);      // first chapter of a session
    const [mangaNextLoading, setMangaNextLoading] = useState(false);     // appending the next chapter
    const [mangaNextError, setMangaNextError] = useState(false);         // append failed; wait for manual retry
    const [mangaReaderSession, setMangaReaderSession] = useState(0);     // bumps on explicit open -> reader resets scroll
    const readerSeqRef = useRef(0);   // invalidates in-flight loads on reopen/close
    const nextBusyRef = useRef(false);
    const sectionsRef = useRef([]);
    useEffect(() => { sectionsRef.current = mangaSections; }, [mangaSections]);

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
        setMangaHash(`manga/${item.dir}`);
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

    const closeManga = useCallback(() => { setMangaTitle(null); setMangaChapters([]); setMangaTitleComments([]); setMangaHash(null); }, []);

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

    // Exact resume position: a NON-monotonic "last viewed spot" on the continue
    // pointer. markChapterProgress is a monotonic max (right for "прочитано"),
    // wrong for "вернуться где остановился" when the user scrolled back up.
    const markReadingPosition = useCallback((dir, chapterId, percent) => {
        if (!dir || !chapterId) return;
        setMangaProgress((prev) => {
            const cur = prev[dir];
            if (!cur || cur.chapterId !== chapterId) return prev;
            const p = Math.max(0, Math.min(100, Math.round(percent)));
            if (cur.pct === p) return prev;
            const next = { ...prev, [dir]: { ...cur, pct: p } };
            writeJSON(PROGRESS_KEY, next);
            return next;
        });
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

    // Bookkeeping shared by "chapter opened" and "chapter scrolled into view":
    // continue-reading pointer, auto-add to "Читаю", initial 1% progress.
    const recordChapterOpened = useCallback((title, chapter) => {
        const dir = title?.dir;
        if (!dir || !chapter) return;
        setMangaProgress((prev) => {
            // keep the in-chapter position when re-pointing at the same chapter
            const pct = prev[dir]?.chapterId === chapter.id ? prev[dir].pct : undefined;
            const next = { ...prev, [dir]: { dir, chapterId: chapter.id, tome: chapter.tome, chapter: chapter.chapter, title: title.title, cover: title.cover, ts: Date.now(), ...(pct != null ? { pct } : {}) } };
            writeJSON(PROGRESS_KEY, next);
            return next;
        });
        setMangaLibrary((prev) => {
            if (prev[dir]) return prev;
            const next = { ...prev, [dir]: { status: 'reading', dir, title: title.title, cover: title.cover, type: title.type, rating: title.rating, ts: Date.now() } };
            writeJSON(LIBRARY_KEY, next);
            return next;
        });
        markChapterProgress(dir, chapter.id, 1);
    }, [markChapterProgress]);

    // Chapter comments are fetched per section (best-effort) and patched in.
    const loadSectionComments = useCallback((chapter, seq) => {
        if (!chapter?.cid) return;
        getChapterComments(chapter.cid).then((c) => {
            if (seq !== readerSeqRef.current || !c.length) return;
            setMangaSections((prev) => prev.map((s) => (s.chapter.id === chapter.id ? { ...s, comments: c } : s)));
        });
    }, []);

    const openChapter = useCallback(async (chapter) => {
        if (!chapter) return;
        const seq = ++readerSeqRef.current;
        nextBusyRef.current = false;
        setMangaReaderOpen(true);
        setMangaReaderLoading(true);
        setMangaReaderError(null);
        setMangaSections([]);
        setMangaNextLoading(false);
        setMangaNextError(false);
        setMangaCurrentChapter(chapter);
        setMangaReaderSession(seq);
        tg?.HapticFeedback?.impactOccurred?.('light');
        const title = mangaTitle;
        // Resume where the user stopped: exact pointer position for this chapter,
        // else the saved read % (furthest point). Only mid-chapter values count.
        {
            const dir = title?.dir;
            const pointer = dir ? mangaProgress[dir] : null;
            const pos = (pointer && pointer.chapterId === chapter.id && typeof pointer.pct === 'number')
                ? pointer.pct
                : (dir ? mangaRead[dir]?.[chapter.id] : null);
            setMangaResumeAt(pos != null && pos >= 2 && pos <= 97 ? pos : null);
            if (dir) setMangaHash(`manga/${dir}/${chapter.volume}/${chapter.number}`);
        }
        try {
            const { pages, paid } = await getChapterPages(title?.dir, chapter.volume, chapter.number);
            if (seq !== readerSeqRef.current) return;
            if (paid) { setMangaReaderError('paid'); }
            else if (!pages.length) { setMangaReaderError('empty'); }
            else {
                setMangaSections([{ chapter, pages, comments: [], error: null }]);
                recordChapterOpened(title, chapter);
                loadSectionComments(chapter, seq);
            }
        } catch (e) {
            console.warn('Manga pages error:', e.message);
            if (seq === readerSeqRef.current) setMangaReaderError('error');
        }
        if (seq === readerSeqRef.current) setMangaReaderLoading(false);
    }, [mangaTitle, mangaProgress, mangaRead, tg, recordChapterOpened, loadSectionComments]);

    // Seamless scroll: append the next chapter (reading order) below the last loaded section.
    // Paid/empty chapters become inline note-sections so the flow can continue past them;
    // network failures stop auto-append until the user retries.
    const loadNextChapter = useCallback(async () => {
        if (nextBusyRef.current) return;
        const last = sectionsRef.current[sectionsRef.current.length - 1];
        if (!last) return;
        const i = mangaChapters.findIndex((c) => c.id === last.chapter.id);
        if (i <= 0) return; // chapters are newest-first: i-1 is the next chapter to read
        const next = mangaChapters[i - 1];
        const seq = readerSeqRef.current;
        nextBusyRef.current = true;
        setMangaNextLoading(true);
        setMangaNextError(false);
        try {
            const { pages, paid } = await getChapterPages(mangaTitle?.dir, next.volume, next.number);
            if (seq !== readerSeqRef.current) return;
            const error = paid ? 'paid' : (!pages.length ? 'empty' : null);
            setMangaSections((prev) => {
                if (prev.some((s) => s.chapter.id === next.id)) return prev;
                const appended = [...prev, { chapter: next, pages: error ? [] : pages, comments: [], error }];
                // Keep the DOM light on long sessions: only the last READER_WINDOW
                // chapters stay mounted; the reader compensates scrollTop for the
                // height of sections dropped from the head.
                return appended.length > READER_WINDOW ? appended.slice(appended.length - READER_WINDOW) : appended;
            });
            if (!error) loadSectionComments(next, seq);
        } catch (e) {
            console.warn('Manga next chapter error:', e.message);
            if (seq === readerSeqRef.current) setMangaNextError(true);
        }
        if (seq === readerSeqRef.current) { setMangaNextLoading(false); nextBusyRef.current = false; }
    }, [mangaChapters, mangaTitle, loadSectionComments]);

    // Called by the reader when the user scrolls across a chapter boundary.
    const noteChapterInView = useCallback((chapter) => {
        if (!chapter) return;
        setMangaCurrentChapter((prev) => (prev?.id === chapter.id ? prev : chapter));
        recordChapterOpened(mangaTitle, chapter);
        if (mangaTitle?.dir) setMangaHash(`manga/${mangaTitle.dir}/${chapter.volume}/${chapter.number}`);
    }, [mangaTitle, recordChapterOpened]);

    const closeReader = useCallback(() => {
        readerSeqRef.current++;
        nextBusyRef.current = false;
        setMangaReaderOpen(false);
        setMangaSections([]);
        setMangaCurrentChapter(null);
        setMangaNextLoading(false);
        setMangaNextError(false);
        setMangaHash(mangaTitle?.dir ? `manga/${mangaTitle.dir}` : null);
    }, [mangaTitle]);

    // Reload restore: a deep link #manga/{dir}/{vol}/{num} requests a chapter to
    // be reopened once the title's chapter list arrives (set at boot).
    const restoreRef = useRef(null);
    const requestReaderRestore = useCallback((dir, volume, number) => {
        restoreRef.current = { dir, volume: String(volume), number: String(number) };
    }, []);
    useEffect(() => {
        const r = restoreRef.current;
        if (!r || mangaTitle?.dir !== r.dir || !mangaChapters.length) return;
        restoreRef.current = null;
        const ch = mangaChapters.find((c) => String(c.volume) === r.volume && String(c.number) === r.number);
        if (ch) openChapter(ch);
    }, [mangaTitle, mangaChapters, openChapter]);

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

    // --- Cross-device sync of the whole manga state (profiles.manga_state) ---
    // Hydrate once per login: merge remote into local (per-chapter max %, newest
    // pointer/library entry by ts, max seconds), then keep pushing local state
    // debounced. Pushing is gated on hydration so a fresh device can't blow away
    // the server copy with its empty localStorage.
    const lastHydrateRef = useRef(0);
    const pushedStateRef = useRef('');
    const [mangaHydrated, setMangaHydrated] = useState(false);

    useEffect(() => {
        if (!user?.id) return undefined;
        let cancelled = false;
        const hydrate = () => {
            lastHydrateRef.current = Date.now();
            supabase.from('profiles').select('manga_state').eq('id', user.id).single().then(({ data }) => {
                if (cancelled) return;
                const remote = data?.manga_state;
                if (remote) {
                    setMangaRead((local) => {
                        const next = { ...local };
                        for (const dir in (remote.read || {})) {
                            next[dir] = { ...(next[dir] || {}) };
                            for (const ch in remote.read[dir]) next[dir][ch] = Math.max(next[dir][ch] || 0, remote.read[dir][ch] || 0);
                        }
                        writeJSON(READ_KEY, next);
                        return next;
                    });
                    setMangaProgress((local) => {
                        const next = { ...local };
                        for (const dir in (remote.progress || {})) {
                            const r = remote.progress[dir];
                            if (r && (!next[dir] || (r.ts || 0) > (next[dir].ts || 0))) next[dir] = r;
                        }
                        writeJSON(PROGRESS_KEY, next);
                        return next;
                    });
                    setMangaLibrary((local) => {
                        const next = { ...local };
                        for (const dir in (remote.library || {})) {
                            const r = remote.library[dir];
                            if (r && (!next[dir] || (r.ts || 0) > (next[dir].ts || 0))) next[dir] = r;
                        }
                        writeJSON(LIBRARY_KEY, next);
                        return next;
                    });
                    setMangaSeconds((local) => {
                        const next = Math.max(local, remote.seconds || 0);
                        writeJSON(SECONDS_KEY, next);
                        return next;
                    });
                }
                setMangaHydrated(true);
            });
        };
        hydrate();
        // Re-merge when the tab comes back into focus after a while — covers a
        // PC tab left open while the user read on the phone (merge is idempotent).
        const onVis = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastHydrateRef.current > 300000) hydrate();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); };
    }, [user]);

    useEffect(() => {
        if (!user?.id || !mangaHydrated) return undefined;
        const json = JSON.stringify({ read: mangaRead, progress: mangaProgress, library: mangaLibrary, seconds: mangaSeconds });
        if (json === pushedStateRef.current) return undefined;
        const t = setTimeout(async () => {
            try {
                await supabase.from('profiles')
                    .update({ manga_state: { v: 1, ts: Date.now(), read: mangaRead, progress: mangaProgress, library: mangaLibrary, seconds: mangaSeconds } })
                    .eq('id', user.id);
                pushedStateRef.current = json;
            } catch (e) { console.warn('Manga state sync failed:', e.message); }
        }, 2000);
        return () => clearTimeout(t);
    }, [mangaRead, mangaProgress, mangaLibrary, mangaSeconds, mangaHydrated, user]);

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
        mangaReaderOpen, mangaCurrentChapter, mangaSections, mangaReaderLoading, mangaReaderError,
        mangaNextLoading, mangaNextError, mangaReaderSession, mangaResumeAt,
        openChapter, closeReader, goAdjacentChapter, loadNextChapter, noteChapterInView, requestReaderRestore,
        mangaProgress, mangaRead, markChapterProgress, markReadingPosition, addReadingTime,
        mangaLibrary, getMangaStatus, setMangaStatus, mangaLibraryByStatus,
        mangaChaptersRead, mangaReadMinutes, mangaSeconds,
    };
}
