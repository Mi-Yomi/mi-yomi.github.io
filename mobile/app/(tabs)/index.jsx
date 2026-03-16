import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../../providers/DataProvider';
import { useSocial } from '../../providers/SocialProvider';
import HeroCarousel from '../../components/components/HeroCarousel';
import Section from '../../components/components/Section';
import ContinueCard from '../../components/components/ContinueCard';
import UpcomingSection from '../../components/components/UpcomingSection';
import FriendsActivity from '../../components/components/FriendsActivity';
import MediaCard from '../../components/components/MediaCard';
import { theme } from '../../theme';
import { HOME_GENRES } from '../../lib/utils';

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { trending, popular, topRated, favorites, history, watchlist, upcoming, forYou, curatedLists, dataLoading, toggleWatchlist } = useData();
    const { friendsActivity } = useSocial();
    const [homeGenre, setHomeGenre] = useState('all');
    const [randomSpinning, setRandomSpinning] = useState(false);

    const filteredPopular = homeGenre === 'all' ? popular : (popular || []).filter(m => (m.genre_ids || []).includes(Number(homeGenre)));
    const filteredTopRated = homeGenre === 'all' ? topRated : (topRated || []).filter(m => (m.genre_ids || []).includes(Number(homeGenre)));

    const openRandomMovie = useCallback(() => {
        const all = [...(trending || []), ...(popular || [])].filter(i => i.id);
        if (all.length === 0) return;
        setRandomSpinning(true);
        setTimeout(() => {
            const item = all[Math.floor(Math.random() * all.length)];
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
            router.push(`/details/${type}/${item.id}`);
            setRandomSpinning(false);
        }, 600);
    }, [trending, popular, router]);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.logo}>🎬 HADES</Text>
                <Pressable onPress={() => router.push('/search')} style={styles.searchBtn}>
                    <Text style={styles.searchText}>🔍 Поиск</Text>
                </Pressable>
            </View>

            <HeroCarousel items={trending} badgePrefix="В тренде" badgeIcon="🔥" defaultType="movie" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
                {HOME_GENRES.map(g => (
                    <Pressable key={g.id} onPress={() => setHomeGenre(g.id)} style={[styles.genreChip, homeGenre === g.id && styles.genreChipActive]}>
                        <Text style={[styles.genreLabel, homeGenre === g.id && styles.genreLabelActive]}>{g.label}</Text>
                    </Pressable>
                ))}
            </ScrollView>

            <Pressable onPress={() => router.push('/mood')} style={styles.moodWidget}>
                <Text style={styles.moodTitle}>🎯 Что посмотреть?</Text>
                <Text style={styles.moodSub}>Подберём фильм под настроение за 3 клика</Text>
            </Pressable>

            {history?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>▶️ Продолжить</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                        {history.slice(0, 10).map(h => (
                            <ContinueCard key={h.item_id} item={{ ...h, id: h.item_id }} />
                        ))}
                    </ScrollView>
                </View>
            )}

            <Pressable onPress={openRandomMovie} style={[styles.randomBtn, randomSpinning && styles.randomSpinning]}>
                <Text style={styles.randomIcon}>🎲</Text>
                <Text style={styles.randomText}>Случайный фильм</Text>
            </Pressable>

            <FriendsActivity friendsActivity={friendsActivity} />

            {watchlist?.length > 0 && (
                <Section title={`🔖 Буду смотреть ${watchlist.length}`} icon="" items={watchlist.map(w => ({ ...w, id: w.item_id }))} type="movie" />
            )}

            {curatedLists?.filter(cl => cl.is_active).map(cl => (
                <View key={cl.id} style={styles.section}>
                    <Text style={styles.sectionTitle}>🏆 {cl.title} <Text style={styles.curatedBadge}>ПОДБОРКА</Text></Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                        {(cl.items || []).map(item => (
                            <MediaCard key={item.id} item={item} width={140} />
                        ))}
                    </ScrollView>
                </View>
            ))}

            <UpcomingSection upcoming={upcoming} watchlist={watchlist} toggleWatchlist={toggleWatchlist} />

            {forYou?.length > 0 && <Section title="Подобрано для вас" icon="✨" items={forYou} type="movie" />}

            <Section title="Популярные" icon="🔥" items={filteredPopular} loading={dataLoading} type="movie" />
            <Section title="Топ рейтинга" icon="⭐" items={filteredTopRated} loading={dataLoading} type="movie" />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    logo: { fontSize: 22, fontWeight: '900', color: theme.text },
    searchBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12 },
    searchText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    genreRow: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
    genreChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface },
    genreChipActive: { backgroundColor: theme.accent },
    genreLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
    genreLabelActive: { color: '#fff' },
    moodWidget: { marginHorizontal: 16, marginBottom: 24, padding: 20, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
    moodTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 4 },
    moodSub: { fontSize: 12, color: theme.textSecondary },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginBottom: 14 },
    curatedBadge: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    row: { paddingHorizontal: 16, gap: 12 },
    randomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 24, padding: 14, backgroundColor: theme.surface2, borderRadius: 14 },
    randomSpinning: { opacity: 0.7 },
    randomIcon: { fontSize: 20 },
    randomText: { color: theme.text, fontSize: 15, fontWeight: '700' },
});
