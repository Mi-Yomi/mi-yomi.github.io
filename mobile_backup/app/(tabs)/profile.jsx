import { ScrollView, View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';
import MediaCard from '../../components/MediaCard';
import { LIBRARY_STATUSES } from '../../lib/utils';
import { theme } from '../../theme';
import { useState } from 'react';

export default function ProfileScreen() {
    const { userProfile, logout } = useAuth();
    const { favorites, history, library } = useData();
    const [tab, setTab] = useState('lib_watching');

    const libByStatus = {};
    LIBRARY_STATUSES.forEach(s => { libByStatus[s.id] = []; });
    library.forEach(item => { if (libByStatus[item.status]) libByStatus[item.status].push(item); });

    const tabs = [
        ...LIBRARY_STATUSES.map(s => ({ id: `lib_${s.id}`, label: `${s.icon} ${s.label}`, count: libByStatus[s.id].length })),
        { id: 'favorites', label: '❤️ Избранное', count: favorites.length },
        { id: 'history', label: '🕐 История', count: history.length },
    ];

    const getItems = () => {
        if (tab === 'favorites') return favorites.map(f => ({ ...f, id: f.item_id }));
        if (tab === 'history') return history.map(h => ({ ...h, id: h.item_id }));
        const statusId = tab.replace('lib_', '');
        return (libByStatus[statusId] || []).map(l => ({ ...l, id: l.item_id }));
    };

    const items = getItems();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrap}>
                        {userProfile?.avatar_url ? (
                            <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPh]}><Text style={styles.avatarText}>{userProfile?.username?.[0]?.toUpperCase() || '?'}</Text></View>
                        )}
                    </View>
                    <Text style={styles.name}>{userProfile?.username || 'User'}</Text>
                    <Text style={styles.tag}>#{userProfile?.tag}</Text>
                </View>

                <View style={styles.stats}>
                    <View style={styles.statItem}><Text style={styles.statNum}>{favorites.length}</Text><Text style={styles.statLabel}>Избранное</Text></View>
                    <View style={styles.statItem}><Text style={styles.statNum}>{history.length}</Text><Text style={styles.statLabel}>Просмотрено</Text></View>
                    <View style={styles.statItem}><Text style={styles.statNum}>{library.length}</Text><Text style={styles.statLabel}>В библиотеке</Text></View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                    {tabs.map(t => (
                        <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
                            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
                            {t.count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{t.count}</Text></View>}
                        </Pressable>
                    ))}
                </ScrollView>

                {items.length > 0 ? (
                    <View style={styles.grid}>
                        {items.map(item => <MediaCard key={item.id || item.item_id} item={item} width={110} />)}
                    </View>
                ) : (
                    <View style={styles.empty}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>Список пуст</Text></View>
                )}

                <Pressable onPress={logout} style={styles.logoutBtn}><Text style={styles.logoutText}>🚪 Выйти</Text></Pressable>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    profileHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
    avatarWrap: { marginBottom: 12 },
    avatar: { width: 96, height: 96, borderRadius: 28, backgroundColor: theme.surface },
    avatarPh: { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.accent },
    avatarText: { color: '#fff', fontSize: 36, fontWeight: '900' },
    name: { fontSize: 22, fontWeight: '900', color: theme.text },
    tag: { fontSize: 13, color: theme.textMuted, fontWeight: '600', marginTop: 2 },
    stats: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, backgroundColor: theme.surface, borderRadius: 18, overflow: 'hidden' },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statNum: { fontSize: 22, fontWeight: '900', color: theme.text },
    statLabel: { fontSize: 10, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    tabs: { paddingHorizontal: 16, gap: 6, marginBottom: 16 },
    tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabActive: { backgroundColor: theme.accent },
    tabText: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
    tabTextActive: { color: '#fff' },
    badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: 'center' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.3 },
    emptyText: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
    logoutBtn: { marginHorizontal: 16, marginTop: 24, padding: 16, borderRadius: 14, backgroundColor: 'rgba(229,9,20,0.08)', borderWidth: 1, borderColor: 'rgba(229,9,20,0.2)', alignItems: 'center' },
    logoutText: { color: theme.accent, fontSize: 14, fontWeight: '700' },
});
