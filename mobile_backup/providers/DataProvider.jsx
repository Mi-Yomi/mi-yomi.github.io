import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/tmdb';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

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
    const [favorites, setFavorites] = useState([]);
    const [history, setHistory] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [library, setLibrary] = useState([]);
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

    const loadUserData = useCallback(async (userId) => {
        const [fav, hist, wl, lib] = await Promise.all([
            supabase.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
            supabase.from('history').select('*').eq('user_id', userId).order('watched_at', { ascending: false }).limit(30),
            supabase.from('watchlist').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('user_library').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
        ]);
        if (fav.data) setFavorites(fav.data);
        if (hist.data) setHistory(hist.data);
        if (wl.data) setWatchlist(wl.data);
        if (lib.data) setLibrary(lib.data);
    }, []);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    useEffect(() => {
        if (user) loadUserData(user.id);
    }, [user, loadUserData]);

    const toggleFavorite = useCallback(async (item, type) => {
        if (!user) return;
        const isFav = favorites.some(f => f.item_id === String(item.id));
        if (isFav) {
            await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', String(item.id));
            setFavorites(prev => prev.filter(f => f.item_id !== String(item.id)));
        } else {
            const favItem = { user_id: user.id, item_id: String(item.id), media_type: type, title: item.title || item.name, poster_path: item.poster_path, vote_average: item.vote_average, release_date: item.release_date || item.first_air_date };
            await supabase.from('favorites').insert(favItem);
            setFavorites(prev => [favItem, ...prev]);
        }
    }, [user, favorites]);

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

    const value = useMemo(() => ({
        trending, popular, topRated, tvPopular, tvTop, tvOnAir, animeMovies, animeSeries, upcoming,
        favorites, history, watchlist, library, dataLoading,
        toggleFavorite, setItemStatus, getItemStatus,
        loadCatalog, loadUserData,
    }), [trending, popular, topRated, tvPopular, tvTop, tvOnAir, animeMovies, animeSeries, upcoming, favorites, history, watchlist, library, dataLoading, toggleFavorite, setItemStatus, getItemStatus]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be inside DataProvider');
    return ctx;
}
