import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api/tmdb.js';

export default function useSearch(showToast) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('hades_search_history') || '[]'); } catch { return []; }
    });

    // Advanced search / discover
    const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
    const [searchFilterType, setSearchFilterType] = useState('all');
    const [searchFilterGenre, setSearchFilterGenre] = useState('');
    const [searchFilterYearFrom, setSearchFilterYearFrom] = useState('');
    const [searchFilterYearTo, setSearchFilterYearTo] = useState('');
    const [searchFilterRating, setSearchFilterRating] = useState(0);
    const [searchFilterSort, setSearchFilterSort] = useState('popularity.desc');
    const [discoverResults, setDiscoverResults] = useState([]);
    const abortRef = useRef(null);

    const addToSearchHistory = useCallback((q) => {
        if (!q.trim()) return;
        const updated = [q, ...searchHistory.filter(h => h !== q)].slice(0, 8);
        setSearchHistory(updated);
        localStorage.setItem('hades_search_history', JSON.stringify(updated));
    }, [searchHistory]);

    const clearSearchHistory = useCallback(() => {
        setSearchHistory([]);
        localStorage.removeItem('hades_search_history');
    }, []);

    const searchContent = useCallback(async (q) => {
        // Abort previous request
        if (abortRef.current) abortRef.current.abort();

        const trimmed = q.trim();
        if (!trimmed || trimmed.length < 2) {
            setResults([]);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            // Search movies and TV in parallel for better results when type is 'all'
            const searchType = searchFilterType;

            if (searchType === 'all') {
                const [movieData, tvData] = await Promise.all([
                    api(`/search/movie?query=${encodeURIComponent(trimmed)}`),
                    api(`/search/tv?query=${encodeURIComponent(trimmed)}`),
                ]);

                if (controller.signal.aborted) return;

                const movies = (movieData?.results || []).map(r => ({ ...r, media_type: 'movie' }));
                const tvShows = (tvData?.results || []).map(r => ({ ...r, media_type: 'tv' }));

                // Merge and rank results
                const merged = [...movies, ...tvShows]
                    .filter(r => r.poster_path) // Only items with posters
                    .sort((a, b) => {
                        // Exact title match gets priority
                        const qLower = trimmed.toLowerCase();
                        const aTitle = (a.title || a.name || '').toLowerCase();
                        const bTitle = (b.title || b.name || '').toLowerCase();
                        const aExact = aTitle === qLower || aTitle.startsWith(qLower) ? 1 : 0;
                        const bExact = bTitle === qLower || bTitle.startsWith(qLower) ? 1 : 0;
                        if (aExact !== bExact) return bExact - aExact;
                        // Then by popularity * vote_count (quality signal)
                        const aScore = (a.popularity || 0) * Math.log10((a.vote_count || 1) + 1);
                        const bScore = (b.popularity || 0) * Math.log10((b.vote_count || 1) + 1);
                        return bScore - aScore;
                    })
                    .slice(0, 30);

                setResults(merged);
            } else {
                const type = searchType === 'tv' ? 'tv' : 'movie';
                const data = await api(`/search/${type}?query=${encodeURIComponent(trimmed)}`);
                if (controller.signal.aborted) return;
                const items = (data?.results || [])
                    .map(r => ({ ...r, media_type: type }))
                    .filter(r => r.poster_path)
                    .slice(0, 30);
                setResults(items);
            }

            addToSearchHistory(trimmed);
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('[HADES] Search error:', e.message);
        }

        if (!controller.signal.aborted) setSearchLoading(false);
    }, [addToSearchHistory, searchFilterType]);

    const runDiscover = useCallback(async () => {
        setSearchLoading(true);
        const type = searchFilterType === 'tv' ? 'tv' : 'movie';
        let url = `/discover/${type}?sort_by=${searchFilterSort}`;
        if (searchFilterGenre) url += `&with_genres=${searchFilterGenre}`;
        if (searchFilterYearFrom) url += type === 'movie' ? `&primary_release_date.gte=${searchFilterYearFrom}-01-01` : `&first_air_date.gte=${searchFilterYearFrom}-01-01`;
        if (searchFilterYearTo) url += type === 'movie' ? `&primary_release_date.lte=${searchFilterYearTo}-12-31` : `&first_air_date.lte=${searchFilterYearTo}-12-31`;
        if (searchFilterRating > 0) url += `&vote_average.gte=${searchFilterRating}&vote_count.gte=50`;
        const data = await api(url);
        setDiscoverResults((data?.results || []).map(r => ({ ...r, media_type: type })));
        setSearchLoading(false);
    }, [searchFilterType, searchFilterSort, searchFilterGenre, searchFilterYearFrom, searchFilterYearTo, searchFilterRating]);

    // Debounced search (400ms — balanced between responsiveness and API calls)
    useEffect(() => {
        const timeout = setTimeout(() => searchContent(query), 400);
        return () => clearTimeout(timeout);
    }, [query, searchContent]);

    // Cleanup abort controller
    useEffect(() => {
        return () => { if (abortRef.current) abortRef.current.abort(); };
    }, []);

    return {
        searchOpen, setSearchOpen,
        query, setQuery,
        results, setResults,
        searchLoading, setSearchLoading,
        searchHistory,
        searchFiltersOpen, setSearchFiltersOpen,
        searchFilterType, setSearchFilterType,
        searchFilterGenre, setSearchFilterGenre,
        searchFilterYearFrom, setSearchFilterYearFrom,
        searchFilterYearTo, setSearchFilterYearTo,
        searchFilterRating, setSearchFilterRating,
        searchFilterSort, setSearchFilterSort,
        discoverResults, setDiscoverResults,
        searchContent, runDiscover,
        addToSearchHistory, clearSearchHistory,
    };
}
