import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { useToast } from './ToastProvider';
import { MANGA_STATUSES } from '../lib/mangaStatuses';

// Same keys and shapes as the web app (src/hooks/useManga.js) so the
// profiles.manga_state merge keeps one reading state across site and app.
const PROGRESS_KEY = 'hades_manga_progress';   // last chapter opened per title (continue reading)
const READ_KEY = 'hades_manga_read';           // { [dir]: { [chapterId]: percent 0-100 } }
const LIBRARY_KEY = 'hades_manga_library';     // { [dir]: { status, title, cover, ... } }
const SECONDS_KEY = 'hades_manga_seconds';     // total reading seconds
const READ_DONE = 90;                          // percent at which a chapter counts as read

const MangaContext = createContext(null);

export function MangaProvider({ children }) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [mangaProgress, setMangaProgress] = useState({});
    const [mangaRead, setMangaRead] = useState({});
    const [mangaLibrary, setMangaLibrary] = useState({});
    const [mangaSeconds, setMangaSeconds] = useState(0);
    const [localLoaded, setLocalLoaded] = useState(false);
    const [hydrated, setHydrated] = useState(false); // remote merge done -> pushing allowed

    // --- Local persistence ---
    useEffect(() => {
        (async () => {
            try {
                const rows = await AsyncStorage.multiGet([PROGRESS_KEY, READ_KEY, LIBRARY_KEY, SECONDS_KEY]);
                const parsed = rows.map(([, v]) => { try { return JSON.parse(v); } catch { return null; } });
                if (parsed[0]) setMangaProgress(parsed[0]);
                if (parsed[1]) setMangaRead(parsed[1]);
                if (parsed[2]) setMangaLibrary(parsed[2]);
                if (typeof parsed[3] === 'number') setMangaSeconds(parsed[3]);
            } catch {}
            setLocalLoaded(true);
        })();
    }, []);

    const persist = useCallback((key, val) => {
        AsyncStorage.setItem(key, JSON.stringify(val)).catch(() => {});
    }, []);

    // --- Cross-device sync (profiles.manga_state), merge then debounced push ---
    const lastHydrateRef = useRef(0);
    const pushedStateRef = useRef('');

    useEffect(() => {
        if (!user?.id || !localLoaded) return undefined;
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
                        persist(READ_KEY, next);
                        return next;
                    });
                    setMangaProgress((local) => {
                        const next = { ...local };
                        for (const dir in (remote.progress || {})) {
                            const r = remote.progress[dir];
                            if (r && (!next[dir] || (r.ts || 0) > (next[dir].ts || 0))) next[dir] = r;
                        }
                        persist(PROGRESS_KEY, next);
                        return next;
                    });
                    setMangaLibrary((local) => {
                        const next = { ...local };
                        for (const dir in (remote.library || {})) {
                            const r = remote.library[dir];
                            if (r && (!next[dir] || (r.ts || 0) > (next[dir].ts || 0))) next[dir] = r;
                        }
                        persist(LIBRARY_KEY, next);
                        return next;
                    });
                    setMangaSeconds((local) => {
                        const next = Math.max(local, remote.seconds || 0);
                        persist(SECONDS_KEY, next);
                        return next;
                    });
                }
                setHydrated(true);
            });
        };
        hydrate();
        // Re-merge when the app returns to foreground after a while — covers
        // reading on another device in between (merge is idempotent).
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && Date.now() - lastHydrateRef.current > 300000) hydrate();
        });
        return () => { cancelled = true; sub.remove(); setHydrated(false); };
    }, [user?.id, localLoaded, persist]);

    useEffect(() => {
        if (!user?.id || !hydrated) return undefined;
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
    }, [mangaRead, mangaProgress, mangaLibrary, mangaSeconds, hydrated, user?.id]);

    // Library with last-read chapter on the profile so friends can see it.
    const syncedReadingRef = useRef('');
    useEffect(() => {
        if (!user?.id || !hydrated) return undefined;
        const reading = Object.values(mangaLibrary)
            .map((e) => ({ dir: e.dir, title: e.title, cover: e.cover, status: e.status, type: e.type, rating: e.rating, chapter: mangaProgress[e.dir]?.chapter ?? null, ts: e.ts }))
            .sort((a, b) => (b.ts || 0) - (a.ts || 0))
            .slice(0, 60);
        const json = JSON.stringify(reading);
        if (json === syncedReadingRef.current) return undefined;
        const t = setTimeout(async () => {
            try { await supabase.from('profiles').update({ manga_reading: reading }).eq('id', user.id); syncedReadingRef.current = json; }
            catch (e) { console.warn('Manga reading sync failed:', e.message); }
        }, 1500);
        return () => clearTimeout(t);
    }, [mangaLibrary, mangaProgress, hydrated, user?.id]);

    // --- Reading progress ---
    // Monotonic per-chapter max % — the "прочитано" signal.
    const markChapterProgress = useCallback((dir, chapterId, percent) => {
        if (!dir || !chapterId) return;
        setMangaRead((prev) => {
            const cur = prev[dir]?.[chapterId] || 0;
            const p = Math.min(100, Math.max(cur, Math.round(percent)));
            if (p === cur) return prev;
            const next = { ...prev, [dir]: { ...(prev[dir] || {}), [chapterId]: p } };
            persist(READ_KEY, next);
            return next;
        });
    }, [persist]);

    // Exact resume position on the continue pointer — non-monotonic on purpose,
    // so scrolling back up moves the resume point back too.
    const markReadingPosition = useCallback((dir, chapterId, percent) => {
        if (!dir || !chapterId) return;
        setMangaProgress((prev) => {
            const cur = prev[dir];
            if (!cur || cur.chapterId !== chapterId) return prev;
            const p = Math.max(0, Math.min(100, Math.round(percent)));
            if (cur.pct === p) return prev;
            const next = { ...prev, [dir]: { ...cur, pct: p } };
            persist(PROGRESS_KEY, next);
            return next;
        });
    }, [persist]);

    const addReadingTime = useCallback((seconds) => {
        if (!seconds || seconds <= 0) return;
        setMangaSeconds((prev) => { const next = prev + Math.round(seconds); persist(SECONDS_KEY, next); return next; });
    }, [persist]);

    // Continue pointer + auto-add to "Читаю" + initial 1% when a chapter opens.
    const recordChapterOpened = useCallback((title, chapter) => {
        const dir = title?.dir;
        if (!dir || !chapter) return;
        setMangaProgress((prev) => {
            const pct = prev[dir]?.chapterId === chapter.id ? prev[dir].pct : undefined;
            const next = { ...prev, [dir]: { dir, chapterId: chapter.id, tome: chapter.tome, chapter: chapter.chapter, title: title.title, cover: title.cover, ts: Date.now(), ...(pct != null ? { pct } : {}) } };
            persist(PROGRESS_KEY, next);
            return next;
        });
        setMangaLibrary((prev) => {
            if (prev[dir]) return prev;
            const next = { ...prev, [dir]: { status: 'reading', dir, title: title.title, cover: title.cover, type: title.type, rating: title.rating, ts: Date.now() } };
            persist(LIBRARY_KEY, next);
            return next;
        });
        markChapterProgress(dir, chapter.id, 1);
    }, [markChapterProgress, persist]);

    // --- Library statuses ---
    const getMangaStatus = useCallback((dir) => mangaLibrary[dir]?.status || null, [mangaLibrary]);

    const setMangaStatus = useCallback((item, status) => {
        if (!item?.dir) return;
        setMangaLibrary((prev) => {
            const next = { ...prev };
            if (!status || prev[item.dir]?.status === status) {
                delete next[item.dir];
                showToast('Убрано из библиотеки', '📕');
            } else {
                next[item.dir] = { status, dir: item.dir, title: item.title, cover: item.cover, type: item.type, rating: item.rating, ts: Date.now() };
                showToast(MANGA_STATUSES.find((s) => s.id === status)?.label || 'Сохранено', '📗');
            }
            persist(LIBRARY_KEY, next);
            return next;
        });
    }, [persist, showToast]);

    // Drop the continue-reading pointer for a title (e.g. long-press "убрать").
    const removeProgress = useCallback((dir) => {
        if (!dir) return;
        setMangaProgress((prev) => {
            if (!prev[dir]) return prev;
            const next = { ...prev };
            delete next[dir];
            persist(PROGRESS_KEY, next);
            return next;
        });
        showToast('Убрано из «Продолжить чтение»', '✂️');
    }, [persist, showToast]);

    const getChapterReadPct = useCallback((dir, chapterId) => mangaRead[dir]?.[chapterId] || 0, [mangaRead]);

    // --- Derived ---
    const continueReading = useMemo(
        () => Object.values(mangaProgress).filter((p) => p?.dir).sort((a, b) => (b.ts || 0) - (a.ts || 0)),
        [mangaProgress]
    );

    const mangaLibraryByStatus = useMemo(() => {
        const map = {};
        MANGA_STATUSES.forEach((s) => { map[s.id] = []; });
        Object.values(mangaLibrary).sort((a, b) => (b.ts || 0) - (a.ts || 0)).forEach((e) => {
            if (map[e.status]) map[e.status].push(e);
        });
        return map;
    }, [mangaLibrary]);

    const mangaLibraryCounts = useMemo(() => {
        const counts = {};
        MANGA_STATUSES.forEach((s) => { counts[s.id] = mangaLibraryByStatus[s.id].length; });
        return counts;
    }, [mangaLibraryByStatus]);

    const mangaChaptersRead = useMemo(() => {
        let n = 0;
        for (const dir in mangaRead) for (const ch in mangaRead[dir]) if (mangaRead[dir][ch] >= READ_DONE) n++;
        return n;
    }, [mangaRead]);

    const mangaReadMinutes = useMemo(() => Math.round(mangaSeconds / 60), [mangaSeconds]);

    const value = useMemo(() => ({
        mangaProgress, mangaRead, mangaLibrary, mangaSeconds,
        continueReading, mangaLibraryByStatus, mangaLibraryCounts, mangaChaptersRead, mangaReadMinutes,
        markChapterProgress, markReadingPosition, addReadingTime, recordChapterOpened,
        getMangaStatus, setMangaStatus, getChapterReadPct, removeProgress,
    }), [mangaProgress, mangaRead, mangaLibrary, mangaSeconds, continueReading, mangaLibraryByStatus, mangaLibraryCounts, mangaChaptersRead, mangaReadMinutes, markChapterProgress, markReadingPosition, addReadingTime, recordChapterOpened, getMangaStatus, setMangaStatus, getChapterReadPct, removeProgress]);

    return <MangaContext.Provider value={value}>{children}</MangaContext.Provider>;
}

export function useManga() {
    const ctx = useContext(MangaContext);
    if (!ctx) throw new Error('useManga must be inside MangaProvider');
    return ctx;
}
