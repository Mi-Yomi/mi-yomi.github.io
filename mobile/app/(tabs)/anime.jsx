import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useData } from '../../providers/DataProvider';
import HeroCarousel from '../../components/components/HeroCarousel';
import Section from '../../components/components/Section';
import { theme } from '../../theme';
import { ANIME_GENRES, ANIME_GENRE_MAP } from '../../lib/utils';

const GENRES = ANIME_GENRES || [{ id: 'all', label: 'Все' }];

function AnimeGenreChip({ label, active, onPress }) {
    return (
        <Pressable
            onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                onPress?.();
            }}
            style={({ pressed }) => [styles.genreChip, !active && styles.genreChipInactive, pressed && { opacity: 0.85 }]}
        >
            {active && (
                <LinearGradient colors={['#ff6b9d', '#c44dff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.genreChipGradient]} />
            )}
            <Text style={[styles.genreLabel, active && styles.genreLabelActive]}>{label}</Text>
        </Pressable>
    );
}

export default function AnimeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { animeMovies, animeSeries, dataLoading } = useData();
    const [animeGenre, setAnimeGenre] = useState('all');

    const animeHeroItems = useMemo(
        () => [...(animeSeries || []), ...(animeMovies || [])].filter(a => a.backdrop_path).slice(0, 5),
        [animeSeries, animeMovies]
    );

    const genreId = animeGenre === 'all' ? null : (ANIME_GENRE_MAP || {})[animeGenre];

    const filteredAnimeSeries = useMemo(() => {
        const list = animeSeries || [];
        if (!genreId) return list;
        return list.filter(a => (a.genre_ids || []).includes(genreId));
    }, [animeSeries, genreId]);

    const filteredAnimeMovies = useMemo(() => {
        const list = animeMovies || [];
        if (!genreId) return list;
        return list.filter(a => (a.genre_ids || []).includes(genreId));
    }, [animeMovies, genreId]);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(280).delay(50)} style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.logo}>🎌 Аниме</Text>
                <Pressable onPress={() => router.push('/search')} style={styles.searchBtn}>
                    <Text style={styles.searchText}>🔍 Поиск</Text>
                </Pressable>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(100)}>
                <HeroCarousel
                    items={animeHeroItems}
                    badgePrefix="Аниме"
                    badgeIcon="🎌"
                    defaultType="tv"
                />
            </Animated.View>

            <Animated.View entering={FadeIn.duration(350).delay(150)} style={styles.genreWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow} nestedScrollEnabled>
                    {GENRES.map(g => (
                        <AnimeGenreChip
                            key={g.id}
                            label={g.label}
                            active={animeGenre === g.id}
                            onPress={() => setAnimeGenre(g.id)}
                        />
                    ))}
                </ScrollView>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(380).delay(200)}>
                <Section title="Аниме-сериалы" icon="📺" items={filteredAnimeSeries} loading={dataLoading} type="tv" />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(380).delay(280)}>
                <Section title="Аниме-фильмы" icon="🎬" items={filteredAnimeMovies} loading={dataLoading} type="movie" />
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    logo: { fontSize: 22, fontWeight: '900', color: theme.text },
    searchBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12 },
    searchText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    genreWrap: { marginBottom: 20 },
    genreRow: { paddingHorizontal: 16, gap: 10 },
    genreChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    genreChipInactive: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,107,157,0.3)',
    },
    genreChipGradient: { borderRadius: 20 },
    genreLabel: { color: '#ff6b9d', fontSize: 13, fontWeight: '700' },
    genreLabelActive: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
