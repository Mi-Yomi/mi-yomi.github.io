import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Animated, {
    FadeIn, FadeInUp,
    useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getTitle, getChapters, getTitleComments } from '../../lib/mangalib';
import { useManga } from '../../providers/MangaProvider';
import { useDownloads } from '../../providers/DownloadsProvider';
import { MANGA_STATUSES } from '../../lib/mangaStatuses';
import { MANGA_IMG_HEADERS } from '../../lib/config';
import { ratingColor } from '../../lib/utils';
import { theme } from '../../theme';

const HERO_H = 280;

export default function MangaTitleScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const slug = String(params.slug || '');
    const { mangaProgress, getMangaStatus, setMangaStatus, getChapterReadPct } = useManga();
    const { getDownloadedPages, downloading, downloadChapter, deleteChapter } = useDownloads();

    // Params from the card give an instant hero while the API loads.
    const [title, setTitle] = useState(() => ({
        dir: slug,
        title: params.title || '',
        cover: params.cover || null,
        type: params.type || '',
        rating: Number(params.rating) || 0,
    }));
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [sortAsc, setSortAsc] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsShown, setCommentsShown] = useState(3);
    const [commentsPage, setCommentsPage] = useState(1);
    const [commentsLoading, setCommentsLoading] = useState(false);

    // Parallax hero + floating compact header driven by the scroll position.
    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
    const heroImgStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(scrollY.value, [0, HERO_H], [0, HERO_H * 0.45], Extrapolation.CLAMP) },
            { scale: interpolate(scrollY.value, [-220, 0], [1.35, 1], Extrapolation.CLAMP) },
        ],
    }));
    const floatHeaderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [HERO_H - 80, HERO_H], [0, 1], Extrapolation.CLAMP),
    }));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(false);
            try {
                const [t, chs] = await Promise.all([getTitle(slug), getChapters(slug)]);
                if (cancelled) return;
                if (t) setTitle(t);
                setChapters(chs);
                if (t?.id) getTitleComments(t.id).then(c => { if (!cancelled) setComments(c); });
            } catch (e) {
                console.warn('Manga title error:', e.message);
                if (!cancelled) setError(true);
            }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [slug]);

    const status = getMangaStatus(slug);
    const pointer = mangaProgress[slug];
    // Chapters are newest-first; the first chapter to read is the last element.
    const firstChapter = chapters.length ? chapters[chapters.length - 1] : null;
    const continueChapter = useMemo(() => {
        if (!pointer) return null;
        return chapters.find(c => c.id === pointer.chapterId) || null;
    }, [pointer, chapters]);

    const displayChapters = useMemo(() => (sortAsc ? [...chapters].reverse() : chapters), [chapters, sortAsc]);

    const openReader = useCallback((chapter) => {
        if (!chapter) return;
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        router.push({
            pathname: '/manga/reader',
            params: {
                slug, volume: String(chapter.volume), number: String(chapter.number),
                title: title.title || '', cover: title.cover || '', type: title.type || '', rating: title.rating || 0,
            },
        });
    }, [router, slug, title]);

    const onStatusPress = useCallback((id) => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
        setMangaStatus(title, id);
    }, [setMangaStatus, title]);

    const loadMoreComments = useCallback(async () => {
        if (commentsShown < comments.length) { setCommentsShown(n => n + 10); return; }
        if (!title.id || commentsLoading) return;
        setCommentsLoading(true);
        const next = await getTitleComments(title.id, commentsPage + 1);
        if (next.length) {
            setComments(prev => {
                const seen = new Set(prev.map(c => c.id));
                return [...prev, ...next.filter(c => !seen.has(c.id))];
            });
            setCommentsPage(p => p + 1);
            setCommentsShown(n => n + 10);
        }
        setCommentsLoading(false);
    }, [comments.length, commentsShown, commentsPage, commentsLoading, title.id]);

    const onDownloadPress = useCallback((chapter, downloaded) => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
        if (downloaded) {
            Alert.alert(`Глава ${chapter.number}`, 'Удалить загруженную главу?', [
                { text: 'Удалить', style: 'destructive', onPress: () => deleteChapter(slug, chapter.id) },
                { text: 'Отмена', style: 'cancel' },
            ]);
        } else {
            downloadChapter(title, chapter);
        }
    }, [slug, title, downloadChapter, deleteChapter]);

    const renderChapter = useCallback(({ item }) => {
        const pct = getChapterReadPct(slug, item.id);
        const done = pct >= 90;
        const current = pointer?.chapterId === item.id;
        const downloaded = !!getDownloadedPages(slug, item.id);
        const dl = downloading[`${slug}/${item.id}`];
        return (
            <Pressable onPress={() => openReader(item)} style={({ pressed }) => [styles.chapterRow, current && styles.chapterCurrent, pressed && { backgroundColor: theme.surface2 }]}>
                <View style={styles.chapterInfo}>
                    <Text style={[styles.chapterLabel, done && { color: theme.textMuted }]} numberOfLines={1}>
                        Том {item.volume} · Глава {item.number}
                    </Text>
                    {!!item.name && <Text style={styles.chapterName} numberOfLines={1}>{item.name}</Text>}
                </View>
                {dl ? (
                    <Text style={styles.dlProgress}>{dl.done}/{dl.total}</Text>
                ) : (
                    <Pressable onPress={() => onDownloadPress(item, downloaded)} hitSlop={8} style={styles.dlBtn}>
                        <Ionicons
                            name={downloaded ? 'checkmark-done-circle' : 'cloud-download-outline'}
                            size={18}
                            color={downloaded ? theme.blue : theme.textMuted}
                        />
                    </Pressable>
                )}
                {done ? (
                    <Ionicons name="checkmark-circle" size={18} color={theme.green} />
                ) : pct > 0 ? (
                    <Text style={styles.chapterPct}>{pct}%</Text>
                ) : (
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                )}
            </Pressable>
        );
    }, [slug, pointer?.chapterId, getChapterReadPct, openReader, getDownloadedPages, downloading, onDownloadPress]);

    const header = (
        <View>
            <View style={styles.hero}>
                {title.cover && (
                    <Animated.View style={[StyleSheet.absoluteFill, heroImgStyle]}>
                        <Image source={{ uri: title.coverHigh || title.cover, headers: MANGA_IMG_HEADERS }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} transition={300} />
                    </Animated.View>
                )}
                <LinearGradient colors={['rgba(10,10,10,0.35)', 'rgba(10,10,10,0.85)', theme.bg]} style={StyleSheet.absoluteFill} />
                <Animated.View entering={FadeInUp.duration(400).delay(80)} style={[styles.heroContent, { paddingTop: insets.top + 56 }]}>
                    {title.cover ? (
                        <Image source={{ uri: title.cover, headers: MANGA_IMG_HEADERS }} style={styles.poster} contentFit="cover" transition={300} cachePolicy="memory-disk" />
                    ) : (
                        <View style={[styles.poster, styles.posterPlaceholder]}><Text style={{ fontSize: 32 }}>📖</Text></View>
                    )}
                    <View style={styles.heroMeta}>
                        <Text style={styles.titleText} numberOfLines={3}>{title.title || 'Загрузка…'}</Text>
                        {!!title.altTitle && <Text style={styles.altTitle} numberOfLines={1}>{title.altTitle}</Text>}
                        <View style={styles.metaRow}>
                            {title.rating > 0 && <Text style={[styles.metaBadge, { color: ratingColor(title.rating) }]}>★ {Number(title.rating).toFixed(1)}</Text>}
                            {!!title.type && <Text style={styles.metaBadge}>{title.type}</Text>}
                            {!!title.year && <Text style={styles.metaBadge}>{title.year}</Text>}
                            {!!title.status && <Text style={styles.metaBadge}>{title.status}</Text>}
                        </View>
                        {chapters.length > 0 && <Text style={styles.chaptersCount}>{chapters.length} глав</Text>}
                    </View>
                </Animated.View>
            </View>

            <Animated.View entering={FadeInUp.duration(380).delay(160)} style={styles.actions}>
                <Pressable
                    onPress={() => openReader(continueChapter || firstChapter)}
                    disabled={!chapters.length}
                    style={({ pressed }) => [styles.readBtn, pressed && styles.btnPressed, !chapters.length && { opacity: 0.5 }]}
                >
                    <LinearGradient colors={['#ff9800', '#ff4081']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                    <Ionicons name="book" size={18} color="#fff" />
                    <Text style={styles.readBtnText}>
                        {continueChapter ? `Продолжить · Том ${continueChapter.volume} Гл. ${continueChapter.number}` : 'Начать читать'}
                    </Text>
                </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(380).delay(220)}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow} nestedScrollEnabled>
                    {MANGA_STATUSES.map(s => {
                        const active = status === s.id;
                        return (
                            <Pressable key={s.id} onPress={() => onStatusPress(s.id)} style={({ pressed }) => [styles.statusChip, active && { backgroundColor: s.color + '33', borderColor: s.color }, pressed && { opacity: 0.8 }]}>
                                <Ionicons name={s.icon} size={14} color={active ? s.color : theme.textMuted} />
                                <Text style={[styles.statusText, active && { color: s.color }]}>{s.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </Animated.View>

            {!!title.genres?.length && (
                <Animated.View entering={FadeIn.duration(350).delay(260)} style={styles.genres}>
                    {title.genres.slice(0, 8).map(g => <Text key={g} style={styles.genreTag}>{g}</Text>)}
                </Animated.View>
            )}

            {!!title.description && (
                <Animated.View entering={FadeIn.duration(350).delay(300)} style={styles.descWrap}>
                    <Text style={styles.desc} numberOfLines={descExpanded ? undefined : 4}>{title.description}</Text>
                    <Pressable onPress={() => setDescExpanded(v => !v)}>
                        <Text style={styles.descToggle}>{descExpanded ? 'Свернуть ↑' : 'Читать дальше ↓'}</Text>
                    </Pressable>
                </Animated.View>
            )}

            {comments.length > 0 && (
                <Animated.View entering={FadeIn.duration(350)} style={styles.commentsWrap}>
                    <Text style={styles.sectionTitle}>💬 Комментарии</Text>
                    {comments.slice(0, commentsShown).map(c => (
                        <View key={c.id} style={styles.commentCard}>
                            <View style={styles.commentHead}>
                                {c.avatar ? (
                                    <Image source={{ uri: c.avatar, headers: MANGA_IMG_HEADERS }} style={styles.commentAvatar} contentFit="cover" cachePolicy="memory-disk" />
                                ) : (
                                    <View style={[styles.commentAvatar, styles.commentAvatarPh]}><Text style={styles.commentAvatarText}>{c.user[0]?.toUpperCase() || '?'}</Text></View>
                                )}
                                <Text style={styles.commentUser} numberOfLines={1}>{c.user}</Text>
                                {c.up - c.down !== 0 && (
                                    <Text style={[styles.commentVotes, { color: c.up - c.down > 0 ? theme.green : theme.accent }]}>
                                        {c.up - c.down > 0 ? '+' : ''}{c.up - c.down}
                                    </Text>
                                )}
                            </View>
                            <Text style={styles.commentText} numberOfLines={6}>{c.text}</Text>
                        </View>
                    ))}
                    <Pressable onPress={loadMoreComments} style={styles.commentsMore} disabled={commentsLoading}>
                        {commentsLoading ? <ActivityIndicator size="small" color={theme.orange} /> : <Text style={styles.commentsMoreText}>Показать ещё</Text>}
                    </Pressable>
                </Animated.View>
            )}

            <View style={styles.chaptersHead}>
                <Text style={styles.sectionTitle}>Главы</Text>
                {loading && <ActivityIndicator size="small" color={theme.orange} />}
                {chapters.length > 1 && (
                    <Pressable
                        onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} setSortAsc(v => !v); }}
                        style={styles.sortToggle}
                        hitSlop={6}
                    >
                        <Ionicons name={sortAsc ? 'arrow-up' : 'arrow-down'} size={13} color={theme.orange} />
                        <Text style={styles.sortToggleText}>{sortAsc ? 'Сначала старые' : 'Сначала новые'}</Text>
                    </Pressable>
                )}
            </View>
            {error && !chapters.length && !loading && (
                <Text style={styles.errorText}>Не удалось загрузить главы</Text>
            )}
            {!error && !loading && !chapters.length && (
                <Text style={styles.errorText}>{title.isLicensed ? 'Тайтл лицензирован — главы недоступны' : 'Глав пока нет'}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={displayChapters}
                keyExtractor={c => c.id}
                ListHeaderComponent={header}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
                renderItem={renderChapter}
                onScroll={onScroll}
                scrollEventThrottle={16}
                initialNumToRender={16}
                maxToRenderPerBatch={20}
                windowSize={11}
                showsVerticalScrollIndicator={false}
            />
            <Animated.View style={[styles.floatHeader, { paddingTop: insets.top + 8 }, floatHeaderStyle]} pointerEvents="none">
                <Text style={styles.floatTitle} numberOfLines={1}>{title.title}</Text>
            </Animated.View>
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    backBtn: { position: 'absolute', left: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,10,10,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    floatHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 12, paddingHorizontal: 64, backgroundColor: 'rgba(10,10,10,0.94)', alignItems: 'center', zIndex: 5 },
    floatTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
    hero: { overflow: 'hidden', paddingBottom: 16, minHeight: HERO_H },
    heroContent: { flexDirection: 'row', paddingHorizontal: 16, gap: 16 },
    poster: { width: 120, height: 180, borderRadius: 14, backgroundColor: theme.surface },
    posterPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface2 },
    heroMeta: { flex: 1, justifyContent: 'flex-end', paddingBottom: 4 },
    titleText: { color: theme.text, fontSize: 20, fontWeight: '900', lineHeight: 26, marginBottom: 4 },
    altTitle: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
    metaBadge: { color: theme.textSecondary, fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
    chaptersCount: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    actions: { paddingHorizontal: 16, marginBottom: 14 },
    readBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, overflow: 'hidden' },
    btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
    readBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    statusRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    statusText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
    genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 14 },
    genreTag: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', backgroundColor: theme.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
    descWrap: { paddingHorizontal: 16, marginBottom: 20 },
    desc: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
    descToggle: { color: theme.orange, fontSize: 12, fontWeight: '700', marginTop: 6 },
    commentsWrap: { paddingHorizontal: 16, marginBottom: 20 },
    commentCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 12, marginTop: 10 },
    commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    commentAvatar: { width: 26, height: 26, borderRadius: 13 },
    commentAvatarPh: { backgroundColor: theme.surface3, justifyContent: 'center', alignItems: 'center' },
    commentAvatarText: { color: theme.textSecondary, fontSize: 12, fontWeight: '800' },
    commentUser: { flex: 1, color: theme.text, fontSize: 12, fontWeight: '700' },
    commentVotes: { fontSize: 12, fontWeight: '800' },
    commentText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    commentsMore: { alignItems: 'center', paddingVertical: 12 },
    commentsMoreText: { color: theme.orange, fontSize: 13, fontWeight: '700' },
    chaptersHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
    sortToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,152,0,0.1)' },
    sortToggleText: { color: theme.orange, fontSize: 11, fontWeight: '700' },
    errorText: { color: theme.textMuted, fontSize: 13, paddingHorizontal: 16, paddingVertical: 12 },
    chapterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
    chapterCurrent: { backgroundColor: 'rgba(255,152,0,0.08)' },
    chapterInfo: { flex: 1, marginRight: 12 },
    chapterLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
    chapterName: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
    chapterPct: { color: theme.orange, fontSize: 12, fontWeight: '800' },
    dlBtn: { marginRight: 12 },
    dlProgress: { color: theme.blue, fontSize: 11, fontWeight: '800', marginRight: 12 },
});
