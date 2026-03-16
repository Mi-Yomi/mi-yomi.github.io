import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { supabase } from '../../lib/appConstants.jsx';

export default function Auth() {
    const { setUser } = useApp();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('login');
    const [msg, setMsg] = useState(null);
    const [error, setError] = useState(null);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null); setMsg(null);
        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMsg('✅ Аккаунт создан! Подтвердите почту, затем войдите. После входа ваша заявка будет отправлена администратору на одобрение.'); setMode('login');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (data.session) setUser(data.session.user);
            }
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="auth-container fade-in">
            <div className="auth-logo">🎬</div>
            <h1 className="auth-title">HADES</h1>
            <p className="auth-subtitle">Твой личный кинотеатр</p>
            <form className="auth-form" onSubmit={handleAuth}>
                {error && <div className="auth-error">{error}</div>}
                {msg && <div className="auth-success">{msg}</div>}
                <input type="email" className="auth-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" className="auth-input" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" className="auth-btn" disabled={loading}>{loading ? 'Загрузка...' : (mode === 'login' ? 'Войти' : 'Регистрация')}</button>
                <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.4 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>ИЛИ</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                </div>
                <button type="button" className="auth-btn" style={{ background: 'white', color: 'black', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                    onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                </button>
                <div className="auth-switch">
                    {mode === 'login' ? 'Нет аккаунта? ' : 'Есть аккаунт? '}
                    <a onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMsg(null); }}>{mode === 'login' ? 'Создать' : 'Войти'}</a>
                </div>
            </form>
        </div>
    );
}
