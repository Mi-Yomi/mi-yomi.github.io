import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '../../providers/AuthProvider';
import { useData } from '../../providers/DataProvider';
import { useSocial } from '../../providers/SocialProvider';
import MediaCard from '../../components/components/MediaCard';
import { theme } from '../../theme';
import { LIBRARY_STATUSES } from '../../lib/libraryStatuses';
import { IMG } from '../../lib/config';
import { ratingColor, getAvatarUrl, getCoverUrl } from '../../lib/utils';

const TABS = [
    ...LIBRARY_STATUSES.map(s => ({ id: `lib_${s.id}`, label: `${s.icon} ${s.label}` })),
    { id: 'favorites', label: '❤️ Избранное' },
    { id: 'history', label: '🕐 История' },
    { id: 'reviews', label: '✍️ Отзывы' },
    { id: 'collections', label: '📁 Коллекции' },
    { id: 'friends', label: '👥 Друзья' },
    { id: 'requests', label: '📩 Заявки' },
    { id: 'settings', label: '⚙️' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, userProfile, logout, isAdmin, updateUsername } = useAuth();
    const { favorites, history, reviews, library, libraryByStatus, libraryCounts, collections, sortItems, setItemStatus } = useData();
    const { friends, friendRequests, friendSearch, setFriendSearch, searchResult, setSearchResult, searchUser, sendFriendRequest, loadFriendProfile, acceptFriend, declineFriend, saveCollection, deleteCollection } = useSocial();
    const [profileTab, setProfileTab] = useState('favorites');
    const [librarySort, setLibrarySort] = useState('date');
    const [nameEditOpen, setNameEditOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [colModalOpen, setColModalOpen] = useState(false);
    const [colModalTitle, setColModalTitle] = useState('');
    const [colModalEditId, setColModalEditId] = useState(null);
    const [statusPickerItem, setStatusPickerItem] = useState(null);

    const searchUserHandler = () => {
        if (friendSearch.includes('#')) searchUser();
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.logo}>👤 Профиль</Text>
                <Pressable onPress={() => router.push('/search')} style={styles.searchBtn}>
                    <Text style={styles.searchText}>🔍</Text>
                </Pressable>
            </View>

            <View style={[styles.profileCard, userProfile?.cover_url && { overflow: 'hidden' }]}>
                {userProfile?.cover_url && (
                    <ExpoImage source={{ uri: getCoverUrl(userProfile.cover_url) || userProfile.cover_url }} style={styles.coverBg} contentFit="cover" />
                )}
                {userProfile?.avatar_url ? (
                    <ExpoImage source={{ uri: getAvatarUrl(userProfile.avatar_url) || userProfile.avatar_url }} style={styles.avatar} contentFit="cover" />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>{(userProfile?.username || 'U')[0].toUpperCase()}</Text>
                    </View>
                )}
                <Pressable onPress={() => { setNameEditOpen(true); setNewUsername(userProfile?.username || ''); }}>
                    <Text style={styles.username}>{userProfile?.username || 'Пользователь'}#{userProfile?.tag || '0000'}</Text>
                </Pressable>
                <View style={styles.stats}>
                    <Pressable onPress={() => setProfileTab('favorites')} style={styles.stat}><Text style={styles.statValue}>{favorites?.length || 0}</Text><Text style={styles.statLabel}>Избранное</Text></Pressable>
                    <Pressable onPress={() => setProfileTab('history')} style={styles.stat}><Text style={styles.statValue}>{history?.length || 0}</Text><Text style={styles.statLabel}>История</Text></Pressable>
                    <Pressable onPress={() => setProfileTab('reviews')} style={styles.stat}><Text style={styles.statValue}>{reviews?.length || 0}</Text><Text style={styles.statLabel}>Отзывы</Text></Pressable>
                    <Pressable onPress={() => setProfileTab('friends')} style={styles.stat}><Text style={styles.statValue}>{friends?.length || 0}</Text><Text style={styles.statLabel}>Друзья</Text></Pressable>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
                {TABS.map(t => (
                    <Pressable key={t.id} onPress={() => setProfileTab(t.id)} style={[styles.tab, profileTab === t.id && styles.tabActive]}>
                        <Text style={[styles.tabText, profileTab === t.id && styles.tabTextActive]}>{t.label}</Text>
                        {t.id.startsWith('lib_') && libraryCounts[t.id.replace('lib_', '')] > 0 && <Text style={styles.tabBadge}>{libraryCounts[t.id.replace('lib_', '')]}</Text>}
                        {t.id === 'requests' && friendRequests?.length > 0 && <Text style={styles.tabBadge}>{friendRequests.length}</Text>}
                    </Pressable>
                ))}
            </ScrollView>

            {(profileTab.startsWith('lib_') || ['favorites', 'history'].includes(profileTab)) && (
                <View style={styles.sortRow}>
                    {[{ id: 'date', label: 'По дате' }, { id: 'rating', label: 'По рейтингу' }, { id: 'title', label: 'По имени' }].map(s => (
                        <Pressable key={s.id} onPress={() => setLibrarySort(s.id)} style={[styles.sortBtn, librarySort === s.id && styles.sortBtnActive]}>
                            <Text style={[styles.sortText, librarySort === s.id && styles.sortTextActive]}>{s.label}</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={styles.content}>
                {LIBRARY_STATUSES.map(s => {
                    if (profileTab !== `lib_${s.id}`) return null;
                    const items = libraryByStatus[s.id] || [];
                    return items.length > 0 ? (
                        <View key={s.id} style={styles.grid}>
                            {sortItems(items, librarySort).map(item => (
                                <View key={item.item_id} style={styles.cardWrap}>
                                    <MediaCard item={{ ...item, id: item.item_id }} width={120} />
                                    <Pressable onPress={() => setStatusPickerItem({ ...item, id: item.item_id })} style={[styles.statusBtn, { borderColor: s.color }]}>
                                        <Text style={[styles.statusBtnText, { color: s.color }]}>{s.icon}</Text>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View key={s.id} style={styles.empty}><Text style={styles.emptyIcon}>{s.icon}</Text><Text style={styles.emptyText}>Список пуст</Text></View>
                    );
                })}

                {profileTab === 'favorites' && (favorites?.length > 0 ? (
                    <View style={styles.grid}>{sortItems(favorites, librarySort).map(f => <MediaCard key={f.item_id} item={{ ...f, id: f.item_id }} width={120} />)}</View>
                ) : <View style={styles.empty}><Text style={styles.emptyIcon}>❤️</Text><Text style={styles.emptyText}>Пока ничего не добавлено</Text></View>)}

                {profileTab === 'history' && (history?.length > 0 ? (
                    <View style={styles.grid}>{sortItems(history, librarySort).map(h => <MediaCard key={h.item_id} item={{ ...h, id: h.item_id }} width={120} />)}</View>
                ) : <View style={styles.empty}><Text style={styles.emptyIcon}>🕐</Text><Text style={styles.emptyText}>История пуста</Text></View>)}

                {profileTab === 'reviews' && (reviews?.length > 0 ? reviews.map(r => (
                    <Pressable key={r.id || r.movie_id} onPress={() => router.push(`/details/${r.media_type || 'movie'}/${r.movie_id}`)} style={styles.reviewCard}>
                        <View style={styles.reviewTop}>
                            <Text style={styles.reviewTitle}>{r.title}</Text>
                            <View style={[styles.reviewRating, { backgroundColor: ratingColor(r.rating) + '33' }]}><Text style={[styles.reviewRatingText, { color: ratingColor(r.rating) }]}>★ {r.rating}/10</Text></View>
                        </View>
                        <Text style={styles.reviewBody} numberOfLines={3}>{r.content}</Text>
                    </Pressable>
                )) : <View style={styles.empty}><Text style={styles.emptyIcon}>📝</Text><Text style={styles.emptyText}>Нет отзывов</Text></View>)}

                {profileTab === 'collections' && (
                    <View>
                        <Pressable onPress={() => { setColModalTitle(''); setColModalEditId(null); setColModalOpen(true); }} style={styles.createColBtn}><Text style={styles.createColText}>+ Создать коллекцию</Text></Pressable>
                        {collections?.length > 0 ? collections.map(col => (
                            <View key={col.id} style={styles.colCard}>
                                <Text style={styles.colTitle}>{col.title}</Text>
                                <Text style={styles.colCount}>{(col.items || []).length} шт.</Text>
                                <View style={styles.colActions}>
                                    <Pressable onPress={() => { setColModalTitle(col.title); setColModalEditId(col.id); setColModalOpen(true); }} style={styles.colBtn}><Text>✏️ Изменить</Text></Pressable>
                                    <Pressable onPress={() => deleteCollection(col.id)} style={[styles.colBtn, styles.colBtnDanger]}><Text>🗑</Text></Pressable>
                                </View>
                            </View>
                        )) : <View style={styles.empty}><Text style={styles.emptyIcon}>📁</Text><Text style={styles.emptyText}>Нет коллекций</Text></View>}
                    </View>
                )}

                {profileTab === 'friends' && (
                    <View>
                        <View style={styles.friendSearch}>
                            <TextInput style={styles.friendInput} placeholder="Ник#Тег" placeholderTextColor={theme.textMuted} value={friendSearch} onChangeText={setFriendSearch} />
                            <Pressable onPress={searchUserHandler} style={styles.friendSearchBtn}><Text style={styles.friendSearchText}>Найти</Text></Pressable>
                        </View>
                        {searchResult && searchResult !== 'not_found' && (
                            <View style={styles.friendCard}>
                                {searchResult.avatar_url ? <ExpoImage source={{ uri: getAvatarUrl(searchResult.avatar_url) || searchResult.avatar_url }} style={styles.friendAvatar} contentFit="cover" /> : <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}><Text style={styles.friendAvatarText}>{searchResult.username?.[0]?.toUpperCase()}</Text></View>}
                                <Text style={styles.friendName}>{searchResult.username}#{searchResult.tag}</Text>
                                <Pressable onPress={() => sendFriendRequest(searchResult.id)} style={styles.friendAddBtn}><Text style={styles.friendAddText}>+ Добавить</Text></Pressable>
                            </View>
                        )}
                        {searchResult === 'not_found' && <Text style={styles.notFound}>Не найден</Text>}
                        {friends?.map(f => (
                            <Pressable key={f.id} onPress={() => { loadFriendProfile(f); router.push({ pathname: '/friend-profile', params: { friendId: f.id } }); }} style={styles.friendCard}>
                                {f.avatar_url ? <ExpoImage source={{ uri: getAvatarUrl(f.avatar_url) || f.avatar_url }} style={styles.friendAvatar} contentFit="cover" /> : <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}><Text style={styles.friendAvatarText}>{f.username?.[0]?.toUpperCase()}</Text></View>}
                                <Text style={styles.friendName}>{f.username}#{f.tag}</Text>
                            </Pressable>
                        ))}
                        {(!friends || friends.length === 0) && !searchResult && <View style={styles.empty}><Text style={styles.emptyIcon}>👥</Text><Text style={styles.emptyText}>Найдите друзей по Ник#Тег</Text></View>}
                    </View>
                )}

                {profileTab === 'requests' && (friendRequests?.length > 0 ? friendRequests.map(req => (
                    <View key={req.requestId} style={styles.friendCard}>
                        {req.avatar_url ? <ExpoImage source={{ uri: getAvatarUrl(req.avatar_url) || req.avatar_url }} style={styles.friendAvatar} contentFit="cover" /> : <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}><Text style={styles.friendAvatarText}>{req.username?.[0]?.toUpperCase()}</Text></View>}
                        <Text style={styles.friendName}>{req.username} хочет дружить</Text>
                        <View style={styles.reqActions}>
                            <Pressable onPress={() => acceptFriend(req.requestId)} style={styles.acceptBtn}><Text>✓</Text></Pressable>
                            <Pressable onPress={() => declineFriend(req.requestId)} style={styles.declineBtn}><Text>✕</Text></Pressable>
                        </View>
                    </View>
                )) : <View style={styles.empty}><Text style={styles.emptyIcon}>📩</Text><Text style={styles.emptyText}>Нет заявок</Text></View>)}

                {profileTab === 'settings' && (
                    <View style={styles.settings}>
                        <View style={styles.settingsItem}><Text style={styles.settingsIcon}>📧</Text><Text style={styles.settingsLabel}>Email</Text><Text style={styles.settingsValue}>{user?.email}</Text></View>
                        <Pressable onPress={() => { if (confirm('Очистить историю?')) { /* TODO */ } }} style={styles.settingsItem}><Text style={styles.settingsIcon}>🗑️</Text><Text style={styles.settingsLabel}>Очистить историю</Text></Pressable>
                        {isAdmin && <View style={[styles.settingsItem, styles.adminItem]}><Text style={styles.settingsIcon}>👑</Text><Text style={styles.settingsLabel}>Админ (скоро)</Text></View>}
                        <Pressable onPress={logout} style={[styles.settingsItem, styles.logoutItem]}><Text style={styles.settingsIcon}>🚪</Text><Text style={styles.settingsLabel}>Выйти</Text></Pressable>
                    </View>
                )}
            </View>

            {nameEditOpen && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Сменить имя</Text>
                        <TextInput style={styles.modalInput} value={newUsername} onChangeText={setNewUsername} placeholder="Имя" placeholderTextColor={theme.textMuted} />
                        <View style={styles.modalActions}>
                            <Pressable onPress={() => setNameEditOpen(false)} style={styles.modalBtn}><Text>Отмена</Text></Pressable>
                            <Pressable onPress={async () => { await updateUsername(newUsername); setNameEditOpen(false); }} style={[styles.modalBtn, styles.modalBtnPrimary]}><Text style={styles.modalBtnPrimaryText}>Сохранить</Text></Pressable>
                        </View>
                    </View>
                </View>
            )}

            {colModalOpen && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>{colModalEditId ? 'Переименовать' : 'Новая коллекция'}</Text>
                        <TextInput style={styles.modalInput} value={colModalTitle} onChangeText={setColModalTitle} placeholder="Название" placeholderTextColor={theme.textMuted} />
                        <View style={styles.modalActions}>
                            <Pressable onPress={() => setColModalOpen(false)} style={styles.modalBtn}><Text>Отмена</Text></Pressable>
                            <Pressable onPress={async () => { const col = collections?.find(c => c.id === colModalEditId); await saveCollection(colModalTitle, col?.items || [], colModalEditId); setColModalOpen(false); }} style={[styles.modalBtn, styles.modalBtnPrimary]}><Text style={styles.modalBtnPrimaryText}>Сохранить</Text></Pressable>
                        </View>
                    </View>
                </View>
            )}

            {statusPickerItem && (
                <Pressable style={styles.modalOverlay} onPress={() => setStatusPickerItem(null)}>
                    <View style={styles.statusModal} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Статус</Text>
                        {LIBRARY_STATUSES.map(s => (
                            <Pressable key={s.id} onPress={() => { setItemStatus(statusPickerItem, statusPickerItem.media_type, s.id); setStatusPickerItem(null); }} style={[styles.statusOption, { borderColor: s.color }]}>
                                <Text style={[styles.statusOptionText, { color: s.color }]}>{s.icon} {s.label}</Text>
                            </Pressable>
                        ))}
                        <Pressable onPress={() => setStatusPickerItem(null)} style={styles.modalBtn}><Text>Отмена</Text></Pressable>
                    </View>
                </Pressable>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    logo: { fontSize: 22, fontWeight: '900', color: theme.text },
    searchBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.surface, borderRadius: 12 },
    searchText: { color: theme.textSecondary, fontSize: 16 },
    profileCard: { marginHorizontal: 16, marginTop: 20, padding: 24, backgroundColor: theme.surface, borderRadius: 20, alignItems: 'center', position: 'relative' },
    coverBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, opacity: 0.4, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
    avatarPlaceholder: { backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
    username: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 20 },
    stats: { flexDirection: 'row', gap: 24 },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900', color: theme.accent },
    statLabel: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
    tabRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.surface },
    tabActive: { backgroundColor: theme.accent },
    tabText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    tabBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.accent, color: '#fff', fontSize: 9, fontWeight: '800', paddingHorizontal: 4, borderRadius: 8 },
    sortRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.surface },
    sortBtnActive: { backgroundColor: theme.accent },
    sortText: { color: theme.textSecondary, fontSize: 12 },
    sortTextActive: { color: '#fff' },
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    cardWrap: { position: 'relative', width: 120 },
    statusBtn: { position: 'absolute', bottom: 44, right: 4, padding: 4, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1 },
    statusBtnText: { fontSize: 10, fontWeight: '700' },
    empty: { alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { color: theme.textMuted, fontSize: 14 },
    reviewCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
    reviewTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    reviewTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
    reviewRating: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    reviewRatingText: { fontSize: 12, fontWeight: '800' },
    reviewBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
    createColBtn: { backgroundColor: theme.surface, padding: 14, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
    createColText: { color: theme.accent, fontWeight: '700' },
    colCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
    colTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
    colCount: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
    colActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    colBtn: { flex: 1, padding: 10, backgroundColor: theme.surface2, borderRadius: 8, alignItems: 'center' },
    colBtnDanger: { flex: 0, backgroundColor: 'rgba(229,9,20,0.2)' },
    friendSearch: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    friendInput: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12, color: theme.text },
    friendSearchBtn: { paddingHorizontal: 16, backgroundColor: theme.accent, borderRadius: 12, justifyContent: 'center' },
    friendSearchText: { color: '#fff', fontWeight: '700' },
    friendCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 8 },
    friendAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
    friendAvatarPlaceholder: { backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' },
    friendAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    friendName: { flex: 1, color: theme.text, fontWeight: '700' },
    friendAddBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.accent, borderRadius: 10 },
    friendAddText: { color: '#fff', fontWeight: '700' },
    reqActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.green, justifyContent: 'center', alignItems: 'center' },
    declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(229,9,20,0.3)', justifyContent: 'center', alignItems: 'center' },
    notFound: { color: theme.textMuted, textAlign: 'center', padding: 20 },
    settings: { gap: 8 },
    settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, padding: 16 },
    settingsIcon: { fontSize: 20, marginRight: 12 },
    settingsLabel: { flex: 1, color: theme.text, fontWeight: '600' },
    settingsValue: { color: theme.textMuted, fontSize: 12 },
    adminItem: { borderWidth: 1, borderColor: 'rgba(255,171,0,0.3)' },
    logoutItem: { backgroundColor: 'rgba(229,9,20,0.15)' },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modal: { width: '85%', backgroundColor: theme.surface, borderRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 },
    modalInput: { backgroundColor: theme.bg, borderRadius: 12, padding: 14, color: theme.text, marginBottom: 20 },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, padding: 14, backgroundColor: theme.surface2, borderRadius: 12, alignItems: 'center' },
    modalBtnPrimary: { backgroundColor: theme.accent },
    modalBtnPrimaryText: { color: '#fff', fontWeight: '700' },
    statusModal: { width: '85%', backgroundColor: theme.surface, borderRadius: 20, padding: 24 },
    statusOption: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    statusOptionText: { fontSize: 15, fontWeight: '700' },
});
