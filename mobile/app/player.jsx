import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, StyleSheet, Pressable, Text, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { WebView } from 'react-native-webview';
import { theme } from '../theme';

let ExpoPip = null;
try {
    ExpoPip = require('expo-pip').default ?? require('expo-pip');
} catch {}

const ASPECT_RATIO = 16 / 9;

export default function PlayerScreen() {
    const { url, title } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [pipAvailable, setPipAvailable] = useState(false);

    const maxWidth = screenWidth * 0.95;
    const maxHeight = (screenHeight - 80) * 0.9;
    const videoWidth = Math.min(maxWidth, maxHeight * ASPECT_RATIO);
    const videoHeight = videoWidth / ASPECT_RATIO;

    useEffect(() => {
        ScreenOrientation.unlockAsync();
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android' || !ExpoPip?.isAvailable) return;
        const p = ExpoPip.isAvailable();
        if (typeof p?.then === 'function') {
            p.then(setPipAvailable).catch(() => setPipAvailable(false));
        }
    }, []);

    const handlePip = () => {
        if (ExpoPip?.enterPipMode) {
            ExpoPip.enterPipMode({ width: 280, height: 158, title: title || 'Видео' });
        }
    };

    if (!url) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>Нет URL для воспроизведения</Text>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>Назад</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.videoContainer, { width: videoWidth, height: videoHeight }]}>
                <WebView
                    source={{ uri: url }}
                    style={[styles.webview, { width: videoWidth, height: videoHeight }]}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    scrollEnabled={false}
                />
            </View>
            <View style={[styles.controls, { top: insets.top + 12 }]}>
                <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕ Закрыть</Text>
                </Pressable>
                {pipAvailable && Platform.OS === 'android' && (
                    <Pressable onPress={handlePip} style={styles.pipBtn}>
                        <Text style={styles.pipText}>⊡ PiP</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    videoContainer: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' },
    webview: { backgroundColor: '#000' },
    controls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    closeBtn: { padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10 },
    closeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    pipBtn: { padding: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10 },
    pipText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    error: { color: theme.text, fontSize: 16, textAlign: 'center', marginTop: 100 },
    backBtn: { marginTop: 20, alignSelf: 'center', padding: 14, backgroundColor: theme.accent, borderRadius: 10 },
    backText: { color: '#fff', fontWeight: '700' },
});
