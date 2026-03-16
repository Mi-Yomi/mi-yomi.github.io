import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import * as Haptics from 'expo-haptics';

const SocialContext = createContext(null);

export function SocialProvider({ children }) {
    const { user } = useAuth();
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friendsActivity, setFriendsActivity] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [collections, setCollections] = useState([]);
    const [viewingFriend, setViewingFriend] = useState(null);
    const [friendData, setFriendData] = useState({ favorites: [], history: [], reviews: [] });
    const [friendSearch, setFriendSearch] = useState('');
    const [searchResult, setSearchResult] = useState(null);

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

    const loadNotifications = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
        if (data) setNotifications(data);
    }, [user]);

    const loadCollections = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('user_collections').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setCollections(data);
    }, [user]);

    const saveCollection = useCallback(async (title, items, id = null) => {
        if (!user || !title.trim()) return;
        try {
            if (id) await supabase.from('user_collections').update({ title, items }).eq('id', id);
            else await supabase.from('user_collections').insert({ user_id: user.id, title, items: items || [], is_public: true });
            loadCollections();
            return true;
        } catch { return false; }
    }, [user, loadCollections]);

    const deleteCollection = useCallback(async (id) => {
        await supabase.from('user_collections').delete().eq('id', id);
        loadCollections();
    }, [loadCollections]);

    const acceptFriend = useCallback(async (requestId) => {
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (user) loadFriends(user.id);
    }, [user, loadFriends]);

    const declineFriend = useCallback(async (requestId) => {
        await supabase.from('friendships').delete().eq('id', requestId);
        if (user) loadFriends(user.id);
    }, [user, loadFriends]);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [user]);

    const loadFriendProfile = useCallback(async (friend) => {
        const friendId = typeof friend === 'object' ? friend.id : friend;
        setViewingFriend(typeof friend === 'object' ? friend : { id: friendId });
        try {
            const [prof, fav, hist, rev] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', friendId).single(),
                supabase.from('favorites').select('*').eq('user_id', friendId).order('created_at', { ascending: false }),
                supabase.from('history').select('*').eq('user_id', friendId).order('watched_at', { ascending: false }).limit(50),
                supabase.from('reviews').select('*').eq('user_id', friendId).order('created_at', { ascending: false }),
            ]);
            const profile = prof.data || null;
            setViewingFriend(prev => (typeof prev === 'object' && prev ? { ...prev, ...profile } : { id: friendId, ...profile }));
            setFriendData({ favorites: fav.data || [], history: hist.data || [], reviews: rev.data || [], profile });
        } catch (e) { console.warn(e); }
    }, []);

    useEffect(() => {
        if (user) {
            loadFriends(user.id);
            loadNotifications();
            loadCollections();
        }
    }, [user, loadFriends, loadNotifications, loadCollections]);

    useEffect(() => {
        if (user && friends.length > 0) loadFriendsActivity(user.id);
    }, [user, friends, loadFriendsActivity]);

    useEffect(() => {
        if (!user) return;
        const ch = supabase.channel('notifications-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (p) => setNotifications(prev => [p.new, ...prev]))
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [user]);

    const value = useMemo(() => ({
        friends, friendRequests, friendsActivity, notifications, collections, viewingFriend, friendData,
        friendSearch, setFriendSearch, searchResult, setSearchResult,
        unreadNotifCount, loadFriends, loadFriendProfile, loadNotifications, loadCollections,
        saveCollection, deleteCollection, acceptFriend, declineFriend, sendFriendRequest, searchUser,
        setViewingFriend,
    }), [friends, friendRequests, friendsActivity, notifications, collections, viewingFriend, friendData, friendSearch, searchResult, unreadNotifCount]);

    return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
    const ctx = useContext(SocialContext);
    if (!ctx) throw new Error('useSocial must be inside SocialProvider');
    return ctx;
}
