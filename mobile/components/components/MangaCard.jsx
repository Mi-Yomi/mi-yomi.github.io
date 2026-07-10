import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MANGA_IMG_HEADERS } from '../../lib/config';
import { ratingColor } from '../../lib/utils';
import { useManga } from '../../providers/MangaProvider';
import { MANGA_STATUSES } from '../../lib/mangaStatuses';
import { theme } from '../../theme';

const MangaCard = memo(function MangaCard({ item, width = 140 }) {
    const router = useRouter();
    const { getMangaStatus, setMangaStatus } = useManga();
    const rating = item.rating > 0 ? Number(item.rating).toFixed(1) : null;

    const handlePress = useCallback(() => {
        router.push({
            pathname: '/manga/[slug]',
            params: { slug: item.dir, title: item.title, cover: item.cover || '', type: item.type || '', rating: item.rating || 0 },
        });
    }, [item, router]);

    // Long-press: change shelf status without opening the title.
    const handleLongPress = useCallback(() => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        const current = getMangaStatus(item.dir);
        Alert.alert(item.title, 'Статус на полке', [
            ...MANGA_STATUSES.map(s => ({
                text: `${current === s.id ? '✓ ' : ''}${s.label}`,
                onPress: () => setMangaStatus(item, s.id),
            })),
            { text: 'Отмена', style: 'cancel' },
        ]);
    }, [item, getMangaStatus, setMangaStatus]);

    return (
        <Pressable onPress={handlePress} onLongPress={handleLongPress}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.type || 'Манга'}${rating ? `, рейтинг ${rating}` : ''}`}
            accessibilityHint="Нажмите, чтобы открыть. Удерживайте, чтобы изменить статус на полке"
            style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
            <View style={[styles.posterWrap, { width }]}>
                {item.cover ? (
                    <Image source={{ uri: item.cover, headers: MANGA_IMG_HEADERS }} style={styles.poster} contentFit="cover" transition={300} cachePolicy="memory-disk" placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                ) : (
                    <View style={[styles.poster, styles.placeholder]}><Text style={styles.placeholderText}>{item.title}</Text></View>
                )}
                {rating && (
                    <View style={styles.ratingBadge}>
                        <Text style={[styles.ratingText, { color: ratingColor(item.rating) }]}>★ {rating}</Text>
                    </View>
                )}
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{item.type || 'Манга'}</Text>
                </View>
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <View style={styles.meta}>
                <Text style={styles.year}>{item.year || '—'}</Text>
                {item.chapters != null && <Text style={styles.chapters}>{item.chapters} гл.</Text>}
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: {},
    pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
    posterWrap: { borderRadius: 16, overflow: 'hidden', aspectRatio: 2/3, marginBottom: 8, backgroundColor: theme.surface },
    poster: { width: '100%', height: '100%' },
    placeholder: { justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: theme.surface2 },
    placeholderText: { color: theme.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
    ratingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(10,10,10,0.8)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    ratingText: { fontSize: 11, fontWeight: '800' },
    typeBadge: { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.orange },
    typeText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    title: { fontSize: 13, fontWeight: '700', color: theme.text, lineHeight: 17, marginBottom: 3, paddingHorizontal: 2 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
    year: { fontSize: 11, color: theme.textMuted },
    chapters: { fontSize: 10, color: theme.textSecondary, fontWeight: '600', backgroundColor: theme.surface, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
});

export default MangaCard;
