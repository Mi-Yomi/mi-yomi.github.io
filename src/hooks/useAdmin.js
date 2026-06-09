import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';
import { api } from '../lib/api/tmdb.js';

export default function useAdmin(user, isAdmin, showToast) {
    const tg = window.Telegram?.WebApp;
    const [adminOpen, setAdminOpen] = useState(false);
    const [curatedLists, setCuratedLists] = useState([]);
    const [adminListTitle, setAdminListTitle] = useState('');
    const [adminListItems, setAdminListItems] = useState([]);
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [adminSearchResults, setAdminSearchResults] = useState([]);
    const [adminEditingId, setAdminEditingId] = useState(null);
    const adminSearchSeq = useRef(0);

    // Approval system
    const [pendingUsers, setPendingUsers] = useState([]);
    const [approvalTab, setApprovalTab] = useState('pending');
    const [approvalLoading, setApprovalLoading] = useState(false);

    const loadCuratedLists = useCallback(async () => {
        const { data, error } = await supabase.from('curated_lists').select('*').order('created_at', { ascending: false });
        if (data) setCuratedLists(data);
        if (error) console.error('Curated lists load error:', error);
    }, []);

    const saveCuratedList = useCallback(async () => {
        if (!adminListTitle.trim() || adminListItems.length === 0) return;
        if (adminEditingId) {
            // Edit: only touch title/items. Previously this re-sent is_active:true and a
            // fresh created_at, which silently re-showed hidden lists and jumped their order.
            const { error } = await supabase.from('curated_lists')
                .update({ title: adminListTitle.trim(), items: adminListItems })
                .eq('id', adminEditingId);
            if (error) { showToast('Ошибка: ' + error.message); return; }
        } else {
            const { error } = await supabase.from('curated_lists').insert({
                title: adminListTitle.trim(),
                items: adminListItems,
                created_by: user?.id,
                created_at: new Date().toISOString(),
                is_active: true,
            });
            if (error) { showToast('Ошибка: ' + error.message); return; }
        }
        setAdminListTitle('');
        setAdminListItems([]);
        setAdminEditingId(null);
        loadCuratedLists();
        showToast(adminEditingId ? 'Подборка обновлена' : 'Подборка создана');
        tg?.HapticFeedback?.notificationOccurred?.('success');
    }, [adminListTitle, adminListItems, adminEditingId, user, loadCuratedLists, showToast, tg]);

    const deleteCuratedList = useCallback(async (id) => {
        if (!confirm('Удалить эту подборку?')) return;
        await supabase.from('curated_lists').delete().eq('id', id);
        loadCuratedLists();
    }, [loadCuratedLists]);

    const toggleCuratedListActive = useCallback(async (id, current) => {
        await supabase.from('curated_lists').update({ is_active: !current }).eq('id', id);
        loadCuratedLists();
    }, [loadCuratedLists]);

    const editCuratedList = useCallback((list) => {
        setAdminEditingId(list.id);
        setAdminListTitle(list.title);
        setAdminListItems(list.items || []);
    }, []);

    const adminSearch = useCallback(async (q) => {
        const trimmed = q.trim();
        if (!trimmed) { setAdminSearchResults([]); return; }
        // Drop out-of-order responses: only the latest query may set results.
        const seq = ++adminSearchSeq.current;
        const data = await api(`/search/multi?query=${encodeURIComponent(trimmed)}`);
        if (seq !== adminSearchSeq.current) return;
        if (data) setAdminSearchResults((data.results || []).filter(r => r.media_type !== 'person').slice(0, 8));
    }, []);

    // Debounce the admin search so typing fires one TMDB call, not one per keystroke.
    useEffect(() => {
        if (!adminOpen) return;
        const t = setTimeout(() => adminSearch(adminSearchQuery), 350);
        return () => clearTimeout(t);
    }, [adminSearchQuery, adminOpen, adminSearch]);

    const addToAdminList = useCallback((item) => {
        if (adminListItems.some(i => i.id === item.id)) return;
        setAdminListItems(prev => [...prev, {
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            media_type: item.media_type || 'movie',
            release_date: item.release_date || item.first_air_date,
        }]);
        setAdminSearchQuery('');
        setAdminSearchResults([]);
        tg?.HapticFeedback?.impactOccurred?.('light');
    }, [adminListItems, tg]);

    // Approval functions
    const loadPendingUsers = useCallback(async () => {
        setApprovalLoading(true);
        try {
            let result = await supabase
                .from('profiles')
                .select('id, username, tag, email, avatar_url, status, is_admin, created_at')
                .order('created_at', { ascending: false });
            if (result.error) {
                // Fallback without ordering if created_at column issues
                result = await supabase
                    .from('profiles')
                    .select('id, username, tag, email, avatar_url, status, is_admin');
            }
            if (result.data) {
                // Filter out admins by DB flag (not hardcoded username)
                const filtered = result.data.filter(u => !u.is_admin);
                setPendingUsers(filtered);
            }
            if (result.error) {
                console.error('[HADES] Users load error:', result.error);
                showToast('Ошибка загрузки: ' + result.error.message);
            }
        } catch (e) { console.error(e); showToast('Ошибка: ' + e.message); }
        setApprovalLoading(false);
    }, [showToast]);

    const approveUser = useCallback(async (userId) => {
        const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId);
        if (error) { showToast('Ошибка: ' + error.message); return; }
        tg?.HapticFeedback?.notificationOccurred?.('success');
        showToast('Пользователь одобрен');
        loadPendingUsers();
    }, [showToast, tg, loadPendingUsers]);

    const rejectUser = useCallback(async (userId) => {
        const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId);
        if (error) { showToast('Ошибка: ' + error.message); return; }
        tg?.HapticFeedback?.notificationOccurred?.('warning');
        showToast('Пользователь отклонён');
        loadPendingUsers();
    }, [showToast, tg, loadPendingUsers]);

    return {
        adminOpen, setAdminOpen,
        curatedLists, setCuratedLists,
        adminListTitle, setAdminListTitle,
        adminListItems, setAdminListItems,
        adminSearchQuery, setAdminSearchQuery,
        adminSearchResults, setAdminSearchResults,
        adminEditingId, setAdminEditingId,
        pendingUsers, setPendingUsers,
        approvalTab, setApprovalTab,
        approvalLoading, setApprovalLoading,
        loadCuratedLists, saveCuratedList, deleteCuratedList,
        toggleCuratedListActive, editCuratedList,
        adminSearch, addToAdminList,
        loadPendingUsers, approveUser, rejectUser,
    };
}
