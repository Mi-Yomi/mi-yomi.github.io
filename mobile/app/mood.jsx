import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '../providers/DataProvider';
import MediaCard from '../components/components/MediaCard';
import { theme } from '../theme';

const MOOD_OPTIONS = [
    { id: 'fun', emoji: '😂', label: 'Весело' }, { id: 'scary', emoji: '😱', label: 'Страшно' },
    { id: 'sad', emoji: '😢', label: 'Грустно' }, { id: 'tense', emoji: '😤', label: 'Напряжённо' },
    { id: 'romantic', emoji: '❤️', label: 'Романтика' }, { id: 'epic', emoji: '🔥', label: 'Эпик' },
];
const TYPE_OPTIONS = [{ id: 'movie', emoji: '🎬', label: 'Фильм' }, { id: 'tv', emoji: '📺', label: 'Сериал' }];
const DURATION_OPTIONS = [
    { id: 'short', emoji: '⚡', label: 'До 90 мин' }, { id: 'medium', emoji: '🎯', label: '90-120 мин' },
    { id: 'long', emoji: '🎭', label: '120+ мин' }, { id: 'any', emoji: '🤷', label: 'Без разницы' },
];

export default function MoodScreen() {
    const router = useRouter();
    const { fetchMoodResults } = useData();
    const [step, setStep] = useState(0);
    const [mood, setMood] = useState(null);
    const [type, setType] = useState(null);
    const [duration, setDuration] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFetch = async () => {
        setLoading(true);
        const res = await fetchMoodResults(mood, type, duration);
        setResults(res || []);
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}><Text style={styles.close}>✕</Text></Pressable>
                <Text style={styles.title}>🎯 Что посмотреть?</Text>
            </View>

            {step === 0 && (
                <>
                    <Text style={styles.stepTitle}>Какое настроение?</Text>
                    <View style={styles.grid}>
                        {MOOD_OPTIONS.map(m => (
                            <Pressable key={m.id} onPress={() => { setMood(m.id); setStep(1); }} style={styles.moodCard}>
                                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                                <Text style={styles.moodLabel}>{m.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </>
            )}

            {step === 1 && (
                <>
                    <Text style={styles.stepTitle}>Фильм или сериал?</Text>
                    <View style={styles.grid}>
                        {TYPE_OPTIONS.map(t => (
                            <Pressable key={t.id} onPress={() => { setType(t.id); setStep(2); }} style={styles.moodCard}>
                                <Text style={styles.moodEmoji}>{t.emoji}</Text>
                                <Text style={styles.moodLabel}>{t.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Pressable onPress={() => setStep(0)} style={styles.backBtn}><Text style={styles.backText}>← Назад</Text></Pressable>
                </>
            )}

            {step === 2 && !results.length && (
                <>
                    <Text style={styles.stepTitle}>{type === 'movie' ? 'Длительность?' : 'Готово!'}</Text>
                    {type === 'movie' ? (
                        <View style={styles.grid}>
                            {DURATION_OPTIONS.map(d => (
                                <Pressable key={d.id} onPress={() => { setDuration(d.id); handleFetch(); }} style={styles.moodCard} disabled={loading}>
                                    <Text style={styles.moodEmoji}>{d.emoji}</Text>
                                    <Text style={styles.moodLabel}>{d.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <Pressable onPress={handleFetch} style={styles.fetchBtn} disabled={loading}>
                            <Text style={styles.fetchText}>{loading ? 'Подбираем...' : '🔍 Подобрать'}</Text>
                        </Pressable>
                    )}
                    <Pressable onPress={() => setStep(1)} style={styles.backBtn}><Text style={styles.backText}>← Назад</Text></Pressable>
                </>
            )}

            {results.length > 0 && (
                <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
                    <Text style={styles.resultsTitle}>Подобрано для вас</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resultsRow}>
                        {results.map(item => (
                            <MediaCard key={item.id} item={item} width={140} />
                        ))}
                    </ScrollView>
                    <Pressable onPress={() => { setResults([]); setStep(0); setMood(null); setType(null); setDuration(null); }} style={styles.resetBtn}>
                        <Text style={styles.resetText}>🔄 Заново</Text>
                    </Pressable>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    close: { color: theme.text, fontSize: 24, marginRight: 16 },
    title: { fontSize: 18, fontWeight: '800', color: theme.text },
    stepTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    moodCard: { width: '30%', minWidth: 100, backgroundColor: theme.surface, borderRadius: 16, padding: 20, alignItems: 'center' },
    moodEmoji: { fontSize: 32, marginBottom: 8 },
    moodLabel: { color: theme.text, fontSize: 13, fontWeight: '700' },
    backBtn: { marginTop: 24 },
    backText: { color: theme.accent, fontSize: 15, fontWeight: '700' },
    fetchBtn: { backgroundColor: theme.accent, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
    fetchText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    results: { flex: 1 },
    resultsTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 },
    resultsRow: { paddingBottom: 20 },
    resetBtn: { marginTop: 20, padding: 14 },
    resetText: { color: theme.accent, fontSize: 15, fontWeight: '700' },
});
