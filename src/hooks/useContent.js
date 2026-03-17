import { useCallback, useMemo, useState } from 'react';
import { api } from '../lib/api/tmdb.js';
import { supabase } from '../lib/api/supabase.js';
import { TMDB_KEY } from '../lib/config.js';
import { ANIME_GENRE_MAP, GENRE_NAMES, MOOD_MAP } from '../lib/utils.js';
import { getStoredProgress } from '../lib/utils.js';

export default function useContent(user, showToast) {
    const tg = window.Telegram?.WebApp;

    // Media catalog
    const [trending, setTrending] = useState([]);
    const [popular, setPopular] = useState([]);
    const [topRated, setTopRated] = useState([]);
    const [tvPopular, setTvPopular] = useState([]);
    const [tvTop, setTvTop] = useState([]);
    const [tvOnAir, setTvOnAir] = useState([]);
    const [animeMovies, setAnimeMovies] = useState([]);
    const [animeSeries, setAnimeSeries] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [forYou, setForYou] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    // User library
    const [favorites, setFavorites] = useState([]);
    const [history, setHistory] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [reviewPosters, setReviewPosters] = useState({});
    const [watchlist, setWatchlist] = useState([]);

    const loadData = useCallback(async () => {
        setDataLoading(true);
        try {
            const [t, p, tvp] = await Promise.all([
                api('/trending/all/week'),
                api('/movie/popular'),
                api('/tv/popular'),
            ]);
            if (t) setTrending(t.results || []);
            if (p) setPopular(p.results || []);
            if (tvp) setTvPopular(tvp.results || []);
            setDataLoading(false);

            const [tr, tvt, tva, animeM, animeS, up] = await Promise.all([
                api('/movie/top_rated'),
                api('/tv/top_rated'),
                api('/tv/on_the_air'),
                api('/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
                api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
                api('/movie/upcoming?region=RU'),
            ]);
            if (tr) setTopRated(tr.results || []);
            if (tvt) setTvTop(tvt.results || []);
            if (tva) setTvOnAir(tva.results || []);
            if (animeM) setAnimeMovies(animeM.results || []);
            if (animeS) setAnimeSeries(animeS.results || []);
            if (up) {
                const future = (up.results || []).filter(m => m.release_date && new Date(m.release_date) > new Date()).sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
                setUpcoming(future.slice(0, 15));
            }
        } catch (e) {
            console.error('Failed to load data:', e);
            setDataLoading(false);
        }
    }, []);

    const [favHasMore, setFavHasMore] = useState(true);
    const [histHasMore, setHistHasMore] = useState(true);
    const [revHasMore, setRevHasMore] = useState(true);

    const loadFavorites = useCallback(async (userId) => {
        const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
        if (error) console.error('Favorites load error:', error.message);
        if (data) { setFavorites(data); setFavHasMore(data.length >= 30); }
    }, []);

    const loadMoreFavorites = useCallback(async (userId) => {
        if (!favHasMore) return;
        const { data } = await supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }).range(favorites.length, favorites.length + 29);
        if (data && data.length > 0) { setFavorites(prev => [...prev, ...data]); setFavHasMore(data.length >= 30); }
        else setFavHasMore(false);
    }, [favorites.length, favHasMore]);

    const loadHistory = useCallback(async (userId) => {
        let result = await supabase.from('history').select('*').eq('user_id', userId).order('watched_at', { ascending: false }).limit(30);
        if (result.error) result = await supabase.from('history').select('*').eq('user_id', userId).limit(30);
        if (result.error) console.error('History load error:', result.error.message);
        if (result.data) { setHistory(result.data); setHistHasMore(result.data.length >= 30); }
    }, []);

    const loadMoreHistory = useCallback(async (userId) => {
        if (!histHasMore) return;
        let result = await supabase.from('history').select('*').eq('user_id', userId).order('watched_at', { ascending: false }).range(history.length, history.length + 29);
        if (result.error) result = await supabase.from('history').select('*').eq('user_id', userId).range(history.length, history.length + 29);
        if (result.data && result.data.length > 0) { setHistory(prev => [...prev, ...result.data]); setHistHasMore(result.data.length >= 30); }
        else setHistHasMore(false);
    }, [history.length, histHasMore]);

    const loadReviews = useCallback(async (userId) => {
        const { data, error } = await supabase.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
        if (error) console.error('Reviews load error:', error.message);
        if (data) { setReviews(data); setRevHasMore(data.length >= 30); }
    }, []);

    const loadWatchlist = useCallback(async (userId) => {
        const { data } = await supabase.from('watchlist').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (data) setWatchlist(data);
    }, []);

    const toggleFavorite = useCallback(async (item, type) => {
        if (!user) return;
        const isFav = favorites.some(f => f.item_id === String(item.id));
        if (isFav) {
            tg?.HapticFeedback?.impactOccurred?.('light');
            await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', String(item.id));
            setFavorites(prev => prev.filter(f => f.item_id !== String(item.id)));
            showToast('Убрано из избранного');
        } else {
            tg?.HapticFeedback?.notificationOccurred?.('success');
            const favItem = { user_id: user.id, item_id: String(item.id), media_type: type, title: item.title || item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, vote_average: item.vote_average, release_date: item.release_date || item.first_air_date };
            await supabase.from('favorites').insert(favItem);
            setFavorites([favItem, ...favorites]);
            showToast('Добавлено в избранное');
        }
    }, [user, favorites, showToast, tg]);

    const toggleWatchlist = useCallback(async (item, type) => {
        if (!user) return;
        const isIn = watchlist.some(w => w.item_id === String(item.id));
        if (isIn) {
            tg?.HapticFeedback?.impactOccurred?.('light');
            await supabase.from('watchlist').delete().eq('user_id', user.id).eq('item_id', String(item.id));
            setWatchlist(prev => prev.filter(w => w.item_id !== String(item.id)));
            showToast('Убрано из «Буду смотреть»');
        } else {
            tg?.HapticFeedback?.notificationOccurred?.('success');
            const wItem = { user_id: user.id, item_id: String(item.id), media_type: type, title: item.title || item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, vote_average: item.vote_average, release_date: item.release_date || item.first_air_date };
            const { error } = await supabase.from('watchlist').insert(wItem);
            if (error) { console.error('Watchlist error:', error); return; }
            setWatchlist([wItem, ...watchlist]);
            showToast('Буду смотреть!');
        }
    }, [user, watchlist, showToast, tg]);

    const addToHistory = useCallback(async (item, type, season = null, episode = null, playerSource = '') => {
        if (!user || !item) return;
        const itemId = String(item.id);
        const coreItem = {
            user_id: user.id, item_id: itemId, media_type: type || 'movie',
            title: item.title || item.name || 'Unknown', poster_path: item.poster_path || null,
            watched_at: new Date().toISOString(),
        };
        try {
            await supabase.from('history').delete().eq('user_id', user.id).eq('item_id', itemId);
            const { error } = await supabase.from('history').insert(coreItem);
            if (error) console.warn('History insert error:', error.message);
        } catch (e) { console.error('History save exception:', e); }
        const localItem = {
            ...coreItem,
            backdrop_path: item.backdrop_path || null,
            vote_average: item.vote_average || 0,
            release_date: item.release_date || item.first_air_date || null,
            last_season: season, last_episode: episode,
            last_source: playerSource || null,
            progress: (() => { const p = getStoredProgress(item.id); return p && p.duration > 0 ? Math.min(95, Math.round((p.time / p.duration) * 100)) : 5; })(),
        };
        setHistory(prev => [localItem, ...prev.filter(h => h.item_id !== itemId)].slice(0, 50));
    }, [user]);

    const addReview = useCallback(async (media, reviewText, reviewRating, userProfile, movieComments, setMovieComments) => {
        if (!user || !media || !reviewText.trim()) return;
        const ratingValue = Math.max(1, Math.min(10, Math.round(Number(reviewRating) || 0)));
        const newReview = {
            user_id: user.id, movie_id: String(media.id), media_type: media.media_type,
            title: media.title || media.name, content: reviewText, rating: ratingValue,
            created_at: new Date().toISOString(),
        };
        const { data, error } = await supabase.from('reviews').insert(newReview).select().single();
        if (error) {
            console.error('Review insert error:', error);
            const isRatingCheck = String(error.message || '').includes('reviews_rating_check') || error.code === '23514';
            if (isRatingCheck) {
                alert('Не удалось сохранить отзыв: проверьте CHECK constraint на reviews.rating в Supabase (должен быть 1-10).');
                return false;
            }
            alert('Не удалось сохранить отзыв: ' + (error.message || 'Ошибка'));
            return false;
        }
        const savedReview = data || newReview;
        setReviews(prev => [savedReview, ...prev]);
        if (setMovieComments) setMovieComments(prev => [{ ...savedReview, profiles: userProfile }, ...prev]);
        tg?.HapticFeedback?.notificationOccurred?.('success');
        showToast('Отзыв опубликован!');
        return true;
    }, [user, showToast, tg]);

    // For You recommendations based on history
    const loadForYou = useCallback(async () => {
        if (history.length === 0) return;
        const recentIds = history.slice(0, 5);
        const allRecs = [];
        await Promise.all(recentIds.map(async (h) => {
            const type = h.media_type || 'movie';
            const data = await api(`/${type}/${h.item_id}/recommendations`);
            if (data?.results) allRecs.push(...data.results);
        }));
        const unique = allRecs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 20);
        setForYou(unique);
    }, [history]);

    // Mood quiz
    const fetchMoodResults = useCallback(async (moodMood, moodType, moodDuration, setMoodResults, setMoodLoading, setMoodStep) => {
        setMoodLoading(true);
        const genreStr = MOOD_MAP[moodMood]?.genres || '28';
        const type = moodType === 'tv' ? 'tv' : 'movie';
        let url = `/discover/${type}?with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=200`;
        if (moodDuration === 'short' && type === 'movie') url += '&with_runtime.lte=90';
        else if (moodDuration === 'medium' && type === 'movie') url += '&with_runtime.gte=90&with_runtime.lte=120';
        else if (moodDuration === 'long' && type === 'movie') url += '&with_runtime.gte=120';
        const data = await api(url);
        setMoodResults((data?.results || []).slice(0, 6));
        setMoodLoading(false);
        setMoodStep(3);
    }, []);

    // Sort items helper
    const sortItems = useCallback((items, sort) => {
        const arr = [...items];
        if (sort === 'date') return arr;
        if (sort === 'rating') return arr.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        if (sort === 'title') return arr.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
        return arr;
    }, []);

    // Stats
    const calcStats = useMemo(() => {
        const movieCount = history.filter(h => h.media_type === 'movie').length;
        const tvCount = history.filter(h => h.media_type === 'tv').length;
        const animeCount = history.filter(h => {
            if (h.media_type === 'anime') return true;
            const countries = h.origin_country || [];
            if (countries.includes('JP')) return true;
            if (h.genre_ids?.includes(16)) return true;
            return false;
        }).length;
        const total = history.length;
        const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1) : '—';
        let totalWatchMinutes = 0;
        history.forEach(h => {
            const itemId = h.item_id || h.id;
            const p = getStoredProgress(itemId);
            if (p?.time) totalWatchMinutes += p.time / 60;
        });
        const totalWatchHours = Math.round(totalWatchMinutes / 60);
        const now = new Date();
        const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 29 + i); return d.toISOString().split('T')[0]; });
        const activityMap = {};
        history.forEach(h => { const wd = h.watched_at || h.created_at; if (wd) { const day = wd.split('T')[0]; activityMap[day] = (activityMap[day] || 0) + 1; } });
        const activityCells = days.map(d => ({ date: d, count: activityMap[d] || 0 }));
        const genreCounts = {};
        [...favorites, ...history].forEach(item => { if (item.genre_ids) item.genre_ids.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }); });
        const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, name: GENRE_NAMES[id] || `#${id}`, count }));
        const maxGenreCount = topGenres[0]?.count || 1;
        return { movieCount, tvCount, animeCount, total, avgRating, totalWatchHours, activityCells, topGenres, maxGenreCount };
    }, [history, reviews, favorites]);

    const profileCompletion = useMemo(() => {
        return 0; // computed in orchestrator with userProfile access
    }, []);

    // Memoized genre filters
    const createGenreFilter = useCallback((items, genre, genreMap = null) => {
        if (genre === 'all') return items;
        if (genreMap) return items.filter(i => i.genre_ids?.includes(genreMap[genre]));
        return items.filter(i => i.genre_ids?.includes(Number(genre)));
    }, []);

    return {
        trending, setTrending,
        popular, setPopular,
        topRated, setTopRated,
        tvPopular, setTvPopular,
        tvTop, setTvTop,
        tvOnAir, setTvOnAir,
        animeMovies, setAnimeMovies,
        animeSeries, setAnimeSeries,
        upcoming, setUpcoming,
        forYou, setForYou,
        dataLoading, setDataLoading,
        favorites, setFavorites,
        history, setHistory,
        reviews, setReviews,
        reviewPosters, setReviewPosters,
        watchlist, setWatchlist,
        loadData, loadFavorites, loadHistory, loadReviews, loadWatchlist,
        loadMoreFavorites, loadMoreHistory,
        favHasMore, histHasMore, revHasMore,
        toggleFavorite, toggleWatchlist,
        addToHistory, addReview,
        loadForYou, fetchMoodResults,
        sortItems, calcStats,
        createGenreFilter,
    };
}
