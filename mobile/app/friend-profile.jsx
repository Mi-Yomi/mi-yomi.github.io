import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useSocial } from '../providers/SocialProvider';
import MediaCard from '../components/components/MediaCard';
import { getAvatarUrl, getCoverUrl } from '../lib/utils';
import { theme } from '../theme';

export default function FriendProfileScreen() {
    const { friendId } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { viewingFriend, friendData, loadFriendProfile, setViewingFriend } = useSocial();

    useEffect(() => {
        if (friendId && viewingFriend?.id !== friendId) {
            loadFriendProfile({ id: friendId });
        }
        return () => setViewingFriend(null);
    }, [friendId, loadFriendProfile]);

    const friend = viewingFriend || { id: friendId };
    const profile = friendData.profile || friend;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.coverWrap}>
                {(profile?.cover_url || friend?.cover_url) && (
                    <ExpoImage source={{ uri: getCoverUrl(profile.cover_url || friend.cover_url) || (profile.cover_url || friend.cover_url) }} style={styles.cover} contentFit="cover" />
                )}
                <View style={styles.coverOverlay} />
                <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12 }]}>
                    <Text style={styles.backText}>← Назад</Text>
                </Pressable>
            </View>
            <View style={styles.header}>
                {profile?.avatar_url || friend?.avatar_url ? (
                    <ExpoImage source={{ uri: getAvatarUrl(profile.avatar_url || friend.avatar_url) || (profile.avatar_url || friend.avatar_url) }} style={styles.avatar} contentFit="cover" />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarText}>{(friend.username || 'Д')[0].toUpperCase()}</Text></View>
                )}
                <Text style={styles.name}>{friend.username || profile?.username || 'Друг'}#{friend.tag || profile?.tag || ''}</Text>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Избранное</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {(friendData.favorites || []).map(f => <MediaCard key={f.item_id} item={{ ...f, id: f.item_id }} width={100} compact />)}
                </ScrollView>
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>История</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {(friendData.history || []).slice(0, 10).map(h => <MediaCard key={h.item_id} item={{ ...h, id: h.item_id }} width={100} compact />)}
                </ScrollView>
            </View>
            {(friendData.reviews || []).length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Отзывы</Text>
                    {(friendData.reviews || []).slice(0, 5).map(r => (
                        <Pressable key={r.id} onPress={() => router.push(`/details/${r.media_type || 'movie'}/${r.movie_id}`)} style={styles.reviewCard}>
                            <Text style={styles.reviewTitle}>{r.title}</Text>
                            <Text style={styles.reviewContent} numberOfLines={2}>{r.content}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    coverWrap: { height: 140, position: 'relative', backgroundColor: theme.surface },
    cover: StyleSheet.absoluteFillObject,
    coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
    backBtn: { position: 'absolute', left: 16, top: 12, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
    backText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    header: { paddingHorizontal: 16, marginTop: -40, marginBottom: 24, alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: theme.bg },
    avatarPlaceholder: { backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
    name: { fontSize: 22, fontWeight: '900', color: theme.text, marginTop: 12 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text, paddingHorizontal: 16, marginBottom: 14 },
    row: { paddingHorizontal: 16, gap: 12 },
    reviewCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 12 },
    reviewTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
    reviewContent: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
});
