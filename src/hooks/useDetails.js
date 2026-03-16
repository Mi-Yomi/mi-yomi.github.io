import { useCallback, useState } from 'react';
import { api, getImdbId, getMalId, isAnime, searchAlloha, searchCollaps } from '../lib/api/tmdb.js';
import { supabase } from '../lib/api/supabase.js';

export default function useDetails() {
    const [media, setMedia] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [collapsData, setCollapsData] = useState(null);
    const [allohaData, setAllohaData] = useState(null);
    const [animeData, setAnimeData] = useState(null);
    const [isAnimeContent, setIsAnimeContent] = useState(false);
    const [sourceLoading, setSourceLoading] = useState(false);
    const [movieComments, setMovieComments] = useState([]);
    const [seasonsData, setSeasonsData] = useState([]);
    const [overviewExpanded, setOverviewExpanded] = useState(false);
    const [recommendations, setRecommendations] = useState([]);

    const loadMovieComments = useCallback(async (movieId) => {
        const { data, error } = await supabase.from('reviews').select('*, profiles(username, tag, avatar_url)').eq('movie_id', String(movieId)).order('created_at', { ascending: false });
        if (error) console.error('Comments load error (RLS?):', error);
        setMovieComments(data || []);
    }, []);

    const loadRecommendations = useCallback(async (id, type) => {
        const data = await api(`/${type}/${id}/recommendations`);
        setRecommendations((data?.results || []).slice(0, 12));
    }, []);

    const loadSources = useCallback(async (data, type) => {
        setSourceLoading(true);
        setCollapsData(null);
        setAllohaData(null);
        setAnimeData(null);
        setIsAnimeContent(false);
        const animeFlag = isAnime(data);
        setIsAnimeContent(animeFlag);
        if (animeFlag) {
            const malId = await getMalId(data.original_name || data.name);
            if (malId) setAnimeData({ myAnimeListId: malId });
        }
        const imdbId = await getImdbId(data.id, type);
        if (imdbId) {
            const collaps = await searchCollaps(imdbId);
            setCollapsData(collaps);
            if (collaps?.kinopoisk_id) setAllohaData(await searchAlloha(collaps.kinopoisk_id));
        }
        setSourceLoading(false);
    }, []);

    const openDetails = useCallback(async (item, type = 'movie') => {
        window.location.hash = `${type}/${item.id}`;
        setSeasonsData([]);
        setOverviewExpanded(false);
        setRecommendations([]);
        const [data, credits] = await Promise.all([
            api(`/${type}/${item.id}`),
            api(`/${type}/${item.id}/credits`),
        ]);
        if (data) {
            setMedia({ ...data, media_type: type, credits: credits || {} });
            setDetailsOpen(true);
            loadSources(data, type);
            loadMovieComments(data.id);
            loadRecommendations(data.id, type);
            if (type === 'tv' && data.number_of_seasons) {
                const seasonsPromises = Array.from({ length: Math.min(data.number_of_seasons, 20) }, (_, i) =>
                    api(`/tv/${data.id}/season/${i + 1}`)
                );
                const seasons = await Promise.all(seasonsPromises);
                setSeasonsData(seasons.filter(Boolean).map(s => ({
                    season_number: s.season_number,
                    episode_count: s.episodes?.length || 0,
                    name: s.name,
                })));
            }
        }
    }, [loadSources, loadMovieComments, loadRecommendations]);

    const closeDetails = useCallback(() => {
        setDetailsOpen(false);
        window.history.pushState('', '', window.location.pathname);
        setMedia(null);
        setCollapsData(null);
        setAllohaData(null);
        setMovieComments([]);
        setSeasonsData([]);
    }, []);

    return {
        media, setMedia,
        detailsOpen, setDetailsOpen,
        collapsData, setCollapsData,
        allohaData, setAllohaData,
        animeData, setAnimeData,
        isAnimeContent, setIsAnimeContent,
        sourceLoading, setSourceLoading,
        movieComments, setMovieComments,
        seasonsData, setSeasonsData,
        overviewExpanded, setOverviewExpanded,
        recommendations, setRecommendations,
        loadMovieComments, loadRecommendations, loadSources,
        openDetails, closeDetails,
    };
}
