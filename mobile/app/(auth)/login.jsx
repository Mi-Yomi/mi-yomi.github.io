import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
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
        setLoading(true);
        setError(null);
        setMsg(null);
        try {
            if (mode === 'signup') {
                const { error: err } = await supabase.auth.signUp({ email, password });
                if (err) throw err;
                setMsg('✅ Аккаунт создан! Подтвердите почту, затем войдите.');
                setMode('login');
            } else {
                const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
                if (data.session) {
                    // AuthProvider will pick up via onAuthStateChange
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.logo}>🎬</Text>
                <Text style={styles.title}>HADES</Text>
                <Text style={styles.subtitle}>Твой личный кинотеатр</Text>

                {error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
                {msg && <View style={styles.success}><Text style={styles.successText}>{msg}</Text></View>}

                <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Пароль" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry />

                <Pressable onPress={handleAuth} disabled={loading} style={[styles.btn, loading && styles.btnDisabled]}>
                    <Text style={styles.btnText}>{loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Регистрация'}</Text>
                </Pressable>

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>ИЛИ</Text>
                    <View style={styles.dividerLine} />
                </View>

                <Pressable onPress={() => supabase.auth.signInWithOAuth({ provider: 'google' })} style={styles.googleBtn}>
                    <Text style={styles.googleBtnText}>Google</Text>
                </Pressable>

                <Pressable onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMsg(null); }} style={styles.switch}>
                    <Text style={styles.switchText}>{mode === 'login' ? 'Нет аккаунта? ' : 'Есть аккаунт? '}</Text>
                    <Text style={styles.switchLink}>{mode === 'login' ? 'Создать' : 'Войти'}</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg, padding: 24 },
    card: { width: '100%', maxWidth: 360 },
    logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
    title: { fontSize: 32, fontWeight: '900', color: theme.text, textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: 14, color: theme.textMuted, textAlign: 'center', marginBottom: 28 },
    error: { backgroundColor: 'rgba(229,9,20,0.2)', padding: 12, borderRadius: 10, marginBottom: 12 },
    errorText: { color: theme.accent, fontSize: 13 },
    success: { backgroundColor: 'rgba(0,200,83,0.2)', padding: 12, borderRadius: 10, marginBottom: 12 },
    successText: { color: theme.green, fontSize: 13 },
    input: { backgroundColor: theme.surface, borderRadius: 12, padding: 16, color: theme.text, fontSize: 16, marginBottom: 12 },
    btn: { backgroundColor: theme.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
    dividerText: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
    googleBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
    googleBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
    switch: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    switchText: { color: theme.textMuted, fontSize: 14 },
    switchLink: { color: theme.accent, fontSize: 14, fontWeight: '700' },
});
