import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_USERNAME, ADMIN_TAG, ADMIN_EMAIL } from '../lib/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = userProfile?.is_admin === true || (userProfile?.username === ADMIN_USERNAME && userProfile?.tag === ADMIN_TAG) || (ADMIN_EMAIL && user?.email === ADMIN_EMAIL);
    const userApproved = useMemo(() => {
        if (!userProfile) return false;
        if (isAdmin) return true;
        if (!userProfile.status) return true;
        return userProfile.status === 'approved';
    }, [userProfile, isAdmin]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                setLoading(false);
                loadProfile(session.user.id, session.user.email);
            } else {
                setLoading(false);
            }
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
                setLoading(false);
                loadProfile(session.user.id, session.user.email);
            } else {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const loadProfile = useCallback(async (userId, email) => {
        let { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (!data) {
            const username = email ? email.split('@')[0] : 'User';
            const tag = Math.floor(1000 + Math.random() * 9000).toString();
            const { data: np } = await supabase.from('profiles').insert({ id: userId, email, username, tag, status: 'pending' }).select().single();
            data = np;
        }
        if (data) setUserProfile(data);
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setUserProfile(null);
    }, []);

    const updateUsername = useCallback(async (username) => {
        if (!user || !username?.trim()) return;
        await supabase.from('profiles').update({ username: username.trim() }).eq('id', user.id);
        setUserProfile(prev => ({ ...prev, username: username.trim() }));
    }, [user]);

    const value = useMemo(() => ({
        user, userProfile, setUserProfile, loading, isAdmin, userApproved, logout, loadProfile, updateUsername,
    }), [user, userProfile, loading, isAdmin, userApproved, logout, loadProfile, updateUsername]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
