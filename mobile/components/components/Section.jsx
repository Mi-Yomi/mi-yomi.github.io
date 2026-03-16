import { memo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import MediaCard from './MediaCard';
import SkeletonCard from './SkeletonCard';
import { theme } from '../../theme';

const Section = memo(function Section({ title, icon, items, loading: isLoading, type = 'movie' }) {
    if (!isLoading && (!items || items.length === 0)) return null;

    return (
        <View style={styles.section}>
            <View style={styles.head}>
                <Text style={styles.title}>{icon} {title}</Text>
            </View>
            {isLoading || !items?.length ? (
                <FlatList horizontal data={[1,2,3,4,5]} renderItem={() => <SkeletonCard />} keyExtractor={(_, i) => `skel-${i}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} />
            ) : (
                <FlatList horizontal data={items} renderItem={({ item }) => <MediaCard item={{ ...item, media_type: item.media_type || type }} />} keyExtractor={item => String(item.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} />
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    section: { marginBottom: 28 },
    head: { paddingHorizontal: 16, marginBottom: 14 },
    title: { fontSize: 18, fontWeight: '800', color: theme.text },
    row: { paddingHorizontal: 16, gap: 12 },
});

export default Section;
