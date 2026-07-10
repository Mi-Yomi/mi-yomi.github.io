import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

const ToastContext = createContext(null);
const TOAST_MS = 2400;

export function ToastProvider({ children }) {
    const insets = useSafeAreaInsets();
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const showToast = useCallback((message, icon = null) => {
        if (!message) return;
        const id = ++idRef.current;
        setToasts(prev => [...prev.slice(-2), { id, message, icon }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_MS);
    }, []);

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
                {toasts.map(t => (
                    <Animated.View
                        key={t.id}
                        entering={FadeInDown.duration(220)}
                        exiting={FadeOutDown.duration(180)}
                        layout={LinearTransition.duration(200)}
                        style={styles.toast}
                    >
                        <Text style={styles.text} numberOfLines={2}>{t.icon ? `${t.icon} ` : ''}{t.message}</Text>
                    </Animated.View>
                ))}
            </View>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be inside ToastProvider');
    return ctx;
}

const styles = StyleSheet.create({
    host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 1000 },
    toast: { maxWidth: '86%', backgroundColor: 'rgba(30,30,30,0.96)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    text: { color: theme.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
