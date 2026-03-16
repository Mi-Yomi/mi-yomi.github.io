import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../theme';

export default function PendingScreen() {
    const { userProfile, logout } = useAuth();
    const isPending = userProfile?.status === 'pending';

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.icon}>{isPending ? '⏳' : '🚫'}</Text>
                <Text style={styles.title}>{isPending ? 'Заявка на рассмотрении' : 'Доступ запрещён'}</Text>
                <Text style={styles.text}>{isPending ? 'Ваша заявка отправлена администратору. Обычно это занимает до 24 часов.' : 'Ваша заявка была отклонена.'}</Text>
                <Pressable onPress={logout} style={styles.btn}><Text style={styles.btnText}>Выйти</Text></Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    icon: { fontSize: 64, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '900', color: theme.text, marginBottom: 8, textAlign: 'center' },
    text: { fontSize: 14, color: theme.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 32, maxWidth: 320 },
    btn: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14, backgroundColor: theme.accent },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
