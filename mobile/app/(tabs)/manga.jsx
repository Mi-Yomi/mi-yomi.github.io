import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, RefreshControl, useWindowDimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getCatalog, MANGA_GENRES } from '../../lib/mangalib';
import { useManga } from '../../providers/MangaProvider';
import MangaCard from '../../components/components/MangaCard';
import MangaContinueCard from '../../components/components/MangaContinueCard';
import MangaSkeletonCard from '../../components/components/MangaSkeletonCard';
import { theme } from '../../theme';

const FEEDS = [
    { id: 'updated', label: 'Обновления', ordering: 'last_chapter_at' },
    { id: 'popular', label: 'Популярное', ordering: 'views' },
    { id: 'new', label: 'Новинки', ordering: 'created_at' },
];

const PADDING = 16;
const GAP = 12;
const COLS = 3;

function FeedChip({ label, active, onPress }) {
    return (
        <Pressable
            onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                onPress?.();
            }}
            style={({ pressed }) => [styles.feedChip, !active && styles.feedChipInactive, pressed && { opacity: 0.85 }]}
        >
            {active && (
                <LinearGradient colors={['#ff9800', '#ff4081']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.feedChipGradient]} />
            )}
            <Text style={[styles.feedLabel, active && styles.feedLabelActive]}>{label}</Text>
        </Pressable>
    );
}

export default function MangaScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const cardWidth = Math.floor((width - PADDING * 2 - GAP * (COLS - 1)) / COLS);
    const { continueReading, mangaLibraryByStatus } = useManga();

    const [feedTab, setFeedTab] = useState('updated');
    const [genre, setGenre] = useState(null);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const listRef = useRef(null);
    useScrollToTop(listRef);
    const pageRef = useRef(1);
    const endReachedRef = useRef(false);
    const seqRef = useRef(0);

    const ordering = FEEDS.find(f => f.id === feedTab)?.ordering || 'last_chapter_at';

    const loadFeed = useCallback(async (tab, genreId, { fresh = false } = {}) => {
        const seq = ++seqRef.current;
        const ord = FEEDS.find(f => f.id === tab)?.ordering || 'last_chapter_at';
        pageRef.current = 1;
        endReachedRef.current = false;
        if (!fresh) setLoading(true);
        try {
            const list = await getCatalog({ ordering: ord, genre: genreId, page: 1, fresh });
            if (seq === seqRef.current) setFeed(list);
        } catch (e) {
            console.warn('Manga feed error:', e.message);
        }
        if (seq === seqRef.current) { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { loadFeed(feedTab, genre); }, [feedTab, genre, loadFeed]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadFeed(feedTab, genre, { fresh: true });
    }, [feedTab, genre, loadFeed]);

    const loadMore = useCallback(async () => {
        if (loadingMore || loading || endReachedRef.current || feed.length === 0) return;
        const seq = seqRef.current;
        setLoadingMore(true);
        try {
            const nextPage = pageRef.current + 1;
            const more = await getCatalog({ ordering, genre, page: nextPage });
            if (seq !== seqRef.current) return;
            if (!more.length) endReachedRef.current = true;
            else {
                pageRef.current = nextPage;
                setFeed(prev => {
                    const seen = new Set(prev.map(m => m.id));
                    return [...prev, ...more.filter(m => !seen.has(m.id))];
                });
            }
        } catch (e) {
            console.warn('Manga load more error:', e.message);
        }
        if (seq === seqRef.current) setLoadingMore(false);
    }, [loadingMore, loading, feed.length, ordering, genre]);

    const openRandom = useCallback(() => {
        if (!feed.length) return;
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        const item = feed[Math.floor(Math.random() * feed.length)];
        router.push({
            pathname: '/manga/[slug]',
            params: { slug: item.dir, title: item.title, cover: item.cover || '', type: item.type || '', rating: item.rating || 0 },
        });
    }, [feed, router]);

    const readingShelf = useMemo(() => (mangaLibraryByStatus.reading || []).slice(0, 15), [mangaLibraryByStatus]);

    const header = (
        <View>
            <Animated.View entering={FadeIn.duration(280).delay(50)} style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.logo}>📖 Манга</Text>
                <View style={styles.headerBtns}>
                    <Pressable onPress={openRandom} style={styles.iconBtn} hitSlop={6}>
                        <Ionicons name="dice" size={17} color={theme.orange} />
                    </Pressable>
                    <Pressable onPress={() => router.push({ pathname: '/search', params: { scope: 'manga' } })} style={styles.searchBtn}>
                        <Text style={styles.searchText}>🔍 Поиск</Text>
                    </Pressable>
                </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(350).delay(100)} style={styles.feedWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedRow} nestedScrollEnabled>
                    {FEEDS.map(f => (
                        <FeedChip key={f.id} label={f.label} active={feedTab === f.id} onPress={() => setFeedTab(f.id)} />
                    ))}
                </ScrollView>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(350).delay(130)} style={styles.genreWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedRow} nestedScrollEnabled>
                    {MANGA_GENRES.map(g => (
                        <Pressable
                            key={String(g.id)}
                            onPress={() => {
                                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                                setGenre(g.id);
                            }}
                            style={[styles.genreChip, genre === g.id && styles.genreChipActive]}
                        >
                            <Text style={[styles.genreText, genre === g.id && styles.genreTextActive]}>{g.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </Animated.View>

            {continueReading.length > 0 && (
                <Animated.View entering={FadeInUp.duration(380).delay(150)} style={styles.section}>
                    <Text style={styles.sectionTitle}>📌 Продолжить чтение</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent} nestedScrollEnabled>
                        {continueReading.slice(0, 10).map(p => <MangaContinueCard key={p.dir} pointer={p} />)}
                    </ScrollView>
                </Animated.View>
            )}

            {readingShelf.length > 0 && (
                <Animated.View entering={FadeInUp.duration(380).delay(200)} style={styles.section}>
                    <Text style={styles.sectionTitle}>📚 Читаю</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent} nestedScrollEnabled>
                        {readingShelf.map(e => <MangaCard key={e.dir} item={e} width={110} />)}
                    </ScrollView>
                </Animated.View>
            )}

            <Animated.View entering={FadeInUp.duration(380).delay(250)}>
                <Text style={[styles.sectionTitle, styles.feedTitle]}>{FEEDS.find(f => f.id === feedTab)?.label}</Text>
            </Animated.View>
        </View>
    );

    return (
        <FlatList
            ref={listRef}
            style={styles.container}
            data={loading ? [] : feed}
            key={COLS}
            numColumns={COLS}
            keyExtractor={item => String(item.id)}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            ListHeaderComponent={header}
            renderItem={({ item, index }) => (
                <Animated.View entering={FadeInUp.duration(320).delay((index % (COLS * 2)) * 40)}>
                    <MangaCard item={item} width={cardWidth} />
                </Animated.View>
            )}
            ListEmptyComponent={loading ? (
                <View style={styles.skeletonGrid}>
                    {Array.from({ length: 9 }, (_, i) => (
                        <MangaSkeletonCard key={i} width={cardWidth} delay={(i % COLS) * 120} />
                    ))}
                </View>
            ) : (
                <View style={styles.loaderWrap}><Text style={styles.emptyText}>Не удалось загрузить каталог</Text></View>
            )}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color={theme.orange} /> : null}
            onEndReached={loadMore}
            onEndReachedThreshold={0.6}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.orange} />}
            showsVerticalScrollIndicator={false}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
    logo: { fontSize: 22, fontWeight: '900', color: theme.text },
    headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' },
    searchBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12 },
    searchText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    feedWrap: { marginBottom: 10, marginHorizontal: -PADDING },
    genreWrap: { marginBottom: 20, marginHorizontal: -PADDING },
    genreChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: theme.surface },
    genreChipActive: { backgroundColor: theme.orange },
    genreText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
    genreTextActive: { color: '#fff', fontWeight: '800' },
    feedRow: { paddingHorizontal: PADDING, gap: 10 },
    feedChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
    feedChipInactive: { backgroundColor: theme.surface, borderWidth: 1, borderColor: 'rgba(255,152,0,0.3)' },
    feedChipGradient: { borderRadius: 20 },
    feedLabel: { color: theme.orange, fontSize: 13, fontWeight: '700' },
    feedLabelActive: { color: '#fff', fontWeight: '800' },
    section: { marginBottom: 24, marginHorizontal: -PADDING },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, paddingHorizontal: PADDING, marginBottom: 14 },
    feedTitle: { paddingHorizontal: 0 },
    rowContent: { paddingHorizontal: PADDING, gap: 12 },
    gridRow: { gap: GAP, marginBottom: GAP + 4 },
    gridContent: { paddingHorizontal: PADDING, paddingBottom: 40 },
    loaderWrap: { padding: 48, alignItems: 'center' },
    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: GAP + 4 },
    emptyText: { color: theme.textMuted, fontSize: 14 },
    footerLoader: { paddingVertical: 20 },
});
