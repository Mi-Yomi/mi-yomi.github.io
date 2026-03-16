import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../providers/DataProvider';
import HeroCarousel from '../../components/HeroCarousel';
import Section from '../../components/Section';
import { ANIME_GENRES, ANIME_GENRE_MAP } from '../../lib/utils';
import { theme } from '../../theme';
import { useState, useMemo } from 'react';

export default function AnimeScreen() {
    const { animeSeries, animeMovies, dataLoading } = useData();
    const [genre, setGenre] = useState('all');
    const heroItems = useMemo(() => [...animeSeries, ...animeMovies].filter(a => a.backdrop_path).slice(0, 5), [animeSeries, animeMovies]);
    const filter = (items) => { if (genre === 'all') return items; const gid = ANIME_GENRE_MAP[genre]; return items.filter(i => i.genre_ids?.includes(gid)); };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
            <View style={styles.header}><Text style={styles.headerTitle}>АНИМЕ</Text><Text style={styles.headerSub}>Лучшее аниме из Японии</Text></View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <HeroCarousel items={heroItems} badgePrefix="Аниме" badgeIcon="🎌" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {ANIME_GENRES.map(g => (
                        <Pressable key={g.id} onPress={() => setGenre(g.id)} style={[styles.chip, genre === g.id && styles.chipActive]}>
                            <Text style={[styles.chipText, genre === g.id && styles.chipTextActive]}>{g.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                <Section title="Аниме-сериалы" icon="📺" items={filter(animeSeries)} type="tv" loading={dataLoading} />
                <Section title="Аниме-фильмы" icon="🎬" items={filter(animeMovies)} type="movie" loading={dataLoading} />
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { alignItems: 'center', paddingVertical: 16 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: theme.pink },
    headerSub: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
    chips: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,107,157,0.06)', borderWidth: 1, borderColor: 'rgba(255,107,157,0.2)' },
    chipActive: { backgroundColor: theme.pink, borderColor: theme.pink },
    chipText: { fontSize: 12, fontWeight: '700', color: '#ff6b9d' },
    chipTextActive: { color: '#fff' },
});
