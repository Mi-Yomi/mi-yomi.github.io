import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/api/supabase.js';

export default function useSocial(user, showToast) {
    const tg = window.Telegram?.WebApp;
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friendSearch, setFriendSearch] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [viewingFriend, setViewingFriend] = useState(null);
    const [friendData, setFriendData] = useState({ favorites: [], history: [], reviews: [] });
    const [friendLoadError, setFriendLoadError] = useState(null);
    const [friendsActivity, setFriendsActivity] = useState([]);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);

    // Collections
    const [collections, setCollections] = useState([]);
    const [collectionModalOpen, setCollectionModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [collectionTitle, setCollectionTitle] = useState('');
    const [addToCollectionItem, setAddToCollectionItem] = useState(null);

    // Reactions
    const [myReactions, setMyReactions] = useState({});

    const unreadNotifCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

    const loadFriends = useCallback(async (userId) => {
        const { data: f } = await supabase.from('friendships').select('*, friend:friend_id(id, username, tag, avatar_url), user:user_id(id, username, tag, avatar_url)').or(`user_id.eq.${userId},friend_id.eq.${userId}`).eq('status', 'accepted');
        if (f) setFriends(f.map(row => row.user_id === userId ? row.friend : row.user));
        const { data: r } = await supabase.from('friendships').select('*, user:user_id(username, tag, avatar_url)').eq('friend_id', userId).eq('status', 'pending');
        if (r) setFriendRequests(r.map(row => ({ ...row.user, requestId: row.id })));
    }, []);

    const loadFriendsActivity = useCallback(async (userId) => {
        const friendIds = friends.map(f => f.id);
        if (friendIds.length === 0) return;
        const { data } = await supabase.from('history')
            .select('*, profiles:user_id(username, avatar_url)')
            .in('user_id', friendIds)
            .gte('watched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('watched_at', { ascending: false })
            .limit(20);
        if (data) setFriendsActivity(data);
    }, [friends]);

    const loadFriendProfile = useCallback(async (friend) => {
        setViewingFriend(friend);
        setFriendData({ favorites: [], history: [], reviews: [], profile: null });
        setFriendLoadError(null);
        try {
            const profResult = await supabase.from('profiles').select('*').eq('id', friend.id).single();
            let favResult = await supabase.from('favorites').select('*').eq('user_id', friend.id).order('created_at', { ascending: false });
            if (favResult.error) favResult = await supabase.from('favorites').select('*').eq('user_id', friend.id);
            let histResult = await supabase.from('history').select('*').eq('user_id', friend.id).order('watched_at', { ascending: false }).limit(50);
            if (histResult.error) histResult = await supabase.from('history').select('*').eq('user_id', friend.id).limit(50);
            let revResult = await supabase.from('reviews').select('*').eq('user_id', friend.id).order('created_at', { ascending: false });
            if (revResult.error) revResult = await supabase.from('reviews').select('*').eq('user_id', friend.id);
            const errors = [];
            if (favResult.error) errors.push('favorites: ' + favResult.error.message);
            if (histResult.error) errors.push('history: ' + histResult.error.message);
            if (revResult.error) errors.push('reviews: ' + revResult.error.message);
            if (errors.length > 0) {
                console.warn('Friend data errors:', errors);
                setFriendLoadError('Некоторые данные недоступны. Проверьте RLS-политики в Supabase.');
            }
            setFriendData({ favorites: favResult.data || [], history: histResult.data || [], reviews: revResult.data || [], profile: profResult.data || null });
        } catch (e) {
            console.error('Error loading friend profile:', e);
            setFriendLoadError('Ошибка загрузки профиля друга: ' + e.message);
        }
    }, []);

    const searchUser = useCallback(async () => {
        if (!friendSearch.includes('#')) return;
        const [name, tag] = friendSearch.split('#');
        const { data } = await supabase.from('profiles').select('*').ilike('username', name).eq('tag', tag).single();
        setSearchResult(data || 'not_found');
    }, [friendSearch]);

    const sendFriendRequest = useCallback(async (friendId) => {
        if (!user) return;
        await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId });
        setSearchResult(null);
        setFriendSearch('');
        tg?.HapticFeedback?.notificationOccurred?.('success');
    }, [user, tg]);

    const acceptFriend = useCallback(async (requestId) => {
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
        tg?.HapticFeedback?.notificationOccurred?.('success');
        if (user) loadFriends(user.id);
    }, [user, tg, loadFriends]);

    const declineFriend = useCallback(async (requestId) => {
        await supabase.from('friendships').delete().eq('id', requestId);
        if (user) loadFriends(user.id);
    }, [user, loadFriends]);

    // Notifications
    const loadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
            if (data) setNotifications(data);
        } catch {}
    }, [user]);

    const markAllNotificationsRead = useCallback(async () => {
        if (!user) return;
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {}
    }, [user]);

    // Collections
    const loadCollections = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('user_collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (data) setCollections(data);
        } catch {}
    }, [user]);

    const saveCollection = useCallback(async (title, items, id = null) => {
        if (!user || !title.trim()) return;
        try {
            if (id) {
                await supabase.from('user_collections').update({ title, items }).eq('id', id);
            } else {
                await supabase.from('user_collections').insert({ user_id: user.id, title, items: items || [], is_public: true });
            }
            loadCollections();
            showToast('📁 Коллекция сохранена');
        } catch { showToast('Ошибка сохранения'); }
    }, [user, loadCollections, showToast]);

    const deleteCollection = useCallback(async (id) => {
        if (!confirm('Удалить коллекцию?')) return;
        try { await supabase.from('user_collections').delete().eq('id', id); loadCollections(); } catch {}
    }, [loadCollections]);

    const addItemToCollection = useCallback(async (collectionId, item) => {
        const col = collections.find(c => c.id === collectionId);
        if (!col) return;
        const items = col.items || [];
        if (items.some(i => i.id === item.id)) { showToast('Уже в коллекции'); return; }
        const newItem = { id: item.id, title: item.title || item.name, poster_path: item.poster_path, media_type: item.media_type || 'movie', vote_average: item.vote_average };
        try {
            await supabase.from('user_collections').update({ items: [...items, newItem] }).eq('id', collectionId);
            loadCollections();
            showToast('Добавлено в коллекцию');
            tg?.HapticFeedback?.notificationOccurred?.('success');
        } catch {}
        setAddToCollectionItem(null);
    }, [collections, loadCollections, showToast, tg]);

    // Reactions
    const loadMyReactions = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('review_reactions').select('*').eq('user_id', user.id);
            if (data) {
                const map = {};
                data.forEach(r => { map[r.review_id] = r.type; });
                setMyReactions(map);
            }
        } catch {}
    }, [user]);

    const toggleReaction = useCallback(async (reviewId, type) => {
        if (!user) return;
        const current = myReactions[reviewId];
        try {
            if (current === type) {
                await supabase.from('review_reactions').delete().eq('user_id', user.id).eq('review_id', reviewId);
                setMyReactions(prev => { const n = { ...prev }; delete n[reviewId]; return n; });
            } else {
                await supabase.from('review_reactions').upsert({ user_id: user.id, review_id: reviewId, type }, { onConflict: 'user_id,review_id' });
                setMyReactions(prev => ({ ...prev, [reviewId]: type }));
            }
            tg?.HapticFeedback?.impactOccurred?.('light');
        } catch {}
    }, [user, myReactions, tg]);

    // Supabase Realtime for notifications
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('notifications-realtime')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // Supabase Realtime for friend requests
    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('friendships-realtime')
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'friendships',
                filter: `friend_id=eq.${user.id}`,
            }, () => { loadFriends(user.id); })
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'friendships',
                filter: `user_id=eq.${user.id}`,
            }, () => { loadFriends(user.id); })
            .subscribe();
        const friendInterval = setInterval(() => loadFriends(user.id), 60000);
        return () => { supabase.removeChannel(channel); clearInterval(friendInterval); };
    }, [user, loadFriends]);

    useEffect(() => {
        if (user && friends.length > 0) loadFriendsActivity(user.id);
    }, [user, friends, loadFriendsActivity]);

    return {
        friends, setFriends,
        friendRequests, setFriendRequests,
        friendSearch, setFriendSearch,
        searchResult, setSearchResult,
        viewingFriend, setViewingFriend,
        friendData, setFriendData,
        friendLoadError, setFriendLoadError,
        friendsActivity, setFriendsActivity,
        notifications, setNotifications,
        notifOpen, setNotifOpen,
        unreadNotifCount,
        collections, setCollections,
        collectionModalOpen, setCollectionModalOpen,
        editingCollection, setEditingCollection,
        collectionTitle, setCollectionTitle,
        addToCollectionItem, setAddToCollectionItem,
        myReactions, setMyReactions,
        loadFriends, loadFriendsActivity, loadFriendProfile,
        searchUser, sendFriendRequest, acceptFriend, declineFriend,
        loadNotifications, markAllNotificationsRead,
        loadCollections, saveCollection, deleteCollection, addItemToCollection,
        loadMyReactions, toggleReaction,
    };
}
