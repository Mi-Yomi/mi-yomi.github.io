import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '../../providers/DataProvider';
import HeroCarousel from '../../components/HeroCarousel';
import Section from '../../components/Section';
import { TV_GENRES } from '../../lib/utils';
import { theme } from '../../theme';
import { useState } from 'react';

export default function TvScreen() {
    const { tvPopular, tvTop, tvOnAir, dataLoading } = useData();
    const [genre, setGenre] = useState('all');
    const filter = (items) => genre === 'all' ? items : items.filter(i => i.genre_ids?.includes(Number(genre)));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
            <View style={styles.header}><Text style={styles.headerTitle}>СЕРИАЛЫ</Text><Text style={styles.headerSub}>Лучшие сериалы со всего мира</Text></View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <HeroCarousel items={tvPopular} badgePrefix="Популярный" badgeIcon="📺" defaultType="tv" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {TV_GENRES.map(g => (
                        <Pressable key={g.id} onPress={() => setGenre(g.id)} style={[styles.chip, genre === g.id && styles.chipActive]}>
                            <Text style={[styles.chipText, genre === g.id && styles.chipTextActive]}>{g.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
                <Section title="Сейчас в эфире" icon="🔴" items={filter(tvOnAir)} type="tv" loading={dataLoading} />
                <Section title="Популярные" icon="📺" items={filter(tvPopular)} type="tv" loading={dataLoading} />
                <Section title="Лучшие всех времён" icon="🏆" items={filter(tvTop)} type="tv" loading={dataLoading} />
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { alignItems: 'center', paddingVertical: 16 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: theme.purple },
    headerSub: { fontSize: 12, color: theme.textMuted, fontWeight: '600' },
    chips: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(124,77,255,0.06)', borderWidth: 1, borderColor: 'rgba(124,77,255,0.2)' },
    chipActive: { backgroundColor: theme.purple, borderColor: theme.purple },
    chipText: { fontSize: 12, fontWeight: '700', color: '#7c4dff' },
    chipTextActive: { color: '#fff' },
});
