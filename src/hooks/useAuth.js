import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';
import { ADMIN_USERNAME, ADMIN_TAG } from '../lib/config.js';
import { toBase64 } from '../lib/utils.js';

/**
 * @typedef {Object} AuthState
 * @property {import('@supabase/supabase-js').User|null} user
 * @property {Object|null} userProfile - Supabase profiles row
 * @property {boolean} loading
 * @property {boolean} isAdmin
 * @property {boolean} userApproved
 * @property {boolean} nameEditOpen
 * @property {string} newUsername
 * @property {boolean} refreshingStatus
 * @property {Function} loadUserProfile
 * @property {Function} updateUsername
 * @property {Function} handleLogout
 * @property {Function} handleProfileImage
 * @property {Function} refreshApprovalStatus
 */

/** @returns {AuthState} */
export default function useAuth() {
    const tg = window.Telegram?.WebApp;
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nameEditOpen, setNameEditOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [refreshingStatus, setRefreshingStatus] = useState(false);

    const isAdmin = userProfile?.is_admin === true ||
        (userProfile?.username === ADMIN_USERNAME && userProfile?.tag === ADMIN_TAG);

    const userApproved = useMemo(() => {
        if (!userProfile) return false;
        if (isAdmin) return true;
        if (!userProfile.status) return true;
        return userProfile.status === 'approved';
    }, [userProfile, isAdmin]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUser(session.user);
            else setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) setUser(session.user);
            else { setUser(null); setLoading(false); }
        });
        return () => subscription.unsubscribe();
    }, []);

    const loadUserProfile = useCallback(async (userId, userEmail) => {
        let { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (!data) {
            const username = userEmail ? userEmail.split('@')[0] : 'User';
            const tag = Math.floor(1000 + Math.random() * 9000).toString();
            const { data: newProfile } = await supabase.from('profiles').insert({ id: userId, email: userEmail, username, tag, status: 'pending' }).select().single();
            data = newProfile;
        }
        if (data) { setUserProfile(data); setNewUsername(data.username); }
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
        const { data: uploadData, error: uploadError } = await supabase.storage
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
            const { data } = await supabase.from('profiles').select('status').eq('id', user.id).single();
            if (data) {
                setUserProfile(prev => ({ ...prev, status: data.status }));
                if (data.status === 'approved') {
                    tg?.HapticFeedback?.notificationOccurred?.('success');
                } else if (data.status === 'rejected') {
                    tg?.HapticFeedback?.notificationOccurred?.('error');
                }
            }
        } catch (e) { console.error(e); }
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
