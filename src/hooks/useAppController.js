import { useCallback, useEffect, useMemo, useRef } from 'react';
import { IMG, BACKDROP, TMDB_KEY } from '../lib/config.js';
import { I } from '../lib/icons.jsx';
import { supabase } from '../lib/api/supabase.js';
import { api } from '../lib/api/tmdb.js';
import { FALLBACK_SOURCES, isRuSource } from '../lib/playerSources.js';
import { getStoredProgress, formatWatchTime, pluralize, ratingColor, HOME_GENRES, TV_GENRES, ANIME_GENRES, MOOD_MAP, ANIME_GENRE_MAP } from '../lib/utils.js';
import useAuth from './useAuth.js';
import useUI from './useUI.js';
import useContent from './useContent.js';
import useDetails from './useDetails.js';
import usePlayer from './usePlayer.js';
import useSearch from './useSearch.js';
import useSocial from './useSocial.js';
import useAdmin from './useAdmin.js';
import useLibrary from './useLibrary.js';
import { useState } from 'react';

/**
 * Thin orchestrator that composes domain hooks and handles cross-cutting concerns.
 * Components should migrate to useApp() context hook for narrower subscriptions.
 */
export default function useAppController() {
    const auth = useAuth();
    const ui = useUI();
    const content = useContent(auth.user, ui.showToast);
    const details = useDetails();
    const player = usePlayer(auth.user, details.media, ui.showToast, auth.userApproved, details.isAnimeContent, details.animeData, content.addToHistory);
    const search = useSearch(ui.showToast);
    const social = useSocial(auth.user, ui.showToast);
    const admin = useAdmin(auth.user, auth.isAdmin, ui.showToast);
    const lib = useLibrary(auth.user, ui.showToast);
    const [statusPickerItem, setStatusPickerItem] = useState(null);

    const syncWithDB = useCallback(async (userId, email) => {
        auth.setLoading(true);
        try {
            await auth.loadUserProfile(userId, email);
            await Promise.race([
                Promise.all([
                    content.loadData(),
                    content.loadFavorites(userId),
                    content.loadHistory(userId),
                    social.loadFriends(userId),
                    lib.loadLibrary(userId),
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
            ]);
        } catch (e) {
            console.warn('[HADES] Sync timeout or error:', e.message);
        }
        auth.setLoading(false);

        Promise.all([
            content.loadReviews(userId),
            content.loadWatchlist(userId),
            admin.loadCuratedLists(),
            social.loadNotifications(),
            social.loadCollections(),
            social.loadMyReactions(),
        ]).catch(() => {});
    }, [auth, content, admin, social]);

    // Trigger sync when user logs in
    useEffect(() => {
        if (auth.user) syncWithDB(auth.user.id, auth.user.email);
    }, [auth.user]);

    // Hash-based deep linking
    useEffect(() => {
        const handleHash = () => {
            const [type, id] = window.location.hash.substring(1).split('/');
            if (id) details.openDetails({ id }, type);
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    // Load "For You" when history loads
    useEffect(() => {
        if (content.history.length > 0 && content.forYou.length === 0) content.loadForYou();
    }, [content.history]);

    // Lazy-load review posters
    useEffect(() => {
        if (content.reviews.length === 0 || ui.profileTab !== 'reviews') return;
        const missing = content.reviews.filter(r => {
            if (content.reviewPosters[r.movie_id]) return false;
            const inFav = content.favorites.find(f => f.item_id === r.movie_id);
            const inHist = content.history.find(h => h.item_id === r.movie_id);
            return !inFav?.poster_path && !inHist?.poster_path;
        });
        if (missing.length === 0) return;
        const fetchPosters = async () => {
            const newPosters = { ...content.reviewPosters };
            await Promise.all(missing.map(async (r) => {
                try {
                    const type = r.media_type === 'tv' ? 'tv' : 'movie';
                    const res = await fetch(`https://api.themoviedb.org/3/${type}/${r.movie_id}?api_key=${TMDB_KEY}`);
                    const d = await res.json();
                    if (d.poster_path) newPosters[r.movie_id] = d.poster_path;
                } catch (e) { console.warn('Failed to fetch poster:', e.message); }
            }));
            content.setReviewPosters(newPosters);
        };
        fetchPosters();
    }, [content.reviews, ui.profileTab]);

    // Hero carousel auto-cycles
    useEffect(() => {
        if (content.trending.length <= 1) return;
        const max = Math.min(content.trending.length, 5);
        const timer = setInterval(() => ui.setHeroIndex(prev => (prev + 1) % max), 7000);
        return () => clearInterval(timer);
    }, [content.trending]);

    useEffect(() => {
        if (content.tvPopular.length <= 1) return;
        const max = Math.min(content.tvPopular.length, 5);
        const timer = setInterval(() => ui.setTvHeroIndex(prev => (prev + 1) % max), 8000);
        return () => clearInterval(timer);
    }, [content.tvPopular]);

    useEffect(() => {
        const allAnime = [...content.animeSeries, ...content.animeMovies];
        if (allAnime.length <= 1) return;
        const max = Math.min(allAnime.length, 5);
        const timer = setInterval(() => ui.setAnimeHeroIndex(prev => (prev + 1) % max), 9000);
        return () => clearInterval(timer);
    }, [content.animeSeries, content.animeMovies]);

    const animeRef = useRef(null);
    useEffect(() => {
        import('animejs/lib/anime.es.js').then(m => { animeRef.current = m.default; });
    }, []);

    useEffect(() => {
        if (!details.detailsOpen || !animeRef.current) return;
        const a = animeRef.current;
        a({ targets: '.details', opacity: [0, 1], easing: 'easeOutExpo', duration: 400 });
        a({ targets: '.details-backdrop', scale: [1.1, 1], easing: 'easeOutExpo', duration: 800 });
        a({ targets: '.details-title, .details-meta, .detail-genre-tags, .details-overview', opacity: [0, 1], translateY: [25, 0], easing: 'easeOutCubic', duration: 500, delay: a.stagger(60, { start: 200 }) });
        a({ targets: '.source-btn, .play-main-btn', opacity: [0, 1], translateY: [15, 0], easing: 'easeOutCubic', duration: 400, delay: a.stagger(80, { start: 400 }) });
    }, [details.detailsOpen]);

    useEffect(() => {
        if (!animeRef.current || !content.trending.length) return;
        animeRef.current({ targets: '.hero-slide.active .hero-content', opacity: [0, 1], translateX: [-30, 0], easing: 'easeOutExpo', duration: 700 });
    }, [ui.heroIndex]);

    // ESC key closes topmost overlay (best practice: keyboard accessibility)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            if (player.playerOpen) { player.closePlayer(); return; }
            if (search.searchOpen) { search.setSearchOpen(false); return; }
            if (ui.moodOpen) { ui.setMoodOpen(false); return; }
            if (social.notifOpen) { social.setNotifOpen(false); return; }
            if (details.detailsOpen) { details.closeDetails(); return; }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [player.playerOpen, search.searchOpen, ui.moodOpen, social.notifOpen, details.detailsOpen]);

    // Swipe-to-go-back for details
    useEffect(() => {
        let touchStartX = 0;
        const handleTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
        const handleTouchEnd = (e) => {
            const diff = e.changedTouches[0].clientX - touchStartX;
            if (diff > 100 && touchStartX < 40) {
                if (!player.playerOpen && details.detailsOpen) details.closeDetails();
            }
        };
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => { document.removeEventListener('touchstart', handleTouchStart); document.removeEventListener('touchend', handleTouchEnd); };
    }, [player.playerOpen, details.detailsOpen]);

    // Save progress on unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (player.playerOpen && details.media) {
                const stored = getStoredProgress(details.media.id);
                if (stored) {
                    try {
                        const pending = JSON.parse(localStorage.getItem('hades_pending_sync') || '[]');
                        pending.push({ item_id: String(details.media.id), media_type: details.media.media_type || 'movie', title: details.media.title || details.media.name, poster_path: details.media.poster_path || null, backdrop_path: details.media.backdrop_path || null, watched_at: new Date().toISOString() });
                        localStorage.setItem('hades_pending_sync', JSON.stringify(pending));
                    } catch (e) { console.warn('Failed to save pending sync:', e.message); }
                }
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [player.playerOpen, details.media]);

    // Sync pending history on app load
    useEffect(() => {
        if (!auth.user) return;
        try {
            const pending = JSON.parse(localStorage.getItem('hades_pending_sync') || '[]');
            if (pending.length > 0) {
                pending.forEach(async (p) => {
                    try {
                        await supabase.from('history').delete().eq('user_id', auth.user.id).eq('item_id', p.item_id);
                        await supabase.from('history').insert({ user_id: auth.user.id, ...p });
                    } catch (e) { console.warn('Failed to sync history item:', e.message); }
                });
                localStorage.removeItem('hades_pending_sync');
            }
        } catch (e) { console.warn('Failed to process pending sync:', e.message); }
    }, [auth.user]);

    // Review wrapper — bridges ReviewModal (no-args) with content.addReview (needs params)
    const addReview = useCallback(async () => {
        if (!details.media || !details.reviewText.trim()) return;
        const ok = await content.addReview(
            details.media, details.reviewText, details.reviewRating,
            auth.userProfile, details.movieComments, details.setMovieComments
        );
        if (ok) {
            details.setReviewOpen(false);
            details.setReviewText('');
            details.setReviewRating(7);
        }
    }, [details, content, auth.userProfile]);

    // Random movie
    const openRandomMovie = useCallback(() => {
        const pool = [...content.popular, ...content.topRated, ...content.trending].filter(m => m.poster_path);
        if (pool.length === 0) return;
        ui.setRandomSpinning(true);
        auth.tg?.HapticFeedback?.impactOccurred?.('medium');
        setTimeout(() => {
            const item = pool[Math.floor(Math.random() * pool.length)];
            details.openDetails(item, item.media_type || 'movie');
            ui.setRandomSpinning(false);
        }, 500);
    }, [content.popular, content.topRated, content.trending, details, ui, auth.tg]);

    // Profile completion
    const profileCompletion = useMemo(() => {
        let score = 0;
        if (auth.userProfile?.username) score += 20;
        if (auth.userProfile?.avatar_url) score += 25;
        if (auth.userProfile?.cover_url) score += 15;
        if (content.favorites.length > 0) score += 15;
        if (content.reviews.length > 0) score += 15;
        if (social.friends.length > 0) score += 10;
        return Math.min(100, score);
    }, [auth.userProfile, content.favorites, content.reviews, social.friends]);

    // Mood quiz wrapper
    const fetchMoodResults = useCallback(async () => {
        await content.fetchMoodResults(ui.moodMood, ui.moodType, ui.moodDuration, ui.setMoodResults, ui.setMoodLoading, ui.setMoodStep);
    }, [content, ui]);

    // Genre-filtered lists
    const filteredPopular = useMemo(() => content.createGenreFilter(content.popular, ui.homeGenre), [content.popular, ui.homeGenre, content.createGenreFilter]);
    const filteredTopRated = useMemo(() => content.createGenreFilter(content.topRated, ui.homeGenre), [content.topRated, ui.homeGenre, content.createGenreFilter]);
    const filteredTvOnAir = useMemo(() => content.createGenreFilter(content.tvOnAir, ui.tvGenre), [content.tvOnAir, ui.tvGenre, content.createGenreFilter]);
    const filteredTvPopular = useMemo(() => content.createGenreFilter(content.tvPopular, ui.tvGenre), [content.tvPopular, ui.tvGenre, content.createGenreFilter]);
    const filteredTvTop = useMemo(() => content.createGenreFilter(content.tvTop, ui.tvGenre), [content.tvTop, ui.tvGenre, content.createGenreFilter]);
    const filteredAnimeSeries = useMemo(() => content.createGenreFilter(content.animeSeries, ui.animeGenre, ANIME_GENRE_MAP), [content.animeSeries, ui.animeGenre, content.createGenreFilter]);
    const filteredAnimeMovies = useMemo(() => content.createGenreFilter(content.animeMovies, ui.animeGenre, ANIME_GENRE_MAP), [content.animeMovies, ui.animeGenre, content.createGenreFilter]);

    // Compose the full app object (backward compat)
    return {
        supabase, I, IMG, BACKDROP, FALLBACK_SOURCES,
        getStoredProgress, formatWatchTime, pluralize, ratingColor,
        HOME_GENRES, TV_GENRES, ANIME_GENRES, MOOD_MAP,
        isRuSource,
        ...auth,
        ...ui,
        ...content,
        ...details,
        ...player,
        ...search,
        ...social,
        ...admin,
        ...lib,
        statusPickerItem, setStatusPickerItem,
        addReview,
        syncWithDB,
        openRandomMovie,
        profileCompletion,
        fetchMoodResults,
        filteredPopular, filteredTopRated,
        filteredTvOnAir, filteredTvPopular, filteredTvTop,
        filteredAnimeSeries, filteredAnimeMovies,
        filterTv: (items) => content.createGenreFilter(items, ui.tvGenre),
        filterAnime: (items) => content.createGenreFilter(items, ui.animeGenre, ANIME_GENRE_MAP),
        filterByGenre: (items) => content.createGenreFilter(items, ui.homeGenre),
    };
}
