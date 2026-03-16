import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { api, getImdbId, searchCollaps } from '../../../lib/tmdb';
import { supabase } from '../../../lib/supabase';
import { useData } from '../../../providers/DataProvider';
import { BACKDROP } from '../../../lib/config';
import { ratingColor, pluralize, FALLBACK_SOURCES, getAvatarUrl } from '../../../lib/utils';
import { LIBRARY_STATUSES } from '../../../lib/libraryStatuses';
import MediaCard from '../../../components/components/MediaCard';
import { theme } from '../../../theme';

export default function DetailsScreen() {
    const { type, id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { favorites, toggleFavorite, watchlist, toggleWatchlist, history, addToHistory, setItemStatus, getItemStatus } = useData();
    const [media, setMedia] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [season, setSeason] = useState(1);
    const [episode, setEpisode] = useState(1);
    const [sources, setSources] = useState([]);
    const [statusPickerOpen, setStatusPickerOpen] = useState(false);
    const [movieReviews, setMovieReviews] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const path = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
                const data = await api(path);
                if (!cancelled && data) setMedia(data);
                const recPath = type === 'tv' ? `/tv/${id}/recommendations` : `/movie/${id}/recommendations`;
                const rec = await api(recPath);
                if (!cancelled && rec?.results) setRecommendations(rec.results.slice(0, 12));
            } catch (e) {
                console.warn(e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [type, id]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const imdbId = await getImdbId(Number(id), type || 'movie');
            if (!imdbId || cancelled) return;
            const collaps = await searchCollaps(imdbId);
            if (collaps?.iframe_url && !cancelled) setSources(prev => [{ id: 'collaps', name: 'Collaps', url: collaps.iframe_url }, ...prev]);
        })();
        return () => { cancelled = true; };
    }, [type, id]);

    useEffect(() => {
        if (!id) return;
        supabase.from('reviews').select('*, profiles(username, tag, avatar_url)').eq('movie_id', String(id)).order('created_at', { ascending: false }).then(({ data }) => setMovieReviews(data || []));
    }, [id]);

    const histEntry = history?.find(h => h.item_id === String(id));
    const lastSeason = histEntry?.last_season || 1;
    const lastEpisode = histEntry?.last_episode || 1;
    const s = season || lastSeason || 1;
    const e = episode || lastEpisode || 1;

    const fallbackUrls = FALLBACK_SOURCES.map(fs => ({ id: fs.id, name: fs.name, url: fs.getUrl(Number(id), type || 'movie', s, e) }));
    const allSources = [...sources, ...fallbackUrls];
    const collapsSource = allSources.find(s => s.id === 'collaps');
    const defaultPlayUrl = collapsSource?.url || allSources[0]?.url || fallbackUrls[0]?.url;

    const handlePlay = (url) => {
        addToHistory(media, type, type === 'tv' ? s : null, type === 'tv' ? e : null);
        router.push({ pathname: '/player', params: { url, title: media?.title || media?.name } });
    };

    const currentStatus = getItemStatus(id);

    if (loading || !media) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const isFav = favorites?.some(f => f.item_id === String(id));

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.backdropWrap}>
                {media.backdrop_path ? (
                    <ExpoImage source={{ uri: `${BACKDROP}${media.backdrop_path}` }} style={styles.backdrop} contentFit="cover" />
                ) : (
                    <View style={[styles.backdrop, styles.backdropPlaceholder]} />
                )}
                <View style={styles.backdropOverlay} />
                <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12 }]}>
                    <Text style={styles.backText}>← Назад</Text>
                </Pressable>
                <Pressable onPress={() => toggleFavorite(media, type)} style={[styles.favBtn, { top: insets.top + 12 }]}>
                    <Text style={styles.favText}>{isFav ? '❤️' : '🤍'}</Text>
                </Pressable>
            </View>

            <View style={styles.body}>
                <Text style={styles.title}>{media.title || media.name}</Text>
                {media.original_title && media.original_title !== (media.title || media.name) && (
                    <Text style={styles.originalTitle}>{media.original_title || media.original_name}</Text>
                )}
                <View style={styles.meta}>
                    <Text style={[styles.rating, { color: ratingColor(media.vote_average) }]}>★ {media.vote_average?.toFixed(1)}</Text>
                    <Text style={styles.metaText}>{(media.release_date || media.first_air_date || '').split('-')[0]}</Text>
                    {media.runtime && <Text style={styles.metaText}>{Math.floor(media.runtime / 60)}ч {media.runtime % 60}м</Text>}
                    {media.number_of_seasons && <Text style={styles.metaText}>{media.number_of_seasons} {pluralize(media.number_of_seasons, 'сезон', 'сезона', 'сезонов')}</Text>}
                </View>
                {media.genres?.length > 0 && (
                    <View style={styles.genres}>
                        {media.genres.map(g => (
                            <View key={g.id} style={styles.genreTag}><Text style={styles.genreText}>{g.name}</Text></View>
                        ))}
                    </View>
                )}
                {media.overview && <Text style={styles.overview}>{media.overview}</Text>}

                <Pressable onPress={() => handlePlay(defaultPlayUrl)} style={styles.watchBtn}>
                    <Text style={styles.watchBtnText}>▶ Смотреть</Text>
                </Pressable>

                <View style={styles.sourceRow}>
                    {allSources.slice(0, 4).map(src => (
                        <Pressable key={src.id} onPress={() => handlePlay(src.url)} style={styles.sourceBtn}>
                            <Text style={styles.sourceBtnText}>{src.name}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.actionRow}>
                    <Pressable onPress={() => toggleWatchlist(media, type)} style={[styles.actionBtn, watchlist?.some(w => w.item_id === String(id)) && styles.actionBtnActive]}>
                        <Text style={styles.actionBtnText}>🔖 {watchlist?.some(w => w.item_id === String(id)) ? 'В списке' : 'Буду смотреть'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setStatusPickerOpen(true)} style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>{LIBRARY_STATUSES.find(st => st.id === currentStatus)?.icon || '📋'} {currentStatus ? LIBRARY_STATUSES.find(st => st.id === currentStatus)?.label : 'Статус'}</Text>
                    </Pressable>
                </View>

                {type === 'tv' && media.number_of_seasons > 0 && (
                    <View style={styles.episodeRow}>
                        <Text style={styles.epLabel}>Сезон {season} / Серия {episode}</Text>
                        <View style={styles.epControls}>
                            <Pressable onPress={() => setEpisode(Math.max(1, episode - 1))} style={styles.epBtn}><Text style={styles.epBtnText}>−</Text></Pressable>
                            <Text style={styles.epNum}>S{season}E{episode}</Text>
                            <Pressable onPress={() => setEpisode(episode + 1)} style={styles.epBtn}><Text style={styles.epBtnText}>+</Text></Pressable>
                        </View>
                    </View>
                )}

                {movieReviews.length > 0 && (
                    <View style={styles.reviewsSection}>
                        <Text style={styles.recTitle}>Отзывы</Text>
                        {movieReviews.map(r => (
                            <View key={r.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    {r.profiles?.avatar_url ? (
                                        <ExpoImage source={{ uri: getAvatarUrl(r.profiles.avatar_url) || r.profiles.avatar_url }} style={styles.reviewAvatar} contentFit="cover" />
                                    ) : (
                                        <View style={[styles.reviewAvatar, styles.reviewAvatarPlaceholder]}><Text style={styles.reviewAvatarText}>{r.profiles?.username?.[0]?.toUpperCase() || '?'}</Text></View>
                                    )}
                                    <View style={styles.reviewAuthorWrap}>
                                        <Text style={styles.reviewAuthor}>{r.profiles?.username || 'Пользователь'}#{r.profiles?.tag || ''}</Text>
                                        <View style={[styles.reviewRating, { backgroundColor: ratingColor(r.rating) + '33' }]}><Text style={[styles.reviewRatingText, { color: ratingColor(r.rating) }]}>★ {r.rating}/10</Text></View>
                                    </View>
                                </View>
                                <Text style={styles.reviewContent}>{r.content}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {recommendations.length > 0 && (
                    <View style={styles.recSection}>
                        <Text style={styles.recTitle}>Рекомендации</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recRow}>
                            {recommendations.map(item => (
                                <MediaCard key={item.id} item={{ ...item, media_type: item.media_type || type }} width={120} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {statusPickerOpen && (
                    <View style={styles.statusOverlay}>
                        <View style={styles.statusModal}>
                            <Text style={styles.statusTitle}>Статус в библиотеке</Text>
                            {LIBRARY_STATUSES.map(st => (
                                <Pressable key={st.id} onPress={() => { setItemStatus(media, type, st.id); setStatusPickerOpen(false); }} style={[styles.statusOption, { borderColor: st.color }]}>
                                    <Text style={[styles.statusOptionText, { color: st.color }]}>{st.icon} {st.label}</Text>
                                </Pressable>
                            ))}
                            <Pressable onPress={() => setStatusPickerOpen(false)} style={styles.statusCancel}><Text>Отмена</Text></Pressable>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
    backdropWrap: { height: 280, position: 'relative' },
    backdrop: StyleSheet.absoluteFillObject,
    backdropPlaceholder: { backgroundColor: theme.surface },
    backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    backBtn: { position: 'absolute', left: 16, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
    backText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    favBtn: { position: 'absolute', right: 16, padding: 10 },
    favText: { fontSize: 24 },
    body: { padding: 16, paddingTop: 0 },
    title: { fontSize: 24, fontWeight: '900', color: theme.text, marginBottom: 4 },
    originalTitle: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', marginBottom: 8 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    rating: { fontSize: 14, fontWeight: '800' },
    metaText: { fontSize: 12, color: theme.textMuted },
    genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    genreTag: { backgroundColor: theme.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    genreText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
    overview: { fontSize: 14, color: theme.textSecondary, lineHeight: 22, marginBottom: 20 },
    watchBtn: { backgroundColor: theme.accent, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16 },
    watchBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    sourceBtn: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface, borderRadius: 12 },
    sourceBtnText: { color: theme.text, fontSize: 13, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    actionBtn: { flex: 1, padding: 14, backgroundColor: theme.surface, borderRadius: 12, alignItems: 'center' },
    actionBtnActive: { backgroundColor: 'rgba(229,9,20,0.2)' },
    actionBtnText: { color: theme.text, fontSize: 13, fontWeight: '700' },
    statusOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24, zIndex: 10 },
    statusModal: { backgroundColor: theme.surface, borderRadius: 20, padding: 24 },
    statusTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 },
    statusOption: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    statusOptionText: { fontSize: 15, fontWeight: '700' },
    statusCancel: { marginTop: 12, padding: 14, alignItems: 'center' },
    episodeRow: { marginBottom: 24 },
    epLabel: { fontSize: 13, color: theme.textMuted, marginBottom: 8 },
    epControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    epBtn: { width: 40, height: 40, backgroundColor: theme.surface, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    epBtnText: { color: theme.text, fontSize: 18, fontWeight: '700' },
    epNum: { color: theme.text, fontSize: 14, fontWeight: '700', minWidth: 60, textAlign: 'center' },
    reviewsSection: { marginBottom: 24 },
    reviewCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    reviewAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    reviewAvatarPlaceholder: { backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' },
    reviewAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    reviewAuthorWrap: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewAuthor: { color: theme.text, fontSize: 14, fontWeight: '700' },
    reviewRating: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    reviewRatingText: { fontSize: 12, fontWeight: '800' },
    reviewContent: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    recSection: { marginTop: 8 },
    recTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 14 },
    recRow: { paddingHorizontal: 16, gap: 12 },
});
