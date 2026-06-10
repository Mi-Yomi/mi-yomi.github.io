import { useCallback, useState } from 'react';
import { api, getImdbId, getMalId, getVideos, isAnime, searchAlloha, searchCollaps } from '../lib/api/tmdb.js';
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
    const [videos, setVideos] = useState([]);

    // Review modal state
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewRating, setReviewRating] = useState(7);
    const [reviewText, setReviewText] = useState('');
    const [reviewEditing, setReviewEditing] = useState(null); // review row being edited (null = new)

    const loadMovieComments = useCallback(async (movieId) => {
        // review_comments(count) embeds the comment count per review for the thread toggle
        const { data, error } = await supabase.from('reviews').select('*, profiles(username, tag, avatar_url), review_comments(count)').eq('movie_id', String(movieId)).order('created_at', { ascending: false });
        if (error) console.error('Comments load error (RLS?):', error);
        setMovieComments(data || []);
    }, []);

    const loadRecommendations = useCallback(async (id, type) => {
        const data = await api(`/${type}/${id}/recommendations`);
        setRecommendations((data?.results || []).slice(0, 12));
    }, []);

    const loadVideos = useCallback(async (id, type) => {
        setVideos(await getVideos(id, type));
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

    const openDetails = useCallback(async (item, type = 'movie', opts = {}) => {
        // Push a real history entry so the browser / Android back button (and the
        // in-app back button via history.back()) returns to the previous screen
        // instead of re-triggering a hashchange. Skip when we're *responding* to a
        // back/forward navigation or a deep link (the entry already exists).
        if (!opts.skipPush) {
            try { window.history.pushState({ hadesDetails: true, did: item.id, dtype: type }, '', `#${type}/${item.id}`); } catch { /* ignore */ }
        }
        setSeasonsData([]);
        setOverviewExpanded(false);
        setRecommendations([]);
        setVideos([]);
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
            loadVideos(data.id, type);
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
    }, [loadSources, loadMovieComments, loadRecommendations, loadVideos]);

    // Pure cleanup — called by the popstate handler when we leave a details entry.
    // Does NOT touch history (the browser already moved us back).
    const closeDetails = useCallback(() => {
        setDetailsOpen(false);
        setMedia(null);
        setCollapsData(null);
        setAllohaData(null);
        setMovieComments([]);
        setSeasonsData([]);
        setVideos([]);
        setReviewEditing(null);
    }, []);

    // What the in-app back button / ESC / edge-swipe call: step back in history
    // (which fires popstate -> closeDetails). Falls back to a direct close if for
    // some reason we aren't sitting on a details history entry.
    const goBackFromDetails = useCallback(() => {
        if (window.history.state?.hadesDetails) window.history.back();
        else closeDetails();
    }, [closeDetails]);

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
        videos,
        reviewOpen, setReviewOpen,
        reviewRating, setReviewRating,
        reviewText, setReviewText,
        reviewEditing, setReviewEditing,
        loadMovieComments, loadRecommendations, loadSources,
        openDetails, closeDetails, goBackFromDetails,
    };
}
