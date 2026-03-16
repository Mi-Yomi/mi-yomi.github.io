import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('login');
    const [msg, setMsg] = useState(null);
    const [error, setError] = useState(null);

    const handleAuth = async () => {
        setLoading(true); setError(null); setMsg(null);
        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMsg('Аккаунт создан! Подтвердите почту.'); setMode('login');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <Text style={styles.logo}>🎬</Text>
                <Text style={styles.title}>HADES</Text>
                <Text style={styles.subtitle}>Твой личный кинотеатр</Text>
                {error && <View style={styles.errBox}><Text style={styles.errText}>{error}</Text></View>}
                {msg && <View style={styles.msgBox}><Text style={styles.msgText}>{msg}</Text></View>}
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Пароль" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
                <Pressable onPress={handleAuth} disabled={loading} style={[styles.btn, loading && { opacity: 0.6 }]}>
                    <Text style={styles.btnText}>{loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Регистрация'}</Text>
                </Pressable>
                <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMsg(null); }}>
                    <Text style={styles.switchText}>{mode === 'login' ? 'Нет аккаунта? Создать' : 'Есть аккаунт? Войти'}</Text>
                </Pressable>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    logo: { fontSize: 64, marginBottom: 8 },
    title: { fontSize: 36, fontWeight: '900', color: theme.text, marginBottom: 6 },
    subtitle: { fontSize: 14, color: theme.textMuted, marginBottom: 36 },
    input: { width: '100%', maxWidth: 340, padding: 16, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, color: theme.text, fontSize: 15, marginBottom: 12 },
    btn: { width: '100%', maxWidth: 340, padding: 16, borderRadius: 14, backgroundColor: theme.accent, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    errBox: { backgroundColor: 'rgba(229,9,20,0.15)', borderWidth: 1, borderColor: theme.accent, borderRadius: 12, padding: 14, marginBottom: 16, width: '100%', maxWidth: 340 },
    errText: { color: '#ff6b6b', fontSize: 13 },
    msgBox: { backgroundColor: 'rgba(0,200,83,0.15)', borderWidth: 1, borderColor: theme.green, borderRadius: 12, padding: 14, marginBottom: 16, width: '100%', maxWidth: 340 },
    msgText: { color: theme.green, fontSize: 13 },
    switchText: { color: theme.accent, fontSize: 13, fontWeight: '700', marginTop: 24 },
});
