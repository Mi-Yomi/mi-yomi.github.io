import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api/tmdb.js';
import { supabase } from '../lib/api/supabase.js';
import { FALLBACK_SOURCES, isRuSource } from '../lib/playerSources.js';
import { getStoredProgress } from '../lib/utils.js';

export default function usePlayer(user, media, showToast, userApproved, isAnimeContent, animeData, addToHistory) {
    const tg = window.Telegram?.WebApp;
    const [playerOpen, setPlayerOpen] = useState(false);
    const [playerUrl, setPlayerUrl] = useState('');
    const [currentSeason, setCurrentSeason] = useState(1);
    const [currentEpisode, setCurrentEpisode] = useState(1);
    const [playerSource, setPlayerSource] = useState('');
    const [playerLoaded, setPlayerLoaded] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    const playerTimerRef = useRef(null);

    // Skip intro/outro
    const [skipSegments, setSkipSegments] = useState([]);
    const [activeSkip, setActiveSkip] = useState(null);
    const [autoSkip, setAutoSkip] = useState(() => { try { return localStorage.getItem('hades_auto_skip') === 'true'; } catch { return false; } });
    const playerCurrentTimeRef = useRef(0);
    const skipDismissedRef = useRef(new Set());

    // Watch progress
    const watchProgressRef = useRef({});
    const progressThrottleRef = useRef(null);
    const lastProgressSaveRef = useRef(0);

    const loadSkipData = useCallback(async (mediaItem, type, season, episode) => {
        setSkipSegments([]);
        setActiveSkip(null);
        skipDismissedRef.current = new Set();
        if (!mediaItem) return;
        const segments = [];
        try {
            if (isAnimeContent && animeData?.myAnimeListId) {
                const ep = episode || 1;
                const res = await fetch(`https://api.aniskip.com/v2/skip-times/${animeData.myAnimeListId}/${ep}?types=op&types=ed&types=recap&types=mixed-op&types=mixed-ed&episodeLength=0`).catch(() => null);
                if (res?.ok) {
                    const data = await res.json();
                    if (data.found && data.results?.length > 0) {
                        data.results.forEach(r => {
                            const skipType = r.skipType === 'op' || r.skipType === 'mixed-op' ? 'intro' : 'outro';
                            if (r.skipType === 'recap') return;
                            segments.push({ type: skipType, start: r.interval.startTime, end: r.interval.endTime });
                        });
                    }
                }
            }
            if (segments.length === 0 && type === 'tv') {
                try {
                    const extData = await api(`/tv/${mediaItem.id}/external_ids`);
                    if (extData?.imdb_id) {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 4000);
                        const res = await fetch(`https://api.introdb.app/v1/intro?imdb=${extData.imdb_id}`, { signal: controller.signal }).catch(() => null);
                        clearTimeout(timeout);
                        if (res?.ok) {
                            const intro = await res.json();
                            if (intro?.start !== undefined && intro?.end !== undefined) {
                                segments.push({ type: 'intro', start: intro.start, end: intro.end });
                            }
                        }
                    }
                } catch {}
            }
        } catch (e) { console.warn('Skip data fetch error:', e); }
        if (segments.length > 0) setSkipSegments(segments);
    }, [isAnimeContent, animeData]);

    const performSkip = useCallback((targetTime, segmentType) => {
        if (segmentType) skipDismissedRef.current.add(segmentType);
        try {
            const iframe = document.querySelector('.player-frame iframe');
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'seek', data: targetTime }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'seek', id: 'player', data: targetTime }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ type: 'seek', value: targetTime }), '*');
                iframe.contentWindow.postMessage({ action: 'seek', time: targetTime }, '*');
            }
        } catch (e) { console.warn('Skip seek error:', e); }
        setActiveSkip(null);
    }, []);

    const checkSkipSegment = useCallback((currentTime) => {
        playerCurrentTimeRef.current = currentTime;
        if (skipSegments.length === 0) { setActiveSkip(null); return; }
        const active = skipSegments.find(s => currentTime >= s.start && currentTime < s.end - 1 && !skipDismissedRef.current.has(s.type));
        if (active && !activeSkip) {
            if (autoSkip) {
                performSkip(active.end, active.type);
                showToast(`⏭ ${active.type === 'intro' ? 'Заставка' : 'Титры'} пропущены`);
                return;
            }
            setActiveSkip(active);
        } else if (!active && activeSkip) {
            setActiveSkip(null);
        }
    }, [skipSegments, activeSkip, autoSkip, performSkip, showToast]);

    const toggleAutoSkip = useCallback(() => {
        const newVal = !autoSkip;
        setAutoSkip(newVal);
        try { localStorage.setItem('hades_auto_skip', String(newVal)); } catch {}
        showToast(newVal ? '⏭ Авто-пропуск включён' : '⏭ Авто-пропуск выключен');
    }, [autoSkip, showToast]);

    const lastDbSyncRef = useRef(0);
    const saveProgress = useCallback((itemId, currentTime, duration) => {
        if (!itemId || !currentTime || currentTime < 5) return;
        const progressData = { time: Math.floor(currentTime), duration: Math.floor(duration || 0), ts: Date.now() };
        try { localStorage.setItem(`hades_progress_${itemId}`, JSON.stringify(progressData)); } catch {}
        watchProgressRef.current[itemId] = progressData;
        if (user && Date.now() - lastDbSyncRef.current > 30000) {
            lastDbSyncRef.current = Date.now();
            supabase.from('watch_progress')
                .upsert({ user_id: user.id, item_id: String(itemId), current_time: progressData.time, duration: progressData.duration, updated_at: new Date().toISOString() }, { onConflict: 'user_id,item_id' })
                .then(() => {}).catch(() => {});
        }
    }, [user]);

    const clearProgress = useCallback((itemId) => {
        try { localStorage.removeItem(`hades_progress_${itemId}`); } catch {}
        delete watchProgressRef.current[itemId];
    }, []);

    const getProgressPercent = useCallback((itemId) => {
        const p = getStoredProgress(itemId);
        if (!p || !p.duration || p.duration === 0) return 0;
        return Math.min(95, Math.max(0, (p.time / p.duration) * 100));
    }, []);

    const playSource = useCallback(async (url, sourceName, season = null, episode = null) => {
        if (!userApproved) {
            showToast('⏳ Ваша заявка ещё не одобрена администратором');
            tg?.HapticFeedback?.notificationOccurred?.('error');
            return;
        }
        const s = season ?? currentSeason;
        const e = episode ?? currentEpisode;
        setPlayerUrl(url);
        setPlayerSource(sourceName);
        setPlayerOpen(true);
        setPlayerLoaded(false);
        setPlayerError(false);
        loadSkipData(media, media?.media_type, s, e);
        if (playerTimerRef.current) clearTimeout(playerTimerRef.current);
        playerTimerRef.current = setTimeout(() => { if (!playerLoaded) setPlayerError(true); }, 15000);
        try { localStorage.setItem('hades_preferred_source', sourceName); } catch {}
        setTimeout(() => {
            if (addToHistory && media) addToHistory(media, media.media_type, media.media_type === 'tv' ? s : null, media.media_type === 'tv' ? e : null, sourceName);
        }, 100);
        tg?.HapticFeedback?.impactOccurred?.('medium');
    }, [userApproved, currentSeason, currentEpisode, media, playerLoaded, showToast, tg, loadSkipData, addToHistory]);

    const closePlayer = useCallback(() => {
        if (media && addToHistory) {
            addToHistory(media, media.media_type, media.media_type === 'tv' ? currentSeason : null, media.media_type === 'tv' ? currentEpisode : null, playerSource);
        }
        setSkipSegments([]);
        setActiveSkip(null);
        setPlayerOpen(false);
        tg?.HapticFeedback?.impactOccurred?.('light');
    }, [media, currentSeason, currentEpisode, playerSource, tg, addToHistory]);

    const updatePlayerEpisode = useCallback((newSeason, newEpisode) => {
        if (!playerOpen || !media) return;
        if (isRuSource(playerSource)) {
            if (addToHistory) addToHistory(media, media.media_type, newSeason, newEpisode, playerSource);
            loadSkipData(media, media.media_type, newSeason, newEpisode);
            return;
        }
        const src = FALLBACK_SOURCES.find(s => s.name === playerSource) || FALLBACK_SOURCES[0];
        const newUrl = src.getUrl(media.id, media.media_type, newSeason, newEpisode);
        setPlayerUrl(newUrl);
        if (addToHistory) addToHistory(media, media.media_type, newSeason, newEpisode, playerSource);
    }, [playerOpen, media, playerSource, loadSkipData, addToHistory]);

    // PostMessage listener for player progress
    useEffect(() => {
        if (!playerOpen || !media) return;
        let elapsedSeconds = 0;
        const fallbackTimer = setInterval(() => {
            elapsedSeconds += 5;
            if (elapsedSeconds > 0 && elapsedSeconds % 30 === 0) {
                const existing = getStoredProgress(media.id);
                if (!existing || existing.ts < Date.now() - 25000) {
                    saveProgress(media.id, elapsedSeconds, 0);
                }
            }
        }, 5000);
        const handlePlayerMessage = (event) => {
            try {
                let data = event.data;
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch { return; } }
                if (!data || typeof data !== 'object') return;
                let currentTime = null;
                let duration = null;
                if (data.event === 'time' && data.data !== undefined) currentTime = parseFloat(data.data);
                if (data.event === 'duration' && data.data !== undefined) {
                    const dur = parseFloat(data.data);
                    if (dur > 0) { const prev = getStoredProgress(media.id); if (prev) saveProgress(media.id, prev.time, dur); }
                }
                if (data.event === 'time' || data.key === 'time') {
                    currentTime = currentTime || parseFloat(data.time || data.value || data.current || 0);
                    duration = parseFloat(data.duration || data.total || 0);
                }
                if (data.type === 'kodik_player_time_update' || data.event === 'kodik_timeupdate') {
                    currentTime = parseFloat(data.currentTime || data.time || data.second || 0);
                    duration = parseFloat(data.duration || data.total || 0);
                }
                if (data.key === 'kodik_player_time_update') currentTime = parseFloat(data.value || 0);
                if (data.key === 'kodik_player_duration_update') {
                    const dur = parseFloat(data.value || 0);
                    if (dur > 0) { const prev = getStoredProgress(media.id); if (prev) saveProgress(media.id, prev.time, dur); }
                }
                if (data.event === 'progress' || data.event === 'timeupdate') {
                    currentTime = currentTime || parseFloat(data.currentTime || data.time || data.seconds || 0);
                    duration = duration || parseFloat(data.duration || data.total || 0);
                }
                if (data.event === 'infoDelivery' && data.info?.currentTime) {
                    currentTime = parseFloat(data.info.currentTime);
                    duration = parseFloat(data.info.duration || 0);
                }
                if (data.type === 'player' && data.data?.currentTime) {
                    currentTime = parseFloat(data.data.currentTime);
                    duration = parseFloat(data.data.duration || 0);
                }
                if (currentTime && currentTime > 3) {
                    elapsedSeconds = Math.floor(currentTime);
                    const now = Date.now();
                    if (now - lastProgressSaveRef.current > 10000) {
                        lastProgressSaveRef.current = now;
                        saveProgress(media.id, currentTime, duration || 0);
                    }
                    checkSkipSegment(currentTime);
                }
            } catch {}
        };
        window.addEventListener('message', handlePlayerMessage);
        return () => { window.removeEventListener('message', handlePlayerMessage); clearInterval(fallbackTimer); };
    }, [playerOpen, media, saveProgress, checkSkipSegment]);

    // Swipe-to-go-back
    useEffect(() => {
        let touchStartX = 0;
        const handleTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
        const handleTouchEnd = (e) => {
            const diff = e.changedTouches[0].clientX - touchStartX;
            if (diff > 100 && touchStartX < 40) {
                if (playerOpen) closePlayer();
            }
        };
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => { document.removeEventListener('touchstart', handleTouchStart); document.removeEventListener('touchend', handleTouchEnd); };
    }, [playerOpen, closePlayer]);

    return {
        playerOpen, setPlayerOpen,
        playerUrl, setPlayerUrl,
        currentSeason, setCurrentSeason,
        currentEpisode, setCurrentEpisode,
        playerSource, setPlayerSource,
        playerLoaded, setPlayerLoaded,
        playerError, setPlayerError,
        playerTimerRef,
        skipSegments, setSkipSegments,
        activeSkip, setActiveSkip,
        autoSkip, setAutoSkip,
        playerCurrentTimeRef, skipDismissedRef,
        watchProgressRef, progressThrottleRef, lastProgressSaveRef,
        loadSkipData, checkSkipSegment, performSkip, toggleAutoSkip,
        saveProgress, clearProgress, getProgressPercent,
        playSource, closePlayer, updatePlayerEpisode,
        isRuSource,
    };
}
