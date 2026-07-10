import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKDROP } from '../../lib/config';
import { ratingColor } from '../../lib/utils';
import { theme } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const AUTOPLAY_MS = 6000;
const PAUSE_AFTER_TOUCH_MS = 12000;

function Dot({ active }) {
    const on = useSharedValue(active ? 1 : 0);
    useEffect(() => { on.value = withSpring(active ? 1 : 0, { damping: 15, stiffness: 180 }); }, [active, on]);
    const style = useAnimatedStyle(() => ({
        width: 8 + 20 * on.value,
        backgroundColor: on.value > 0.5 ? theme.accent : 'rgba(255,255,255,0.3)',
        opacity: withTiming(active ? 1 : 0.7, { duration: 200 }),
    }));
    return <Animated.View style={[styles.dot, style]} />;
}

const HeroCarousel = memo(function HeroCarousel({ items = [], badgePrefix = 'В тренде', badgeIcon = '🔥', defaultType }) {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const flatRef = useRef(null);
    const activeIndexRef = useRef(0);
    const pausedUntilRef = useRef(0);
    const heroItems = items.filter(i => i.backdrop_path).slice(0, 5);
    const count = heroItems.length;

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            const i = viewableItems[0].index || 0;
            setActiveIndex(i);
            activeIndexRef.current = i;
        }
    }, []);

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    // Auto-advance; user touches pause it for a while.
    useEffect(() => {
        if (count < 2) return undefined;
        const t = setInterval(() => {
            if (Date.now() < pausedUntilRef.current) return;
            const next = (activeIndexRef.current + 1) % count;
            flatRef.current?.scrollToIndex({ index: next, animated: true });
        }, AUTOPLAY_MS);
        return () => clearInterval(t);
    }, [count]);

    if (count === 0) return <View style={styles.skeleton} />;

    const renderItem = ({ item, index }) => {
        const type = item.media_type || defaultType || (item.first_air_date ? 'tv' : 'movie');
        return (
            <Pressable style={styles.slide} onPress={() => router.push(`/details/${type}/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title || item.name}. Рейтинг ${item.vote_average?.toFixed(1) || 'не указан'}`}
                accessibilityHint="Открывает страницу произведения"
                accessibilityElementsHidden={index !== activeIndex}
                importantForAccessibility={index === activeIndex ? 'yes' : 'no-hide-descendants'}>
                <Image source={{ uri: `${BACKDROP}${item.backdrop_path}` }} style={styles.bg} contentFit="cover" transition={400} cachePolicy="memory-disk" />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', theme.bg]} locations={[0, 0.5, 1]} style={styles.grad} />
                <View style={styles.content}>
                    <View style={styles.badge}><Text style={styles.badgeText}>{badgeIcon} #{index + 1} {badgePrefix}</Text></View>
                    <Text style={styles.title} numberOfLines={2}>{item.title || item.name}</Text>
                    <View style={styles.meta}>
                        <Text style={[styles.rating, { color: ratingColor(item.vote_average) }]}>★ {item.vote_average?.toFixed(1)}</Text>
                        <Text style={styles.metaText}>{(item.release_date || item.first_air_date || '').split('-')[0]}</Text>
                        <Text style={styles.metaText}>{type === 'tv' ? '📺 Сериал' : '🎬 Фильм'}</Text>
                    </View>
                    {item.overview ? <Text style={styles.overview} numberOfLines={2}>{item.overview}</Text> : null}
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatRef}
                data={heroItems}
                renderItem={renderItem}
                keyExtractor={item => String(item.id)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
                onScrollBeginDrag={() => { pausedUntilRef.current = Date.now() + PAUSE_AFTER_TOUCH_MS; }}
            />
            <View style={styles.dots} accessible={false} importantForAccessibility="no-hide-descendants">
                {heroItems.map((_, i) => (
                    <Dot key={i} active={activeIndex === i} />
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: { height: 420, marginBottom: 20 },
    skeleton: { height: 420, backgroundColor: theme.surface, marginBottom: 20 },
    slide: { width: SCREEN_W, height: 420, position: 'relative' },
    bg: { ...StyleSheet.absoluteFillObject },
    grad: { ...StyleSheet.absoluteFillObject },
    content: { position: 'absolute', bottom: 28, left: 16, right: 16 },
    badge: { backgroundColor: theme.accent, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, marginBottom: 12 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 32, marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 30 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
    rating: { fontSize: 14, fontWeight: '700' },
    metaText: { color: theme.textSecondary, fontSize: 13 },
    overview: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'absolute', bottom: 12, left: 0, right: 0 },
    dot: { height: 8, borderRadius: 4 },
});

export default HeroCarousel;
