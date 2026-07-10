import { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay } from 'react-native-reanimated';
import { theme } from '../../theme';

/** Pulsing placeholder matching MangaCard's layout; delay staggers the shimmer. */
const MangaSkeletonCard = memo(function MangaSkeletonCard({ width = 110, delay = 0 }) {
    const opacity = useSharedValue(0.35);

    useEffect(() => {
        opacity.value = withDelay(delay, withRepeat(withTiming(1, { duration: 750 }), -1, true));
    }, [opacity, delay]);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <View style={{ width }}>
            <Animated.View style={[styles.poster, { width }, animStyle]} />
            <Animated.View style={[styles.text, animStyle]} />
            <Animated.View style={[styles.textSm, animStyle]} />
        </View>
    );
});

const styles = StyleSheet.create({
    poster: { aspectRatio: 2/3, borderRadius: 16, backgroundColor: theme.surface2 },
    text: { height: 12, marginTop: 8, borderRadius: 6, width: '85%', backgroundColor: theme.surface2 },
    textSm: { height: 9, marginTop: 5, borderRadius: 5, width: '55%', backgroundColor: theme.surface2 },
});

export default MangaSkeletonCard;
