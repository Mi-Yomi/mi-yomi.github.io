import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { theme } from '../../theme';

export default function PendingScreen() {
    const { userProfile, loadProfile, user, logout } = useAuth();
    const isPending = userProfile?.status === 'pending';

    const refreshStatus = async () => {
        if (user) await loadProfile(user.id, user.email);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{isPending ? '⏳' : '🚫'}</Text>
            <Text style={styles.title}>{isPending ? 'Заявка на рассмотрении' : 'Доступ запрещён'}</Text>
            <View style={[styles.status, isPending ? styles.statusPending : styles.statusRejected]}>
                <Text style={styles.statusText}>{isPending ? '🔄 Ожидание проверки' : '❌ Заявка отклонена'}</Text>
            </View>
            <Text style={styles.text}>
                {isPending
                    ? 'Ваша заявка отправлена администратору. После подтверждения вы получите полный доступ к Cinema HADES.'
                    : 'К сожалению, ваша заявка была отклонена администратором.'}
            </Text>
            <Pressable onPress={refreshStatus} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>🔄 Обновить статус</Text>
            </Pressable>
            <Pressable onPress={logout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>Выйти из аккаунта</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg, padding: 32 },
    icon: { fontSize: 64, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '900', color: theme.text, textAlign: 'center', marginBottom: 16 },
    status: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 20 },
    statusPending: { backgroundColor: 'rgba(255,152,0,0.2)' },
    statusRejected: { backgroundColor: 'rgba(229,9,20,0.2)' },
    statusText: { color: theme.text, fontSize: 14, fontWeight: '700' },
    text: { color: theme.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    refreshBtn: { backgroundColor: theme.surface, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
    refreshText: { color: theme.text, fontSize: 15, fontWeight: '700' },
    logoutBtn: { paddingVertical: 14 },
    logoutText: { color: theme.accent, fontSize: 15, fontWeight: '700' },
});
