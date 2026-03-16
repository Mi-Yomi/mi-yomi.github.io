import { View, Text, Pressable, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export default function PlayerScreen() {
    const { url, name, title } = useLocalSearchParams();
    const router = useRouter();

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={{ color: '#fff', fontSize: 18 }}>‹ Назад</Text></Pressable>
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    <Text style={styles.source}>{name}</Text>
                </View>
            </SafeAreaView>
            <WebView source={{ uri: url }} style={styles.webview} allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} javaScriptEnabled domStorageEnabled startInLoadingState renderLoading={() => <View style={styles.loading}><Text style={{ color: theme.textMuted }}>Загрузка плеера...</Text></View>} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { backgroundColor: 'rgba(17,17,17,0.95)', paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    backBtn: { paddingVertical: 8, paddingRight: 12 },
    info: { flex: 1 },
    title: { color: '#fff', fontSize: 14, fontWeight: '800' },
    source: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    webview: { flex: 1 },
    loading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
});
