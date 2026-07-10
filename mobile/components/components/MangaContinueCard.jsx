import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MANGA_IMG_HEADERS } from '../../lib/config';
import { useManga } from '../../providers/MangaProvider';
import { theme } from '../../theme';

/** Horizontal "continue reading" card — opens the reader at the saved chapter. */
const MangaContinueCard = memo(function MangaContinueCard({ pointer }) {
    const router = useRouter();
    const { removeProgress } = useManga();
    const pct = typeof pointer.pct === 'number' ? Math.max(0, Math.min(100, pointer.pct)) : 0;

    const handlePress = useCallback(() => {
        router.push({
            pathname: '/manga/reader',
            params: { slug: pointer.dir, volume: String(pointer.tome), number: String(pointer.chapter), title: pointer.title || '', cover: pointer.cover || '' },
        });
    }, [pointer, router]);

    const handleLongPress = useCallback(() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        Alert.alert(pointer.title || 'Манга', 'Убрать из «Продолжить чтение»?', [
            { text: 'Убрать', style: 'destructive', onPress: () => removeProgress(pointer.dir) },
            { text: 'Отмена', style: 'cancel' },
        ]);
    }, [pointer, removeProgress]);

    return (
        <Pressable onPress={handlePress} onLongPress={handleLongPress}
            accessibilityRole="button"
            accessibilityLabel={`Продолжить чтение ${pointer.title || 'манги'}, том ${pointer.tome}, глава ${pointer.chapter}, прогресс ${pct} процентов`}
            accessibilityHint="Удерживайте, чтобы убрать из продолжения чтения"
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}>
            {pointer.cover ? (
                <Image source={{ uri: pointer.cover, headers: MANGA_IMG_HEADERS }} style={styles.cover} contentFit="cover" transition={300} />
            ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}><Text style={styles.coverEmoji}>📖</Text></View>
            )}
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{pointer.title || 'Манга'}</Text>
                <Text style={styles.meta}>Том {pointer.tome} · Глава {pointer.chapter}</Text>
                <View style={styles.progressBg}><View style={[styles.progressBar, { width: `${Math.max(pct, 4)}%` }]} /></View>
                <Text style={styles.pct}>{pct > 0 ? `${pct}%` : 'Начать'}</Text>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: { width: 250, flexDirection: 'row', borderRadius: 16, overflow: 'hidden', backgroundColor: theme.surface },
    cover: { width: 72, height: 104 },
    coverPlaceholder: { backgroundColor: theme.surface2, justifyContent: 'center', alignItems: 'center' },
    coverEmoji: { fontSize: 24 },
    info: { flex: 1, padding: 12, justifyContent: 'center' },
    title: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 4, lineHeight: 17 },
    meta: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 8 },
    progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
    progressBar: { height: '100%', backgroundColor: theme.orange, borderRadius: 2 },
    pct: { color: theme.orange, fontSize: 10, fontWeight: '800' },
});

export default MangaContinueCard;
