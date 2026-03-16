import { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

const SkeletonCard = memo(function SkeletonCard() {
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }, []);

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <View style={styles.card}>
            <Animated.View style={[styles.poster, animStyle]} />
            <Animated.View style={[styles.text, animStyle]} />
            <Animated.View style={[styles.textSm, animStyle]} />
        </View>
    );
});

const styles = StyleSheet.create({
    card: { width: 140, marginRight: 14 },
    poster: { width: 140, aspectRatio: 2/3, borderRadius: 16, backgroundColor: theme.surface2 },
    text: { height: 14, marginTop: 10, borderRadius: 7, width: '80%', backgroundColor: theme.surface2 },
    textSm: { height: 10, marginTop: 6, borderRadius: 5, width: '50%', backgroundColor: theme.surface2 },
});

export default SkeletonCard;
