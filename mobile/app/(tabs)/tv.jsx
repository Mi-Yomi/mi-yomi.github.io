import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../../providers/DataProvider';
import Section from '../../components/components/Section';
import { theme } from '../../theme';

export default function TvScreen() {
    const router = useRouter();
    const { tvPopular, tvTop, tvOnAir, dataLoading } = useData();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.logo}>📺 Сериалы</Text>
                <Pressable onPress={() => router.push('/search')} style={styles.searchBtn}>
                    <Text style={styles.searchText}>🔍 Поиск</Text>
                </Pressable>
            </View>

            <Section title="Популярные" icon="🔥" items={tvPopular} loading={dataLoading} type="tv" />
            <Section title="Топ рейтинга" icon="⭐" items={tvTop} loading={dataLoading} type="tv" />
            <Section title="В эфире" icon="📡" items={tvOnAir} loading={dataLoading} type="tv" />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    logo: { fontSize: 22, fontWeight: '900', color: theme.text },
    searchBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12 },
    searchText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
});
