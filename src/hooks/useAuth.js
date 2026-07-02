import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';
import { ADMIN_EMAIL, WHITELIST_ENABLED } from '../lib/config.js';
import { toBase64 } from '../lib/utils.js';

/**
 * Local dev bypass — set VITE_DEV_BYPASS=on in .env to skip Supabase login
 * and open the app straight away. Catalog (movies/series/anime) still loads
 * from TMDB; Supabase-backed features (watchlist/social) stay empty locally.
 * Gated behind an env flag so production builds are never affected.
 */
// `import.meta.env.DEV` is true only under `vite dev` and false in any production
// build, so the bypass can never leak into the deployed site even if VITE_DEV_BYPASS
// is left on in an env file.
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'on';
const DEV_UUID = '00000000-0000-0000-0000-000000000000';
const DEV_USER = { id: DEV_UUID, email: ADMIN_EMAIL || 'dev@hades.local' };
const DEV_PROFILE = {
    id: DEV_UUID, email: DEV_USER.email, username: 'Dev',
    tag: '0000', status: 'approved', is_admin: true,
};

/**
 * Admin detection (UI only — the server enforces admin rights on every write):
 * 1. profiles.is_admin === true  (database flag, set by the server)
 * 2. email === VITE_ADMIN_EMAIL  (env var — works before profile loads)
 */

export default function useAuth() {
    const tg = window.Telegram?.WebApp;
    const [user, setUser] = useState(DEV_BYPASS ? DEV_USER : null);
    const [userProfile, setUserProfile] = useState(DEV_BYPASS ? DEV_PROFILE : null);
    const [loading, setLoading] = useState(!DEV_BYPASS);
    const [nameEditOpen, setNameEditOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [refreshingStatus, setRefreshingStatus] = useState(false);

    // --- Admin detection (multiple fallbacks) ---
    const isAdmin = useMemo(() => {
        if (userProfile?.is_admin === true) return true;
        if (ADMIN_EMAIL && user?.email === ADMIN_EMAIL) return true;
        return false;
    }, [userProfile, user]);

    // --- Approval logic ---
    const userApproved = useMemo(() => {
        if (!userProfile) return false;
        if (isAdmin) return true;
        if (!WHITELIST_ENABLED) return true;
        if (!userProfile.status) return true;
        return userProfile.status === 'approved';
    }, [userProfile, isAdmin]);

    // --- Auth session ---
    useEffect(() => {
        if (DEV_BYPASS) return; // local dev: mock user already set, skip Supabase
        // Timeout: if session check takes too long, stop loading spinner
        const timeout = setTimeout(() => setLoading(false), 8000);
        supabase.auth.getSession().then(({ data: { session } }) => {
            clearTimeout(timeout);
            if (session?.user) setUser(session.user);
            else setLoading(false);
        }).catch(() => { clearTimeout(timeout); setLoading(false); });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) setUser(session.user);
            else { setUser(null); setUserProfile(null); setLoading(false); }
        });
        return () => { subscription.unsubscribe(); clearTimeout(timeout); };
    }, []);

    /** Check if this email belongs to admin (env var) */
    const _isAdminEmail = (email) => !!(ADMIN_EMAIL && email === ADMIN_EMAIL);

    /**
     * Admin flags live server-side: the API sets is_admin/status from
     * HADES_ADMIN_EMAIL and rejects client attempts to change them.
     * For the admin email we still surface admin UI locally even if the
     * profile row predates the flag.
     */
    const _withAdminView = (profile, emailIsAdmin) =>
        emailIsAdmin ? { ...profile, is_admin: true, status: 'approved' } : profile;

    const loadUserProfile = useCallback(async (userId, userEmail) => {
        if (DEV_BYPASS) { setUserProfile(DEV_PROFILE); setNewUsername(DEV_PROFILE.username); return; }
        const emailIsAdmin = _isAdminEmail(userEmail);

        // Step 1: Try to load existing profile (.maybeSingle avoids error on 0 rows)
        const { data: existing, error: selectErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (existing) {
            const profile = _withAdminView(existing, emailIsAdmin);
            setUserProfile(profile);
            setNewUsername(profile.username || '');
            return;
        }

        // Log RLS / network issues (code PGRST116 = 0 rows, not an error)
        if (selectErr) {
            console.warn('[HADES] Profile SELECT failed:', selectErr.code, selectErr.message);
        }

        // Step 2: Profile doesn't exist → create new one
        const username = userEmail ? userEmail.split('@')[0] : 'User';
        const tag = Math.floor(1000 + Math.random() * 9000).toString();

        const { data: created, error: insertErr } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                email: userEmail,
                username,
                tag,
                status: (emailIsAdmin || !WHITELIST_ENABLED) ? 'approved' : 'pending',
                is_admin: emailIsAdmin,
            })
            .select()
            .single();

        if (created) {
            setUserProfile(created);
            setNewUsername(created.username || '');
            return;
        }

        // Step 3: Insert failed — profile likely exists but RLS blocked the read
        if (insertErr) {
            console.warn('[HADES] Profile INSERT failed (RLS or duplicate):', insertErr.message);
            // Retry read — RLS might allow now or was a transient issue
            const { data: retry } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (retry) {
                const profile = _withAdminView(retry, emailIsAdmin);
                setUserProfile(profile);
                setNewUsername(profile.username || '');
                return;
            }
        }

        // Step 4: All DB operations failed — create minimal local profile
        // so the app doesn't render with null profile (prevents blank username/avatar)
        console.error('[HADES] All profile load attempts failed. Using local fallback.');
        const fallback = {
            id: userId,
            email: userEmail,
            username: userEmail ? userEmail.split('@')[0] : 'User',
            status: emailIsAdmin ? 'approved' : 'pending',
            is_admin: emailIsAdmin,
        };
        setUserProfile(fallback);
        setNewUsername(fallback.username);
    }, []);

    const updateUsername = useCallback(async () => {
        if (!user || !newUsername.trim()) return;
        await supabase.from('profiles').update({ username: newUsername }).eq('id', user.id);
        setUserProfile(prev => ({ ...prev, username: newUsername }));
        setNameEditOpen(false);
    }, [user, newUsername]);

    /**
     * Toggle whether an item is hidden from friends. `key` is `String(item_id)` for
     * movies/series or `m:{slug}` for manga. Persisted in profiles.hidden_items;
     * friends' profile views filter their visible items against this list.
     * Returns the new hidden state (true = now hidden).
     */
    const toggleHidden = useCallback(async (key) => {
        if (!user || !key) return false;
        const cur = Array.isArray(userProfile?.hidden_items) ? userProfile.hidden_items : [];
        const willHide = !cur.includes(key);
        const next = willHide ? [...cur, key] : cur.filter(k => k !== key);
        setUserProfile(prev => ({ ...prev, hidden_items: next }));
        try { await supabase.from('profiles').update({ hidden_items: next }).eq('id', user.id); }
        catch (e) { console.warn('hidden_items update failed:', e.message); }
        return willHide;
    }, [user, userProfile]);

    const isHidden = useCallback((key) => (userProfile?.hidden_items || []).includes(key), [userProfile]);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setUserProfile(null);
    }, []);

    const handleProfileImage = useCallback(async (e, type) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        const maxSize = 512 * 1024;
        let uploadFile = file;
        if (file.size > maxSize && file.type.startsWith('image/')) {
            try {
                const bitmap = await createImageBitmap(file);
                const maxDim = type === 'cover' ? 1200 : 400;
                const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
                const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
                uploadFile = new File([blob], `${type}.webp`, { type: 'image/webp' });
            } catch {}
        }
        const path = `${user.id}/${type}_${Date.now()}`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
        if (uploadError) {
            const base64 = await toBase64(file);
            setUserProfile(prev => ({ ...prev, [`${type}_url`]: base64 }));
            await supabase.from('profiles').update({ [`${type}_url`]: base64 }).eq('id', user.id);
            return;
        }
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const publicUrl = urlData?.publicUrl;
        if (publicUrl) {
            setUserProfile(prev => ({ ...prev, [`${type}_url`]: publicUrl }));
            await supabase.from('profiles').update({ [`${type}_url`]: publicUrl }).eq('id', user.id);
        }
    }, [user]);

    const refreshApprovalStatus = useCallback(async () => {
        if (!user) return;
        setRefreshingStatus(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.warn('[HADES] Status refresh failed:', error.message);
            }

            if (data) {
                const emailIsAdmin = _isAdminEmail(user.email);
                const profile = _withAdminView(data, emailIsAdmin);
                setUserProfile(profile);
                if (profile.status === 'approved' || profile.is_admin) {
                    tg?.HapticFeedback?.notificationOccurred?.('success');
                } else if (profile.status === 'rejected') {
                    tg?.HapticFeedback?.notificationOccurred?.('error');
                }
            }
        } catch (e) { console.error('[HADES] Status refresh error:', e); }
        setRefreshingStatus(false);
    }, [user, tg]);

    return {
        tg,
        user, setUser,
        userProfile, setUserProfile,
        loading, setLoading,
        isAdmin, userApproved,
        nameEditOpen, setNameEditOpen,
        newUsername, setNewUsername,
        refreshingStatus,
        loadUserProfile,
        updateUsername,
        toggleHidden, isHidden,
        handleLogout,
        handleProfileImage,
        refreshApprovalStatus,
    };
}
