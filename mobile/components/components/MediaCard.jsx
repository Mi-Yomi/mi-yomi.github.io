import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IMG_SM } from '../../lib/config';
import { ratingColor, GENRE_NAMES } from '../../lib/utils';
import { theme } from '../../theme';

const MediaCard = memo(function MediaCard({ item, width = 140, compact }) {
    const router = useRouter();
    const year = (item.release_date || item.first_air_date || '').split('-')[0];
    const rating = item.vote_average?.toFixed(1);
    const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    const genre = item.genre_ids?.[0] ? GENRE_NAMES[item.genre_ids[0]] : null;
    const isAnime = (item.origin_country || []).includes('JP');
    const typeLabel = isAnime ? 'Аниме' : type === 'tv' ? 'Сериал' : 'Фильм';
    const typeColor = isAnime ? theme.cyan : type === 'tv' ? theme.purple : theme.accent;

    const handlePress = useCallback(() => {
        router.push(`/details/${type}/${item.id}`);
    }, [item.id, type, router]);

    return (
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}>
            <View style={[styles.posterWrap, { width }]}>
                {item.poster_path ? (
                    <Image source={{ uri: `${IMG_SM}${item.poster_path}` }} style={styles.poster} contentFit="cover" transition={300} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                ) : (
                    <View style={[styles.poster, styles.placeholder]}><Text style={styles.placeholderText}>{item.title || item.name}</Text></View>
                )}
                {rating > 0 && (
                    <View style={styles.ratingBadge}>
                        <Text style={[styles.ratingText, { color: ratingColor(item.vote_average) }]}>★ {rating}</Text>
                    </View>
                )}
                <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                    <Text style={styles.typeText}>{typeLabel}</Text>
                </View>
            </View>
            <Text style={styles.title} numberOfLines={2}>{item.title || item.name}</Text>
            <View style={styles.meta}>
                <Text style={styles.year}>{year || '—'}</Text>
                {genre && <Text style={styles.genre}>{genre}</Text>}
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
    typeBadge: { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    typeText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
    title: { fontSize: 13, fontWeight: '700', color: theme.text, lineHeight: 17, marginBottom: 3, paddingHorizontal: 2 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
    year: { fontSize: 11, color: theme.textMuted },
    genre: { fontSize: 10, color: theme.textSecondary, fontWeight: '600', backgroundColor: theme.surface, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
});

export default MediaCard;
