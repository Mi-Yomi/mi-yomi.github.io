import { useCallback, useMemo, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';
import { LIBRARY_STATUSES } from '../lib/libraryStatuses.js';

/**
 * Unified library hook.
 * Manages user's media library with statuses: watching, planned, completed, on_hold, dropped.
 * Uses the `user_library` table in Supabase.
 */
export default function useLibrary(user, showToast) {
    const tg = window.Telegram?.WebApp;
    const [library, setLibrary] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(false);

    const loadLibrary = useCallback(async (userId) => {
        if (!userId) return;
        setLibraryLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_library')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            if (error) {
                console.error('Library load error:', error.message);
                const fallback = await supabase.from('user_library').select('*').eq('user_id', userId);
                if (fallback.data) setLibrary(fallback.data);
            } else {
                setLibrary(data || []);
            }
        } catch (e) { console.error('Library exception:', e); }
        setLibraryLoading(false);
    }, []);

    const getItemStatus = useCallback((itemId) => {
        return library.find(l => l.item_id === String(itemId))?.status || null;
    }, [library]);

    const setItemStatus = useCallback(async (item, type, status) => {
        if (!user) return;
        const itemId = String(item.id);
        const existing = library.find(l => l.item_id === itemId);

        if (existing && existing.status === status) {
            await supabase.from('user_library').delete().eq('user_id', user.id).eq('item_id', itemId);
            setLibrary(prev => prev.filter(l => l.item_id !== itemId));
            showToast('Убрано из библиотеки');
            tg?.HapticFeedback?.impactOccurred?.('light');
            return;
        }

        const row = {
            user_id: user.id,
            item_id: itemId,
            media_type: type || item.media_type || 'movie',
            status,
            title: item.title || item.name,
            poster_path: item.poster_path || null,
            backdrop_path: item.backdrop_path || null,
            vote_average: item.vote_average || 0,
            release_date: item.release_date || item.first_air_date || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('user_library')
            .upsert(row, { onConflict: 'user_id,item_id' });

        if (error) {
            console.error('Library upsert error:', error.message);
            showToast('Ошибка сохранения');
            return;
        }

        setLibrary(prev => {
            const filtered = prev.filter(l => l.item_id !== itemId);
            return [row, ...filtered];
        });

        const statusInfo = LIBRARY_STATUSES.find(s => s.id === status);
        showToast(`${statusInfo?.icon || '📋'} ${statusInfo?.label || status}`);
        tg?.HapticFeedback?.notificationOccurred?.('success');
    }, [user, library, showToast, tg]);

    const removeFromLibrary = useCallback(async (itemId) => {
        if (!user) return;
        await supabase.from('user_library').delete().eq('user_id', user.id).eq('item_id', String(itemId));
        setLibrary(prev => prev.filter(l => l.item_id !== String(itemId)));
        showToast('Убрано из библиотеки');
    }, [user, showToast]);

    const libraryByStatus = useMemo(() => {
        const map = {};
        LIBRARY_STATUSES.forEach(s => { map[s.id] = []; });
        library.forEach(item => {
            if (map[item.status]) map[item.status].push(item);
            else map.planned.push(item);
        });
        return map;
    }, [library]);

    const libraryCounts = useMemo(() => {
        const counts = {};
        LIBRARY_STATUSES.forEach(s => { counts[s.id] = 0; });
        library.forEach(item => {
            if (counts[item.status] !== undefined) counts[item.status]++;
            else counts.planned++;
        });
        return counts;
    }, [library]);

    return {
        library, setLibrary, libraryLoading,
        loadLibrary,
        getItemStatus, setItemStatus, removeFromLibrary,
        libraryByStatus, libraryCounts,
    };
}
