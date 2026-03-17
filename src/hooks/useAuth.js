import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';
import { ADMIN_USERNAME, ADMIN_TAG, ADMIN_EMAIL, WHITELIST_ENABLED } from '../lib/config.js';
import { toBase64 } from '../lib/utils.js';

/**
 * Admin detection priority:
 * 1. profiles.is_admin === true  (database flag — most reliable)
 * 2. email === VITE_ADMIN_EMAIL  (env var — works before profile loads)
 * 3. username#tag match          (hardcoded fallback)
 *
 * Admin is auto-approved inline during profile load (no chicken-and-egg).
 */

export default function useAuth() {
    const tg = window.Telegram?.WebApp;
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nameEditOpen, setNameEditOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [refreshingStatus, setRefreshingStatus] = useState(false);

    // --- Admin detection (multiple fallbacks) ---
    const isAdmin = useMemo(() => {
        if (userProfile?.is_admin === true) return true;
        if (ADMIN_EMAIL && user?.email === ADMIN_EMAIL) return true;
        if (userProfile?.username === ADMIN_USERNAME && userProfile?.tag === ADMIN_TAG) return true;
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
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUser(session.user);
            else setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) setUser(session.user);
            else { setUser(null); setUserProfile(null); setLoading(false); }
        });
        return () => subscription.unsubscribe();
    }, []);

    /** Check if this email belongs to admin (env var or hardcoded) */
    const _isAdminEmail = (email) => !!(ADMIN_EMAIL && email === ADMIN_EMAIL);

    /** Check if this profile matches hardcoded admin credentials */
    const _isAdminProfile = (profile) =>
        profile && profile.username === ADMIN_USERNAME && profile.tag === ADMIN_TAG;

    /**
     * Auto-fix admin flags in DB if needed.
     * Called inline during profile load — no separate useEffect, no chicken-and-egg.
     */
    const _ensureAdminFlags = async (profile, userId, emailIsAdmin) => {
        const shouldBeAdmin = emailIsAdmin || _isAdminProfile(profile);
        if (!shouldBeAdmin) return profile;

        const needsFix = profile.is_admin !== true || profile.status !== 'approved';
        if (!needsFix) return profile;

        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: true, status: 'approved' })
            .eq('id', userId);

        if (error) {
            console.warn('[HADES] Admin auto-fix DB update failed:', error.message);
            // Still return fixed profile locally so admin isn't blocked
        }
        return { ...profile, is_admin: true, status: 'approved' };
    };

    const loadUserProfile = useCallback(async (userId, userEmail) => {
        const emailIsAdmin = _isAdminEmail(userEmail);

        // Step 1: Try to load existing profile (.maybeSingle avoids error on 0 rows)
        const { data: existing, error: selectErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (existing) {
            const profile = await _ensureAdminFlags(existing, userId, emailIsAdmin);
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
                const profile = await _ensureAdminFlags(retry, userId, emailIsAdmin);
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
                // Inline admin fix on refresh too
                const emailIsAdmin = _isAdminEmail(user.email);
                const profile = await _ensureAdminFlags(data, user.id, emailIsAdmin);
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
        handleLogout,
        handleProfileImage,
        refreshApprovalStatus,
    };
}
