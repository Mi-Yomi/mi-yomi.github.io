import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { LIBRARY_STATUSES } from '../lib/libraryStatuses';
import { MOOD_MAP } from '../lib/utils';
import { getStoredProgress } from '../lib/utils';

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const { user } = useAuth();
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
    const [favorites, setFavorites] = useState([]);
    const [history, setHistory] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [library, setLibrary] = useState([]);
    const [curatedLists, setCuratedLists] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    const loadCatalog = useCallback(async () => {
        setDataLoading(true);
        const [t, p, tvp] = await Promise.all([api('/trending/all/week'), api('/movie/popular'), api('/tv/popular')]);
        if (t) setTrending(t.results || []);
        if (p) setPopular(p.results || []);
        if (tvp) setTvPopular(tvp.results || []);
        setDataLoading(false);
        const [tr, tvt, tva, am, as2, up] = await Promise.all([
            api('/movie/top_rated'), api('/tv/top_rated'), api('/tv/on_the_air'),
            api('/discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
            api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'),
            api('/movie/upcoming?region=RU'),
        ]);
        if (tr) setTopRated(tr.results || []);
        if (tvt) setTvTop(tvt.results || []);
        if (tva) setTvOnAir(tva.results || []);
        if (am) setAnimeMovies(am.results || []);
        if (as2) setAnimeSeries(as2.results || []);
        if (up) {
            const future = (up.results || []).filter(m => m.release_date && new Date(m.release_date) > new Date()).sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
            setUpcoming(future.slice(0, 15));
        }
    }, []);

    const loadCuratedLists = useCallback(async () => {
        const { data } = await supabase.from('curated_lists').select('*').order('created_at', { ascending: false });
        if (data) setCuratedLists(data);
    }, []);

    const loadUserData = useCallback(async (userId) => {
        const [fav, hist, wl, lib, rev] = await Promise.all([
            supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
            supabase.from('history').select('*').eq('user_id', userId).order('watched_at', { ascending: false }).limit(30),
            supabase.from('watchlist').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('user_library').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
            supabase.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        ]);
        if (fav.data) setFavorites(fav.data);
        if (hist.data) setHistory(hist.data);
        if (wl.data) setWatchlist(wl.data);
        if (lib.data) setLibrary(lib.data);
        if (rev.data) setReviews(rev.data);
    }, []);

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

    const fetchMoodResults = useCallback(async (moodMood, moodType, moodDuration) => {
        const genreStr = MOOD_MAP[moodMood]?.genres || '28';
        const type = moodType === 'tv' ? 'tv' : 'movie';
        let url = `/discover/${type}?with_genres=${genreStr}&sort_by=vote_average.desc&vote_count.gte=200`;
        if (moodDuration === 'short' && type === 'movie') url += '&with_runtime.lte=90';
        else if (moodDuration === 'medium' && type === 'movie') url += '&with_runtime.gte=90&with_runtime.lte=120';
        else if (moodDuration === 'long' && type === 'movie') url += '&with_runtime.gte=120';
        const data = await api(url);
        return (data?.results || []).slice(0, 6);
    }, []);

    useEffect(() => {
        loadCatalog();
        loadCuratedLists();
    }, [loadCatalog, loadCuratedLists]);

    useEffect(() => {
        if (user) loadUserData(user.id);
    }, [user, loadUserData]);

    useEffect(() => {
        if (history.length > 0 && forYou.length === 0) loadForYou();
    }, [history, forYou.length, loadForYou]);

    const toggleFavorite = useCallback(async (item, type) => {
        if (!user) return;
        const isFav = favorites.some(f => f.item_id === String(item.id));
        if (isFav) {
            await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', String(item.id));
            setFavorites(prev => prev.filter(f => f.item_id !== String(item.id)));
        } else {
            const favItem = { user_id: user.id, item_id: String(item.id), media_type: type, title: item.title || item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, vote_average: item.vote_average, release_date: item.release_date || item.first_air_date };
            await supabase.from('favorites').insert(favItem);
            setFavorites(prev => [favItem, ...prev]);
        }
    }, [user, favorites]);

    const toggleWatchlist = useCallback(async (item, type) => {
        if (!user) return;
        const isIn = watchlist.some(w => w.item_id === String(item.id));
        if (isIn) {
            await supabase.from('watchlist').delete().eq('user_id', user.id).eq('item_id', String(item.id));
            setWatchlist(prev => prev.filter(w => w.item_id !== String(item.id)));
        } else {
            const wItem = { user_id: user.id, item_id: String(item.id), media_type: type, title: item.title || item.name, poster_path: item.poster_path, backdrop_path: item.backdrop_path, vote_average: item.vote_average, release_date: item.release_date || item.first_air_date };
            await supabase.from('watchlist').insert(wItem);
            setWatchlist(prev => [wItem, ...prev]);
        }
    }, [user, watchlist]);

    const addToHistory = useCallback(async (item, type, season = null, episode = null) => {
        if (!user || !item) return;
        const itemId = String(item.id);
        await supabase.from('history').delete().eq('user_id', user.id).eq('item_id', itemId);
        const coreItem = {
            user_id: user.id, item_id: itemId, media_type: type || 'movie',
            title: item.title || item.name || 'Unknown', poster_path: item.poster_path || null,
            watched_at: new Date().toISOString(), last_season: season, last_episode: episode,
        };
        await supabase.from('history').insert(coreItem);
        const localItem = { ...coreItem, backdrop_path: item.backdrop_path, vote_average: item.vote_average || 0, release_date: item.release_date || item.first_air_date };
        setHistory(prev => [localItem, ...prev.filter(h => h.item_id !== itemId)].slice(0, 50));
    }, [user]);

    const setItemStatus = useCallback(async (item, type, status) => {
        if (!user) return;
        const itemId = String(item.id);
        const existing = library.find(l => l.item_id === itemId);
        if (existing && existing.status === status) {
            await supabase.from('user_library').delete().eq('user_id', user.id).eq('item_id', itemId);
            setLibrary(prev => prev.filter(l => l.item_id !== itemId));
            return;
        }
        const row = { user_id: user.id, item_id: itemId, media_type: type || 'movie', status, title: item.title || item.name, poster_path: item.poster_path, vote_average: item.vote_average || 0, updated_at: new Date().toISOString() };
        await supabase.from('user_library').upsert(row, { onConflict: 'user_id,item_id' });
        setLibrary(prev => [row, ...prev.filter(l => l.item_id !== itemId)]);
    }, [user, library]);

    const getItemStatus = useCallback((itemId) => library.find(l => l.item_id === String(itemId))?.status || null, [library]);

    const sortItems = useCallback((items, sort) => {
        const arr = [...(items || [])];
        if (sort === 'date') return arr;
        if (sort === 'rating') return arr.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        if (sort === 'title') return arr.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
        return arr;
    }, []);

    const libraryByStatus = useMemo(() => {
        const map = {};
        LIBRARY_STATUSES.forEach(s => { map[s.id] = []; });
        library.forEach(item => {
            if (map[item.status]) map[item.status].push(item);
            else map.planned.push(item);
        });
        return map;
    }, [library]);

    const libraryCounts = useMemo(() => {
        const counts = {};
        LIBRARY_STATUSES.forEach(s => { counts[s.id] = 0; });
        library.forEach(item => {
            if (counts[item.status] !== undefined) counts[item.status]++;
            else counts.planned++;
        });
        return counts;
    }, [library]);

    const value = useMemo(() => ({
        trending, popular, topRated, tvPopular, tvTop, tvOnAir, animeMovies, animeSeries, upcoming, forYou,
        favorites, history, watchlist, reviews, library, curatedLists, dataLoading,
        toggleFavorite, toggleWatchlist, setItemStatus, getItemStatus, addToHistory,
        loadCatalog, loadUserData, loadForYou, fetchMoodResults, loadCuratedLists,
        sortItems, libraryByStatus, libraryCounts,
    }), [trending, popular, topRated, tvPopular, tvTop, tvOnAir, animeMovies, animeSeries, upcoming, forYou, favorites, history, watchlist, reviews, library, curatedLists, dataLoading, toggleFavorite, toggleWatchlist, setItemStatus, getItemStatus, addToHistory, sortItems, libraryByStatus, libraryCounts]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be inside DataProvider');
    return ctx;
}
