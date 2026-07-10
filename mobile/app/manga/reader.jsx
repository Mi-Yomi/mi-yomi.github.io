import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import Animated, {
    FadeIn, FadeInDown, FadeOutUp, FadeInUp, FadeOutDown, SlideInDown, SlideOutDown,
    useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { getChapters, getChapterPages } from '../../lib/mangalib';
import { useManga } from '../../providers/MangaProvider';
import { useDownloads } from '../../providers/DownloadsProvider';
import { MANGA_IMG_HEADERS } from '../../lib/config';
import { theme } from '../../theme';

const DEFAULT_ASPECT = 1.45;                 // page height/width when the API gives no dimensions
const MODE_KEY = 'hades_reader_mode';        // 'vertical' (webtoon) | 'paged' (RTL page flip)
const PICKER_ROW_H = 54;

// Taps are handled by container-level gestures (single = bars, double = zoom),
// so pages are plain images.
const PageItem = memo(function PageItem({ uri, width, height }) {
    return (
        <Image
            source={{ uri, headers: MANGA_IMG_HEADERS }}
            style={{ width, height }}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={uri}
        />
    );
});

export default function MangaReaderScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width, height: viewportH } = useWindowDimensions();
    const params = useLocalSearchParams();
    const slug = String(params.slug || '');
    const titleMeta = useMemo(() => ({
        dir: slug,
        title: params.title || '',
        cover: params.cover || null,
        type: params.type || '',
        rating: Number(params.rating) || 0,
    }), [slug, params.title, params.cover, params.type, params.rating]);

    const { mangaProgress, mangaRead, recordChapterOpened, markChapterProgress, markReadingPosition, addReadingTime, getChapterReadPct } = useManga();
    const { getDownloadedPages } = useDownloads();
    const getDownloadedRef = useRef(getDownloadedPages);
    useEffect(() => { getDownloadedRef.current = getDownloadedPages; }, [getDownloadedPages]);

    const [chapters, setChapters] = useState([]);
    const [chapter, setChapter] = useState(null);
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [bars, setBars] = useState(true);
    const [pageNo, setPageNo] = useState(1);
    const [pct, setPct] = useState(0);
    const [mode, setMode] = useState('vertical');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [offline, setOffline] = useState(false);

    const listRef = useRef(null);
    const seqRef = useRef(0);
    const scrollTick = useRef(0);
    const resumeRef = useRef(null);       // % to restore once pages are laid out
    const pctRef = useRef(0);             // latest % (for mode switching)
    const prefetchedRef = useRef({});     // chapter.id -> true once its images are prefetched
    const progressRef = useRef(mangaProgress);
    const readRef = useRef(mangaRead);
    useEffect(() => { progressRef.current = mangaProgress; }, [mangaProgress]);
    useEffect(() => { readRef.current = mangaRead; }, [mangaRead]);

    const invalidate = useCallback(() => { seqRef.current++; }, []);

    // Smooth bottom progress bar.
    const progress = useSharedValue(0);
    const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

    const toggleBars = useCallback(() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
        setBars(v => !v);
    }, []);
    const hapticLight = useCallback(() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }, []);

    // Zoom: pinch = temporary peek (springs back), double tap = pinned 2.2x
    // toggle at the tapped point. Single tap toggles the bars.
    const zoom = useSharedValue(1);
    const zoomTx = useSharedValue(0);
    const zoomTy = useSharedValue(0);
    const gestures = useMemo(() => {
        const spring = { damping: 16, stiffness: 160 };
        const pinch = Gesture.Pinch()
            .onUpdate((e) => {
                const s = Math.max(1, Math.min(3.5, e.scale));
                zoom.value = s;
                zoomTx.value = (1 - s) * (e.focalX - width / 2);
                zoomTy.value = (1 - s) * (e.focalY - viewportH / 2);
            })
            .onEnd(() => {
                zoom.value = withSpring(1, spring);
                zoomTx.value = withSpring(0, spring);
                zoomTy.value = withSpring(0, spring);
            });
        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd((e, success) => {
                if (!success) return;
                if (zoom.value > 1.05) {
                    zoom.value = withSpring(1, spring);
                    zoomTx.value = withSpring(0, spring);
                    zoomTy.value = withSpring(0, spring);
                } else {
                    const s = 2.2;
                    zoom.value = withSpring(s, spring);
                    zoomTx.value = withSpring((1 - s) * (e.x - width / 2), spring);
                    zoomTy.value = withSpring((1 - s) * (e.y - viewportH / 2), spring);
                }
                runOnJS(hapticLight)();
            });
        const singleTap = Gesture.Tap()
            .numberOfTaps(1)
            .onEnd((_e, success) => {
                if (success) runOnJS(toggleBars)();
            });
        return Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, singleTap));
    }, [width, viewportH, zoom, zoomTx, zoomTy, toggleBars, hapticLight]);
    const zoomStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: zoomTx.value }, { translateY: zoomTy.value }, { scale: zoom.value }],
    }));

    // Reading mode preference.
    useEffect(() => {
        AsyncStorage.getItem(MODE_KEY).then(v => { if (v === 'paged' || v === 'vertical') setMode(v); }).catch(() => {});
    }, []);

    const toggleMode = useCallback(() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        setMode(prev => {
            const next = prev === 'vertical' ? 'paged' : 'vertical';
            resumeRef.current = pctRef.current; // keep the place when switching
            AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
            return next;
        });
    }, []);

    // Total reading time: count the seconds this screen was mounted (capped).
    useEffect(() => {
        const start = Date.now();
        return () => addReadingTime(Math.min((Date.now() - start) / 1000, 3 * 3600));
    }, [addReadingTime]);

    // Page geometry is known up front (the API returns dimensions), so the list
    // scrolls to any offset without measuring — that powers resume and progress.
    const layout = useMemo(() => {
        const heights = pages.map(p => (p.width && p.height ? width * (p.height / p.width) : width * DEFAULT_ASPECT));
        const offsets = [0];
        for (let i = 0; i < heights.length; i++) offsets.push(offsets[i] + heights[i]);
        return { heights, offsets, total: offsets[heights.length] || 0 };
    }, [pages, width]);

    const applyProgress = useCallback((percent, page) => {
        pctRef.current = percent;
        progress.value = withTiming(percent, { duration: 180 });
        setPct(Math.round(percent));
        setPageNo(page);
    }, [progress]);

    const loadChapter = useCallback(async (ch) => {
        if (!ch) return;
        const seq = ++seqRef.current;
        setChapter(ch);
        setLoading(true);
        setError(false);
        setPages([]);
        setBars(true);
        applyProgress(0, 1);
        zoom.value = withTiming(1, { duration: 150 });
        zoomTx.value = withTiming(0, { duration: 150 });
        zoomTy.value = withTiming(0, { duration: 150 });
        try {
            // Downloaded chapters read from disk — no network needed.
            const local = getDownloadedRef.current(slug, ch.id);
            const list = local?.length
                ? local.map(p => ({ link: p.uri, width: p.width, height: p.height }))
                : (await getChapterPages(slug, ch.volume, ch.number)).pages;
            if (seq !== seqRef.current) return;
            setOffline(!!local?.length);
            if (!list.length) { setError(true); }
            else {
                // Resume mid-chapter: exact pointer position, else furthest read %.
                const pointer = progressRef.current[slug];
                const saved = (pointer && pointer.chapterId === ch.id && typeof pointer.pct === 'number')
                    ? pointer.pct
                    : readRef.current[slug]?.[ch.id];
                resumeRef.current = saved != null && saved >= 2 && saved <= 97 ? saved : null;
                setPages(list);
                recordChapterOpened(titleMeta, ch);
            }
        } catch (e) {
            console.warn('Manga pages error:', e.message);
            if (seq === seqRef.current) setError(true);
        }
        if (seq === seqRef.current) setLoading(false);
    }, [slug, titleMeta, recordChapterOpened, applyProgress, zoom, zoomTx, zoomTy]);

    // Boot: chapter list + the requested chapter.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const chs = await getChapters(slug);
                if (cancelled) return;
                setChapters(chs);
                const target = chs.find(c => String(c.volume) === String(params.volume) && String(c.number) === String(params.number)) || chs[chs.length - 1];
                loadChapter(target);
            } catch (e) {
                console.warn('Manga chapters error:', e.message);
                if (!cancelled) { setError(true); setLoading(false); }
            }
        })();
        return () => { cancelled = true; invalidate(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    // Restore the saved position as soon as the list has content (and again
    // after a mode switch, which remounts the list).
    useEffect(() => {
        if (!pages.length || resumeRef.current == null) return;
        const saved = resumeRef.current;
        resumeRef.current = null;
        requestAnimationFrame(() => {
            if (mode === 'paged') {
                const idx = Math.max(0, Math.min(pages.length - 1, Math.round((saved / 100) * pages.length) - 1));
                listRef.current?.scrollToIndex({ index: idx, animated: false });
            } else if (layout.total) {
                const target = Math.max(0, (saved / 100) * layout.total - viewportH);
                listRef.current?.scrollToOffset({ offset: target, animated: false });
            }
        });
    }, [pages, layout.total, viewportH, mode]);

    const chapterIndex = useMemo(() => (chapter ? chapters.findIndex(c => c.id === chapter.id) : -1), [chapters, chapter]);
    const nextChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;   // newest-first
    const prevChapter = chapterIndex >= 0 && chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

    // Near the end of a chapter — prefetch the next one (pages meta + first images).
    useEffect(() => {
        if (pct < 65 || !nextChapter || prefetchedRef.current[nextChapter.id]) return;
        prefetchedRef.current[nextChapter.id] = true;
        (async () => {
            try {
                const { pages: list } = await getChapterPages(slug, nextChapter.volume, nextChapter.number);
                const urls = list.slice(0, 4).map(p => p.link);
                if (urls.length) await Image.prefetch(urls, { headers: MANGA_IMG_HEADERS, cachePolicy: 'memory-disk' });
            } catch { /* best-effort */ }
        })();
    }, [pct, nextChapter, slug]);

    const goChapter = useCallback((target) => {
        if (!target) return;
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        setPickerOpen(false);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        loadChapter(target);
    }, [loadChapter]);

    const onScroll = useCallback((e) => {
        const now = Date.now();
        if (now - scrollTick.current < 200) return;
        scrollTick.current = now;
        const y = e.nativeEvent.contentOffset.y;
        const total = layout.total;
        if (!total || !chapter) return;
        const percent = Math.max(0, Math.min(100, ((y + viewportH) / total) * 100));
        markChapterProgress(slug, chapter.id, percent);
        markReadingPosition(slug, chapter.id, percent);
        // Current page = the page under the middle of the screen.
        const mid = y + viewportH / 2;
        let lo = 0;
        for (let i = 0; i < layout.offsets.length - 1; i++) { if (layout.offsets[i] <= mid) lo = i; else break; }
        applyProgress(percent, lo + 1);
    }, [layout, chapter, viewportH, slug, markChapterProgress, markReadingPosition, applyProgress]);

    // Paged mode progress comes from the visible page index. RN requires this
    // handler to keep a stable identity, so the changing bits live in refs.
    const viewableCtxRef = useRef({ chapter: null, pagesLen: 0 });
    useEffect(() => { viewableCtxRef.current = { chapter, pagesLen: pages.length }; }, [chapter, pages.length]);
    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        const { chapter: ch, pagesLen } = viewableCtxRef.current;
        if (!viewableItems.length || !ch || !pagesLen) return;
        const idx = viewableItems[0].index ?? 0;
        const percent = ((idx + 1) / pagesLen) * 100;
        markChapterProgress(slug, ch.id, percent);
        markReadingPosition(slug, ch.id, percent);
        applyProgress(percent, idx + 1);
    }, [slug, markChapterProgress, markReadingPosition, applyProgress]);
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

    const renderVertical = useCallback(({ item, index }) => (
        <PageItem uri={item.link} width={width} height={layout.heights[index]} />
    ), [width, layout.heights]);

    const renderPaged = useCallback(({ item }) => (
        <PageItem uri={item.link} width={width} height={viewportH} />
    ), [width, viewportH]);

    const footerContent = (
        <>
            <Text style={styles.footerEnd}>— Конец главы —</Text>
            {nextChapter ? (
                <Pressable onPress={() => goChapter(nextChapter)} style={({ pressed }) => [styles.nextBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
                    <Text style={styles.nextBtnText}>Следующая глава · Том {nextChapter.volume} Гл. {nextChapter.number}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
            ) : (
                <Text style={styles.footerLast}>Это последняя глава 🎉</Text>
            )}
        </>
    );
    const footer = <View style={[styles.footer, { paddingBottom: insets.bottom + 90 }]}>{footerContent}</View>;
    const pagedFooter = <View style={[styles.pagedFooter, { width, height: viewportH }]}>{footerContent}</View>;

    return (
        <View style={styles.container}>
            <StatusBar style="light" hidden={!bars} animated />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.orange} />
                    {chapter && <Text style={styles.loadingText}>Том {chapter.volume} · Глава {chapter.number}</Text>}
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorEmoji}>😔</Text>
                    <Text style={styles.errorText}>Не удалось загрузить главу</Text>
                    <Pressable onPress={() => loadChapter(chapter)} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Повторить</Text>
                    </Pressable>
                </View>
            ) : (
                <GestureDetector gesture={gestures}>
                    <Animated.View entering={FadeIn.duration(250)} style={[styles.container, zoomStyle]} key={`${chapter?.id}-${mode}`}>
                        {mode === 'vertical' ? (
                            <FlatList
                                ref={listRef}
                                data={pages}
                                keyExtractor={(p, i) => `${p.link}-${i}`}
                                renderItem={renderVertical}
                                getItemLayout={(_, index) => ({ length: layout.heights[index], offset: layout.offsets[index], index })}
                                onScroll={onScroll}
                                scrollEventThrottle={64}
                                onScrollBeginDrag={() => setBars(false)}
                                ListFooterComponent={footer}
                                initialNumToRender={3}
                                maxToRenderPerBatch={3}
                                windowSize={9}
                                removeClippedSubviews
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <FlatList
                                ref={listRef}
                                data={pages}
                                keyExtractor={(p, i) => `${p.link}-${i}`}
                                renderItem={renderPaged}
                                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                                horizontal
                                inverted
                                pagingEnabled
                                onViewableItemsChanged={onViewableItemsChanged}
                                viewabilityConfig={viewabilityConfig}
                                onScrollBeginDrag={() => setBars(false)}
                                ListFooterComponent={pagedFooter}
                                initialNumToRender={2}
                                maxToRenderPerBatch={2}
                                windowSize={5}
                                showsHorizontalScrollIndicator={false}
                            />
                        )}
                    </Animated.View>
                </GestureDetector>
            )}

            {bars && (
                <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    <Pressable onPress={() => router.back()} style={styles.barBtn} hitSlop={8}>
                        <Ionicons name="close" size={22} color="#fff" />
                    </Pressable>
                    <View style={styles.topInfo}>
                        <Text style={styles.topTitle} numberOfLines={1}>{titleMeta.title || 'Манга'}</Text>
                        {chapter && (
                            <Text style={styles.topChapter}>
                                {offline ? '📴 ' : ''}Том {chapter.volume} · Глава {chapter.number}{chapter.name ? ` — ${chapter.name}` : ''}
                            </Text>
                        )}
                    </View>
                    <Pressable onPress={toggleMode} style={styles.barBtn} hitSlop={8}>
                        <Ionicons name={mode === 'vertical' ? 'swap-horizontal' : 'swap-vertical'} size={20} color="#fff" />
                    </Pressable>
                </Animated.View>
            )}

            {bars && !loading && !error && (
                <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutDown.duration(180)} style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, progressStyle]} />
                    </View>
                    <View style={styles.bottomRow}>
                        <Pressable onPress={() => goChapter(prevChapter)} disabled={!prevChapter} style={[styles.chapterNavBtn, !prevChapter && { opacity: 0.35 }]} hitSlop={6}>
                            <Ionicons name="chevron-back" size={18} color="#fff" />
                            <Text style={styles.chapterNavText}>Пред.</Text>
                        </Pressable>
                        <Pressable onPress={() => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} setPickerOpen(true); }} style={styles.pickerBtn} hitSlop={6}>
                            <Ionicons name="list" size={15} color={theme.orange} />
                            <Text style={styles.pageIndicator}>{pageNo} / {pages.length} · {pct}%</Text>
                        </Pressable>
                        <Pressable onPress={() => goChapter(nextChapter)} disabled={!nextChapter} style={[styles.chapterNavBtn, !nextChapter && { opacity: 0.35 }]} hitSlop={6}>
                            <Text style={styles.chapterNavText}>След.</Text>
                            <Ionicons name="chevron-forward" size={18} color="#fff" />
                        </Pressable>
                    </View>
                </Animated.View>
            )}

            {pickerOpen && (
                <View style={StyleSheet.absoluteFill}>
                    <Animated.View entering={FadeIn.duration(180)} style={styles.pickerBackdrop}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
                    </Animated.View>
                    <Animated.View entering={SlideInDown.duration(280)} exiting={SlideOutDown.duration(220)} style={[styles.pickerSheet, { paddingBottom: insets.bottom + 8 }]}>
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>Главы · {chapters.length}</Text>
                        <FlatList
                            data={chapters}
                            keyExtractor={c => c.id}
                            initialScrollIndex={Math.max(0, chapterIndex)}
                            getItemLayout={(_, index) => ({ length: PICKER_ROW_H, offset: PICKER_ROW_H * index, index })}
                            renderItem={({ item }) => {
                                const readPct = getChapterReadPct(slug, item.id);
                                const isCurrent = chapter?.id === item.id;
                                return (
                                    <Pressable onPress={() => goChapter(item)} style={[styles.pickerRow, isCurrent && styles.pickerRowActive]}>
                                        <View style={styles.pickerRowInfo}>
                                            <Text style={[styles.pickerRowLabel, isCurrent && { color: theme.orange }]} numberOfLines={1}>
                                                Том {item.volume} · Глава {item.number}
                                            </Text>
                                            {!!item.name && <Text style={styles.pickerRowName} numberOfLines={1}>{item.name}</Text>}
                                        </View>
                                        {readPct >= 90 ? (
                                            <Ionicons name="checkmark-circle" size={16} color={theme.green} />
                                        ) : readPct > 0 ? (
                                            <Text style={styles.pickerRowPct}>{readPct}%</Text>
                                        ) : null}
                                    </Pressable>
                                );
                            }}
                            style={styles.pickerList}
                            showsVerticalScrollIndicator={false}
                        />
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    errorEmoji: { fontSize: 40 },
    errorText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
    retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.surface2, borderRadius: 12 },
    retryText: { color: '#fff', fontWeight: '700' },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, backgroundColor: 'rgba(10,10,10,0.92)', zIndex: 5 },
    barBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    topInfo: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
    topTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
    topChapter: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,10,10,0.92)', paddingTop: 10, paddingHorizontal: 16, zIndex: 5 },
    progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
    progressFill: { height: '100%', backgroundColor: theme.orange, borderRadius: 2 },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chapterNavBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.surface2, borderRadius: 12 },
    chapterNavText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,152,0,0.12)' },
    pageIndicator: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
    footer: { alignItems: 'center', paddingTop: 28, gap: 14 },
    pagedFooter: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
    footerEnd: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    footerLast: { color: theme.textSecondary, fontSize: 14, fontWeight: '700' },
    nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: theme.orange, borderRadius: 14 },
    nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    pickerSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '65%', backgroundColor: theme.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10 },
    pickerHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 10 },
    pickerTitle: { color: theme.text, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginBottom: 8 },
    pickerList: { paddingHorizontal: 8 },
    pickerRow: { height: PICKER_ROW_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12 },
    pickerRowActive: { backgroundColor: 'rgba(255,152,0,0.1)' },
    pickerRowInfo: { flex: 1, marginRight: 10 },
    pickerRowLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
    pickerRowName: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
    pickerRowPct: { color: theme.orange, fontSize: 12, fontWeight: '800' },
});
