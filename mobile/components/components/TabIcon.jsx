import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

/** Tab bar icon that springs up slightly when its tab becomes active. */
export default function TabIcon({ name, color, size, focused }) {
    const active = useSharedValue(focused ? 1 : 0);

    useEffect(() => {
        active.value = withSpring(focused ? 1 : 0, { damping: 12, stiffness: 220 });
    }, [focused, active]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { scale: 1 + 0.16 * active.value },
            { translateY: -2.5 * active.value },
        ],
    }));

    return (
        <Animated.View style={style}>
            <Ionicons name={name} size={size} color={color} />
        </Animated.View>
    );
}
