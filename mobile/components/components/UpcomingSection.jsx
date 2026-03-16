import { memo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IMG } from '../../lib/config';
import { theme } from '../../theme';

const UpcomingSection = memo(function UpcomingSection({ upcoming, watchlist, toggleWatchlist }) {
    const router = useRouter();

    if (!upcoming?.length) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.title}>🗓️ Скоро в кино</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {upcoming.map(m => {
                    const daysUntil = Math.ceil((new Date(m.release_date) - new Date()) / (1000 * 60 * 60 * 24));
                    const inWatchlist = watchlist?.some(w => w.item_id === String(m.id));
                    return (
                        <Pressable key={m.id} onPress={() => router.push(`/details/movie/${m.id}`)} style={styles.card}>
                            {m.poster_path ? (
                                <Image source={{ uri: `${IMG}${m.poster_path}` }} style={styles.poster} contentFit="cover" />
                            ) : (
                                <View style={[styles.poster, styles.placeholder]}><Text style={styles.placeholderText}>🎬</Text></View>
                            )}
                            <View style={styles.countdown}><Text style={styles.countdownText}>{daysUntil <= 0 ? 'Уже вышел' : `${daysUntil} дн.`}</Text></View>
                            <Pressable onPress={(e) => { e.stopPropagation(); toggleWatchlist?.(m, 'movie'); }} style={[styles.remind, inWatchlist && styles.remindActive]}>
                                <Text style={styles.remindText}>{inWatchlist ? '✓' : '🔔'}</Text>
                            </Pressable>
                            <Text style={styles.movieTitle} numberOfLines={2}>{m.title}</Text>
                            <Text style={styles.date}>{new Date(m.release_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    section: { marginBottom: 28 },
    title: { fontSize: 18, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginBottom: 14 },
    row: { paddingHorizontal: 16, gap: 14 },
    card: { width: 120, marginRight: 14 },
    poster: { width: 120, aspectRatio: 2/3, borderRadius: 12, backgroundColor: theme.surface },
    placeholder: { justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 24 },
    countdown: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    countdownText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    remind: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    remindActive: { backgroundColor: theme.accent },
    remindText: { fontSize: 12 },
    movieTitle: { color: theme.text, fontSize: 12, fontWeight: '700', marginTop: 6 },
    date: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
});

export default UpcomingSection;
