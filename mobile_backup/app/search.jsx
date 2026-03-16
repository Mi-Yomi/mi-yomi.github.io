import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../lib/tmdb';
import MediaCard from '../components/MediaCard';
import { theme } from '../theme';

const COLS = 3;
const GAP = 12;
const PAD = 16;
const cardW = (Dimensions.get('window').width - PAD * 2 - GAP * (COLS - 1)) / COLS;

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            const data = await api(`/search/multi?query=${encodeURIComponent(query)}`);
            if (data) setResults((data.results || []).filter(r => r.media_type !== 'person'));
            setLoading(false);
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <TextInput style={styles.input} placeholder="Поиск фильмов и сериалов..." placeholderTextColor={theme.textMuted} value={query} onChangeText={setQuery} autoFocus returnKeyType="search" />
                <Pressable onPress={() => router.back()}><Text style={styles.cancel}>Отмена</Text></Pressable>
            </View>
            {loading && <View style={styles.loadWrap}><Text style={{ color: theme.textMuted }}>Ищем...</Text></View>}
            {!loading && results.length > 0 && (
                <FlatList data={results} numColumns={COLS} keyExtractor={r => String(r.id)} contentContainerStyle={styles.grid} columnWrapperStyle={{ gap: GAP }} renderItem={({ item }) => <MediaCard item={item} width={cardW} />} />
            )}
            {!loading && query && results.length === 0 && (
                <View style={styles.empty}><Text style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🔍</Text><Text style={{ color: theme.textMuted, fontWeight: '700' }}>Ничего не найдено</Text></View>
            )}
            {!query && <View style={styles.empty}><Text style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎬</Text><Text style={{ color: theme.textMuted, fontWeight: '700' }}>Введите название</Text></View>}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: theme.surface },
    input: { flex: 1, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, color: theme.text, fontSize: 15 },
    cancel: { color: theme.accent, fontSize: 14, fontWeight: '700' },
    grid: { padding: PAD, gap: GAP },
    loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
