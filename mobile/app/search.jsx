import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/tmdb';
import MediaCard from '../components/components/MediaCard';
import { theme } from '../theme';

const CARD_GAP = 12;
const PADDING = 16;

export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const cardWidth = Math.floor((width - PADDING * 2 - CARD_GAP) / 2);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const search = useCallback(async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResults([]);
        try {
            const data = await api(`/search/multi?query=${encodeURIComponent(query.trim())}`);
            const items = (data?.results || []).filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && (r.poster_path || r.backdrop_path));
            setResults(items);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    }, [query]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Назад</Text>
                </Pressable>
                <TextInput
                    style={styles.input}
                    placeholder="Поиск фильмов и сериалов..."
                    placeholderTextColor={theme.textMuted}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={search}
                    returnKeyType="search"
                    autoFocus
                />
                <Pressable onPress={search} style={styles.searchBtn}>
                    <Text style={styles.searchBtnText}>Найти</Text>
                </Pressable>
            </View>
            {loading && <Text style={styles.status}>Поиск...</Text>}
            {!loading && results.length === 0 && query && <Text style={styles.status}>Ничего не найдено</Text>}
            <FlatList
                data={results}
                keyExtractor={item => `${item.media_type}-${item.id}`}
                numColumns={2}
                contentContainerStyle={styles.grid}
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                    <View style={[styles.cardWrap, { width: cardWidth }]}>
                        <MediaCard item={item} width={cardWidth} compact />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    backBtn: { padding: 8 },
    backText: { color: theme.accent, fontSize: 15, fontWeight: '700' },
    input: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: theme.text, fontSize: 16 },
    searchBtn: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.accent, borderRadius: 12 },
    searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    status: { color: theme.textMuted, fontSize: 14, textAlign: 'center', padding: 24 },
    grid: { padding: 16, paddingBottom: 40 },
    row: { justifyContent: 'space-between', marginBottom: CARD_GAP },
    cardWrap: {},
});
