import { ScrollView, View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../providers/DataProvider';
import HeroCarousel from '../../components/HeroCarousel';
import Section from '../../components/Section';
import ContinueCard from '../../components/ContinueCard';
import { HOME_GENRES } from '../../lib/utils';
import { theme } from '../../theme';
import { useState } from 'react';

export default function HomeScreen() {
    const router = useRouter();
    const { trending, popular, topRated, history, upcoming, dataLoading, favorites } = useData();
    const [genre, setGenre] = useState('all');
    const filtered = genre === 'all' ? popular : popular.filter(i => i.genre_ids?.includes(Number(genre)));
    const filteredTop = genre === 'all' ? topRated : topRated.filter(i => i.genre_ids?.includes(Number(genre)));

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <View><Text style={styles.logoSub}>Cinema</Text><Text style={styles.logoMain}>HADES</Text></View>
                <Pressable onPress={() => router.push('/search')} style={styles.searchBtn}>
                    <Text style={{ color: theme.text, fontSize: 20 }}>🔍</Text>
                </Pressable>
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <HeroCarousel items={trending} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {HOME_GENRES.map(g => (
                        <Pressable key={g.id} onPress={() => setGenre(g.id)} style={[styles.chip, genre === g.id && styles.chipActive]}>
                            <Text style={[styles.chipText, genre === g.id && styles.chipTextActive]}>{g.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                {history.length > 0 && (
                    <View style={styles.sectionWrap}>
                        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>▶️ Продолжить</Text></View>
                        <FlatList horizontal data={history.slice(0, 10)} renderItem={({ item }) => <ContinueCard item={{ ...item, id: item.item_id || item.id }} />} keyExtractor={item => item.item_id || item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }} />
                    </View>
                )}
                <Section title="Популярные" icon="🔥" items={filtered} loading={dataLoading} />
                <Section title="Топ рейтинга" icon="⭐" items={filteredTop} loading={dataLoading} />
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    logoSub: { fontSize: 8, fontWeight: '700', color: theme.accent, letterSpacing: 3, textTransform: 'uppercase' },
    logoMain: { fontSize: 24, fontWeight: '900', color: theme.text },
    searchBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.glass, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    scroll: { flex: 1 },
    chips: { paddingHorizontal: 16, gap: 10, marginBottom: 20 },
    chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    chipText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
    chipTextActive: { color: '#fff' },
    sectionWrap: { marginBottom: 28 },
    sectionHead: { paddingHorizontal: 16, marginBottom: 14 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
});
