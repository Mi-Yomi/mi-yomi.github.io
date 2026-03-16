import { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, getImdbId, searchCollaps, searchAlloha, getMalId, isAnime as checkAnime } from '../../lib/tmdb';
import { useData } from '../../providers/DataProvider';
import { BACKDROP, IMG } from '../../lib/config';
import { FALLBACK_SOURCES, LIBRARY_STATUSES, ratingColor, pluralize } from '../../lib/utils';
import MediaCard from '../../components/MediaCard';
import { theme } from '../../theme';

const { width: SW } = Dimensions.get('window');

export default function DetailsScreen() {
    const { type, id } = useLocalSearchParams();
    const router = useRouter();
    const { favorites, toggleFavorite, getItemStatus, setItemStatus } = useData();
    const [media, setMedia] = useState(null);
    const [collapsData, setCollapsData] = useState(null);
    const [allohaData, setAllohaData] = useState(null);
    const [sourceLoading, setSourceLoading] = useState(true);
    const [recs, setRecs] = useState([]);

    useEffect(() => {
        (async () => {
            const [data, credits] = await Promise.all([api(`/${type}/${id}`), api(`/${type}/${id}/credits`)]);
            if (data) setMedia({ ...data, media_type: type, credits: credits || {} });
            const recData = await api(`/${type}/${id}/recommendations`);
            if (recData?.results) setRecs(recData.results.slice(0, 12));
            setSourceLoading(true);
            const imdbId = await getImdbId(id, type);
            if (imdbId) {
                const c = await searchCollaps(imdbId);
                setCollapsData(c);
                if (c?.kinopoisk_id) setAllohaData(await searchAlloha(c.kinopoisk_id));
            }
            setSourceLoading(false);
        })();
    }, [type, id]);

    if (!media) return <View style={styles.loader}><Text style={{ color: theme.textMuted }}>Загрузка...</Text></View>;

    const isFav = favorites.some(f => f.item_id === String(media.id));
    const currentStatus = getItemStatus(media.id);
    const cast = (media.credits?.cast || []).slice(0, 10);

    const playSource = (url, name) => {
        router.push({ pathname: '/player', params: { url, name, title: media.title || media.name, mediaType: type, mediaId: id } });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.backdropWrap}>
                    <Image source={{ uri: `${BACKDROP}${media.backdrop_path}` }} style={styles.backdrop} contentFit="cover" />
                    <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,0.4)', theme.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
                    <SafeAreaView style={styles.topBar} edges={['top']}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={{ color: '#fff', fontSize: 18 }}>‹</Text></Pressable>
                        <Pressable onPress={() => toggleFavorite(media, type)} style={[styles.backBtn, isFav && { backgroundColor: theme.pink }]}>
                            <Text style={{ color: '#fff', fontSize: 16 }}>{isFav ? '♥' : '♡'}</Text>
                        </Pressable>
                    </SafeAreaView>
                </View>

                <View style={styles.body}>
                    <Text style={styles.title}>{media.title || media.name}</Text>
                    <View style={styles.meta}>
                        <Text style={[styles.rating, { color: ratingColor(media.vote_average) }]}>★ {media.vote_average?.toFixed(1)}</Text>
                        <Text style={styles.metaText}>{(media.release_date || media.first_air_date || '').split('-')[0]}</Text>
                        {media.runtime > 0 && <Text style={styles.metaText}>{Math.floor(media.runtime/60)}ч {media.runtime%60}м</Text>}
                        {media.number_of_seasons > 0 && <Text style={styles.metaText}>{media.number_of_seasons} {pluralize(media.number_of_seasons, 'сезон', 'сезона', 'сезонов')}</Text>}
                    </View>

                    {media.genres?.length > 0 && (
                        <View style={styles.genres}>{media.genres.map(g => <View key={g.id} style={styles.genreTag}><Text style={styles.genreText}>{g.name}</Text></View>)}</View>
                    )}

                    {sourceLoading ? (
                        <View style={styles.sourceLoading}><Text style={{ color: theme.textMuted }}>Ищем источники...</Text></View>
                    ) : (
                        <View>
                            {collapsData && <Pressable style={styles.playBtn} onPress={() => playSource(collapsData.iframe_url, 'Collaps')}><Text style={styles.playBtnText}>▶ 🇷🇺 Смотреть</Text></Pressable>}
                            {allohaData && <Pressable style={[styles.playBtn, { backgroundColor: theme.blue }]} onPress={() => playSource(allohaData.iframe, 'Alloha')}><Text style={styles.playBtnText}>▶ 🇷🇺 Alloha</Text></Pressable>}
                        </View>
                    )}

                    <View style={styles.actionRow}>
                        <Pressable style={styles.actionBtn} onPress={() => {
                            const next = currentStatus === 'planned' ? null : 'planned';
                            if (next) setItemStatus(media, type, next);
                        }}>
                            <Text style={styles.actionText}>{currentStatus ? LIBRARY_STATUSES.find(s => s.id === currentStatus)?.icon + ' ' + LIBRARY_STATUSES.find(s => s.id === currentStatus)?.label : '📋 Статус'}</Text>
                        </Pressable>
                    </View>

                    <View style={styles.fallbackSection}>
                        <Text style={styles.fallbackTitle}>Другие плееры</Text>
                        <View style={styles.fallbackGrid}>
                            {FALLBACK_SOURCES.map(src => (
                                <Pressable key={src.id} style={styles.fallbackBtn} onPress={() => playSource(src.getUrl(media.id, type, 1, 1), src.name)}>
                                    <Text style={{ fontSize: 20 }}>{src.icon}</Text>
                                    <Text style={styles.fallbackName}>{src.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {media.overview ? <Text style={styles.overview}>{media.overview}</Text> : null}

                    {cast.length > 0 && (
                        <View style={styles.castSection}>
                            <Text style={styles.castTitle}>В ролях</Text>
                            <FlatList horizontal data={cast} keyExtractor={c => String(c.id)} showsHorizontalScrollIndicator={false} renderItem={({ item: c }) => (
                                <View style={styles.castCard}>
                                    {c.profile_path ? <Image source={{ uri: `${IMG}${c.profile_path}` }} style={styles.castImg} /> : <View style={[styles.castImg, { backgroundColor: theme.surface2, justifyContent: 'center', alignItems: 'center' }]}><Text style={{ color: theme.textMuted }}>{c.name?.[0]}</Text></View>}
                                    <Text style={styles.castName} numberOfLines={1}>{c.name}</Text>
                                    <Text style={styles.castRole} numberOfLines={1}>{c.character}</Text>
                                </View>
                            )} />
                        </View>
                    )}

                    {recs.length > 0 && (
                        <View style={{ marginTop: 24 }}>
                            <Text style={[styles.castTitle, { marginBottom: 14 }]}>Похожие</Text>
                            <FlatList horizontal data={recs} keyExtractor={r => String(r.id)} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <MediaCard item={{ ...item, media_type: item.media_type || type }} width={130} />} />
                        </View>
                    )}
                    <View style={{ height: 60 }} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
    backdropWrap: { height: SW * 0.65, position: 'relative' },
    backdrop: { ...StyleSheet.absoluteFillObject },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,10,10,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    body: { paddingHorizontal: 20, marginTop: -60 },
    title: { fontSize: 26, fontWeight: '900', color: theme.text, lineHeight: 30, marginBottom: 10 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center' },
    rating: { fontSize: 14, fontWeight: '800' },
    metaText: { color: theme.textSecondary, fontSize: 13 },
    genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    genreTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    genreText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
    sourceLoading: { padding: 18, borderRadius: 14, backgroundColor: theme.surface, marginBottom: 12, alignItems: 'center' },
    playBtn: { padding: 18, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', marginBottom: 12 },
    playBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    actionBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: theme.surface2, alignItems: 'center' },
    actionText: { color: theme.textSecondary, fontSize: 13, fontWeight: '700' },
    fallbackSection: { marginTop: 12, padding: 16, backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
    fallbackTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
    fallbackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    fallbackBtn: { width: '30%', padding: 14, borderRadius: 12, backgroundColor: theme.surface2, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    fallbackName: { fontSize: 10, fontWeight: '700', color: theme.text, marginTop: 4 },
    overview: { fontSize: 14, lineHeight: 24, color: theme.textSecondary, marginTop: 16 },
    castSection: { marginTop: 24 },
    castTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
    castCard: { width: 80, marginRight: 14, alignItems: 'center' },
    castImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.surface2, marginBottom: 8, borderWidth: 2, borderColor: theme.border },
    castName: { fontSize: 11, fontWeight: '700', color: theme.text, textAlign: 'center' },
    castRole: { fontSize: 10, color: theme.textMuted, textAlign: 'center' },
});
