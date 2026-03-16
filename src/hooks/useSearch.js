import { useCallback, useEffect, useState } from 'react';
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

    const addToSearchHistory = useCallback((q) => {
        if (!q.trim()) return;
        const updated = [q, ...searchHistory.filter(h => h !== q)].slice(0, 5);
        setSearchHistory(updated);
        localStorage.setItem('hades_search_history', JSON.stringify(updated));
    }, [searchHistory]);

    const clearSearchHistory = useCallback(() => {
        setSearchHistory([]);
        localStorage.removeItem('hades_search_history');
    }, []);

    const searchContent = useCallback(async (q) => {
        if (!q.trim()) { setResults([]); setSearchLoading(false); return; }
        setSearchLoading(true);
        const data = await api(`/search/multi?query=${encodeURIComponent(q)}`);
        if (data) setResults((data.results || []).filter(r => r.media_type !== 'person'));
        setSearchLoading(false);
        addToSearchHistory(q);
    }, [addToSearchHistory]);

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

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => searchContent(query), 150);
        return () => clearTimeout(timeout);
    }, [query, searchContent]);

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
