import { useCallback, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';
import { api } from '../lib/api/tmdb.js';
import { ADMIN_USERNAME, ADMIN_TAG } from '../lib/config.js';

export default function useAdmin(user, isAdmin, showToast) {
    const tg = window.Telegram?.WebApp;
    const [adminOpen, setAdminOpen] = useState(false);
    const [curatedLists, setCuratedLists] = useState([]);
    const [adminListTitle, setAdminListTitle] = useState('');
    const [adminListItems, setAdminListItems] = useState([]);
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [adminSearchResults, setAdminSearchResults] = useState([]);
    const [adminEditingId, setAdminEditingId] = useState(null);

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
        const listData = {
            title: adminListTitle.trim(),
            items: adminListItems,
            created_by: user?.id,
            created_at: new Date().toISOString(),
            is_active: true,
        };
        if (adminEditingId) {
            const { error } = await supabase.from('curated_lists').update(listData).eq('id', adminEditingId);
            if (error) { alert('Ошибка: ' + error.message); return; }
        } else {
            const { error } = await supabase.from('curated_lists').insert(listData);
            if (error) { alert('Ошибка: ' + error.message); return; }
        }
        setAdminListTitle('');
        setAdminListItems([]);
        setAdminEditingId(null);
        loadCuratedLists();
        tg?.HapticFeedback?.notificationOccurred?.('success');
    }, [adminListTitle, adminListItems, adminEditingId, user, loadCuratedLists, tg]);

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
        if (!q.trim()) { setAdminSearchResults([]); return; }
        const data = await api(`/search/multi?query=${encodeURIComponent(q)}`);
        if (data) setAdminSearchResults((data.results || []).filter(r => r.media_type !== 'person').slice(0, 8));
    }, []);

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
            let result = await supabase.from('profiles').select('id, username, tag, email, avatar_url, status, created_at').order('created_at', { ascending: false });
            if (result.error) result = await supabase.from('profiles').select('id, username, tag, email, avatar_url, status');
            if (result.data) {
                const filtered = result.data.filter(u => !(u.username === ADMIN_USERNAME && u.tag === ADMIN_TAG));
                setPendingUsers(filtered);
            }
            if (result.error) {
                console.error('Pending users load error:', result.error);
                showToast('⚠️ Ошибка загрузки: ' + result.error.message);
            }
        } catch (e) { console.error(e); showToast('⚠️ Ошибка: ' + e.message); }
        setApprovalLoading(false);
    }, [showToast]);

    const approveUser = useCallback(async (userId) => {
        const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId);
        if (error) { showToast('Ошибка: ' + error.message); return; }
        tg?.HapticFeedback?.notificationOccurred?.('success');
        showToast('✅ Пользователь одобрен');
        loadPendingUsers();
    }, [showToast, tg, loadPendingUsers]);

    const rejectUser = useCallback(async (userId) => {
        const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId);
        if (error) { showToast('Ошибка: ' + error.message); return; }
        tg?.HapticFeedback?.notificationOccurred?.('warning');
        showToast('🚫 Пользователь отклонён');
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
