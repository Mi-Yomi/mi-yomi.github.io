import { memo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IMG } from '../../lib/config';
import { getAvatarUrl } from '../../lib/utils';
import { theme } from '../../theme';

const FriendsActivity = memo(function FriendsActivity({ friendsActivity }) {
    const router = useRouter();

    if (!friendsActivity?.length) return null;

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <View style={styles.liveDot} />
                <Text style={styles.title}>Друзья смотрят</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {friendsActivity.map((a, i) => (
                    <Pressable key={i} onPress={() => router.push(`/details/${a.media_type || 'movie'}/${a.item_id}`)} style={styles.card}>
                        <View style={styles.avatar}>
                            {a.profiles?.avatar_url ? (
                                <Image source={{ uri: getAvatarUrl(a.profiles.avatar_url) || a.profiles.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                            ) : (
                                <Text style={styles.avatarText}>{a.profiles?.username?.[0]?.toUpperCase() || '?'}</Text>
                            )}
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.userName}>{a.profiles?.username || 'Друг'}</Text>
                            <Text style={styles.what} numberOfLines={1}>{a.title}{a.last_season ? ` S${a.last_season}:E${a.last_episode}` : ''}</Text>
                        </View>
                        {a.poster_path && <Image source={{ uri: `${IMG}${a.poster_path}` }} style={styles.poster} contentFit="cover" />}
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    section: { marginBottom: 28 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.green, marginRight: 8 },
    title: { fontSize: 16, fontWeight: '800', color: theme.text },
    row: { paddingHorizontal: 16 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14, padding: 12, marginRight: 12, minWidth: 220 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { color: theme.text, fontSize: 16, fontWeight: '800' },
    info: { flex: 1, marginLeft: 12 },
    userName: { color: theme.text, fontSize: 13, fontWeight: '700' },
    what: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
    poster: { width: 36, height: 54, borderRadius: 6 },
});

export default FriendsActivity;
