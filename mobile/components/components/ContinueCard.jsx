import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKDROP, IMG } from '../../lib/config';
import { theme } from '../../theme';

const ContinueCard = memo(function ContinueCard({ item, storedTime, storedDuration }) {
    const router = useRouter();
    const type = item.media_type || 'movie';
    const progress = storedDuration > 0 ? Math.min(95, (storedTime / storedDuration) * 100) : 5;

    const timeStr = (() => {
        if (!storedTime || storedTime < 5) return null;
        const h = Math.floor(storedTime / 3600);
        const m = Math.floor((storedTime % 3600) / 60);
        const s = Math.floor(storedTime % 60);
        if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        return `${m}:${String(s).padStart(2,'0')}`;
    })();

    const handlePress = useCallback(() => {
        router.push(`/details/${type}/${item.item_id || item.id}`);
    }, [item, type, router]);

    return (
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
            <Image source={{ uri: item.backdrop_path ? `${BACKDROP}${item.backdrop_path}` : `${IMG}${item.poster_path}` }} style={styles.poster} contentFit="cover" transition={300} />
            <View style={styles.playBtn}><Text style={{ color: '#fff', fontSize: 20 }}>▶</Text></View>
            <View style={styles.overlay}>
                <Text style={styles.title} numberOfLines={1}>{item.title || item.name}</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.meta}>{item.last_season ? `S${item.last_season}:E${item.last_episode}` : 'Продолжить'}</Text>
                    {timeStr && <View style={styles.timeBadge}><Text style={styles.timeText}>⏱ {timeStr}</Text></View>}
                </View>
                <View style={styles.progressBg}><View style={[styles.progressBar, { width: `${progress}%` }]} /></View>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: { width: 280, borderRadius: 18, overflow: 'hidden', marginRight: 14, backgroundColor: theme.surface },
    poster: { width: '100%', aspectRatio: 16/9 },
    playBtn: { position: 'absolute', top: '35%', left: '45%', width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: 'rgba(0,0,0,0.7)' },
    title: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    meta: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
    timeBadge: { backgroundColor: 'rgba(229,9,20,0.25)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
    timeText: { color: theme.accent, fontSize: 10, fontWeight: '800' },
    progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: theme.accent, borderRadius: 2 },
});

export default ContinueCard;
