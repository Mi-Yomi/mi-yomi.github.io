import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { api } from '../lib/tmdb';
import { searchManga } from '../lib/mangalib';
import MediaCard from '../components/components/MediaCard';
import MangaCard from '../components/components/MangaCard';
import { theme } from '../theme';

const CARD_GAP = 12;
const PADDING = 16;

const SCOPES = [
    { id: 'media', label: '🎬 Кино и сериалы' },
    { id: 'manga', label: '📖 Манга' },
];

const RECENTS_KEY = 'hades_recent_searches';
const RECENTS_MAX = 10;

export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const params = useLocalSearchParams();
    const cardWidth = Math.floor((width - PADDING * 2 - CARD_GAP) / 2);
    const [scope, setScope] = useState(params.scope === 'manga' ? 'manga' : 'media');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [recents, setRecents] = useState([]);
    const seqRef = useRef(0);

    useEffect(() => {
        AsyncStorage.getItem(RECENTS_KEY)
            .then(v => { const arr = JSON.parse(v || '[]'); if (Array.isArray(arr)) setRecents(arr); })
            .catch(() => {});
    }, []);

    const saveRecent = useCallback((q) => {
        setRecents(prev => {
            const next = [q, ...prev.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, RECENTS_MAX);
            AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
            return next;
        });
    }, []);

    const clearRecents = useCallback(() => {
        setRecents([]);
        AsyncStorage.removeItem(RECENTS_KEY).catch(() => {});
    }, []);

    // Debounced live search for both scopes.
    useEffect(() => {
        const q = query.trim();
        const seq = ++seqRef.current;
        if (!q) { setResults([]); setLoading(false); return undefined; }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                let items = [];
                if (scope === 'manga') {
                    items = await searchManga(q);
                } else {
                    const data = await api(`/search/multi?query=${encodeURIComponent(q)}`);
                    items = (data?.results || []).filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && (r.poster_path || r.backdrop_path));
                }
                if (seq === seqRef.current) {
                    setResults(items);
                    if (items.length && q.length >= 2) saveRecent(q);
                }
            } catch (e) {
                console.warn('Search error:', e.message);
            }
            if (seq === seqRef.current) setLoading(false);
        }, 400);
        return () => clearTimeout(t);
    }, [query, scope, saveRecent]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Назад">
                    <Text style={styles.backText}>←</Text>
                </Pressable>
                <TextInput
                    style={styles.input}
                    placeholder={scope === 'manga' ? 'Поиск манги...' : 'Поиск фильмов и сериалов...'}
                    placeholderTextColor={theme.textMuted}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    autoFocus
                    accessibilityLabel={scope === 'manga' ? 'Поиск манги' : 'Поиск фильмов и сериалов'}
                />
            </View>

            <View style={styles.scopeRow}>
                {SCOPES.map(s => (
                    <Pressable
                        key={s.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: scope === s.id }}
                        onPress={() => {
                            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                            setScope(s.id);
                            setResults([]);
                        }}
                        style={[styles.scopeChip, scope === s.id && (s.id === 'manga' ? styles.scopeChipManga : styles.scopeChipActive)]}
                    >
                        <Text style={[styles.scopeText, scope === s.id && styles.scopeTextActive]}>{s.label}</Text>
                    </Pressable>
                ))}
            </View>

            {loading && <ActivityIndicator style={styles.status} color={scope === 'manga' ? theme.orange : theme.accent} accessibilityLabel="Идёт поиск" />}
            {!loading && results.length === 0 && !!query.trim() && <Text style={styles.statusText} accessibilityLiveRegion="polite">Ничего не найдено</Text>}

            {!query.trim() && recents.length > 0 && (
                <Animated.View entering={FadeIn.duration(250)} style={styles.recentsWrap}>
                    <View style={styles.recentsHead}>
                        <Text style={styles.recentsTitle}>Недавние запросы</Text>
                        <Pressable onPress={clearRecents} hitSlop={8} accessibilityRole="button" accessibilityLabel="Очистить недавние запросы">
                            <Text style={styles.recentsClear}>Очистить</Text>
                        </Pressable>
                    </View>
                    <View style={styles.recentsRow}>
                        {recents.map(r => (
                            <Pressable key={r} onPress={() => setQuery(r)} style={styles.recentChip} accessibilityRole="button" accessibilityLabel={`Повторить поиск: ${r}`}>
                                <Ionicons name="time-outline" size={13} color={theme.textMuted} />
                                <Text style={styles.recentText}>{r}</Text>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>
            )}

            <FlatList
                data={loading ? [] : results}
                key={scope}
                keyExtractor={item => scope === 'manga' ? String(item.id) : `${item.media_type}-${item.id}`}
                numColumns={2}
                contentContainerStyle={styles.grid}
                columnWrapperStyle={styles.row}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInUp.duration(280).delay((index % 6) * 40)} style={{ width: cardWidth }}>
                        {scope === 'manga'
                            ? <MangaCard item={item} width={cardWidth} />
                            : <MediaCard item={item} width={cardWidth} />}
                    </Animated.View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    backBtn: { padding: 8 },
    backText: { color: theme.text, fontSize: 22, fontWeight: '700' },
    input: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: theme.text, fontSize: 16 },
    scopeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    scopeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: theme.surface },
    scopeChipActive: { backgroundColor: theme.accent },
    scopeChipManga: { backgroundColor: theme.orange },
    scopeText: { color: theme.textSecondary, fontSize: 12, fontWeight: '700' },
    scopeTextActive: { color: '#fff' },
    status: { padding: 24 },
    statusText: { color: theme.textMuted, fontSize: 14, textAlign: 'center', padding: 24 },
    recentsWrap: { paddingHorizontal: 16, paddingTop: 12 },
    recentsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    recentsTitle: { color: theme.text, fontSize: 14, fontWeight: '800' },
    recentsClear: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    recentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recentChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.surface },
    recentText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    grid: { padding: 16, paddingBottom: 40 },
    row: { justifyContent: 'space-between', marginBottom: CARD_GAP },
});
