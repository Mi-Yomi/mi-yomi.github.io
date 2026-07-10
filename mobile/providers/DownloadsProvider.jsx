import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getChapterPages } from '../lib/mangalib';
import { MANGA_IMG_HEADERS } from '../lib/config';
import { useToast } from './ToastProvider';

/**
 * Offline chapter downloads. Page images live under
 * documentDirectory/manga/{dir}/{chapterId}/, the manifest (which chapters are
 * downloaded, with page dimensions for the reader's layout math) in AsyncStorage.
 */
const MANIFEST_KEY = 'hades_manga_downloads';
const ROOT = `${FileSystem.documentDirectory}manga/`;
const CONCURRENCY = 4;

const DownloadsContext = createContext(null);

const chapterDir = (dir, chapterId) => `${ROOT}${encodeURIComponent(dir)}/${encodeURIComponent(chapterId)}/`;

export function DownloadsProvider({ children }) {
    const { showToast } = useToast();
    // { [dir]: { title, chapters: { [chapterId]: { volume, number, pages: [{uri,width,height}], ts } } } }
    const [downloads, setDownloads] = useState({});
    // { [`${dir}/${chapterId}`]: { done, total } } — live progress while downloading
    const [downloading, setDownloading] = useState({});
    const downloadsRef = useRef(downloads);
    useEffect(() => { downloadsRef.current = downloads; }, [downloads]);

    useEffect(() => {
        AsyncStorage.getItem(MANIFEST_KEY)
            .then(v => { const d = JSON.parse(v || '{}'); if (d && typeof d === 'object') setDownloads(d); })
            .catch(() => {});
    }, []);

    const persist = useCallback((next) => {
        AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(next)).catch(() => {});
    }, []);

    const getDownloadedPages = useCallback((dir, chapterId) => downloads[dir]?.chapters?.[chapterId]?.pages || null, [downloads]);
    const isDownloading = useCallback((dir, chapterId) => !!downloading[`${dir}/${chapterId}`], [downloading]);

    const downloadChapter = useCallback(async (titleMeta, chapter) => {
        const dir = titleMeta?.dir;
        if (!dir || !chapter) return;
        const key = `${dir}/${chapter.id}`;
        if (downloadsRef.current[dir]?.chapters?.[chapter.id] || downloading[key]) return;
        try {
            const { pages } = await getChapterPages(dir, chapter.volume, chapter.number);
            if (!pages.length) { showToast('Глава пуста', '😕'); return; }
            setDownloading(prev => ({ ...prev, [key]: { done: 0, total: pages.length } }));
            const folder = chapterDir(dir, chapter.id);
            await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
            const local = new Array(pages.length);
            let done = 0;
            // Small worker pool: N parallel image downloads.
            let cursor = 0;
            const worker = async () => {
                while (cursor < pages.length) {
                    const i = cursor++;
                    const p = pages[i];
                    const ext = (p.link.split('.').pop() || 'jpg').split('?')[0].slice(0, 4);
                    const fileUri = `${folder}${i}.${ext}`;
                    const res = await FileSystem.downloadAsync(p.link, fileUri, { headers: MANGA_IMG_HEADERS });
                    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
                    local[i] = { uri: fileUri, width: p.width, height: p.height };
                    done++;
                    setDownloading(prev => (prev[key] ? { ...prev, [key]: { done, total: pages.length } } : prev));
                }
            };
            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));
            setDownloads(prev => {
                const next = {
                    ...prev,
                    [dir]: {
                        title: titleMeta.title || prev[dir]?.title || '',
                        chapters: {
                            ...(prev[dir]?.chapters || {}),
                            [chapter.id]: { volume: chapter.volume, number: chapter.number, pages: local, ts: Date.now() },
                        },
                    },
                };
                persist(next);
                return next;
            });
            showToast(`Глава ${chapter.number} скачана`, '📥');
        } catch (e) {
            console.warn('Chapter download failed:', e.message);
            showToast('Не удалось скачать главу', '⚠️');
            FileSystem.deleteAsync(chapterDir(dir, chapter.id), { idempotent: true }).catch(() => {});
        } finally {
            setDownloading(prev => { const next = { ...prev }; delete next[key]; return next; });
        }
    }, [downloading, persist, showToast]);

    const deleteChapter = useCallback(async (dir, chapterId) => {
        await FileSystem.deleteAsync(chapterDir(dir, chapterId), { idempotent: true }).catch(() => {});
        setDownloads(prev => {
            const entry = prev[dir];
            if (!entry?.chapters?.[chapterId]) return prev;
            const chapters = { ...entry.chapters };
            delete chapters[chapterId];
            const next = { ...prev };
            if (Object.keys(chapters).length) next[dir] = { ...entry, chapters };
            else delete next[dir];
            persist(next);
            return next;
        });
        showToast('Загрузка удалена', '🗑');
    }, [persist, showToast]);

    const downloadedCount = useMemo(
        () => Object.values(downloads).reduce((n, e) => n + Object.keys(e.chapters || {}).length, 0),
        [downloads]
    );

    const value = useMemo(() => ({
        downloads, downloading, downloadedCount,
        getDownloadedPages, isDownloading, downloadChapter, deleteChapter,
    }), [downloads, downloading, downloadedCount, getDownloadedPages, isDownloading, downloadChapter, deleteChapter]);

    return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
    const ctx = useContext(DownloadsContext);
    if (!ctx) throw new Error('useDownloads must be inside DownloadsProvider');
    return ctx;
}
